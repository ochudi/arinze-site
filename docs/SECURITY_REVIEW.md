# Security review

25 October 2026, against `main` at 7c810b7 plus the changes listed under FIX.
Run locally with `npm run build` and `PORT=3100 npm start`; database checks
touched only `arinze_` tables and the `arinze-site` bucket. No key value
appears in this report.

**PASS**: checked, no change needed. **FIX**: changed in this review.
**ASK**: needs a decision; a recommendation is given.

## Decisions needed, most urgent first

| ID  | Finding                                                                              | Recommendation                                          |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| D2  | `next` 16.3.6 has a critical advisory set; the fix (16.4.3) is outside the pin       | Bump `next` and `eslint-config-next` to 16.4.3          |
| S6  | `/files/` passes Supabase's headers through, including `x-robots-tag: none` on PDFs  | Serve `/files/` from a route handler with fixed headers |
| C3  | `llms.txt` carries the bio, which is first person                                    | Keep if he wrote the bio; otherwise drop it there       |
| P1  | `/open/[slug]` relies on the foreign key, not a route check, to refuse unknown slugs | Leave as is                                             |
| H2  | No Content-Security-Policy                                                           | Add a static policy in Report-Only first, if wanted     |
| A6  | No app-level limit on sign-in attempts                                               | Accept for now                                          |

## 1. Secrets

**S1 PASS. Env files are ignored and untracked.** `.gitignore:34` ignores
`.env*` and re-includes only `.env.example`, which holds empty placeholders.
No other env file appears in any commit.

**S2 PASS. No key material in the repository or its history.** All tracked
files and every patch of all 4 commits (`git log -p --all --reflog`) were
searched for the secret key's value and its last 12 characters, the
publishable key's value, any `sb_secret_` token and any JWT-shaped string: no
matches. `service_role` occurs only as the role name in the GRANT statements
in `supabase/schema.sql`.

**S3 PASS. The secret key stays on the server.** In the app, only
`src/lib/supabase.ts` reads `SUPABASE_SECRET_KEY`. The two CLI scripts,
`supabase/seed.mjs` and `supabase/admin.mjs`, run locally with
`--env-file` and are not part of the build. `supabase.ts`, `content.ts` and
`auth.ts` import `server-only`, so a client import would fail the build. None
of the nine `"use client"` files imports them; they import only server-action
references and types. `session.ts` uses the publishable key and is imported
only by `proxy.ts` and `auth.ts`. No `NEXT_PUBLIC_` variable carries a
Supabase value.

**S4 PASS. Client bundles are clean.** After the build, the 35 files in
`.next/static` contain no secret key or fragment, no publishable key, no
`sb_secret`, no JWT, no `supabase.co` and no project ref. The served pages (`/`,
`/research`, `/writing`, `/llms.txt`, `/feed.xml`, `/sitemap.xml`,
`/admin/login`, a 404) do not mention Supabase.

**S5 PASS. A leaked publishable key would expose nothing.** With that key,
every `arinze_` table refuses select and update (42501), both functions refuse
execute, and listing the bucket returns nothing.

**S6 ASK. The `/files/` proxy forwards the storage provider's headers.** A
request for any file under `/files/` comes back with the upstream headers
intact:

- `sb-project-ref` names the Supabase project, so the hostname the rewrite
  hides can be derived from it. `server: cloudflare`, `cf-ray` and a
  `set-cookie` for `Domain=supabase.co` (which browsers discard) also name the
  provider.
- `x-robots-tag: none`, which means noindex and nofollow, is sent on the CV,
  the paper PDFs and the portrait. While the site is on `.vercel.app` this
  changes nothing. Once it has a domain, Google and Google Scholar will not
  index the paper PDFs.
- `cache-control: private, no-cache`, so no file is cached at the edge.
- None of the site's own headers (H1) are applied to these responses.

The security risk is low. The project ref is not a secret (S5), and the bucket
accepts only PDF, JPEG, PNG and WebP (A3), so a missing `nosniff` has nothing
to act on. The indexing effect matters more.

Recommendation: replace the rewrite with `src/app/files/[...path]/route.ts`.
It would fetch from the bucket and return the body with a fixed header set:
`content-type`, `content-length`, `etag`, `last-modified` and a public
`cache-control`, without `sb-*`, `set-cookie` or `x-robots-tag`. This was
observed on `next start`; Vercel's proxy may treat upstream headers
differently. Before deciding, check production with
`curl -sI https://<domain>/files/<a paper's file>`.

