import type { Paper, Profile } from "./content";

/* Site-wide constants: address, navigation, footer, dates. */

/*
  The public address: NEXT_PUBLIC_SITE_URL if set, otherwise the production
  domain Vercel reports (its own .vercel.app name until a domain is attached,
  then that domain), otherwise this machine.
*/
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (vercel ? `https://${vercel}` : "http://localhost:3000"),
);

/** Out of search engines when asked (NOINDEX=1) and for as long as the site has no domain of its own. */
export const noindex =
  process.env.NOINDEX === "1" || siteUrl.hostname.endsWith(".vercel.app");

/** Him, in structured data: every page names the same person by the same id. */
export function person(name: string) {
  return {
    "@type": "Person",
    "@id": new URL("#person", siteUrl).href,
    name,
    url: siteUrl.href,
  };
}

/** The research page's sections, in order. */
export const sections = [
  { id: "publications", heading: "Publications" },
  { id: "working-papers", heading: "Working papers" },
  { id: "in-progress", heading: "Work in progress" },
] as const;

/** The line under the name: title, school, university. */
export function letterhead(profile: Profile): string[] {
  return [profile.role, profile.institution, profile.university].filter(
    Boolean,
  );
}

export interface NavItem {
  label: string;
  href: string;
  /** A file or an off-site URL: rendered as a plain <a>. */
  external?: boolean;
}

export function navFor(profile: Profile, hasWriting: boolean): NavItem[] {
  return [
    { label: "Research", href: "/research" },
    ...(hasWriting ? [{ label: "Writing", href: "/writing" }] : []),
    ...(profile.cv ? [{ label: "CV", href: "/cv.pdf", external: true }] : []),
  ];
}

/** Where a stored file (a bucket path such as "papers/x.pdf") is served on this site. */
export function fileHref(path: string): string {
  return `/files/${encodeURI(path)}`;
}

/** Keeps a title's last two words together, so no line ends with one word alone. */
export function tie(title: string): string {
  return title.replace(/ (\S+)$/, "\u00a0$1");
}

/**
 * Where a paper's title leads: its PDF at an address that stays the same
 * when the file is replaced (src/app/papers), else its page, else its DOI.
 */
export function paperHref(paper: Paper): string | null {
  if (paper.pdf) return `/papers/${paper.slug}.pdf`;
  return paper.url ?? (paper.doi ? `https://doi.org/${paper.doi}` : null);
}

/** A stable address (/cv.pdf, /papers/….pdf) answers by pointing at the file it stands for today. */
export function fileRedirect(path: string | null | undefined): Response {
  return path
    ? new Response(null, { status: 307, headers: { Location: fileHref(path) } })
    : new Response("There is no file here.", { status: 404 });
}

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-09-08" -> "8 September 2026". UTC so the day never shifts with the build machine. */
export function formatDate(iso: string): string {
  return longDate.format(new Date(iso));
}
