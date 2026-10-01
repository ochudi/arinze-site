import "server-only";
import { createClient } from "@supabase/supabase-js";

/*
  The one database client. It carries the secret key, so it only ever runs on
  the server; row level security keeps every other key out of the arinze_
  tables (supabase/schema.sql).
*/
export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** The public bucket that holds the portrait, the CV and the paper PDFs; the site serves it at /files/. */
export const files = db.storage.from("arinze-site");
