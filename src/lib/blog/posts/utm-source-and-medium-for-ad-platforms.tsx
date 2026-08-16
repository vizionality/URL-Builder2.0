import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";

function Content() {
  return (
    <>
      <p>
        Every marketer hits the same wall eventually. You are tagging a Facebook
        ad and you pause: is Facebook the source or the medium? Is it{" "}
        <code>social</code>, <code>paid_social</code>, or <code>cpc</code>? Do
        Instagram ads count as a different source, or the same one? Get it wrong
        and your paid traffic quietly lands in the wrong bucket in Google
        Analytics, and your channel reports stop making sense.
      </p>
      <p>
        The confusion is real, but the rule underneath it is simple. Here is how
        to think about it, followed by a cheat sheet you can copy for every
        platform.
      </p>

      <h2>The one rule: source is where, medium is how</h2>
      <p>
        <strong>utm_source</strong> is the specific place the click comes from:
        the platform or product. Google, Facebook, LinkedIn, your newsletter.
      </p>
      <p>
        <strong>utm_medium</strong> is the <em>type</em> of traffic, not the
        brand. Was it a paid search click, a paid social ad, an organic post, an
        email? The medium is what Google Analytics uses to sort your traffic into
        channel groups, so it matters more than most people realize.
      </p>
      <p>
        So Facebook is always the source. Whether the medium is{" "}
        <code>paid_social</code> or <code>social</code> depends on whether you
        paid for the placement. That single distinction, paid versus organic, is
        the thing most teams get wrong.
      </p>

      <h2>Why the medium decides your GA4 report</h2>
      <p>
        Google Analytics 4 sorts traffic into default channel groups based mostly
        on the medium you set. A few of the rules:
      </p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>If utm_medium is…</th>
              <th>GA4 files it under…</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>cpc</code>, <code>ppc</code>, <code>paidsearch</code>
              </td>
              <td>Paid Search</td>
            </tr>
            <tr>
              <td>
                <code>paid_social</code>
              </td>
              <td>Paid Social</td>
            </tr>
            <tr>
              <td>
                <code>display</code>, <code>cpm</code>, <code>banner</code>
              </td>
              <td>Display</td>
            </tr>
            <tr>
              <td>
                <code>social</code>
              </td>
              <td>Organic Social</td>
            </tr>
            <tr>
              <td>
                <code>email</code>
              </td>
              <td>Email</td>
            </tr>
            <tr>
              <td>
                <code>affiliate</code>
              </td>
              <td>Affiliates</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        This is why <code>paid_social</code> matters. Tag a Facebook ad as{" "}
        <code>social</code> and GA4 mixes your paid budget in with your organic
        posts, so you can no longer tell what your ad spend actually did. Tag it{" "}
        <code>paid_social</code> and it lands cleanly in Paid Social, separate
        from the free stuff.
      </p>

      <h2>The cheat sheet: source and medium for every platform</h2>
      <p>
        Copy this. The point is not that these values are the only correct ones,
        it is that you and your whole team use the <em>same</em> ones every time.
      </p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Placement</th>
              <th>utm_source</th>
              <th>utm_medium</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Google Search ad</td>
              <td>google</td>
              <td>cpc</td>
            </tr>
            <tr>
              <td>Google Display ad</td>
              <td>google</td>
              <td>display</td>
            </tr>
            <tr>
              <td>YouTube ad</td>
              <td>youtube</td>
              <td>cpc</td>
            </tr>
            <tr>
              <td>Microsoft / Bing Search ad</td>
              <td>bing</td>
              <td>cpc</td>
            </tr>
            <tr>
              <td>Facebook ad</td>
              <td>facebook</td>
              <td>paid_social</td>
            </tr>
            <tr>
              <td>Instagram ad</td>
              <td>instagram</td>
              <td>paid_social</td>
            </tr>
            <tr>
              <td>Facebook organic post</td>
              <td>facebook</td>
              <td>social</td>
            </tr>
            <tr>
              <td>Instagram organic post or bio</td>
              <td>instagram</td>
              <td>social</td>
            </tr>
            <tr>
              <td>LinkedIn ad</td>
              <td>linkedin</td>
              <td>paid_social</td>
            </tr>
            <tr>
              <td>LinkedIn organic post</td>
              <td>linkedin</td>
              <td>social</td>
            </tr>
            <tr>
              <td>TikTok ad</td>
              <td>tiktok</td>
              <td>paid_social</td>
            </tr>
            <tr>
              <td>TikTok organic</td>
              <td>tiktok</td>
              <td>social</td>
            </tr>
            <tr>
              <td>X (Twitter) ad</td>
              <td>x</td>
              <td>paid_social</td>
            </tr>
            <tr>
              <td>Pinterest ad</td>
              <td>pinterest</td>
              <td>paid_social</td>
            </tr>
            <tr>
              <td>Reddit ad</td>
              <td>reddit</td>
              <td>paid_social</td>
            </tr>
            <tr>
              <td>Email newsletter</td>
              <td>newsletter</td>
              <td>email</td>
            </tr>
            <tr>
              <td>Email promo or blast</td>
              <td>email</td>
              <td>email</td>
            </tr>
            <tr>
              <td>SMS campaign</td>
              <td>sms</td>
              <td>sms</td>
            </tr>
            <tr>
              <td>Affiliate or partner link</td>
              <td>partner</td>
              <td>affiliate</td>
            </tr>
            <tr>
              <td>QR code or print</td>
              <td>qr</td>
              <td>offline</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>A note on Meta and cross-placement ads</h2>
      <p>
        Meta ads often run across Facebook and Instagram at once, which is where
        people freeze. You have two clean options. Split by platform if you want
        to compare them (<code>facebook</code> vs <code>instagram</code> as the
        source, both <code>paid_social</code>), or treat Meta as one paid channel
        and use a single source. Either is fine. The mistake is doing both at
        different times, so half your Meta spend says <code>facebook</code> and
        half says <code>meta</code>.
      </p>

      <h2>The mistakes that cause most of the mess</h2>
      <ul>
        <li>
          <strong>Putting the platform in the medium.</strong>{" "}
          <code>utm_medium=facebook</code> tells GA4 nothing about the channel.
          The medium is the type of traffic, not the brand.
        </li>
        <li>
          <strong>Using social for paid ads.</strong> It buries your ad spend in
          with organic posts. Paid gets <code>paid_social</code>.
        </li>
        <li>
          <strong>Spelling the same medium three ways.</strong>{" "}
          <code>paidsocial</code>, <code>paid-social</code>, and{" "}
          <code>paid_social</code> are three different channels to GA4. Pick one.
        </li>
        <li>
          <strong>Letting each person decide.</strong> The fix is not a longer
          document, it is a shared list everyone picks from.
        </li>
      </ul>

      <h2>How to make this automatic</h2>
      <p>
        The reason this stays confusing is that it lives in people&apos;s heads.
        The fix is to stop relying on memory. In{" "}
        <Link href="/app">UTMBuilder</Link>, you set your approved sources and
        mediums once and start from a template for each platform, so the right{" "}
        <code>paid_social</code> or <code>cpc</code> value is filled in for you
        and nobody has to guess. That is how you keep this cheat sheet from
        becoming another doc no one opens.
      </p>
    </>
  );
}

