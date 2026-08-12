import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { getAllPosts } from "@/lib/blog";
import { absoluteUrl, BLOG_ENABLED, SITE_NAME } from "@/lib/site";

const TITLE = "Blog: UTM tracking, campaign naming & analytics";
const DESCRIPTION =
  "Practical guides on UTM parameters, campaign naming, and measuring marketing traffic, written for people who actually run campaigns.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/blog") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/blog"),
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function BlogIndexPage() {
  // Hidden for now: keep the code, return 404 until re-enabled.
  if (!BLOG_ENABLED) notFound();

  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            The UTMBuilder Blog
          </h1>
          <p className="mt-3 text-lg text-zinc-600">
            Practical guides on UTM tracking, campaign naming, and making sense
            of your marketing traffic.
          </p>
        </header>

        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <time dateTime={post.datePublished}>
                  {formatDate(post.datePublished)}
                </time>
                <span aria-hidden="true">·</span>
                <span>{post.readingTime}</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold text-zinc-900">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-green-700"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-zinc-600">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline"
              >
                Read the guide
                <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
