import type { Metadata } from "next";
import { Users, Table2, SlidersHorizontal, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { CampaignHero } from "@/components/marketing/CampaignHero";
import { CampaignCTA } from "@/components/marketing/CampaignCTA";
import { FeatureSection } from "@/components/marketing/FeatureSection";
import {
  BulkBuilderMock,
  UtmOptionsMock,
  CampaignCreatorMock,
} from "@/components/marketing/FeatureSections";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

const TITLE = "UTM tracking for teams and agencies";
const DESCRIPTION =
  "One tool, one naming standard, every client. Keep each client or campaign in its own project, share one list of approved sources and mediums, and export clean CSVs. Free to start.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/lp/utm-for-teams") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/lp/utm-for-teams"),
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
  },
};

export default function UtmForTeamsLanding() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />

      <CampaignHero
        eyebrow="For teams & agencies"
        icon={Users}
        title="One tool, one naming standard, every client"
        subtitle="Stop chasing rogue links across a dozen marketers. Keep each client or campaign in its own project, tag from one shared list of sources and mediums, and hand off clean CSV exports."
        bullets={[
          "Separate projects per client or campaign",
          "One shared list everyone tags from",
          "New marketers pick from dropdowns instead of guessing",
          "Export client links to CSV in one click",
        ]}
      />

      <FeatureSection
        eyebrow="Projects"
        icon={Table2}
        title="A project per client, every link saved"
        body="Give each client or campaign its own project. Build links in bulk, copy them all at once, and keep a saved record of every URL so you always know which link went where."
        benefits={[
          "Keep clients cleanly separated (up to 5 projects)",
          "Bulk build, then copy all or export to CSV",
          "Every link is saved and searchable",
          "No more one-off links scattered across inboxes",
        ]}
        visual={<BulkBuilderMock />}
      />

      <FeatureSection
        eyebrow="Shared options"
        icon={SlidersHorizontal}
        title="One source of truth for how you tag"
        body="Curate the approved sources and mediums your team uses, once. Everyone picks from the same dropdowns, so tagging stays consistent no matter who is building the links."
        benefits={[
          "One shared list keeps every marketer tagging alike",
          "Onboard new team members in minutes",
          "No naming drift across people or clients",
          "Update the list and everyone stays in sync",
        ]}
        visual={<UtmOptionsMock />}
        reverse
        tint
      />

      <FeatureSection
        eyebrow="Campaign Creator"
        icon={Sparkles}
        title="Consistent campaign names, no debates"
        body="Generate standardized names like 2026_q1_summer_sale in one format everyone follows. Lowercased and underscored automatically, so reports stay clean across every client."
        benefits={[
          "A consistent year_quarter_initiative format",
          "Names are lowercased and underscored for you",
          "AI suggestions when a name will not come",
          "Stop the naming debates for good",
        ]}
        visual={<CampaignCreatorMock />}
      />

      <CampaignCTA
        title="Set up your first client project today"
        subtitle="Give every marketer one place to build and one way to name. Free to start, no credit card."
      />

      <SiteFooter />
    </div>
  );
}
