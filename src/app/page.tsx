import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { HeroBuilder } from "@/components/marketing/HeroBuilder";
import { FeatureSections } from "@/components/marketing/FeatureSections";
import { Testimonials } from "@/components/marketing/Testimonials";
import { BlogTeaser } from "@/components/marketing/BlogTeaser";

export const metadata: Metadata = {
  title: {
    absolute: "UTMBuilder: Build, standardize & track campaign URLs",
  },
  description:
    "Create consistent UTM campaign URLs in seconds, build them in bulk, standardize naming, and track performance with real GA4 reporting.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "UTMBuilder: Build, standardize & track campaign URLs",
    description:
      "Create consistent UTM campaign URLs in seconds, build them in bulk, standardize naming, and track performance with real GA4 reporting.",
    siteName: "UTMBuilder",
  },
};

const STEPS = [
  {
    title: "Set your options",
    body: "Define the sources, mediums, and campaign names your team standardizes on.",
  },
  {
    title: "Build your URLs",
    body: "Create tracking links one at a time or in bulk, with parameters filled from your options.",
  },
  {
    title: "Track performance",
    body: "Connect GA4 and watch clicks and engagement land on your dashboard.",
  },
];

const BENEFITS = [
  "Correctly encoded, standards-compliant URLs every time",
  "Consistent campaign naming across your whole team",
  "One-click copy and CSV export everywhere",
  "Real GA4 data, or clearly labeled samples until you connect",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <Sparkles size={14} />
              UTM tracking, standardized
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
              Build, standardize &amp; track your{" "}
              <span className="text-green-600">campaign URLs</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-zinc-600">
              Create consistent UTM links in seconds, build them in bulk, keep
              naming clean across your team, and measure results with real GA4
              reporting.
            </p>
            <div className="mt-8">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
              >
                Start building free
                <ArrowRight size={16} />
              </Link>
              <p className="mt-3 text-sm text-zinc-500">
                Free to start · No credit card required
              </p>
            </div>
          </div>

          {/* Live mini builder so visitors get value with no signup. */}
          <div className="relative">
            <HeroBuilder />
          </div>
        </div>
      </section>

      {/* Trust bar: factual product statements, not fabricated social proof. */}
      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <ul className="grid gap-3 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Correct URL encoding, every time",
              "Consistent naming across your team",
              "Real GA4 data when you connect it",
              "Free to start, no credit card",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check size={16} className="shrink-0 text-green-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            From naming to numbers in three steps
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed feature sections, one per product area. */}
      <FeatureSections />

      {/* Testimonials render only once real quotes are added. */}
      <Testimonials />

      {/* Latest blog posts. */}
      <BlogTeaser />

      {/* Benefits + CTA */}
      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Stop guessing what your links mean
            </h2>
            <p className="mt-3 text-zinc-600">
              Standardized UTMs mean cleaner reports and fewer &quot;which
              campaign was that?&quot; moments.
            </p>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <Check size={13} />
                  </span>
                  <span className="text-sm text-zinc-700">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50 p-8 text-center">
            <h3 className="text-xl font-semibold text-zinc-900">
              Ready to standardize your tracking?
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Create your free account and build your first UTM URL in minutes.
            </p>
            <Link
              href="/sign-up"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
            >
              Get started
              <ArrowRight size={16} />
            </Link>
            <p className="mt-4 text-xs text-zinc-500">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-medium text-green-700 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
