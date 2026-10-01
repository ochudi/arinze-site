import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/content";
import { db } from "@/lib/supabase";
import { paperFromDoi } from "../../../crossref";
import { Form } from "../../../Form";
import { Flash } from "../../../Notices";
import { collection, type Collection, type Row } from "../../../schema";

/** A new entry's required dates start as today. */
function datesToday(sheet: Collection) {
  const today = new Date().toISOString().slice(0, 10);
  return sheet.groups
    .flatMap((group) => group.fields)
    .filter((field) => field.type === "date" && field.required)
    .map((field) => [field.name, today]);
}

/** Edit one entry, or start a new one at …/new. */
export default async function Edit({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string; slug: string }>;
  searchParams: Promise<{ doi?: string }>;
}) {
  const [{ collection: key, slug }, { doi }] = await Promise.all([
    params,
    searchParams,
  ]);
  await requireAdmin();
  const sheet = collection(key);
  if (!sheet) notFound();
  const isNew = slug === "new";
  // A new paper can start from its DOI: Crossref knows the rest.
  const byDoi = isNew && key === "papers";
  const looked =
    byDoi && doi ? await paperFromDoi(doi, (await getProfile()).name) : null;
  const { data } = isNew
    ? { data: { ...Object.fromEntries(datesToday(sheet)), ...looked } }
    : await db.from(sheet.table).select().eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const row = data as Row;

  return (
    <>
      <p className="crumb">
        <Link href={`/admin/${key}`}>{sheet.title}</Link>
      </p>
      <h1>{isNew ? `A new ${sheet.one}` : String(row.title)}</h1>
      {byDoi && (
        <form className="lookup inline">
          <div className="field">
            <label htmlFor="doi">Already published? Paste its DOI</label>
            <input
              id="doi"
              name="doi"
              defaultValue={doi}
              placeholder="10.1111/ajps.12769"
              autoCapitalize="none"
              aria-invalid={doi && !looked ? true : undefined}
              aria-describedby={doi && !looked ? "doi-note" : undefined}
              required
            />
            {doi && !looked && (
              <span className="error" id="doi-note">
                No paper found for this DOI. Check it, or fill in the form
                below.
              </span>
            )}
          </div>
          <button className="button plain">Fill in the details</button>
          {looked && (
            <Flash
              message="Filled in from the DOI. Check the details, then add the paper."
              keep
            />
          )}
        </form>
      )}
      <Form
        // A form filled from a DOI is a fresh form.
        key={looked ? doi : undefined}
        sheet={key}
        slug={isNew ? null : slug}
        groups={sheet.groups}
        row={row}
        one={sheet.one}
        back={`/admin/${key}`}
      />
    </>
  );
}
