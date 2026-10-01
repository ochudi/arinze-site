import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { getPosts, getProfile } from "@/lib/content";

// Saving in the editor rebuilds everything at once; the pages also re-read
// the database once a day, so a change made directly in Supabase shows up too.
export const revalidate = 86400;

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [profile, posts] = await Promise.all([getProfile(), getPosts()]);
  return (
    <Shell profile={profile} hasWriting={posts.length > 0}>
      {posts.length > 0 && (
        // React lifts this into the head; feed readers find the writing from any page.
        <link
          rel="alternate"
          type="application/rss+xml"
          href="/feed.xml"
          title={`${profile.name}: writing`}
        />
      )}
      {children}
    </Shell>
  );
}
