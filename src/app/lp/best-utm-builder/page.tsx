import type { Metadata } from "next";
import { Scale, Table2 } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { CampaignHero } from "@/components/marketing/CampaignHero";
import { CampaignCTA } from "@/components/marketing/CampaignCTA";
import { FeatureSection } from "@/components/marketing/FeatureSection";
import {
  ComparisonTable,
  type ComparisonRow,
} from "@/components/marketing/ComparisonTable";
import { BulkBuilderMock } from "@/components/marketing/FeatureSections";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

const TITLE = "What a free UTM builder should actually include";
const DESCRIPTION =
  "Most single-link builders stop at generating one URL. Compare what you get with UTMBuilder at the free tier: bulk building, saved projects, shared naming, templates and CSV export. No signup to try.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "best utm builder",
    "best free utm builder",
    "utm builder comparison",
    "best campaign url builder",
    "utm builder vs spreadsheet",
  ],
  alternates: { canonical: absoluteUrl("/lp/best-utm-builder") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/lp/best-utm-builder"),
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
  },
};

// NOTE: The "GA4 reporting" row is marked "Coming soon". Remove or update it
// the day that feature ships or is dropped, per the campaign policy notes.
const ROWS: ComparisonRow[] = [
  { label: "Build a single tagged link", us: true, them: true },
  { label: "Correct URL encoding every time", us: true, them: true },
  { label: "Build dozens of links at once (bulk)", us: true, them: false },
  { label: "Save and organize links into projects", us: true, them: false },
  { label: "Shared list of approved sources and mediums", us: true, them: false },
  { label: "Standardized campaign naming", us: true, them: false },
  { label: "Templates for every channel", us: true, them: false },
  { label: "Copy all links or export to CSV", us: true, them: false },
  { label: "Try it with no signup", us: true, them: "Sometimes" },
  { label: "Free to start, no credit card", us: true, them: "Varies" },
  { label: "Real GA4 reporting", us: "Coming soon", them: false },
];

export default function BestUtmBuilderLanding() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />

      <CampaignHero
        eyebrow="Compare"
        icon={Scale}
        title="What a free UTM builder should actually include"
        subtitle="Most single-link builders stop at generating one URL. If you tag more than the occasional link, here is what to look for, and what you get with UTMBuilder at the free tier."
        bullets={[
          "Bulk building, not one link at a time",
          "Saved projects so links never get lost",
          "Shared naming standards for the whole team",
          "No signup to try, no credit card to start",
        ]}
      />

      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Free tier, side by side
            </h2>
            <p className="mt-3 text-zinc-600">
              How UTMBuilder compares with a basic single-link builder on the
              things that matter once you are tagging at any real volume.
            </p>
          </div>
          <div className="mt-8">
            <ComparisonTable rows={ROWS} />
          </div>
          <p className="mt-4 text-xs text-zinc-400">
            Comparison reflects UTMBuilder&apos;s free tier and typical
            single-link builders. Features and pricing of other tools vary.
          </p>
        </div>
      </section>

      <FeatureSection
        eyebrow="Bulk Builder"
        icon={Table2}
        title="The difference shows up at volume"
        body="A single-link builder is fine for one URL. The moment you are tagging a launch across channels, you want bulk rows, saved projects, and a copy-all export. That is the free tier here."
        benefits={[
          "Build dozens of links at once, then copy all",
          "Organize campaigns into projects (up to 5)",
          "Every link stays saved and searchable",
          "Export the whole project to CSV",
        ]}
        visual={<BulkBuilderMock />}
        tint
        reverse
      />

      <CampaignCTA
        title="See the difference for yourself"
        subtitle="Try the builder with no signup, then create a free account for bulk building and saved projects. No credit card."
      />

      <SiteFooter />
    </div>
  );
}
