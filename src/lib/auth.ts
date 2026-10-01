import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { sessionClient } from "./session";
import { db } from "./supabase";

/*
  Sign-in for /admin. Accounts are Supabase Auth users, a pool the whole
  Supabase project shares; the arinze_admins table says which accounts may
  edit this site. The session lives in an HttpOnly cookie, sent to /admin
  only, that src/proxy.ts keeps fresh.
*/
export async function session() {
  const jar = await cookies();
  return sessionClient({
    getAll: () => jar.getAll(),
    setAll: (all) => {
      try {
        for (const { name, value, options } of all)
          jar.set(name, value, options);
      } catch {
        // A Server Component cannot write cookies; the proxy already has.
      }
    },
  });
}

/** The editor's email if this account is on the list, else null. */
export async function adminEmail(
  userId: string | undefined,
): Promise<string | null> {
  if (!userId) return null;
  const { data } = await db
    .from("arinze_admins")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.email ?? null;
}

/** Who is signed in, if they are an editor. One check per request. */
export const getAdmin = cache(async (): Promise<string | null> => {
  const { data } = await (await session()).auth.getClaims();
  return adminEmail(data?.claims.sub);
});

/**
 * The editor's email; anyone else is sent to the sign-in page. Every admin
 * page calls this itself, because a layout is not re-run when the reader
 * moves between the pages inside it.
 */
export async function requireAdmin(): Promise<string> {
  return (await getAdmin()) ?? redirect("/admin/login");
}
