import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { getAllSlugs, getPost } from "@/lib/blog";
import { absoluteUrl, BLOG_ENABLED, SITE_NAME } from "@/lib/site";

export function generateStaticParams() {
  // Hidden for now: prerender nothing so no post pages are published.
  if (!BLOG_ENABLED) return [];
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    title: { absolute: post.title },
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      siteName: SITE_NAME,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified ?? post.datePublished,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!BLOG_ENABLED) notFound();
  const post = getPost(slug);
  if (!post) notFound();

  const url = absoluteUrl(`/blog/${post.slug}`);
  const modified = post.dateModified ?? post.datePublished;

  // Structured data for search engines and AI answer engines (GEO).
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.datePublished,
      dateModified: modified,
      author: { "@type": "Organization", name: post.author },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: absoluteUrl("/"),
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      keywords: post.keywords.join(", "),
      inLanguage: "en-US",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Blog",
          item: absoluteUrl("/blog"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: post.title,
          item: url,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  const { Content } = post;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <script
        type="application/ld+json"
        // Our own trusted, static content, safe to inline.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-sm text-zinc-500"
        >
          <Link href="/blog" className="hover:text-zinc-900">
            Blog
          </Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span className="truncate text-zinc-700">{post.title}</span>
        </nav>

        <article className="mt-6">
          <header className="border-b border-zinc-200 pb-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span>{post.author}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.datePublished}>
                {formatDate(post.datePublished)}
              </time>
              <span aria-hidden="true">·</span>
              <span>{post.readingTime}</span>
            </div>
          </header>

          <div className="article mt-8">
            <Content />
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-2xl border border-green-100 bg-green-50 p-8 text-center">
            <h2 className="text-xl font-semibold text-zinc-900">
              Build clean UTM links in seconds
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
              Set your sources, mediums, and campaign names once, then generate
              consistent, correctly encoded links, one at a time or in bulk.
            </p>
            <Link
              href="/sign-up"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
            >
              Start building free
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* FAQ mirrors the FAQPage structured data above. */}
          {post.faqs.length > 0 && (
            <section className="mt-12" aria-labelledby="faq-heading">
              <h2
                id="faq-heading"
                className="text-2xl font-bold tracking-tight text-zinc-900"
              >
                Frequently asked questions
              </h2>
              <dl className="mt-6 space-y-6">
                {post.faqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="rounded-xl border border-zinc-200 bg-white p-5"
                  >
                    <dt className="font-semibold text-zinc-900">
                      {faq.question}
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-zinc-600">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
