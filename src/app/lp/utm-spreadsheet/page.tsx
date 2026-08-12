import type { Metadata } from "next";
import { Table2, SlidersHorizontal } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { CampaignHero } from "@/components/marketing/CampaignHero";
import { CampaignCTA } from "@/components/marketing/CampaignCTA";
import { FeatureSection } from "@/components/marketing/FeatureSection";
import {
  BulkBuilderMock,
  UtmOptionsMock,
} from "@/components/marketing/FeatureSections";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

const TITLE = "The UTM spreadsheet upgrade, without the typos";
const DESCRIPTION =
  "Keep the spreadsheet workflow, lose the errors. Build tagged URLs in bulk with dropdowns and encoding handled for you, save every link, and export to CSV. Free to start.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/lp/utm-spreadsheet") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/lp/utm-spreadsheet"),
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
  },
};

export default function UtmSpreadsheetLanding() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />

      <CampaignHero
        eyebrow="For spreadsheet users"
        icon={Table2}
        title="Your UTM spreadsheet, without the typos"
        subtitle="Keep the workflow you know and drop the copy-paste errors. Build tagged URLs in bulk, keep every row consistent, and export any project to CSV."
        bullets={[
          "Bulk build in a familiar spreadsheet-style grid",
          "Dropdowns keep every row consistent, no formulas needed",
          "Correct encoding every time, no broken characters",
          "Export any project to CSV in one click",
        ]}
      />

      <FeatureSection
        eyebrow="Bulk Builder"
        icon={Table2}
        title="A spreadsheet grid built for UTMs"
        body="Add a row per link, pick source and medium from dropdowns, and let the encoding happen for you. Group links into projects, copy them all at once, or export the project to CSV."
        benefits={[
          "Build dozens of links at once, then copy all",
          "Organize campaigns into separate projects (up to 5)",
          "Every link you build is saved, so nothing gets lost",
          "Export the whole project to CSV",
        ]}
        visual={<BulkBuilderMock />}
      />

      <FeatureSection
        eyebrow="UTM Options"
        icon={SlidersHorizontal}
        title="Your sources and mediums, ready in every dropdown"
        body="Set your approved sources and mediums once. They fill the dropdowns in the grid so no one retypes them and no stray capital letter splits your reporting."
        benefits={[
          "One shared list keeps naming consistent",
          "No CONCATENATE formulas, no broken links",
          "Add or remove values with a single click",
          "Reset to sensible defaults anytime",
        ]}
        visual={<UtmOptionsMock />}
        reverse
        tint
      />

      <CampaignCTA
        title="Bring your spreadsheet workflow up to speed"
        subtitle="Build your first batch of clean, consistent UTM links in minutes. Free to start, no credit card."
      />

      <SiteFooter />
    </div>
  );
}
