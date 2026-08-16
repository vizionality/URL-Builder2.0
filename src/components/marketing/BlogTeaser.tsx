import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllPosts } from "@/lib/blog";
import { BLOG_ENABLED } from "@/lib/site";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Shows the latest posts on the homepage. Renders nothing while the blog is
// disabled or empty.
export function BlogTeaser({ limit = 3 }: { limit?: number }) {
  if (!BLOG_ENABLED) return null;
  const posts = getAllPosts().slice(0, limit);
  if (posts.length === 0) return null;

  return (
    <section className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              From the blog
            </h2>
            <p className="mt-3 text-zinc-600">
              Practical guides on UTM tracking, campaign naming, and the messy
              problems every marketing team runs into.
            </p>
          </div>
          <Link
            href="/blog"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-green-700 hover:underline sm:inline-flex"
          >
            All posts
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <time dateTime={post.datePublished}>
                  {formatDate(post.datePublished)}
                </time>
                <span aria-hidden="true">·</span>
                <span>{post.readingTime}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-zinc-900">
                <Link href={`/blog/${post.slug}`} className="hover:text-green-700">
                  {post.title}
                </Link>
              </h3>
              <p className="mt-2 flex-1 text-sm text-zinc-600">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline"
              >
                Read more
                <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
