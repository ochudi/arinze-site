import { Mulish } from "next/font/google";
import localFont from "next/font/local";

/*
  Fraunces for display and body, Mulish for metadata.

  Fraunces has a real optical-size axis; at text sizes it is soft and round
  with low contrast, and a little crisper at display sizes, which is the
  difference between a letter's hand and its letterhead. It is self-hosted as
  static instances (fonts/, OFL): text regular and italic at optical size 18,
  a display regular at 36 (page titles, the opening sentence on the front
  page, the not-found note), and a text semibold that only essays use. The
  variable files were 230 and 187 KB and held the first paint back on a slow
  connection; these are about 20 KB each. Every page preloads the regular,
  the italic and the display; the semibold is fetched only where an essay
  needs it.

  Mulish is round and quiet and disappears into the role of metadata, which
  is what a citation line should do. One weight, Google-served.
*/
export const serif = localFont({
  src: [
    {
      path: "./fonts/Fraunces-Text-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Fraunces-Text-Italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const bold = localFont({
  src: "./fonts/Fraunces-Text-SemiBold.woff2",
  weight: "600",
  style: "normal",
  variable: "--font-serif-bold",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  preload: false,
});

export const display = localFont({
  src: "./fonts/Fraunces-Display-Regular.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-display",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const sans = Mulish({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sans",
  display: "swap",
});
