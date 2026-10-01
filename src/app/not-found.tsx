import type { Metadata } from "next";
import Link from "next/link";
import { Note } from "@/components/Note";
import { Shell } from "@/components/Shell";
import { getPosts, getProfile } from "@/lib/content";

export const metadata: Metadata = { title: "Page not found" };

/** 404 for any unmatched address, in the site's own frame. */
export default async function NotFound() {
  const [profile, posts] = await Promise.all([getProfile(), getPosts()]);
  return (
    <Shell profile={profile} hasWriting={posts.length > 0}>
      <Note
        title="There is no page at this address."
        actions={
          <>
            <Link href="/">Front page</Link>
            <Link href="/research">Research</Link>
            {posts.length > 0 && <Link href="/writing">Writing</Link>}
          </>
        }
      >
        <p>The link may be old, or the address mistyped.</p>
      </Note>
    </Shell>
  );
}
