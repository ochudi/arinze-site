import type { Metadata } from "next";
import type { ReactNode } from "react";
import { bold, display, sans, serif } from "@/fonts";
import { getProfile } from "@/lib/content";
import { noindex, siteUrl } from "@/lib/site";
import "./globals.css";

const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

/*
  What search engines and link previews say about the site, in his own
  words: the opening sentence and the first sentence of the bio. Pages add
  their own title and description; the social tags follow from those.
*/
export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const [first] = sentences.segment(profile.bio);
  return {
    metadataBase: siteUrl,
    title: {
      default: [profile.name, profile.institution].filter(Boolean).join(" · "),
      template: `%s · ${profile.name}`,
    },
    description: [profile.lede, first?.segment.trim()]
      .filter(Boolean)
      .join(" "),
    openGraph: { type: "website", siteName: profile.name, locale: "en_GB" },
    twitter: { card: "summary_large_image" },
    robots: noindex ? { index: false, follow: false } : undefined,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-GB"
      className={`${serif.variable} ${bold.variable} ${display.variable} ${sans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
