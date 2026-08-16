import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";
import { UtmBuilderMock } from "@/components/marketing/FeatureSections";

function Content() {
  return (
    <>
      <p>
        Every marketer walks into the same ambush eventually. You are tagging a
        Facebook ad at some ugly hour and your hand freezes over the keyboard. Is
        Facebook the source or the medium? Is it <code>social</code>,{" "}
        <code>paid_social</code>, or <code>cpc</code>? Do Instagram ads count as a
        different beast or the same one? Guess wrong and your paid traffic slinks
        off into the wrong bucket in Google Analytics, and by the time you notice,
        your channel report reads like a ransom note written by three different
        people.
      </p>
      <p>
        The confusion is real. The rule underneath it is not complicated once
        somebody says it out loud. So here it is, out loud, followed by a cheat
        sheet you can nail to the wall for every platform you touch.
      </p>

      <h2>The one rule: source is where, medium is how</h2>
      <p>
        <strong>utm_source</strong> is the specific place the click crawled out
        of: the platform or product. Google, Facebook, LinkedIn, your newsletter.
      </p>
      <p>
        <strong>utm_medium</strong> is the <em>type</em> of traffic, not the
        brand name. Was it a paid search click, a paid social ad, an organic post,
        an email? This is the one Google Analytics actually uses to sort your
        world into channels, which means it matters more than the nervous part of
        your brain is telling you.
      </p>
      <p>
        So Facebook is always the source. Whether the medium is{" "}
        <code>paid_social</code> or <code>social</code> comes down to one
        question: did you pay for the placement or not? That single fork in the
        road, paid versus organic, is where most teams drive straight into the
        ditch.
      </p>

      <h2>Why the medium runs your whole GA4 report</h2>
      <p>
        GA4 sorts traffic into default channel groups based mostly on the medium
        you hand it. A few of the rules of the road:
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
        This is the whole reason <code>paid_social</code> earns its keep. Tag a
        Facebook ad as plain <code>social</code> and GA4 dumps your ad budget in
        the same barrel as your free organic posts, and now you cannot tell what
        the money did versus what the intern&apos;s meme did. Tag it{" "}
        <code>paid_social</code> and it marches straight into Paid Social, clean
        and accountable, exactly where a paid dollar belongs.
      </p>

      <h2>The cheat sheet: source and medium for every platform</h2>
      <p>
        Copy it. Steal it. The magic is not that these exact values were handed
        down on stone tablets, it is that you and every last person on your team
        use the <em>same</em> ones every single time.
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

      <h2>A word on Meta and its cross-placement madness</h2>
      <p>
        Meta ads love to run across Facebook and Instagram at once, and that is
        the exact spot where people seize up. You have two clean escape routes.
        Split by platform if you want to compare the two (<code>facebook</code> vs{" "}
        <code>instagram</code> as the source, both <code>paid_social</code>), or
        treat Meta as one paid channel with a single source and be done. Either
        works. The crime is doing both on different days, so half your Meta spend
        swears it came from <code>facebook</code> and the other half insists on{" "}
        <code>meta</code>, and neither will look you in the eye.
      </p>

      <h2>The mistakes that cause most of the wreckage</h2>
      <ul>
        <li>
          <strong>Shoving the platform into the medium.</strong>{" "}
          <code>utm_medium=facebook</code> tells GA4 nothing about the channel.
          The medium is the type of traffic, not the logo.
        </li>
        <li>
          <strong>Using social for paid ads.</strong> It buries your ad money
          under a pile of free posts. Paid gets <code>paid_social</code>.
        </li>
        <li>
          <strong>Spelling one medium three ways.</strong>{" "}
          <code>paidsocial</code>, <code>paid-social</code>, and{" "}
          <code>paid_social</code> are three separate channels as far as GA4 is
          concerned. Pick one and hold the line.
        </li>
        <li>
          <strong>Letting everyone freelance.</strong> The cure is not a longer
          memo. It is a shared list people pick from instead of typing.
        </li>
      </ul>

      <h2>How to make this run on autopilot</h2>
      <p>
        The reason this never stops being confusing is that it lives in the soft
        tissue of human memory, which fails at the worst possible moment. So take
        it out of your head. In <Link href="/app">UTMBuilder</Link> you set your
        approved sources and mediums once and start from a template for each
        platform, so the right <code>paid_social</code> or <code>cpc</code> is
        already sitting in the box and nobody has to gamble. That is how a cheat
        sheet stops being another doc nobody opens and starts being the way the
        work actually gets done.
      </p>
      <figure className="my-8">
        <UtmBuilderMock />
        <figcaption className="mt-3 text-center text-sm text-zinc-500">
          Source and medium filled in for you in UTMBuilder, so the right{" "}
          <code>cpc</code> or <code>paid_social</code> lands every time.
        </figcaption>
      </figure>
    </>
  );
}

export const post: BlogPost = {
  slug: "utm-source-and-medium-for-ad-platforms",
  title: "UTM Source vs Medium for Every Ad Platform (Cheat Sheet)",
  description:
    "Confused whether Facebook is a source or medium, or when to use paid_social vs cpc? Here is a copy-and-keep cheat sheet of the right utm_source and utm_medium for every ad platform.",
  excerpt:
    "Is Facebook a source or a medium? Should ads be social, paid_social, or cpc? A cheat sheet you can nail to the wall for every platform, and why the medium quietly runs your whole GA4 report.",
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
