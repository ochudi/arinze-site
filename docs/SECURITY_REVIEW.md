# Security review

25 October 2026, against `main` at 7c810b7. Decisions taken the same day are
recorded under each finding, and the fixes they led to were verified the
same way as the review: `npm run build` and `PORT=3100 npm start`. Database
checks touched only `arinze_` tables and the `arinze-site` bucket. No key
value appears in this report.

**PASS**: checked, no change needed. **FIX**: changed. **ASK**: needed a
decision; the decision is recorded.

## Decisions

| ID  | Finding                                                                              | Decision                                            |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| D2  | `next` 16.3.6 had a critical advisory set; the fix was outside the pin               | FIX: upgraded to 16.4.3                             |
| S6  | `/files/` passed Supabase's headers through, including `x-robots-tag: none` on PDFs  | FIX: served by a route handler with fixed headers   |
| C3  | `llms.txt` carried the bio, which is first person                                    | FIX: told in the third person, his sentence quoted  |
| P1  | `/open/[slug]` relies on the foreign key, not a route check, to refuse unknown slugs | Left as is                                          |
| H2  | No Content-Security-Policy                                                           | Skipped for now; the policy below is kept for later |
| A6  | No app-level limit on sign-in attempts                                               | Accepted                                            |

## 1. Secrets

**S1 PASS. Env files are ignored and untracked.** `.gitignore:34` ignores
`.env*` and re-includes only `.env.example`, which holds empty placeholders.
No other env file appears in any commit.

**S2 PASS. No key material in the repository or its history.** All tracked
files and every patch of all 5 commits (`git log -p --all --reflog`, through
6cae35c) were searched for the secret key's value and its last 12
characters, the publishable key's value, any `sb_secret_` token and any
JWT-shaped string: no matches. `service_role` occurs only as the role name in
the GRANT statements in `supabase/schema.sql` and in this report. 6cae35c also
committed `tmp/profile-update.mjs`, a temporary script; it names the
environment variables and holds no key.

**S3 PASS. The secret key stays on the server.** In the app, only
`src/lib/supabase.ts` reads `SUPABASE_SECRET_KEY`. The two CLI scripts,
`supabase/seed.mjs` and `supabase/admin.mjs`, run locally with `--env-file`
and are not part of the build. `supabase.ts`, `content.ts` and `auth.ts`
import `server-only`, so a client import would fail the build. None of the
nine `"use client"` files imports them; they import only server-action
references and types. `session.ts` uses the publishable key and is imported
only by `proxy.ts` and `auth.ts`. No `NEXT_PUBLIC_` variable carries a
Supabase value.

**S4 PASS. Client bundles are clean.** After the build, before and after the
Next upgrade, the files in `.next/static` contain no secret key or fragment,
no publishable key, no `sb_secret`, no JWT, no `supabase.co` and no project
ref. The served pages (`/`, `/research`, `/writing`, `/llms.txt`,
`/feed.xml`, `/sitemap.xml`, `/admin/login`, a 404) do not mention Supabase.

**S5 PASS. A leaked publishable key would expose nothing.** With that key,
every `arinze_` table refuses select and update (42501), both functions refuse
execute, and listing the bucket returns nothing.

**S6 FIX. `/files/` no longer passes on the storage provider's headers.**
The rewrite to the bucket returned the upstream headers as they were:
`sb-project-ref` (which names the Supabase project, and so the hostname the
rewrite was meant to hide), `server: cloudflare`, `cf-ray`, a `set-cookie` for
`Domain=supabase.co`, `cache-control: private, no-cache`, and
`x-robots-tag: none`. That last one means noindex and nofollow, and it would
have kept every paper PDF out of Google and Google Scholar once the site had
its own domain. The site's own headers were not applied either.

The rewrite is gone. `src/app/files/[...path]/route.ts` now fetches the file
from the bucket server-side and streams the body with a fixed header set:

- `Content-Type`, from the extension; only pdf, jpg, jpeg, png and webp are
  served, matching the bucket's allowlist
- `Content-Length`, the body's own size (fetched uncompressed so the two
  agree)
