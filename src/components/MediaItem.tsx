import type { MediaItem as Item } from "@/lib/content";
import { formatDate, tie } from "@/lib/site";
import { Listen } from "./Listen";

/** One appearance elsewhere: title, then outlet, kind and date; a podcast can be played here. */
export function MediaItem({ item }: { item: Item }) {
  const where = [item.outlet, item.kind].filter(Boolean).join(" ");
  return (
    <article>
      <h3 className="post-title">
        <a href={item.url}>{tie(item.title)}</a>
      </h3>
      <p className="post-date sans">
        {where}
        {item.date && (
          <>
            {where && (
              <span className="sep" aria-hidden="true">
                {" · "}
              </span>
            )}
            <time dateTime={item.date}>{formatDate(item.date)}</time>
          </>
        )}
      </p>
      {item.audio && <Listen src={item.audio} title={item.title} />}
    </article>
  );
}