## 2. Admin surface

**A1 PASS. The proxy and the gate.** `src/proxy.ts` matches `/admin/:path*`,
which covers `/admin` itself and every page under it. The proxy only renews
the session cookie. Access is decided by `requireAdmin()`, which the `(panel)`
layout and every admin page call, so bypassing the proxy would not open the
editor. Signed out, `/admin`, `/admin/profile`, `/admin/papers`,
`/admin/papers/new` and `/admin/nope/x` all answer 307 to `/admin/login`.

**A2 PASS. Every mutating action checks the session first.** `save`,
`remove`, `uploadTarget` and `changePassword` all call `getAdmin()` before any
database or storage call. `getAdmin()` is the check that `requireAdmin()`
wraps; the actions use it so that a signed-out editor gets a message instead
of a redirect that would discard the form (`remove` does redirect). `signIn` is
the sign-in itself, and `signOut` clears only the caller's own cookie. At
runtime, `uploadTarget` and `changePassword` were called signed out with their
real action IDs. Both returned the "signed out" message and created nothing.
`save` and `remove` were not called, to rule out any write. An unknown action
ID gets a 404. A cross-origin call is aborted by Next's origin check, and the
client sees only an error digest.

**A3 PASS. Uploads stay in the bucket's three folders.** `uploadTarget`
accepts only the folders `portrait`, `cv` and `papers` and the extensions
`.pdf`, `.jpg`, `.jpeg`, `.png` and `.webp`. The file name goes through
`plain()`, which turns everything except letters, digits and `_` (including
`/` and `.`) into `-`, and gets a random suffix. The signing client is fixed to
`arinze-site`. When saving, a file field must start with its own folder. The
bucket itself is public, has a 20 MB limit and allows only `application/pdf`,
`image/jpeg`, `image/png` and `image/webp`, so even an editor cannot place HTML
or SVG under `/files/`.

**A4 PASS. The session cookie.** `admin-session` is set with
`httpOnly: true`, `path: "/admin"`, `sameSite: "lax"` and `secure` in
production (`src/lib/session.ts`). `@supabase/ssr` 0.12.7 spreads these over
its own defaults, so they take effect. Confirming this on a live `Set-Cookie`
needs a real sign-in; take one look in the browser's devtools after the next
sign-in on production.

**A5 PASS. Sign-in reveals nothing about accounts.** An unknown email, a wrong
password, and a valid account that is not in `arinze_admins` (which is signed
straight out again) all get the same message: "That email and password do not
match."

**A6 ASK. No app-level limit on sign-in attempts.** Supabase Auth limits
sign-ins per IP. Every attempt reaches Supabase from the server's IP, though,
so an attacker and the editor share that limit: it caps guessing, but someone
could lock the editor out for a while. Passwords must be at least ten
characters. Recommendation: accept for now. If it becomes a problem, add a
rate-limit rule on POST `/admin/login`, using only what the current Vercel plan
includes.

## 3. Public endpoints

**P1 ASK. `/open/[slug]` does not check the slug itself.** Any slug is passed
to `arinze_count_open`, and the database refuses unknown ones:
`arinze_opens.paper` references `arinze_papers(slug)`, so the insert fails
with 23503. A POST with a made-up slug got 204 and left no row. The route
always answers 204, so it does not reveal which slugs exist. The only possible
effect is +1 on a real paper's count for the day. The function is a single
insert into `arinze_opens`, executable only by `service_role`. Anyone can
inflate a count by repeating the request; that is inherent in an anonymous
counter. Recommendation: leave it. A route check would add a database read to
every ping to repeat what the foreign key already enforces. If counts are ever
gamed, cap them per paper per day inside the function.

**P2 PASS. `/cv.pdf` and `/papers/[file]` redirect only into the bucket.**
Both go through `fileRedirect`, whose `Location` is always
`/files/<path>`: a same-origin path, never an absolute URL. The path comes
from a row the editor saved, where it was checked against its folder. `/cv.pdf`
and a real paper's PDF answer 307 to their files; `/papers/nope.pdf` and
`/papers/..%2F..%2Fx.pdf` answer 404.

**P3 PASS. `/files/` cannot be steered out of the bucket.** `%2e%2e`
segments are collapsed before the rewrite, so the path either resolves inside
`/files/` or becomes an ordinary site 404. An encoded `..%2F` reaches storage
as a literal key and 404s. Every probe targeted `arinze-site` paths only.

