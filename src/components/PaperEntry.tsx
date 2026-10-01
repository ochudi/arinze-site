import { Fragment } from "react";
import type { Paper } from "@/lib/content";
import { paperHref, tie } from "@/lib/site";
import { Abstract } from "./Abstract";

/*
  One entry: the year in a column to the left, the title (linking the PDF,
  the paper's page, or the DOI), then a citation row with the coauthors on
  the left and the journal on the right, extra links, and the abstract as an
  accordion. Compact entries (the front page, work in progress) stop after
  the citation row.
*/
export function PaperEntry({
  paper,
  compact = false,
}: {
  paper: Paper;
  compact?: boolean;
}) {
  const href = paperHref(paper);
  const last = paper.coauthors.length - 1;
  const journal = [paper.venue, paper.citation].filter(Boolean).join(", ");
  const right = journal || paper.status;
  const links = compact ? [] : paper.links.filter((link) => link.url);
  const coauthors = paper.coauthors.length > 0 && (
    <span>
      With{" "}
      {paper.coauthors.map((coauthor, i) => (
        <Fragment key={coauthor.name}>
          {i > 0 && (i === last ? " and " : ", ")}
          {coauthor.url ? (
            <a href={coauthor.url}>{coauthor.name}</a>
          ) : (
            coauthor.name
          )}
        </Fragment>
      ))}
    </span>
  );
  const moreLinks = links.length > 0 && (
    <span className="links">
      {links.map((link, i) => (
        <Fragment key={link.url}>
          {i > 0 && (
            <span className="sep" aria-hidden="true">
              {" · "}
            </span>
          )}
          <a href={link.url!}>{link.label}</a>
        </Fragment>
      ))}
    </span>
  );
  // The row keeps the journal on the right; the left takes the coauthors, or else the links.
  const left = coauthors || moreLinks;
  return (
    <article id={paper.slug} className="paper">
      <p className="year sans">{paper.year}</p>
      <div className="paper-body">
        <h3 className="paper-title">
          {href ? (
            // The ping lets the editor see how often a paper is opened; it sends no visitor data.
            <a href={href} ping={`/open/${paper.slug}`}>
              {tie(paper.title)}
            </a>
          ) : (
            tie(paper.title)
          )}
        </h3>
        {(left || right) && (
          <p className="cite sans">
            {left}
            {right && <span className="venue">{right}</span>}
          </p>
        )}
        {coauthors && moreLinks && <p className="cite sans">{moreLinks}</p>}
        {!compact && paper.abstract && <Abstract>{paper.abstract}</Abstract>}
      </div>
    </article>
  );
}
