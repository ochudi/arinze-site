# arinze-nwokolo.com

The personal site of Arinze Nwokolo, economist at Lagos Business School.
Next.js pages prerendered from a small Supabase database, with an editor at
`/admin` so he can change anything himself.

## Run it

```
npm install
cp .env.example .env.local   # then fill in the three Supabase values
npm run dev                  # http://localhost:3000, editor at /admin
npm run build && npm start
npm run check                # typecheck, lint, formatting
```

Node 22 or newer.

## How it fits together

```
supabase/schema.sql   the tables; run once in the Supabase SQL editor
supabase/seed.mjs     npm run seed: fills empty tables and the bucket from supabase/seed/
supabase/admin.mjs    npm run admin -- name@example.com: gives someone the editor
src/lib/content.ts    the only reader of the content; pages are built from it
src/lib/site.ts       address, navigation, links and dates shared by pages
src/lib/supabase.ts   the one database client (secret key, server only)
src/lib/auth.ts       who may use /admin
src/proxy.ts          keeps the editor's session fresh; runs on /admin only
src/app/(site)/       the public pages
src/app/admin/        the editor: schema.ts says what can be edited, the rest is generic
                      (Form, Editor for essays, Notices for toasts and dialogs, crossref for DOIs)
src/app/open/         counts a paper being opened (the Readers table in the editor)
src/app/papers/       /papers/<slug>.pdf, a paper's lasting address whatever file is behind it
src/app/llms.txt/     the site as one plain-text page, for AI answer engines
src/lib/card.tsx      the social card (the site's, and one per essay)
src/app/globals.css   the public stylesheet; admin/admin.css is the editor's
src/components/       Shell, PaperEntry, MediaItem, Listen, PostCard, Abstract, Note, NavLink, ErrorNote
src/fonts/            Fraunces instances (OFL), see LICENSE.md there
```

The public pages are static. They are rebuilt the moment something is saved
in the editor (`revalidatePath`), and the pages are re-read once a day, so visitors never
wait on the database and the site stays up if the database is unreachable. The portrait, the CV and
paper PDFs live in a public storage bucket and are served from the site's
own address under `/files/`.

Everything in Supabase is prefixed `arinze_` (tables, the function) or named
`arinze-site` (the bucket), so the project can be shared with other sites.
Row level security is on with no policies: the publishable key can sign an
editor in and nothing else; only the server, with the secret key, reads and
writes.

To add a field: add the column in Supabase, add one entry in
`src/app/admin/schema.ts`, and use it in a component.

## The editor

`/admin`, signed in with an email and password. **Profile** is the
letterhead, the front page, the portrait and the CV. **Papers** is one entry
per paper; a new one can be filled in from its DOI (Crossref). **Media** is
podcasts, interviews and articles (a podcast with an MP3 address plays on
the site). **Writing** is essays, written in a small formatting editor and
stored as Markdown, or a link to a piece published elsewhere; a piece can be
kept as a draft until it is ready, and the Writing page and menu item appear
with the first published one. **Readers**, on the
overview, shows how often each paper has been opened from the site: a count
per paper per day, nothing about the visitor.

Accounts are Supabase Auth users, which the whole Supabase project shares;
the `arinze_admins` table lists the ones who may edit this site.

```
npm run admin -- name@example.com           # new editor; prints a password once
npm run admin -- name@example.com --reset   # a new password for a lost one
```

No email is sent. The editor can change the password on the overview page.

## Deploying (Vercel)

Set the three Supabase variables from `.env.example`, for Production and
Preview, before the first deploy: the build reads the database.

The public address is worked out from the project's production domain at
build time, so after attaching a domain, redeploy once (`NEXT_PUBLIC_SITE_URL`
overrides it). While the site is still on its `.vercel.app` address it tells search
engines to stay away; with a domain of its own it serves `robots.txt`,
`sitemap.xml`, canonical URLs, a social card, an RSS feed and `llms.txt`.

## Addresses that must keep working

- `/cv.pdf` opens whichever CV the profile names.
- The old WordPress CV addresses under `/wp-content/uploads/` redirect to it.
- `/one`, `/two` and `/three`, the concept previews the client saw, redirect
  to the front page.
