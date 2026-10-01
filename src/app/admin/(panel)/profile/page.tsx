import { requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/content";
import { Form } from "../../Form";
import { profile } from "../../schema";

export default async function EditProfile() {
  await requireAdmin();
  const row = await getProfile();
  return (
    <>
      <h1>Profile</h1>
      <p className="intro">{profile.intro}</p>
      <Form
        sheet="profile"
        slug={null}
        groups={profile.groups}
        row={{ ...row }}
        one="profile"
        back="/admin"
      />
    </>
  );
}
