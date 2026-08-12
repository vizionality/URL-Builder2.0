import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";

function Content() {
  return (
    <>
      <p>
        A UTM is a short piece of text you tag onto the end of a URL to tell
        your analytics where a visitor came from. When someone clicks a tagged
        link, those tags travel with them and show up in reports like Google
        Analytics, so instead of a vague lump of &quot;traffic,&quot; you see
        exactly which email, ad, or social post sent that person to your site.
      </p>
      <p>
        That&apos;s the whole idea. Everything else is detail. But the detail is
        where most tracking quietly goes wrong, so it&apos;s worth understanding
        what each part actually does.
      </p>

      <h2>What a UTM link actually looks like</h2>
      <p>Here&apos;s an ordinary link with UTMs added to it:</p>
      <pre>
        <code>
          https://vizionality.com/pricing?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=2026_q1_launch
        </code>
      </pre>
      <p>
        The part before the <code>?</code> is your normal page. Everything after
        it is tracking. Each tag is a <code>key=value</code> pair, and the pairs
        are joined with <code>&amp;</code>. Read in plain English, that link
        says: this click came from our <strong>newsletter</strong> (the source),
        it arrived by <strong>email</strong> (the medium), and it belongs to our{" "}
        <strong>Q1 2026 launch</strong> campaign.
      </p>
      <p>
        None of it changes what the visitor sees. The page loads exactly the
        same way. The tags are there only for your analytics to read.
      </p>

      <h2>The five UTM parameters</h2>
      <p>
        There are five parameters in total. You&apos;ll use three of them
        constantly and the other two occasionally.
      </p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>What it answers</th>
              <th>Required?</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>utm_source</code>
              </td>
              <td>The specific site or product the traffic comes from</td>
              <td>Yes</td>
              <td>google, newsletter, facebook</td>
            </tr>
            <tr>
              <td>
                <code>utm_medium</code>
              </td>
              <td>The type of channel</td>
              <td>Yes</td>
              <td>cpc, email, social, banner</td>
            </tr>
            <tr>
              <td>
                <code>utm_campaign</code>
              </td>
              <td>The specific promotion or initiative</td>
              <td>Yes</td>
              <td>2026_q1_launch, black_friday</td>
            </tr>
            <tr>
              <td>
                <code>utm_term</code>
              </td>
              <td>The paid keyword you bid on</td>
              <td>Optional</td>
              <td>running_shoes</td>
            </tr>
            <tr>
              <td>
                <code>utm_content</code>
              </td>
              <td>Which version of a link (A/B tests, or two links in one email)</td>
              <td>Optional</td>
              <td>header_button, footer_link</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        A quick way to keep the first two straight:{" "}
        <strong>source is the &quot;who,&quot; medium is the &quot;how.&quot;</strong>{" "}
        Facebook is a source; &quot;social&quot; or &quot;cpc&quot; is the
        medium. Mailchimp is a source; &quot;email&quot; is the medium.
      </p>

      <h2>Why bother with them at all?</h2>
      <p>
        Without UTMs, analytics tools do their best to guess where traffic came
        from, and they end up lumping a lot of it into vague buckets like
        &quot;Direct&quot; or &quot;Referral.&quot; That&apos;s fine right up
        until you&apos;re spending money and need to know what&apos;s working.
      </p>
      <p>
        Say you promote the same landing page three ways in one week: a paid
        Instagram ad, a link in your newsletter, and an organic LinkedIn post.
        Untagged, all three can land in your reports as one undifferentiated
        pile. Tagged, you can see that the newsletter drove 40 sign-ups at zero
        cost while the Instagram ad drove 12 for $300, and move your budget
        accordingly.
      </p>
      <p>
        UTMs turn &quot;we got some traffic&quot; into &quot;this specific thing
        worked.&quot; That&apos;s the difference between guessing and deciding.
      </p>

      <h2>How to build one that actually works</h2>
      <p>
        The mechanics are simple, but a handful of rules separate clean data
        from a mess:
      </p>
      <ul>
        <li>
          <strong>Be consistent with casing.</strong> Analytics treats{" "}
          <code>Email</code> and <code>email</code> as two separate mediums.
          Pick lowercase and never deviate. One stray capital letter splits
          your reporting in half.
        </li>
        <li>
          <strong>Encode spaces and special characters.</strong> A raw space
          breaks a URL. Use underscores (<code>summer_sale</code>) or let a
          builder encode the values for you.
        </li>
        <li>
          <strong>Only tag links you control from outside your site.</strong>{" "}
          Ads, emails, social posts, partner links: yes. Links between your own
          pages: no. Internal UTMs overwrite the original source and make it
          look like everyone arrived from your own website.
        </li>
        <li>
          <strong>
            Keep the tags before the <code>#</code> fragment.
          </strong>{" "}
          If your URL ends in an anchor like <code>#pricing</code>, the UTMs go
          before it: <code>/page?utm_source=x#pricing</code>, not{" "}
          <code>/page#pricing?utm_source=x</code>.
        </li>
        <li>
          <strong>Don&apos;t invent a new name every time.</strong> &quot;fb,&quot;
          &quot;facebook,&quot; &quot;FB-ads,&quot; and &quot;Facebook&quot; will
          each get their own row in your reports. Decide on one and write it
          down.
        </li>
      </ul>
      <p>
        That last point is the one that quietly ruins most tracking, which
        brings us to naming.
      </p>

      <h2>A naming convention that scales</h2>
      <p>
        The goal is that anyone on your team can look at a link and know what
        it&apos;s for, and that two people tagging the same channel produce the
        same tags. A simple, durable pattern:
      </p>
      <ul>
        <li>
          <strong>Source:</strong> the platform, lowercase (google, linkedin,
          klaviyo)
        </li>
        <li>
          <strong>Medium:</strong> the channel type, chosen from a short fixed
          list (cpc, email, social, referral, banner)
        </li>
        <li>
          <strong>Campaign:</strong> <code>year_quarter_initiative</code>{" "}
          (2026_q1_summer_sale)
        </li>
      </ul>
      <p>
        The campaign format is worth adopting even if you change nothing else.
        Dating your campaigns lets you compare this quarter&apos;s launch to last
        year&apos;s at a glance, and they sort cleanly in every report.
      </p>
      <blockquote>
        The single most valuable thing you can do for your analytics is agree on
        a short list of allowed sources and mediums, and then never type them
        by hand again.
      </blockquote>

      <h2>Common mistakes to avoid</h2>
      <ul>
        <li>
          <strong>Tagging internal links.</strong> The most common mistake and
          the most damaging. It resets the original source of every visitor who
          clicks.
        </li>
        <li>
          <strong>Mixed casing and spelling.</strong> <code>email</code> vs{" "}
          <code>Email</code>, <code>newsletter</code> vs <code>news-letter</code>
          . Every variant becomes a new line in your reports.
        </li>
        <li>
          <strong>Putting ad copy in utm_campaign.</strong> Campaign is for the
          initiative, not the keyword. Use <code>utm_term</code> and{" "}
          <code>utm_content</code> for the granular detail.
        </li>
        <li>
          <strong>No shared source of truth.</strong> If tags live in five
          people&apos;s heads, you&apos;ll end up with five naming systems. Keep
          them in one place.
        </li>
      </ul>

      <h2>Building UTMs without the busywork</h2>
      <p>
        You can absolutely write UTMs by hand. They&apos;re just text. But once
        you&apos;re running more than a handful of campaigns, doing it manually
        gets error-prone fast, and a single typo can hide a channel&apos;s real
        performance for a month.
      </p>
      <p>
        That&apos;s what we built{" "}
        <Link href="/app">UTMBuilder</Link> for. You set your approved sources,
        mediums, and campaign names once, then generate consistent, correctly
        encoded links, one at a time or dozens in bulk, so your reports stay
        clean no matter who on the team is making the links.
      </p>
    </>
  );
}

