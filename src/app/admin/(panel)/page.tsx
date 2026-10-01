import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getMedia, getPapers, getPosts } from "@/lib/content";
import { db } from "@/lib/supabase";
import { Password } from "../Account";
import { Flash } from "../Notices";

const count = (n: number, one: string, many: string) =>
  n === 0 ? `No ${many} yet` : `${n} ${n === 1 ? one : many}`;

/** Opens per paper, all time and over the last thirty days, most read first. */
async function getReaders() {
  const [papers, { data }] = await Promise.all([
    getPapers(),
    db.rpc("arinze_readers"),
  ]);
  const title = new Map(papers.map((paper) => [paper.slug, paper.title]));
  return ((data ?? []) as { paper: string; total: number; recent: number }[])
    .map((row) => ({ ...row, title: title.get(row.paper) ?? row.paper }))
    .sort((a, b) => b.total - a.total);
}

export default async function Overview({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const [{ saved }, papers, media, posts, readers] = await Promise.all([
    searchParams,
    getPapers(),
    getMedia(),
    getPosts(),
    getReaders(),
  ]);

  const cards = [
    {
      href: "/admin/profile",
      title: "Profile",
      text: "Your title, bio, portrait, email, CV and affiliations",
    },
    {
      href: "/admin/papers",
      title: "Papers",
      text: count(papers.length, "paper", "papers"),
    },
    {
      href: "/admin/media",
      title: "Media",
      text: count(media.length, "mention", "mentions"),
    },
    {
      href: "/admin/writing",
      title: "Writing",
      text: count(posts.length, "piece", "pieces"),
    },
  ];

  return (
    <>
      <h1>Your site</h1>
      <p className="intro">
        Choose what you would like to change. Whatever you save is on the site a
        few seconds later.
      </p>
      {saved && (
        <Flash message="Saved. Your profile is on the site." href="/" />
      )}
      <ul className="cards">
        {cards.map((card) => (
          <li key={card.href}>
            <Link href={card.href} className="card">
              <h2>{card.title}</h2>
              <p>{card.text}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="readers">
        <h2 id="readers">Readers</h2>
        {readers.length === 0 ? (
          <p className="hint">
            No paper has been opened from the site yet. Each time a visitor
            opens one, it is counted here.
          </p>
        ) : (
          <>
            <table className="readers">
              <thead>
                <tr>
                  <th scope="col">Paper</th>
                  <th scope="col" className="n">
                    Last 30 days
                  </th>
                  <th scope="col" className="n">
                    All time
                  </th>
                </tr>
              </thead>
              <tbody>
                {readers.map((paper) => (
                  <tr key={paper.paper}>
                    <th scope="row">{paper.title}</th>
                    <td className="n">{paper.recent}</td>
                    <td className="n">{paper.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint">
              How often each paper was opened from this site, give or take: a
              few browsers do not report it. Nothing about the visitors
              themselves is recorded.
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="password">
        <h2 id="password">Password</h2>
        <Password />
      </section>
    </>
  );
}
