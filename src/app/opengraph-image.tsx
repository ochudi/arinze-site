import { getProfile } from "@/lib/content";
import { card, cardSize } from "@/lib/card";
import { letterhead } from "@/lib/site";

export async function generateImageMetadata() {
  const { name, lede } = await getProfile();
  return [
    {
      id: "card",
      alt: [name, lede].filter(Boolean).join(". "),
      size: cardSize,
      contentType: "image/png",
    },
  ];
}

/** The card a link to the site is shared with: the letterhead and his opening sentence. */
export default async function Image() {
  const profile = await getProfile();
  const line = letterhead(profile).join(", ");
  return card({
    name: profile.name,
    line: profile.lede ? line : "",
    body: profile.lede || line,
  });
}
