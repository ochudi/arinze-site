"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { adminEmail, getAdmin, session } from "@/lib/auth";
import { db, files } from "@/lib/supabase";
import { bareDoi } from "./crossref";
import {
  collection,
  profile,
  type Collection,
  type Field,
  type FormState,
  type Row,
} from "./schema";

/*
  Everything the editor can do. Each action checks the session before it
  touches anything; one that finds the editor signed out says so instead of
  redirecting, so a form full of typing is not thrown away.
*/
const signedOut =
  "You have been signed out. Sign in again in another tab, then come back and save.";

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const supabase = await session();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: String(form.get("password") ?? ""),
  });
  // An account from another site on the same Supabase project is not an editor here.
  if (error || !(await adminEmail(data.user?.id))) {
    if (!error) await supabase.auth.signOut();
    return { email, message: "That email and password do not match." };
  }
  redirect("/admin");
}

export async function signOut() {
  await (await session()).auth.signOut();
  redirect("/admin/login");
}

export async function changePassword(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  if (!(await getAdmin())) return { message: signedOut };
  const password = String(form.get("password") ?? "");
  if (password.length < 10)
    return { message: "Please use at least ten characters." };
  const { error } = await (await session()).auth.updateUser({ password });
  return error
    ? { message: "That did not work. Sign out, sign in again and retry." }
    : { message: "Password changed.", done: true };
}

/** Save the profile, an existing entry (slug given) or a new one (slug null). */
export async function save(
  key: string,
  slug: string | null,
  form: FormData,
): Promise<FormState> {
  if (!(await getAdmin())) return { message: signedOut };
  const sheet = find(key);
  const fields = sheet.groups.flatMap((group) => group.fields);
  const values: Row = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    try {
      values[field.name] = read(field, form);
    } catch (problem) {
      errors[field.name] = (problem as Error).message;
    }
  }
  if (Object.keys(errors).length > 0) return { errors };

  const table = db.from(sheet.table);
  const before = await stored(sheet, slug);
  let saved = slug ?? "profile";
  let failure;
  if (sheet === profile) {
    failure = (await table.update(values).eq("id", true)).error;
  } else if (slug) {
    failure = (await table.update(values).eq("slug", slug)).error;
  } else {
    saved = await freshSlug(sheet.table, String(values.title));
    failure = (await table.insert({ ...values, slug: saved })).error;
  }
  if (failure) return { message: "That could not be saved. Please try again." };

  // A file that was replaced or removed leaves the bucket, so it is no longer public.
  await discard(before.filter((path) => !Object.values(values).includes(path)));
  await published(values.draft !== true);
  redirect(
    sheet === profile ? "/admin?saved=profile" : `/admin/${key}?saved=${saved}`,
  );
}

export async function remove(key: string, slug: string) {
  if (!(await getAdmin())) redirect("/admin/login");
  const sheet = find(key);
  if (sheet === profile) throw new Error("The profile cannot be deleted");
  const before = await stored(sheet, slug);
  await db.from(sheet.table).delete().eq("slug", slug);
  await discard(before);
  await published();
  redirect(`/admin/${key}?removed=1`);
}

/**
 * Where the browser should send a file: a one-time upload address in the
 * bucket. Every upload gets a name of its own, so nothing is overwritten
 * and nothing changes on the site until the form is saved.
 */
export async function uploadTarget(folder: string, filename: string) {
  if (!(await getAdmin())) return { error: signedOut };
  const dot = filename.lastIndexOf(".");
  const extension = filename.slice(dot).toLowerCase();
  if (
    !["portrait", "cv", "papers"].includes(folder) ||
    dot < 0 ||
    !/^\.(pdf|jpe?g|png|webp)$/.test(extension)
  )
    return { error: "That kind of file cannot be used here." };
  const name = plain(filename.slice(0, dot), "_") || "file";
  const { data, error } = await files.createSignedUploadUrl(
    `${folder}/${name}-${randomUUID().slice(0, 8)}${extension}`,
  );
  if (error) return { error: "The upload could not start. Please try again." };
  return { path: data.path, url: data.signedUrl };
}

/** After any change: rebuild every page and, unless only a draft was saved, date the footer's "Updated". */
async function published(dated = true) {
  if (dated)
    await db
      .from("arinze_profile")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", true);
  revalidatePath("/", "layout");
}

/** The files an entry holds in the bucket right now. */
async function stored(sheet: Collection, slug: string | null) {
  const names = sheet.groups
    .flatMap((group) => group.fields)
    .filter((field) => field.type === "file")
    .map((field) => field.name);
  if (names.length === 0 || (sheet !== profile && !slug)) return [];
  const query = db.from(sheet.table).select(names.join(", "));
  const { data } = await (
    sheet === profile ? query : query.eq("slug", slug)
  ).maybeSingle<Row>();
  return Object.values(data ?? {}).filter(Boolean) as string[];
}

async function discard(paths: string[]) {
  if (paths.length > 0) await files.remove(paths);
}

function find(key: string): Collection {
  const sheet = key === "profile" ? profile : collection(key);
  if (!sheet) throw new Error(`Unknown ${key}`);
  return sheet;
}

/** "Été à Lagos!" -> "ete-a-lagos". */
function plain(text: string, keep = ""): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(new RegExp(`[^a-zA-Z0-9${keep}]+`, "g"), "-")
    .replace(/^-+|-+$/g, "");
}

/** A web address for a new entry, made from its title and not yet taken. */
async function freshSlug(table: string, title: string): Promise<string> {
  const base = plain(title).toLowerCase().slice(0, 80) || "untitled";
  const { data } = await db.from(table).select("slug").like("slug", `${base}%`);
  const taken = new Set(["new", ...(data ?? []).map((row) => row.slug)]);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** "lbs.edu.ng/x" -> "https://lbs.edu.ng/x"; anything that is not a web address is refused. */
function link(text: string): string {
  const address = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  const url = URL.canParse(address) ? new URL(address) : null;
  if (!url || !/^https?:$/.test(url.protocol) || !url.hostname.includes("."))
    throw new Error("This does not look like a web address.");
  return address;
}

/** One field's value as the database wants it; throws the sentence to show the editor. */
function read(field: Field, form: FormData): unknown {
  const text = String(form.get(field.name) ?? "").trim();
  if (field.required && !text) throw new Error("Please fill this in.");
  switch (field.type) {
    case "checkbox":
      return text === "on";
    case "url":
      return text ? link(text) : null;
    case "date":
      return text || null;
    case "file":
      if (text && !text.startsWith(`${field.folder}/`))
        throw new Error("Please upload the file again.");
      return text || null;
    case "year":
      if (!/^(\d{4})?$/.test(text))
        throw new Error("Four digits, like 2025, or leave it empty.");
      return text;
    case "email":
      if (text && !/^\S+@\S+\.\S+$/.test(text))
        throw new Error("This does not look like an email address.");
      return text;
    case "doi":
      return bareDoi(text);
    case "select":
      if (!Object.hasOwn(field.options, text))
        throw new Error("Please choose one.");
      return text;
    case "pairs": {
      // Every list here is a name or label followed by an optional web address.
      const [[first], [second]] = field.columns;
      return (JSON.parse(text || "[]") as Record<string, string>[])
        .map((row) => [row[first]?.trim(), row[second]?.trim()])
        .filter(([a, b]) => a || b)
        .map(([a, b]) => {
          if (!a) throw new Error("A row is missing its first part.");
          return { [first]: a, [second]: b ? link(b) : null };
        });
    }
    default:
      return text;
  }
}
