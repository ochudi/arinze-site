import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { Flash } from "../../Notices";
import { collection, type Row } from "../../schema";

export default async function List({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<{ saved?: string; removed?: string }>;
}) {
  const [{ collection: key }, { saved, removed }] = await Promise.all([
    params,
    searchParams,
  ]);
  await requireAdmin();
  const sheet = collection(key);
  if (!sheet) notFound();
  const { data } = await db.from(sheet.table).select();
  // Newest first, then by title: the order the site uses.
  const when = (row: Row) => String(row.date ?? row.year ?? "");
  const rows = ((data ?? []) as Row[]).sort(
    (a, b) =>
      when(b).localeCompare(when(a)) ||
      String(a.title).localeCompare(String(b.title)),
  );
  const savedRow = rows.find((row) => row.slug === saved);
  const lists = sheet.split
    ? Object.entries(sheet.split.headings).map(([value, heading]) => ({
        heading,
        rows: rows.filter((row) => row[sheet.split!.by] === value),
      }))
    : [{ heading: "", rows }];

  return (
    <>
      <div className="top">
        <h1>{sheet.title}</h1>
        <Link href={`/admin/${key}/new`} className="button">
          Add a {sheet.one}
        </Link>
      </div>
      <p className="intro">{sheet.intro}</p>
      {savedRow &&
        (savedRow.draft ? (
          <Flash message="Saved as a draft. It is not on the site yet." />
        ) : (
          <Flash
            message={`Saved. “${savedRow.title}” is on the site.`}
            href={sheet.href(savedRow)}
          />
        ))}
      {removed && <Flash message="Deleted. It is no longer on the site." />}
      {rows.length === 0 && (
        <p className="empty">
          Nothing here yet. “Add a {sheet.one}” starts the first one.
        </p>
      )}
      {lists.map(
        (list) =>
          list.rows.length > 0 && (
            <section key={list.heading}>
              {list.heading && <h2>{list.heading}</h2>}
              <ul className="rows">
                {list.rows.map((row) => (
                  <li key={String(row.slug)}>
                    <Link href={`/admin/${key}/${row.slug}`}>
                      <span className="row-title">{String(row.title)}</span>
                      <span className="row-detail">{sheet.detail(row)}</span>
                      <span className="row-edit" aria-hidden="true">
                        Edit
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
    </>
  );
}
