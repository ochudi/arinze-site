// Gives someone the keys to /admin.
//   npm run admin -- name@example.com           a new editor, with a fresh password
//   npm run admin -- name@example.com --reset   a new password for an editor who lost theirs
// The password is printed once; pass it on and ask them to change it after signing in.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const email = process.argv[2]?.toLowerCase();
if (!email?.includes("@")) {
  console.error("Usage: npm run admin -- name@example.com");
  process.exit(1);
}

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);
const password = randomBytes(12).toString("base64url");

// No email is sent: the account is created already confirmed.
const created = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
let user = created.data.user;
let note = `Password: ${password}`;
if (created.error) {
  // The address already has an account on this Supabase project, perhaps from
  // another site. Asking for a recovery link finds it; nothing is emailed.
  const found = await db.auth.admin.generateLink({ type: "recovery", email });
  if (found.error) throw new Error(created.error.message);
  user = found.data.user;
  if (process.argv.includes("--reset")) {
    const reset = await db.auth.admin.updateUserById(user.id, { password });
    if (reset.error) throw new Error(reset.error.message);
  } else {
    note =
      "This address already has an account here: its existing password works. Add --reset to issue a new one.";
  }
}

const { error } = await db
  .from("arinze_admins")
  .upsert({ user_id: user.id, email });
if (error) throw new Error(error.message);

console.log(`${email} can sign in at /admin\n${note}`);
