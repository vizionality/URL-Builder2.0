import type { ComponentType } from "react";

export type Faq = {
  question: string;
  answer: string;
};

export type BlogPost = {
  /** URL slug, e.g. "what-is-a-utm" -> /blog/what-is-a-utm */
  slug: string;
  /** Page <h1> and SEO title. */
  title: string;
  /** Meta description (aim for ~150–160 characters). */
  description: string;
  /** Short summary shown on the blog index card. */
  excerpt: string;
  /** ISO date the post was first published. */
  datePublished: string;
  /** ISO date the post was last updated (defaults to datePublished). */
  dateModified?: string;
  /** Byline. */
  author: string;
  /** Human-readable reading time, e.g. "7 min read". */
  readingTime: string;
  /** SEO keywords / topics. */
  keywords: string[];
  /** Q&A used for both the on-page FAQ and FAQPage structured data. */
  faqs: Faq[];
  /** The article body. */
  Content: ComponentType;
};
