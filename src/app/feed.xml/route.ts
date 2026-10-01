import { getPosts, getProfile } from "@/lib/content";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

const escape = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** RSS for the writing. */
export async function GET() {
  const [profile, posts] = await Promise.all([getProfile(), getPosts()]);
  const items = posts
    .map((post) => {
      const link =
        post.external ?? new URL(`/writing/${post.slug}`, siteUrl).href;
      return `<item><title>${escape(post.title)}</title><link>${escape(link)}</link><guid>${escape(link)}</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate>${post.summary ? `<description>${escape(post.summary)}</description>` : ""}</item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escape(profile.name)}: writing</title><link>${escape(siteUrl.href)}</link><description>${escape(`Writing by ${profile.name}`)}</description><language>en-gb</language>${items}</channel></rss>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
