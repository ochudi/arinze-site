Personal academic site for Arinze Nwokolo, economist at Lagos Business School, Pan-Atlantic University. Launch-ready; the README explains how to run, edit and deploy it.

WHAT IT IS: one theme (the "letter": warm paper, one olive accent, Fraunces and Mulish), Next.js 16 App Router. Content lives in Supabase Postgres (tables prefixed arinze_, schema in supabase/schema.sql, seed in supabase/seed/) and files in the public bucket arinze-site, served at /files/. The public pages are prerendered and revalidated when the editor saves. src/lib/content.ts is the only reader; src/lib/supabase.ts the only database client (secret key, server only). The editor is at /admin (since 2026-10-01; Keystatic and the content/ files are archived in ../archive/keystatic-2026-10-01).

THE EDITOR: /admin, email and password (Supabase Auth; arinze_admins is the allowlist, by account, because the Supabase project is shared with Chudi's other client sites). src/app/admin/schema.ts describes every editable field; Form.tsx, actions.ts and the pages are generic over it. Notices.tsx is how it speaks (toasts and a native dialog; never window.confirm or inline banners), Editor.tsx is the essay editor (Tiptap, stored as Markdown), crossref.ts fills a new paper from its DOI. Essays can be drafts. Overview shows Readers: opens per paper, counted by the title link's ping attribute hitting /open/[slug]; a count per paper per day, no visitor data. That is the one exception to "no analytics", asked for by the client and approved by Chudi.

IA: every page carries the letterhead (name, title and school under it, the one olive rule, menu on the right). Home: one opening sentence set large with the small monochrome portrait beside it, the bio, email, affiliations, selected work (three, compact). Research: Publications, Working papers, Work in progress (compact), then In the media (compact; podcasts play from a "Listen" word); each entry: year left, title linking PDF or paper page or DOI, "With X and Y", journal right, extra links, abstract accordion. Writing (index and essay pages; hidden from the nav until a piece exists). CV in the nav at /cv.pdf, which redirects to whatever file the profile names; a paper's PDF is linked as /papers/<slug>.pdf, which does the same. Footer: email, Google Scholar, LinkedIn, "Updated <date>", © year.

SEARCH AND SHARING: titles, descriptions and the social card are derived from the profile (lede, bio, letterhead), never written separately. JSON-LD: WebSite + ProfilePage + Person on Home, ScholarlyArticle on Research, BlogPosting on essays. /llms.txt, /feed.xml, /sitemap.xml, /robots.txt. The site address comes from Vercel's production domain; while that is a .vercel.app name the site is noindex.

LAYOUT DECISION (2026-10-01, with Opus): the centred 60ch column stays on desktop; large screens get larger type (from 80rem), running text keeps to about 70 characters, the year hangs in the margin from 60rem. No sidebar, no off-centre column, no card behind the text.

CLIENT TASTE: hates vanity; reference emanuelecolonnelli.com; rejected ochudi.com as "too much". Document first, website second. Decisions from his review: no name heading on Home; year left, journal right; "With X and Y"; abstract as accordion; LinkedIn is the only social link (Google Scholar kept as academic, his call to confirm).

FACTS: every fact on the site was verified on 2026-09-29 against his CVs (2021, 2022), his CEPR, NOVAFRICA, J-PAL, IGC and LBS pages, Crossref and OpenAlex. Nothing is invented; anything unverifiable was left out. He edits what he wants himself.

RULES
- Never run git commit or push. Chudi commits.
- No paid services; no analytics beyond the per-paper open count.
- Supabase keys live only in .env.local and in Vercel. Never write them into a tracked file, a command, or a prompt to another agent.
- The Supabase project is shared: touch only arinze_ tables and the arinze-site bucket; never list or read anything else in it.
- Facts change in the editor (or supabase/seed/ for a fresh database); expression only in src/.
- Every visual change: screenshot 390/768/1440 and self-check before calling it done.
- Motion on the public site stays at the underline draw on Home, the abstract accordion and the chevron; every other hover is a 150ms colour change. The editor adds only the toast and dialog easing in.
- No dark mode; no photo beyond the one small monochrome portrait.
- Legacy addresses that must keep working: /cv.pdf, the two old WordPress CV paths, /one /two /three.
- A schema change needs Chudi to paste SQL into the Supabase SQL editor (the keys cannot run DDL); keep supabase/schema.sql as the full current schema.

../archive/ holds the two rejected concepts, the multi-theme plumbing, the Keystatic setup and the original portrait files; it can be deleted.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
