import type { MetadataRoute } from "next";
import { absoluteUrl, BLOG_ENABLED } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Keep the authenticated app and auth flows out of the index. While the
  // blog is hidden, disallow it too so crawlers don't surface stray pages.
  const disallow = ["/app", "/account", "/sign-in", "/sign-up", "/api/"];
  if (!BLOG_ENABLED) disallow.push("/blog");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
