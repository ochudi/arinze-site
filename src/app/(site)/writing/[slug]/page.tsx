import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { getPost, getPosts, getProfile } from "@/lib/content";
import { formatDate, person, siteUrl } from "@/lib/site";

type Params = Promise<{ slug: string }>;

/** Pieces that exist at build time; one added later in the admin is rendered on its first visit. */
export async function generateStaticParams() {
  return (await getPosts())
    .filter((post) => !post.external)
    .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const [post, { name }] = await Promise.all([
    getPost((await params).slug),
    getProfile(),
  ]);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary || undefined,
    alternates: { canonical: `/writing/${post.slug}` },
    // A page's openGraph replaces the site's, so the site's name and locale are restated.
    openGraph: {
      type: "article",
      siteName: name,
      locale: "en_GB",
      publishedTime: post.date,
      authors: [name],
    },
  };
}

export default async function Post({ params }: { params: Params }) {
  const [post, { name }] = await Promise.all([
    getPost((await params).slug),
    getProfile(),
  ]);
  if (!post || post.external) notFound();
  const { Content } = post;
  const url = new URL(`/writing/${post.slug}`, siteUrl).href;
  const posting = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary || undefined,
    datePublished: post.date,
    author: person(name),
    url,
    mainEntityOfPage: url,
  };
  return (
    <article>
      <header className="essay-head">
        <h1 className="title">{post.title}</h1>
        <p className="essay-meta sans">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </p>
      </header>
      <div className="prose">
        <Content />
      </div>
      <JsonLd data={posting} />
    </article>
  );
}
