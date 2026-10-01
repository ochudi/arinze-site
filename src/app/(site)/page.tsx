import type { Metadata } from "next";
import { getImageProps } from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { JsonLd } from "@/components/JsonLd";
import { PaperEntry } from "@/components/PaperEntry";
import { PostCard } from "@/components/PostCard";
import { getPosts, getProfile, getSelectedPapers } from "@/lib/content";
import { fileHref, person, siteUrl } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/*
  The front page opens like a letter: one sentence set large, in his voice,
  with the small portrait beside it, then the paragraph, then selected work
  and the latest writing.
*/
export default async function Home() {
  const [profile, selected, posts] = await Promise.all([
    getProfile(),
    getSelectedPapers(),
    getPosts(),
  ]);
  const latest = posts.slice(0, 2);
  const site = siteUrl.href;
  // One graph: the site, this page as his profile page, and the person every other page points back to.
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${site}#site`,
        url: site,
        name: profile.name,
      },
      {
        "@type": "ProfilePage",
        "@id": site,
        url: site,
        name: profile.name,
        isPartOf: { "@id": `${site}#site` },
        mainEntity: { "@id": person(profile.name)["@id"] },
      },
      {
        ...person(profile.name),
        jobTitle: profile.role || undefined,
        description: profile.lede || undefined,
        email: profile.email ? `mailto:${profile.email}` : undefined,
        image: profile.portrait
          ? new URL(fileHref(profile.portrait), siteUrl).href
          : undefined,
        worksFor: profile.institution
          ? {
              "@type": "EducationalOrganization",
              name: profile.institution,
              parentOrganization: profile.university
                ? { "@type": "CollegeOrUniversity", name: profile.university }
                : undefined,
            }
          : undefined,
        // His own profiles are him; the networks he belongs to are organisations.
        sameAs: profile.links.flatMap((link) => (link.url ? [link.url] : [])),
        memberOf: profile.affiliations.map((affiliation) => ({
          "@type": "Organization",
          name: affiliation.name,
          url: affiliation.url ?? undefined,
        })),
      },
    ],
  };
  // A plain <img> with next/image's sizing and optimised sources, so no image script ships with the page.
  const portrait =
    profile.portrait &&
    getImageProps({
      src: fileHref(profile.portrait),
      alt: `Portrait of ${profile.name}`,
      width: 88,
      height: 110,
      loading: "eager",
    }).props;
  return (
    <div className="home">
      <h1 className="sr-only">{profile.name}</h1>
      {portrait && (
        <div className="portrait">
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img {...portrait} />
        </div>
      )}
      {profile.lede && <p className="lede">{profile.lede}</p>}
      {profile.bio && <p className="bio">{profile.bio}</p>}
      {profile.email && (
        <p className="bio">
          You can reach me at{" "}
          <a href={`mailto:${profile.email}`}>{profile.email}</a>.
        </p>
      )}
      {profile.affiliations.length > 0 && (
        <p className="affil sans">
          {profile.affiliations.map((affiliation, i) => (
            <Fragment key={affiliation.name}>
              {i > 0 && (
                <span className="sep" aria-hidden="true">
                  {" · "}
                </span>
              )}
              <span className="affil-item">
                {affiliation.url ? (
                  <a href={affiliation.url} className="quiet">
                    {affiliation.name}
                  </a>
                ) : (
                  affiliation.name
                )}
              </span>
            </Fragment>
          ))}
        </p>
      )}

      {selected.length > 0 && (
        <section aria-labelledby="selected">
          <h2 id="selected">Selected work</h2>
          <ol className="entries">
            {selected.map((paper) => (
              <li key={paper.slug}>
                <PaperEntry paper={paper} compact />
              </li>
            ))}
          </ol>
          <p className="more">
            <Link href="/research">All research</Link>
          </p>
        </section>
      )}

      {latest.length > 0 && (
        <section aria-labelledby="latest">
          <h2 id="latest">Latest writing</h2>
          <ol className="entries">
            {latest.map((post) => (
              <li key={post.slug}>
                <PostCard post={post} titleLevel={3} />
              </li>
            ))}
          </ol>
          <p className="more">
            <Link href="/writing">All writing</Link>
          </p>
        </section>
      )}
      <JsonLd data={graph} />
    </div>
  );
}
