import {
  Link2,
  Table2,
  Sparkles,
  SlidersHorizontal,
  LayoutDashboard,
  Plug,
  Check,
  Copy,
  ChevronDown,
  TrendingUp,
  X,
} from "lucide-react";
import { FeatureSection, type FeatureSectionProps } from "./FeatureSection";

/* ---------- Small mock building blocks ---------- */

function MockCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
      {children}
    </div>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-600">{label}</p>
      <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800">
        {value}
      </div>
    </div>
  );
}

function MockSelect({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-600">{label}</p>
      <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800">
        {value}
        <ChevronDown size={15} className="text-zinc-400" />
      </div>
    </div>
  );
}

function Chip({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
      {value}
      <X size={12} className="text-green-400" />
    </span>
  );
}

/* ---------- Per-feature visuals ---------- */

function UtmBuilderMock() {
  return (
    <MockCard>
      <MockField label="Website URL" value="https://example.com/sale" />
      <div className="mt-3 grid grid-cols-3 gap-3">
        <MockField label="Source" value="google" />
        <MockField label="Medium" value="cpc" />
        <MockField label="Campaign" value="2026_q1_sale" />
      </div>
      <div className="mt-4">
        <p className="mb-1 text-xs font-medium text-zinc-600">Your UTM URL</p>
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <code className="block break-all font-mono text-xs leading-relaxed text-zinc-700">
            https://example.com/sale
            <span className="text-green-600">?utm_source=google</span>
            <span className="text-green-600">&amp;utm_medium=cpc</span>
            <span className="text-green-600">&amp;utm_campaign=2026_q1_sale</span>
          </code>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 rounded-md bg-green-600 py-2 text-sm font-medium text-white">
          <Copy size={15} />
          Copy URL
        </div>
      </div>
    </MockCard>
  );
}

function BulkBuilderMock() {
  const rows = [
    { source: "google", medium: "cpc", campaign: "2026_q1_launch" },
    { source: "newsletter", medium: "email", campaign: "2026_q1_launch" },
    { source: "linkedin", medium: "social", campaign: "2026_q1_launch" },
  ];
  return (
    <MockCard>
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
            <p className="mt-1 text-lg font-bold text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>
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
      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="grid grid-cols-[1fr_1fr_1.3fr_auto] gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          <span>Source</span>
          <span>Medium</span>
          <span>Campaign</span>
          <span className="sr-only">Saved</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.source}
            className="grid grid-cols-[1fr_1fr_1.3fr_auto] items-center gap-2 border-b border-zinc-50 px-3 py-2.5 text-xs text-zinc-700 last:border-0"
          >
            <span className="truncate">{r.source}</span>
            <span className="truncate">{r.medium}</span>
            <span className="truncate font-mono text-[11px]">{r.campaign}</span>
            <Check size={14} className="justify-self-end text-green-600" />
          </div>
        ))}
      </div>
    </MockCard>
  );
}

