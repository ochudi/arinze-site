// Fills a fresh database and bucket from supabase/seed/. Safe to run again:
// rows and files that already exist are left as they are.
//   npm run seed
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir } from "node:fs/promises";

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);
const seed = new URL("./seed/", import.meta.url);
const content = JSON.parse(await readFile(new URL("content.json", seed)));
const types = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };

const check = ({ error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

const { error: exists } = await db.storage.createBucket("arinze-site", {
  public: true,
  fileSizeLimit: "20MB",
  allowedMimeTypes: [...Object.values(types), "image/webp"],
});
if (exists && !/already exists/i.test(exists.message))
  check({ error: exists }, "bucket");

for (const file of await readdir(new URL("files/", seed), {
  recursive: true,
})) {
  const contentType = types[file.split(".").pop()];
  if (!contentType) continue; // a folder
  const { error } = await db.storage
    .from("arinze-site")
    .upload(file, await readFile(new URL(`files/${file}`, seed)), {
      contentType,
    });
  if (error && !/already exists/i.test(error.message)) check({ error }, file);
  console.log(error ? "kept    " : "uploaded", file);
}

const tables = {
  arinze_profile: [{ id: true, ...content.profile }],
  arinze_papers: content.papers,
  arinze_media: content.media,
  arinze_writing: content.writing,
};
for (const [table, rows] of Object.entries(tables)) {
  if (rows.length === 0) continue;
  const { data, error } = await db
    .from(table)
    .upsert(rows, { ignoreDuplicates: true })
    .select();
  check({ error }, table);
  console.log(
    `${table}: ${data.length} added, ${rows.length - data.length} already there`,
  );
}
