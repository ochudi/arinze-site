import type { Row } from "./schema";

/** "https://doi.org/10.1111/x", "doi: 10.1111/x" and a link that contains it are all the identifier 10.1111/x. */
export function bareDoi(text: string): string {
  return text.match(/10\.\d{4,9}\/[^\s?#]+/)?.[0] ?? text.trim();
}

const plain = (marked: string) =>
  marked
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

interface Work {
  type?: string;
  title?: string[];
  "container-title"?: string[];
  author?: { given?: string; family?: string }[];
  issued?: { "date-parts"?: number[][] };
  "published-print"?: { "date-parts"?: number[][] };
  volume?: string;
  issue?: string;
  page?: string;
  abstract?: string;
}

/**
 * A paper's details from its DOI, as Crossref records them, shaped like a
 * row of arinze_papers so a new paper's form opens already filled in. The
 * editor himself is left out of the co-authors.
 */
export async function paperFromDoi(
  text: string,
  me: string,
): Promise<Row | null> {
  const doi = bareDoi(text);
  const found = await fetch(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
    { signal: AbortSignal.timeout(8000) },
  ).catch(() => null);
  if (!found?.ok) return null;
  const work = ((await found.json()) as { message: Work }).message;
  const family = me.split(" ").pop()?.toLowerCase();
  const pages = work.page?.replace("-", "–");
  return {
    doi,
    title: plain(work.title?.[0] ?? ""),
    section:
      work.type === "journal-article" ? "publications" : "working-papers",
    // The year of the printed issue is the one a citation carries; online-first comes earlier.
    year: String(
      (work["published-print"] ?? work.issued)?.["date-parts"]?.[0]?.[0] ?? "",
    ),
    coauthors: (work.author ?? [])
      .filter((author) => author.family?.toLowerCase() !== family)
      .map((author) => ({
        name: [author.given, author.family].filter(Boolean).join(" "),
        url: null,
      })),
    venue: work["container-title"]?.[0] ?? "",
    citation: [
      work.volume && `${work.volume}${work.issue ? `(${work.issue})` : ""}`,
      pages,
    ]
      .filter(Boolean)
      .join(", "),
    // Crossref abstracts come wrapped in JATS tags, often starting with the word itself.
    abstract: plain(work.abstract ?? "").replace(/^Abstract\s+/i, ""),
  };
}
