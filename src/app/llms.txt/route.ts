import {
  getMedia,
  getPosts,
  getProfile,
  getResearch,
  type Paper,
  type Profile,
} from "@/lib/content";
import { formatDate, letterhead, paperHref, siteUrl } from "@/lib/site";

export const dynamic = "force-static";

const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

// What "I" does in the bio, as it reads after "he". Regular past tenses need
// no entry; a sentence with any other verb is left out until one is added.
const verbs: Record<string, string> = {
  am: "is",
  was: "was",
  have: "has",
  had: "had",
  teach: "teaches",
  taught: "taught",
  work: "works",
  lead: "leads",
  led: "led",
  study: "studies",
};

/** A sentence of the bio told about him, "I teach" -> "He teaches"; null if it cannot be. */
function retell(sentence: string): string | null {
  let known = true;
  const told = sentence
    .replace(/\bI (\w+)/g, (_, verb: string) => {
      const said = verbs[verb] ?? (/[^e]ed$/.test(verb) ? verb : null);
      known &&= said !== null;
      return `he ${said}`;
    })
    .replace(/\b[Mm]y\b/g, "his")
    .replace(/\b[Mm]e\b/g, "him")
    .replace(/\b[Mm]yself\b/g, "himself");
  if (!known || /\b(I|[Mm]ine|[Ww]e|[Oo]urs?|us)\b/.test(told)) return null;
  return told.charAt(0).toUpperCase() + told.slice(1);
}

/*
  The bio in the third person, so nothing here speaks in his voice that he
  did not write: who he is from the letterhead, the bio's first sentence
  quoted as his own description of his work, and the rest retold.
*/
function about(profile: Profile): string {
  const [first, ...rest] = Array.from(sentences.segment(profile.bio), (s) =>
    s.segment.trim(),
  );
  const places = [profile.institution, profile.university].filter(Boolean);
  return [
    profile.role &&
      places.length > 0 &&
      `${profile.name} is ${profile.role} at ${places.join(", ")}.`,
    first && `In his words: “${first}”`,
    ...rest.map(retell),
  ]
    .filter(Boolean)
    .join(" ");
}

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
    about(profile),
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
