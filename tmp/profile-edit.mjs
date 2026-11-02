// Temporary. Reads the rows the client's edits touch; run with
// node --env-file=.env.local tmp/profile-edit.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: profile, error: readProfile } = await db
  .from("arinze_profile")
  .select("bio, updated_at")
  .single();
if (readProfile) throw readProfile;

const { data: papers, error: readPapers } = await db
  .from("arinze_papers")
  .select("slug, title, section, year, venue, citation, status, selected, pdf, url, doi, links")
  .order("year", { ascending: false });
if (readPapers) throw readPapers;

const flaring = papers.filter((paper) => /gas flaring/i.test(paper.title));

console.log("bio:", JSON.stringify(profile.bio));
console.log("updated_at:", profile.updated_at);
console.log("\nmatching papers:", flaring.length);
console.log(JSON.stringify(flaring, null, 2));
console.log("\nselected on Home today (newest first):");
for (const paper of papers.filter((p) => p.selected))
  console.log(`  ${paper.year}  ${paper.section}  ${paper.slug}`);
console.log("\nall papers:");
for (const paper of papers)
  console.log(`  ${paper.year || "----"}  ${paper.section.padEnd(15)} ${paper.selected ? "*" : " "} ${paper.slug}`);
