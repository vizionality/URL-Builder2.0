import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronUp,
  LayoutTemplate,
  Search,
} from "lucide-react";
import { utmTemplates, templatePlatformOrder } from "@/lib/utmTemplates";

const TEMPLATE_COUNT = utmTemplates.length;
const PLATFORM_COUNT = templatePlatformOrder.length;

const BENEFITS = [
  `${TEMPLATE_COUNT} ready-made templates across ${PLATFORM_COUNT} platforms`,
  "The right source, medium & content pre-filled for each format",
  "Searchable — type “reel” or “ad” to jump straight to it",
  "Consistent tagging even when different people build the links",
];

export function TemplatesSpotlight() {
  return (
    <section className="border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
        {/* Copy (right on desktop, first on mobile) */}
        <div className="lg:order-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <LayoutTemplate size={14} />
            Quick Templates
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Start from a template for every channel
          </h2>
          <p className="mt-3 text-zinc-600">
            Pick your platform and format — Instagram Story, Google Search Ad,
            Email Newsletter — and the source, medium, and content fields fill
            in with sensible, consistent values. Tweak what you need and copy.
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
          <Link
            href="/sign-up"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-green-600 px-5 py-3 text-sm font-medium text-white hover:bg-green-700"
          >
            Start building free
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Product mock (left on desktop) */}
        <div className="lg:order-1">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
            <p className="mb-1 text-xs font-medium text-zinc-600">
              Quick Template
            </p>
            <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-400">
              Select a template…
              <ChevronUp size={16} className="text-zinc-400" />
            </div>

            {/* Open dropdown */}
            <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
              <div className="border-b border-zinc-100 p-2">
                <div className="flex items-center gap-2 rounded-md border border-green-500 px-2.5 py-1.5 text-sm text-zinc-400 ring-1 ring-green-500">
                  <Search size={14} className="text-zinc-400" />
                  Search templates…
                </div>
              </div>
              <ul className="max-h-64 overflow-hidden py-1 text-sm text-zinc-700">
                <li className="px-3 py-1.5">Instagram Story Ad</li>
                <li className="px-3 py-1.5">Instagram Reel Ad (CPC)</li>
                <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Facebook
                </li>
                <li className="px-3 py-1.5">Facebook Post</li>
                <li className="bg-green-50 px-3 py-1.5 font-medium text-green-700">
                  Facebook Story
                </li>
                <li className="px-3 py-1.5">Facebook Group</li>
                <li className="px-3 py-1.5">Facebook Page Bio</li>
                <li className="px-3 py-1.5">Facebook Feed Ad</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
