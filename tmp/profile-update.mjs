// Temporary: read the profile fields the client asked to change. Never commit.
//   node --env-file=.env.local tmp/profile-update.mjs
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data, error } = await db
  .from("arinze_profile")
  .select(
    "role, institution, university, lede, bio, affiliations, links, updated_at",
  )
  .eq("id", true)
  .single();
if (error) throw new Error(`arinze_profile: ${error.message}`);

console.log(JSON.stringify(data, null, 2));
