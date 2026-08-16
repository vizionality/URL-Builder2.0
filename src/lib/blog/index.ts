import type { BlogPost } from "@/lib/blog/types";
import { post as whatIsAUtm } from "@/lib/blog/posts/what-is-a-utm";
import { post as sourceAndMediumForAdPlatforms } from "@/lib/blog/posts/utm-source-and-medium-for-ad-platforms";
import { post as singleSourceOfTruthForTeams } from "@/lib/blog/posts/utm-single-source-of-truth-for-teams";
import { post as whyYourUtmSpreadsheetBreaks } from "@/lib/blog/posts/why-your-utm-spreadsheet-breaks";

// Register posts here. Newest first is enforced by getAllPosts().
const ALL_POSTS: BlogPost[] = [
  whatIsAUtm,
  sourceAndMediumForAdPlatforms,
  singleSourceOfTruthForTeams,
  whyYourUtmSpreadsheetBreaks,
];

export function getAllPosts(): BlogPost[] {
  return [...ALL_POSTS].sort((a, b) =>
    b.datePublished.localeCompare(a.datePublished)
  );
}

export function getPost(slug: string): BlogPost | undefined {
  return ALL_POSTS.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return ALL_POSTS.map((p) => p.slug);
}

export type { BlogPost } from "@/lib/blog/types";