- `Content-Disposition: inline`
- `Cache-Control: public, max-age=3600`
- `X-Content-Type-Options: nosniff`

The site-wide headers (H1) are added as on every route. No upstream header
passes through. A `.` or `..` path part is refused, and every part is
percent-encoded on its own, so no path can leave `arinze-site`. Missing files
get a plain 404, and a storage failure gets a 502 so crawlers retry rather
than drop the PDF. GET and HEAD are both served; other methods get 405. The URL
shape is unchanged: `/cv.pdf`, `/papers/<slug>.pdf`, the portrait and the
editor all use `/files/<path>` as before.

Verified with `curl -sI` and GET on the portrait and the World Bank paper: 200,
the headers above and nothing else, and body sizes equal to `Content-Length`.
No `sb-*`, `set-cookie`, `server`, `cf-*` or `x-robots-tag`.

Two notes for production:

- While the site is on its `.vercel.app` address, the site-wide
  `X-Robots-Tag: noindex, nofollow` covers `/files/` too, by design. It
  disappears with the rest once the domain is attached.
- `max-age` is a browser cache. Vercel's CDN caches on `s-maxage`, so each
  first view runs the function. That is fine at this site's traffic.

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

**A6 ASK, accepted. No app-level limit on sign-in attempts.** Supabase Auth
limits sign-ins per IP. Every attempt reaches Supabase from the server's IP,
though, so an attacker and the editor share that limit: it caps guessing, but
someone could lock the editor out for a while. Passwords must be at least ten
characters. Decision: accept as is. If it ever becomes a problem, add a
rate-limit rule on POST `/admin/login`, using only what the current Vercel plan
includes.

## 3. Public endpoints

**P1 ASK, left as is. `/open/[slug]` does not check the slug itself.** Any
slug is passed to `arinze_count_open`, and the database refuses unknown ones:
`arinze_opens.paper` references `arinze_papers(slug)`, so the insert fails
with 23503. A POST with a made-up slug got 204 and left no row. The route
always answers 204, so it does not reveal which slugs exist. The only possible
effect is +1 on a real paper's count for the day. The function is a single
insert into `arinze_opens`, executable only by `service_role`. Anyone can
inflate a count by repeating the request; that is inherent in an anonymous
counter. A route check would add a database read to every ping to repeat what
the foreign key already enforces. If counts are ever gamed, cap them per paper
per day inside the function.

**P2 PASS. `/cv.pdf` and `/papers/[file]` redirect only into the bucket.**
Both go through `fileRedirect`, whose `Location` is always `/files/<path>`: a
same-origin path, never an absolute URL. The path comes from a row the editor
saved, where it was checked against its folder. `/cv.pdf` and a real paper's
PDF answer 307 to their files; `/papers/nope.pdf` and
`/papers/..%2F..%2Fx.pdf` answer 404.

**P3 PASS. `/files/` cannot be steered out of the bucket.** This was checked
against both the old rewrite and the new route handler. `%2e%2e` segments are
collapsed by Next before routing, so they either resolve inside `/files/` or
become an ordinary site 404. In the route handler, a `.` or `..` part is
refused. `/`, `?` and `#` that arrive encoded inside a part stay encoded, so
storage sees them as a literal key name and 404s. Every probe targeted
`arinze-site` paths only.

**P4 PASS. The image optimizer serves local sources only.** There is no
`images` config. `/_next/image` refuses `https://…` and `//…` sources with 400,
and serves the portrait from `/files/portrait/…`.

## 4. Headers

**H1 PASS. The four headers were already in place.** `next.config.ts` sends
`X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`
and `Permissions-Policy: camera=(), microphone=(), geolocation=()` on
`/:path*`, plus `X-Robots-Tag` while the site is noindex. `curl -sI` shows
them on `/`, `/research`, `/llms.txt`, `/admin/login`, a 404 and, since S6,
`/files/`. There is no `X-Powered-By`. HSTS is not set by the app, and Vercel
normally adds it; confirm on production once the domain is attached.

