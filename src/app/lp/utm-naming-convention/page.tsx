import type { Metadata } from "next";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { CampaignHero } from "@/components/marketing/CampaignHero";
import { CampaignCTA } from "@/components/marketing/CampaignCTA";
import { FeatureSection } from "@/components/marketing/FeatureSection";
import {
  CampaignCreatorMock,
  UtmOptionsMock,
} from "@/components/marketing/FeatureSections";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

const TITLE = "A UTM naming convention your team will actually follow";
const DESCRIPTION =
  "Steal a simple, durable UTM naming standard: lowercase sources, a fixed list of mediums, and dated campaign names. Then enforce it automatically. Free to start.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "utm naming convention",
    "utm naming best practices",
    "campaign naming convention",
    "utm taxonomy",
    "utm governance",
  ],
  alternates: { canonical: absoluteUrl("/lp/utm-naming-convention") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/lp/utm-naming-convention"),
    title: TITLE,
    description: DESCRIPTION,
    siteName: SITE_NAME,
  },
};

export default function UtmNamingConventionLanding() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />

      <CampaignHero
        eyebrow="UTM naming"
        icon={SlidersHorizontal}
        title="A UTM naming convention your team will actually follow"
        subtitle="A naming standard only works if everyone uses the same one. Here is a simple, durable convention you can adopt today, plus the fastest way to make the whole team stick to it."
        bullets={[
          "A format anyone can read at a glance",
          "Lowercase and underscored, every time",
          "One shared list of sources and mediums",
          "Enforced automatically, not with a wiki page",
        ]}
      />

      {/* The standard, given away as usable organic content. */}
      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="article">
            <h2>The convention, in three rules</h2>
            <p>
              The goal is that anyone can look at a tagged link and know what it
              is for, and that two people tagging the same channel produce the
              same tags. Three rules get you there.
            </p>

            <h3>1. Source is the platform, lowercase</h3>
            <p>
              The <code>utm_source</code> is the specific place the click comes
              from, written in lowercase with no spaces: <code>google</code>,{" "}
              <code>linkedin</code>, <code>klaviyo</code>, <code>newsletter</code>
              . Pick one spelling per platform and never vary it. Analytics
              treats <code>Facebook</code> and <code>facebook</code> as two
              different sources, and that one capital letter quietly splits your
              reporting.
            </p>

            <h3>2. Medium comes from a short, fixed list</h3>
            <p>
              The <code>utm_medium</code> is the type of channel, not the brand.
              Keep it to a small set everyone shares so your reports group
              cleanly:
            </p>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Medium</th>
                    <th>Use it for</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>cpc</code>
                    </td>
                    <td>Paid search and paid clicks you pay per click for</td>
                  </tr>
                  <tr>
                    <td>
                      <code>paid_social</code>
                    </td>
                    <td>Paid ads on social platforms</td>
                  </tr>
                  <tr>
                    <td>
                      <code>social</code>
                    </td>
                    <td>Organic social posts</td>
                  </tr>
                  <tr>
                    <td>
                      <code>email</code>
                    </td>
                    <td>Newsletters and email sends</td>
                  </tr>
                  <tr>
                    <td>
                      <code>referral</code>
                    </td>
                    <td>Partner links and placements on other sites</td>
                  </tr>
                  <tr>
                    <td>
                      <code>display</code>
                    </td>
                    <td>Banner and display ads</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>3. Campaign is dated: year_quarter_initiative</h3>
            <p>
              Name the campaign <code>year_quarter_initiative</code>, for example{" "}
              <code>2026_q1_summer_sale</code>. Dating it lets you compare this
              quarter to the same one last year at a glance, and the names sort
              cleanly in every report. It is the single most useful habit on this
              page, even if you change nothing else.
            </p>

            <h3>Putting it together</h3>
            <p>A newsletter link for a Q1 launch becomes:</p>
            <pre>
              <code>
                ?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=2026_q1_launch
              </code>
            </pre>
            <p>
              Clean, readable, and identical no matter who on the team builds it.
              The hard part is not writing the standard. It is getting everyone
              to follow it without typos, which is where the tools below come in.
            </p>
          </div>
        </div>
      </section>

      <FeatureSection
        eyebrow="Campaign Creator"
        icon={Sparkles}
        title="Enforce the campaign format automatically"
        body="Pick a year and quarter, add your initiative, and get a name in the exact format above. Lowercased and underscored for you, so no one has to remember the rules."
        benefits={[
          "Names always land as year_quarter_initiative",
          "Lowercased and underscored automatically",
          "AI suggestions when a name will not come",
          "Copy it straight into your links",
        ]}
        visual={<CampaignCreatorMock />}
        tint
        reverse
      />

      <FeatureSection
        eyebrow="UTM Options"
        icon={SlidersHorizontal}
        title="One shared list of approved sources and mediums"
        body="Set the approved values once and everyone picks from the same dropdowns. That is what actually stops naming drift, rather than a document nobody opens."
        benefits={[
          "The whole team tags from one list",
          "New members pick values instead of guessing",
          "Add or remove approved values in a click",
          "Reset to sensible defaults anytime",
        ]}
        visual={<UtmOptionsMock />}
      />

      <CampaignCTA
        title="Make the standard stick"
        subtitle="Set your sources, mediums, and naming format once, and let everyone build from it. Free to start, no credit card."
      />

      <SiteFooter />
    </div>
  );
}
