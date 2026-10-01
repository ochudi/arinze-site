import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/content";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  const page = (path: string) => ({ url: new URL(path, siteUrl).href });
  return [
    page("/"),
    page("/research"),
    ...(posts.length > 0 ? [page("/writing")] : []),
    ...posts
      .filter((post) => !post.external)
      .map((post) => ({
        ...page(`/writing/${post.slug}`),
        lastModified: post.date,
      })),
  ];
}
