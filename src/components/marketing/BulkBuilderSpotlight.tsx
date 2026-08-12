import Link from "next/link";
import { ArrowRight, Check, Copy, FolderKanban } from "lucide-react";

const BENEFITS = [
  "Organize campaigns into separate projects (up to 5)",
  "Every UTM you build is saved, so you always know which links you've already used",
  "Spreadsheet-style rows with dropdowns from your saved sources and mediums",
  "Copy all URLs at once, or export a whole project to CSV",
];

// Illustrative sample data for the product mock (not a real customer's data).
const SAMPLE_ROWS = [
  { source: "google", medium: "cpc", campaign: "2026_q1_launch" },
  { source: "newsletter", medium: "email", campaign: "2026_q1_launch" },
  { source: "linkedin", medium: "social", campaign: "2026_q1_launch" },
];

export function BulkBuilderSpotlight() {
  return (
    <section className="border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
        {/* Copy */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <FolderKanban size={14} />
            Bulk Builder
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Build in bulk — and never lose track of a link
          </h2>
          <p className="mt-3 text-zinc-600">
            Create dozens of tagged URLs at once in a simple spreadsheet, group
            them into projects, and keep every link you&apos;ve built in one
            place so you never wonder &quot;did I already tag that?&quot; again.
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

        {/* Product mock */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Projects", value: "2 / 5" },
              { label: "This project", value: "3" },
              { label: "Total UTMs", value: "12" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-zinc-200 bg-white p-3"
              >
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                  {s.label}
                </p>
                <p className="mt-1 text-lg font-bold text-zinc-900">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Project tabs */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
              Spring Launch
            </span>
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-500">
              Holiday Ads
            </span>
            <span className="rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-400">
              + New project
            </span>
          </div>

          {/* Saved rows */}
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="grid grid-cols-[1fr_1fr_1.3fr_auto] gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              <span>Source</span>
              <span>Medium</span>
              <span>Campaign</span>
              <span className="sr-only">Saved</span>
            </div>
            {SAMPLE_ROWS.map((r) => (
              <div
                key={r.source}
                className="grid grid-cols-[1fr_1fr_1.3fr_auto] items-center gap-2 border-b border-zinc-50 px-3 py-2.5 text-xs text-zinc-700 last:border-0"
              >
                <span className="truncate">{r.source}</span>
                <span className="truncate">{r.medium}</span>
                <span className="truncate font-mono text-[11px]">
                  {r.campaign}
                </span>
                <Check size={14} className="justify-self-end text-green-600" />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              <Copy size={13} />
              Copy all URLs
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
