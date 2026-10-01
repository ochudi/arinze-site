import { getProfile } from "@/lib/content";
import { SignIn } from "../Account";

export default async function Login() {
  const { name } = await getProfile();
  return (
    <main className="signin">
      <p className="wordmark">{name}</p>
      <h1>Sign in to edit the site</h1>
      <SignIn />
      <p className="hint">
        Lost your password? Whoever looks after the site can issue a new one.
      </p>
    </main>
  );
}
