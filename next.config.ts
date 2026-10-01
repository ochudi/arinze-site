import type { NextConfig } from "next";
import { noindex } from "./src/lib/site";

/*
  The portrait, the CV and the paper PDFs live in a public Supabase bucket
  and are served from this site's own address at /files/…, so no page or
  link ever names the storage provider. /cv.pdf (src/app/cv.pdf) is the
  stable CV address; the old WordPress paths and the concept previews the
  client saw redirect to it.
*/
const bucket = `${process.env.SUPABASE_URL}/storage/v1/object/public/arinze-site`;

const nextConfig: NextConfig = {
  // Pinned because a stray package-lock.json in the home folder makes Turbopack guess the wrong root.
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  // The whole site's CSS is a few kilobytes; inlining it removes the one render-blocking request.
  experimental: { inlineCss: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(noindex
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/wp-content/uploads/2022/10/CV_Arinze_Nwokolo_October2022.pdf",
        destination: "/cv.pdf",
        permanent: true,
      },
      {
        source: "/wp-content/uploads/2021/05/Arinze_Nwokolo_cv_latest.pdf",
        destination: "/cv.pdf",
        permanent: true,
      },
      { source: "/three", destination: "/", permanent: true },
      { source: "/three/:path*", destination: "/:path*", permanent: true },
      { source: "/one/:path*", destination: "/", permanent: true },
      { source: "/two/:path*", destination: "/", permanent: true },
    ];
  },
  async rewrites() {
    return [{ source: "/files/:path*", destination: `${bucket}/:path*` }];
  },
};

export default nextConfig;