function CampaignCreatorMock() {
  return (
    <MockCard>
      <div className="grid grid-cols-2 gap-3">
        <MockSelect label="Year" value="2026" />
        <MockSelect label="Quarter" value="Q1" />
      </div>
      <div className="mt-3">
        <MockField label="Initiative" value="summer_sale" />
      </div>
      <div className="mt-4">
        <p className="mb-1 text-xs font-medium text-zinc-600">Campaign name</p>
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <code className="font-mono text-sm font-medium text-green-700">
            2026_q1_summer_sale
          </code>
        </div>
      </div>
      <div className="mt-4">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
          <Sparkles size={13} />
          Generate AI suggestions
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["midyear_promo", "sunshine_deals", "warm_weather_push"].map((s) => (
            <span
              key={s}
              className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-mono text-[11px] text-zinc-600"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </MockCard>
  );
}

function UtmOptionsMock() {
  const groups = [
    { title: "Sources", values: ["google", "facebook", "newsletter"] },
    { title: "Mediums", values: ["cpc", "email", "social"] },
    { title: "Campaigns", values: ["spring_sale", "launch"] },
  ];
  return (
    <MockCard>
      <div className="space-y-3">
        {groups.map((g) => (
          <div
            key={g.title}
            className="rounded-lg border border-zinc-200 bg-white p-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {g.title}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.values.map((v) => (
                <Chip key={v} value={v} />
              ))}
              <span className="inline-flex items-center rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs text-zinc-400">
                + Add new
              </span>
            </div>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

function DashboardMock() {
  const bars = [40, 65, 50, 80, 60, 95, 72];
  return (
    <MockCard>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sessions", value: "4.2k" },
          { label: "Campaigns", value: "12" },
          { label: "Engagement", value: "61%" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-zinc-200 bg-white p-3"
          >
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">
              {s.label}
            </p>
            <p className="mt-1 text-lg font-bold text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex h-28 items-end justify-between gap-2">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-full rounded-t bg-green-500"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </MockCard>
  );
}

function Ga4Mock() {
  // Illustrative sessions trend (not real data), drawn as an inline SVG so the
  // section stays static and dependency-free.
  const line =
    "M6,92 L34,82 L62,86 L90,66 L118,72 L146,52 L174,58 L202,40 L230,46 L258,28 L286,34 L314,16";
  const area = `${line} L314,120 L6,120 Z`;

  return (
    <MockCard>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500">
              Campaign Sessions · last 30 days
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">4,218</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
            <TrendingUp size={12} />
            +12.4%
          </span>
        </div>

        <svg
          viewBox="0 0 320 120"
          className="mt-3 h-32 w-full"
          role="img"
          aria-label="Campaign sessions trending upward over the last 30 days"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="ga4Area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[30, 60, 90].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="320"
              y2={y}
              stroke="#f4f4f5"
              strokeWidth="1"
            />
          ))}
          <path d={area} fill="url(#ga4Area)" />
          <path
            d={line}
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="314" cy="16" r="3.5" fill="#16a34a" />
        </svg>

        <div className="mt-2 flex justify-between text-[10px] text-zinc-400">
          <span>Jul 1</span>
          <span>Jul 8</span>
          <span>Jul 15</span>
          <span>Jul 22</span>
          <span>Jul 29</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-green-700">
        <Check size={13} />
        Real sessions and engagement, via the GA4 Data API
      </div>
    </MockCard>
  );
}

/* ---------- Feature data ---------- */

type Feature = Omit<FeatureSectionProps, "reverse" | "tint">;

const FEATURES: Feature[] = [
  {
    eyebrow: "UTM Builder",
    icon: Link2,
    title: "Build a clean tracking URL in seconds",
    body: "Fill in a few fields and get a correctly encoded UTM link you can copy in one click. Start from a template so the source, medium, and content are filled in for you.",
    benefits: [
      "Correct URL encoding every time, even with spaces and symbols",
      "One-click copy, ready to paste into any ad or post",
      "Start from a template for Instagram, Google Ads, email, and more",
      "Helpful hints keep your naming clean and consistent",
    ],
    visual: <UtmBuilderMock />,
  },
  {
    eyebrow: "Bulk Builder",
    icon: Table2,
    title: "Build in bulk, and never lose track of a link",
    body: "Create dozens of tagged URLs at once in a simple spreadsheet, group them into projects, and keep every link you have built in one place.",
    benefits: [
      "Organize campaigns into separate projects (up to 5)",
      "Every UTM you build is saved, so you can see what you have used",
      "Spreadsheet rows with dropdowns from your saved options",
      "Copy all URLs at once, or export a project to CSV",
    ],
    visual: <BulkBuilderMock />,
  },
  {
    eyebrow: "Campaign Creator",
    icon: Sparkles,
    title: "Name every campaign the same way",
    body: "Pick a year and quarter, add your initiative, and get a clean, standardized campaign name like 2026_q1_summer_sale. Stuck on a name? Generate AI suggestions from a short description.",
    benefits: [
      "A consistent year_quarter_initiative format across your team",
      "Names are lowercased and underscored automatically",
      "AI suggestions when you need a little inspiration",
      "Copy the name straight into your UTM links",
    ],
    visual: <CampaignCreatorMock />,
  },
  {
    eyebrow: "UTM Options",
    icon: SlidersHorizontal,
    title: "Set your approved sources and mediums once",
    body: "Curate the sources, mediums, and campaign names your team standardizes on. They populate every dropdown in the Bulk Builder so no one has to type them by hand.",
    benefits: [
      "One shared list, so tagging stays consistent",
      "Add or remove values with a single click",
      "Powers the dropdowns across the app",
      "Reset to sensible defaults anytime",
    ],
    visual: <UtmOptionsMock />,
  },
  {
    eyebrow: "Dashboard",
    icon: LayoutDashboard,
    title: "See what your campaigns are actually doing",
    body: "Visualize clicks, active campaigns, and engagement over any date range. Connect GA4 for real numbers, with clearly labeled sample data until you do.",
    benefits: [
      "Clicks and engagement at a glance",
      "Filter by any date range",
      "Real GA4 data once connected",
      "Sample data is always clearly labeled, never faked",
    ],
    visual: <DashboardMock />,
    badge: "Coming soon",
  },
  {
    eyebrow: "GA4 Integration",
    icon: Plug,
    title: "Connect GA4 for real reporting",
    body: "Add your GA4 property to pull real clicks and engagement into your dashboard. No fake numbers, ever. Until you connect, any sample data stays clearly labeled.",
    benefits: [
      "Real data from the official GA4 Data API",
      "Just paste your numeric Property ID",
      "Grant access with a single service-account email",
      "Your metrics, never invented",
    ],
    visual: <Ga4Mock />,
    badge: "Coming soon",
  },
];

export function FeatureSections() {
  return (
    <>
      {FEATURES.map((feature, i) => (
        <FeatureSection
          key={feature.eyebrow}
          {...feature}
          reverse={i % 2 === 1}
          tint={i % 2 === 1}
        />
      ))}
    </>
  );
}
