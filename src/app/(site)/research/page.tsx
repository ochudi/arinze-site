import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { MediaItem } from "@/components/MediaItem";
import { PaperEntry } from "@/components/PaperEntry";
import { getMedia, getProfile, getResearch } from "@/lib/content";
import { paperHref, person, siteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const [research, profile] = await Promise.all([getResearch(), getProfile()]);
  const [first, ...rest] = research.map((section) => section.heading);
  const kinds = [first, ...rest.map((heading) => heading.toLowerCase())];
  const place = [profile.institution, profile.university]
    .filter(Boolean)
    .join(", ");
  return {
    title: "Research",
    // "Publications, working papers and work in progress by …"
    description: `${kinds.length > 1 ? `${kinds.slice(0, -1).join(", ")} and ${kinds.at(-1)}` : kinds.join("")} by ${[profile.name, profile.role].filter(Boolean).join(", ")}${place ? ` at ${place}` : ""}.`,
    alternates: { canonical: "/research" },
  };
}

export default async function Research() {
  const [research, media, { name }] = await Promise.all([
    getResearch(),
    getMedia(),
    getProfile(),
  ]);
  const articles = research
    .flatMap((section) => section.papers)
    .flatMap((paper) => {
      const href = paperHref(paper);
      if (!href) return [];
      return {
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        headline: paper.title,
        author: [
          person(name),
          ...paper.coauthors.map((c) => ({
            "@type": "Person",
            name: c.name,
            url: c.url ?? undefined,
          })),
        ],
        datePublished: paper.year || undefined,
        // Only a published paper belongs to a journal; a working-paper series is not a periodical.
        isPartOf:
          paper.section === "publications" && paper.venue
            ? { "@type": "Periodical", name: paper.venue }
            : undefined,
        url: new URL(href, siteUrl).href,
        sameAs: paper.doi ? `https://doi.org/${paper.doi}` : undefined,
        abstract: paper.abstract || undefined,
      };
    });
  return (
    <article>
      <h1 className="title">Research</h1>
      {research.map((section) => {
        const compact = section.id === "in-progress";
        return (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id}>{section.heading}</h2>
            <ol className={compact ? "entries compact" : "entries"}>
              {section.papers.map((paper) => (
                <li key={paper.slug}>
                  <PaperEntry paper={paper} compact={compact} />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      {media.length > 0 && (
        <section aria-labelledby="media">
          <h2 id="media">In the media</h2>
          <ol className="entries compact">
            {media.map((item) => (
              <li key={item.slug}>
                <MediaItem item={item} />
              </li>
            ))}
          </ol>
        </section>
      )}
      {articles.length > 0 && <JsonLd data={articles} />}
    </article>
  );
}