export const post: BlogPost = {
  slug: "utm-source-and-medium-for-ad-platforms",
  title: "UTM Source vs Medium for Every Ad Platform (Cheat Sheet)",
  description:
    "Confused whether Facebook is a source or medium, or when to use paid_social vs cpc? Here is a copy-and-keep cheat sheet of the right utm_source and utm_medium for every ad platform.",
  excerpt:
    "Is Facebook a source or a medium? Should ads be social, paid_social, or cpc? A copy-and-keep cheat sheet of the right source and medium for every ad platform, and why the medium decides your GA4 report.",
  datePublished: "2026-08-14",
  author: "The UTMBuilder Team",
  readingTime: "7 min read",
  keywords: [
    "utm source vs medium",
    "utm medium for facebook ads",
    "utm parameters for google ads",
    "paid_social utm medium",
    "utm medium list",
    "ga4 channel grouping utm",
    "utm for ad platforms",
  ],
  faqs: [
    {
      question: "Should the ad platform be the source or the medium?",
      answer:
        "The platform is the source (google, facebook, linkedin). The medium is the type of traffic: cpc for paid search, paid_social for paid social ads, email for email. Source is where the click came from, medium is how.",
    },
    {
      question: "What utm_medium should I use for Facebook and Instagram ads?",
      answer:
        "Use paid_social. It keeps paid ads in GA4's Paid Social channel, separate from organic posts, which use social. Facebook or Instagram is the source; paid_social is the medium.",
    },
    {
      question: "Does the medium I choose affect my GA4 reports?",
      answer:
        "Yes. GA4 sorts traffic into default channel groups mostly by the medium. cpc becomes Paid Search, paid_social becomes Paid Social, email becomes Email, and social becomes Organic Social. A wrong medium puts the traffic in the wrong bucket.",
    },
    {
      question: "Is it paid_social or paidsocial?",
      answer:
        "Use paid_social with an underscore, and use it everywhere. GA4 recognizes paid_social for its Paid Social grouping, and paidsocial or paid-social would count as separate channels. Pick one spelling and never vary it.",
    },
  ],
  Content,
};