**P4 PASS. The image optimizer serves local sources only.** There is no
`images` config. `/_next/image` refuses `https://…` and `//…` sources with 400
and serves `/files/portrait/…`.

## 4. Headers

**H1 PASS. The four headers were already in place; no change made.**
`next.config.ts` already sends `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`
and `Permissions-Policy: camera=(), microphone=(), geolocation=()` on
`/:path*`, plus `X-Robots-Tag` while the site is noindex. `curl -sI` shows
them on `/`, `/research`, `/llms.txt`, `/admin/login` and a 404. There is no
`X-Powered-By`. They are missing on `/files/` responses; see S6. HSTS is not
set by the app, and Vercel normally adds it; confirm on production once the
domain is attached.

**H2 ASK. Content-Security-Policy.** Not added. With
`experimental.inlineCss`, the stylesheet arrives as an inline `<style>`, and
the pages also carry inline JSON-LD and Next's inline bootstrap scripts. A
CSP therefore needs either `'unsafe-inline'` or nonces, and nonces force
every page to render on request, which gives up the prerendering.
Recommendation, if wanted: a static policy, sent as
`Content-Security-Policy-Report-Only` first, that still limits where things
load from and who can frame or post:
`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' <podcast audio hosts>; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`.

## 5. Crawling

**C1 PASS. robots.txt.** It disallows `/admin` and `/open/` when the site is
indexable, and everything while it is noindex. The admin layout also sets
`robots: noindex, nofollow`.

**C2 PASS. The sitemap.** It lists `/`, `/research`, and `/writing` with its
internal essays when any exist. It never lists `/admin` or `/open/`.

**C3 ASK. `llms.txt` contains the bio, which is first person.** The bio
appears verbatim ("My research is…", "I teach…"). Nothing else in the file is
in his voice: the line under the name is the letterhead, and the rest is paper
titles, abstracts, media titles and links. Whether this breaks the rule
depends on whether he wrote the bio. It is the same text as on Home, and he
edits it himself. Recommendation: keep it if the bio is his. Otherwise remove
`profile.bio` from `src/app/llms.txt/route.ts` (one line) and let the
letterhead, affiliations and papers stand.

## 6. Dependencies

**D1 FIX. Semver-compatible audit fixes applied.** `npm audit fix` (without
`--force`) moved `zod` from 4.6.5 to 4.6.7 (memory exhaustion; a dev
dependency through `eslint-plugin-react-hooks`) and `source-map-js` from 1.2.1
to 1.2.2 (event-loop denial of service; build time, through `postcss`). Only
`package-lock.json` changed.

**D2 ASK. `next` 16.3.6 is critical.** It falls inside the affected range
(16.0.0–16.4.0) of ten advisories. The fix is 16.4.3, outside the exact pin in
`package.json`. Those that reach this site:

- Image Optimization SSRF and RCE (GHSA-cjq9-62q9-8jv4, GHSA-2464-fhr4-w9xw):
  the portrait goes through `/_next/image`.
- Denial of service through Server Actions (GHSA-p3m5-59mp-jv5r): the
  editor's actions can be reached by anyone.
- Information disclosure in metadata image routes (GHSA-f87g-xv8r-7p7x): the
  site has `opengraph-image` routes.

The `use cache` and Draft Mode advisories do not apply, since the site uses
neither. The cache-poisoning advisories are listed for self-hosted
deployments. Recommendation: bump `next` and `eslint-config-next` together to
16.4.3, read the upgrade notes in `node_modules/next/dist/docs`, then run
check, build and the screenshots.

## 7. Regression

| Check                                       | Result                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `npm run check`                             | PASS: typecheck, lint and format clean                                     |
| `npm run build`                             | PASS: 17 static pages, no warnings                                         |
| Headers (`curl -sI localhost:3100`)         | PASS on pages and the 404; absent on `/files/` (S6)                        |
| `/one`, `/two`, `/three` and their subpaths | PASS: 308 to `/`; `/three/research` to `/research`                         |
| Both `/wp-content/…` CV paths               | PASS: 308 to `/cv.pdf`, then 307 to the current CV                         |
| `/admin` signed out                         | PASS: 307 to `/admin/login`                                                |
| Error output                                | PASS: fixed text only; failed actions return a digest; storage 404 generic |
| Home at 390, 768, 1440                      | PASS: unchanged; no horizontal overflow                                    |

The error pages (`error.tsx`, `global-error.tsx`) show fixed sentences and
never the error's message, stack or digest. The 404 page is the site's own
note.
