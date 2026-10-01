import {
  getMedia,
  getPosts,
  getProfile,
  getResearch,
  type Paper,
} from "@/lib/content";
import { formatDate, letterhead, paperHref, siteUrl } from "@/lib/site";

export const dynamic = "force-static";

const absolute = (href: string) => new URL(href, siteUrl).href;
const list = (names: string[]) =>
  names.length > 1
    ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
    : names.join("");

function paperLine(paper: Paper): string {
  const href = paperHref(paper);
  const title = href ? `[${paper.title}](${absolute(href)})` : paper.title;
  const facts = [
    paper.coauthors.length > 0 &&
      `With ${list(paper.coauthors.map((c) => c.name))}.`,
    [paper.venue, paper.citation, paper.year].filter(Boolean).join(", ") &&
      `${[paper.venue, paper.citation, paper.year].filter(Boolean).join(", ")}.`,
    paper.abstract,
  ].filter(Boolean);
  return `- ${title}${facts.length > 0 ? `: ${facts.join(" ")}` : ""}`;
}

/** The whole site as one plain-text page, for the language models that answer questions about him. */
export async function GET() {
  const [profile, research, posts, media] = await Promise.all([
    getProfile(),
    getResearch(),
    getPosts(),
    getMedia(),
  ]);
  const section = (heading: string, lines: string[]) =>
    lines.length > 0 ? [`## ${heading}`, lines.join("\n")] : [];
  const text = [
    `# ${profile.name}`,
    `> ${[`${letterhead(profile).join(", ")}.`, profile.lede].filter(Boolean).join(" ")}`,
    profile.bio,
    [
      profile.email && `Email: ${profile.email}`,
      profile.cv && `CV: ${absolute("/cv.pdf")}`,
    ]
      .filter(Boolean)
      .join(" · "),
    ...research.flatMap(({ heading, papers }) =>
      section(heading, papers.map(paperLine)),
    ),
    ...section(
      "Writing",
      posts.map(
        (post) =>
          `- [${post.title}](${post.external ?? absolute(`/writing/${post.slug}`)}), ${formatDate(post.date)}${post.summary ? `: ${post.summary}` : ""}`,
      ),
    ),
    ...section(
      "In the media",
      media.map(
        (item) =>
          `- [${item.title}](${item.url})${item.outlet ? `, ${item.outlet}` : ""}${item.date ? `, ${formatDate(item.date)}` : ""}`,
      ),
    ),
    ...section("Elsewhere", [
      ...profile.affiliations.map((a) =>
        a.url ? `- [${a.name}](${a.url})` : `- ${a.name}`,
      ),
      ...profile.links.flatMap((l) =>
        l.url ? [`- [${l.label}](${l.url})`] : [],
      ),
    ]),
  ]
    .filter(Boolean)
    .join("\n\n");
  return new Response(`${text}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
