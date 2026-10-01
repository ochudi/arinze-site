import Link from "next/link";
import type { PostMeta } from "@/lib/content";
import { formatDate, tie } from "@/lib/site";

/** One piece of writing in a list: title, one-line summary, date and outlet. */
export function PostCard({
  post,
  titleLevel,
}: {
  post: PostMeta;
  /** 2 on the writing index (under its h1), 3 on the front page (under a section h2). */
  titleLevel: 2 | 3;
}) {
  const Title = titleLevel === 2 ? "h2" : "h3";
  return (
    <article>
      <Title className="post-title">
        {post.external ? (
          <a href={post.external}>{tie(post.title)}</a>
        ) : (
          <Link href={`/writing/${post.slug}`}>{tie(post.title)}</Link>
        )}
      </Title>
      {post.summary && <p className="post-summary">{post.summary}</p>}
      <p className="post-date sans">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        {post.outlet && (
          <>
            <span className="sep" aria-hidden="true">
              {" · "}
            </span>
            {post.outlet}
          </>
        )}
      </p>
    </article>
  );
}
