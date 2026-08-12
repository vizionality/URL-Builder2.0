import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { absoluteUrl, BLOG_ENABLED } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  // Per-campaign landing pages.
  for (const slug of [
    "utm-spreadsheet",
    "utm-for-teams",
    "utm-naming-convention",
    "best-utm-builder",
  ]) {
    entries.push({
      url: absoluteUrl(`/lp/${slug}`),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // Only advertise the blog to search engines once it's enabled.
  if (BLOG_ENABLED) {
    entries.push({
      url: absoluteUrl("/blog"),
      changeFrequency: "weekly",
      priority: 0.8,
    });
    for (const post of getAllPosts()) {
      entries.push({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: new Date(
          `${post.dateModified ?? post.datePublished}T00:00:00Z`
        ),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