**H2 ASK, skipped for now. Content-Security-Policy.** Not added. With
`experimental.inlineCss`, the stylesheet arrives as an inline `<style>`, and
the pages also carry inline JSON-LD and Next's inline bootstrap scripts. A CSP
therefore needs either `'unsafe-inline'` or nonces, and nonces force every page
to render on request, which gives up the prerendering. For later: a static
policy, sent as `Content-Security-Policy-Report-Only` first, that still limits
where things load from and who can frame or post:
`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' <podcast audio hosts>; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`.

## 5. Crawling

**C1 PASS. robots.txt.** It disallows `/admin` and `/open/` when the site is
indexable, and everything while it is noindex. The admin layout also sets
`robots: noindex, nofollow`.

**C2 PASS. The sitemap.** It lists `/`, `/research`, and `/writing` with its
internal essays when any exist. It never lists `/admin` or `/open/`.

**C3 FIX. `llms.txt` no longer speaks in his voice.** It used to carry the
bio verbatim, in the first person. `src/app/llms.txt/route.ts` now tells it
in the third person, from the profile, so it follows his edits:

- "Arinze Nwokolo is Assistant Professor at Lagos Business School,
  Pan-Atlantic University.", from the letterhead fields.
- The bio's first sentence, his own description of his research, quoted
  verbatim: In his words: "My research investigates…".
- The remaining sentences retold: "I was" becomes "he was", "my" becomes
  "his", "I teach" becomes "He teaches".

A sentence the retelling cannot turn cleanly (a verb after "I" that it does
not know, "I'm", "we") is left out rather than shown in the first person or in
broken grammar. Add the verb to the list in the route when the bio gains one.
Verified: outside the quoted sentence, the served file has no first-person
word.

## 6. Dependencies

**D1 FIX. Semver-compatible audit fixes applied.** `npm audit fix` (without
`--force`) moved `zod` from 4.6.5 to 4.6.7 (memory exhaustion; a dev
dependency through `eslint-plugin-react-hooks`) and `source-map-js` from 1.2.1
to 1.2.2 (event-loop denial of service; build time, through `postcss`).

**D2 FIX. `next` upgraded from 16.3.6 to 16.4.3.** 16.3.6 fell inside the
affected range (16.0.0–16.4.0) of ten advisories, three of which reached this
site:

- Image Optimization SSRF and RCE (GHSA-cjq9-62q9-8jv4, GHSA-2464-fhr4-w9xw):
  the portrait goes through `/_next/image`.
- Denial of service through Server Actions (GHSA-p3m5-59mp-jv5r): the
  editor's actions can be reached by anyone.
- Information disclosure in metadata image routes (GHSA-f87g-xv8r-7p7x): the
  site has `opengraph-image` routes.

`next` and `eslint-config-next` are both pinned at 16.4.3 in `package.json`.
`npm audit` now reports 0 vulnerabilities.

## 7. Regression

Run after all the changes above, with the updated profile in the database.

| Check                                       | Result                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `npm run check`                             | PASS: typecheck, lint and format clean                                     |
| `npm run build` (Next 16.4.3)               | PASS: 17 static pages; `/files/[...path]` on demand                        |
| Headers (`curl -sI localhost:3100`)         | PASS on pages, the 404 and `/files/`                                       |
| `/files/` portrait and a paper PDF          | PASS: 200 with the fixed header set, no upstream headers (S6)              |
| `/files/` missing, other types, traversal   | PASS: 404; POST 405                                                        |
| `/one`, `/two`, `/three` and their subpaths | PASS: 308 to `/`; `/three/research` to `/research`                         |
| Both `/wp-content/…` CV paths               | PASS: 308 to `/cv.pdf`, 307 to the CV, 200 `application/pdf`               |
| `/admin` signed out                         | PASS: 307 to `/admin/login`                                                |
| Error output                                | PASS: fixed text only; failed actions return a digest; `/files/` 404 plain |
| Home at 390, 768, 1440                      | PASS: layout unchanged, portrait loads, no horizontal overflow             |

The error pages (`error.tsx`, `global-error.tsx`) show fixed sentences and
never the error's message, stack or digest. The 404 page is the site's own
note.