export const post: BlogPost = {
  slug: "what-is-a-utm",
  title: "What Is a UTM? A Plain-English Guide to Campaign Tracking",
  description:
    "A UTM is a tag you add to a URL to track where your traffic comes from. Here's what each parameter means, how to build one correctly, and the mistakes to avoid.",
  excerpt:
    "A UTM is a tag you add to a link to track where your traffic comes from. Here's what each parameter means, how to build one correctly, and the mistakes that quietly ruin most tracking.",
  datePublished: "2026-08-12",
  author: "The UTMBuilder Team",
  readingTime: "6 min read",
  keywords: [
    "what is a utm",
    "utm parameters",
    "utm tracking",
    "campaign tracking",
    "utm codes",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "google analytics utm",
  ],
  faqs: [
    {
      question: "What does UTM stand for?",
      answer:
        "UTM stands for Urchin Tracking Module. Urchin was a web analytics company Google acquired in 2005; its tracking parameters became the foundation of Google Analytics, and the name stuck.",
    },
    {
      question: "Are UTM parameters case-sensitive?",
      answer:
        "Yes. Google Analytics treats utm_source=Google and utm_source=google as two different sources. Pick one casing (lowercase is the common standard) and use it everywhere so your reporting doesn't split.",
    },
    {
      question: "Which UTM parameters are required?",
      answer:
        "Three are needed for useful reporting: utm_source, utm_medium, and utm_campaign. utm_term and utm_content are optional and mostly used for paid-search keywords and A/B testing.",
    },
    {
      question: "Do UTMs hurt SEO?",
      answer:
        "No, when used correctly. Only add UTMs to inbound links you control, such as ads, emails, and social posts. Never put them on internal links between your own pages, which can misattribute your traffic and, in rare cases, create duplicate-URL issues.",
    },
    {
      question: "What's the difference between a UTM and a tracking pixel?",
      answer:
        "A UTM lives in the URL and tells your analytics where a click came from. A tracking pixel is a snippet of code that fires when a page or email loads. They answer different questions and are often used together.",
    },
  ],
  Content,
};
