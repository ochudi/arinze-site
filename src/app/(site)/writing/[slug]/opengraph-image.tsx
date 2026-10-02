import { notFound } from "next/navigation";
import { getPosts, getProfile } from "@/lib/content";
import { card, cardSize } from "@/lib/card";
import { formatDate, letterhead } from "@/lib/site";

type Params = { slug: string };

// Drawn once per essay and kept, so a link preview never waits on it.
export const dynamic = "force-static";

export async function generateStaticParams() {
  return (await getPosts())
    .filter((post) => !post.external)
    .map(({ slug }) => ({ slug }));
}

export async function generateImageMetadata({ params }: { params: Params }) {
  const [posts, { name }] = await Promise.all([getPosts(), getProfile()]);
  const post = posts.find((post) => post.slug === params.slug);
  return [
    {
      id: "card",
      alt: post ? `${post.title}, by ${name}` : name,
      size: cardSize,
      contentType: "image/png",
    },
  ];
}

/** An essay is shared under its own title, with its summary. */
export default async function Image({ params }: { params: Promise<Params> }) {
  const [{ slug }, posts, profile] = await Promise.all([
    params,
    getPosts(),
    getProfile(),
  ]);
  const post = posts.find((post) => post.slug === slug);
  if (!post) notFound();
  return card({
    name: profile.name,
    line: letterhead(profile),
    title: post.title,
    summary: post.summary || formatDate(post.date),
  });
}
