import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/PostCard";
import { getPosts, getProfile } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { name, role, institution } = await getProfile();
  return {
    title: "Writing",
    description: `Essays by ${[name, role].filter(Boolean).join(", ")}${institution ? ` at ${institution}` : ""}.`,
    alternates: { canonical: "/writing" },
  };
}

export default async function Writing() {
  const posts = await getPosts();
  if (posts.length === 0) notFound();
  return (
    <article>
      <h1 className="title">Writing</h1>
      <ol className="entries">
        {posts.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} titleLevel={2} />
          </li>
        ))}
      </ol>
    </article>
  );
}
