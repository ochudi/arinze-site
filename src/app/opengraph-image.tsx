import { getProfile } from "@/lib/content";
import { card, cardSize } from "@/lib/card";
import { letterhead } from "@/lib/site";

export async function generateImageMetadata() {
  const profile = await getProfile();
  return [
    {
      id: "card",
      alt: [profile.name, ...letterhead(profile)].join(", "),
      size: cardSize,
      contentType: "image/png",
    },
  ];
}

/** The card a link to the site is shared with: his name, title and school. */
export default async function Image() {
  const profile = await getProfile();
  return card({ name: profile.name, line: letterhead(profile) });
}
