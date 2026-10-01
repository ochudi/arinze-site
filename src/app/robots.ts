import type { MetadataRoute } from "next";
import { noindex, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: noindex
      ? { userAgent: "*", disallow: "/" }
      : { userAgent: "*", allow: "/", disallow: ["/admin", "/open/"] },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  };
}
