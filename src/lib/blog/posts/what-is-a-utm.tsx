import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";

function Content() {
  return (
    <>
      <p>
        Let me tell you about the beast, because nobody else will give it to you
        straight. A UTM is a small, vicious little string of text you staple to
        the end of a link, and it does one job: it rats out where your visitors
        came from. Somebody clicks a tagged link and the tags ride shotgun all
        the way into Google Analytics, so instead of a gray fog labeled
        &quot;traffic&quot; you get names, dates, motives. Which ad. Which email.
        Which reckless post you fired off at midnight.
      </p>
      <p>
        That is the whole idea, and it is beautiful in its simplicity. The
        trouble, as always, lives in the details, and the details are where good
        people lose their minds and their data at the same time. So let us walk
        into it with our eyes open.
      </p>

      <h2>What the thing actually looks like</h2>
      <p>Here is an ordinary link with the tags bolted on:</p>
      <pre>
        <code>
          https://vizionality.com/pricing?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=2026_q1_launch
        </code>
      </pre>
      <p>
        Everything before the <code>?</code> is your normal page, minding its own
        business. Everything after it is the tracking, hitching a ride. Each tag
        is a <code>key=value</code> pair, strung together with <code>&amp;</code>.
        Read it in plain English and the link is confessing: this click came from
        the <strong>newsletter</strong> (the source), it rode in on{" "}
        <strong>email</strong> (the medium), and it belongs to the{" "}
        <strong>Q1 2026 launch</strong>.
      </p>
      <p>
        The visitor sees none of it. The page loads exactly the same. The tags
        are a private note your analytics reads in the dark.
      </p>

      <h2>The five parameters, and what they confess</h2>
      <p>
        There are five of them. You will lean on three like a crutch and reach
        for the other two now and then.
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
        Burn this into your skull so you never freeze again:{" "}
        <strong>source is the &quot;who,&quot; medium is the &quot;how.&quot;</strong>{" "}
        Facebook is a source; &quot;social&quot; or &quot;cpc&quot; is the how it
        got here. Mailchimp is a source; &quot;email&quot; is the how.
      </p>

      <h2>Why you should care, and care a lot</h2>
      <p>
        Skip the tags and your analytics tool starts guessing, and a guessing
        machine is a dangerous animal. It shovels your hard-won traffic into
        vague pits marked &quot;Direct&quot; and &quot;Referral&quot; and calls
        it a day. Fine, until the moment real money is on the line and you need to
        know what actually worked.
      </p>
      <p>
        Picture it. One landing page, three shots in a single week: a paid
        Instagram ad, a link in the newsletter, an organic LinkedIn post. Untagged,
        the three of them slop together into one anonymous heap and you learn
        nothing. Tagged, the truth stands up and salutes: the newsletter dragged
        in 40 sign-ups for free while the Instagram ad coughed up 12 for $300. Now
        you know where to point the money.
      </p>
      <p>
        Tags turn &quot;we got some traffic&quot; into &quot;this exact thing
        worked.&quot; That is the whole difference between guessing and deciding,
        and it is not a small one.
      </p>

      <h2>How to build one that does not fall apart</h2>
      <p>
        The mechanics are easy. A short list of rules is what stands between clean
        data and a swamp:
      </p>
      <ul>
        <li>
          <strong>Pick one casing and never blink.</strong> Analytics reads{" "}
          <code>Email</code> and <code>email</code> as two different animals. Go
          lowercase and stay there. One stray capital letter and your report
          splits down the middle like a bad marriage.
        </li>
        <li>
          <strong>Encode the spaces and the weird characters.</strong> A raw
          space is a live grenade in a URL. Use underscores (<code>summer_sale</code>)
          or let a builder handle the encoding while you look away.
        </li>
        <li>
          <strong>Only tag links you fire from outside your own house.</strong>{" "}
          Ads, emails, social posts, partner links: yes. Links between your own
          pages: no. Internal tags overwrite the real source and make it look
          like every soul on earth walked in through your own front door.
        </li>
        <li>
          <strong>
            Keep the tags in front of the <code>#</code> fragment.
          </strong>{" "}
          If the URL ends in an anchor like <code>#pricing</code>, the tags go
          before it: <code>/page?utm_source=x#pricing</code>, never{" "}
          <code>/page#pricing?utm_source=x</code>.
        </li>
        <li>
          <strong>Stop inventing a new name every time.</strong> &quot;fb,&quot;
          &quot;facebook,&quot; &quot;FB-ads,&quot; and &quot;Facebook&quot; each
          get their own lonely row in your report. Choose one and write it in
          blood.
        </li>
      </ul>
      <p>
        That last one is the quiet killer, which drags us straight to the
        question of naming.
      </p>

      <h2>A naming convention that survives contact</h2>
      <p>
        The goal is simple and brutal: anyone on the team can look at a link and
        know exactly what it is, and two people tagging the same channel spit out
        identical tags. A durable pattern:
      </p>
      <ul>
        <li>
          <strong>Source:</strong> the platform, lowercase (google, linkedin,
          klaviyo)
        </li>
        <li>
          <strong>Medium:</strong> the channel type, pulled from a short fixed
          list (cpc, email, social, referral, banner)
        </li>
        <li>
          <strong>Campaign:</strong> <code>year_quarter_initiative</code>{" "}
          (2026_q1_summer_sale)
        </li>
      </ul>
      <p>
        Adopt the campaign format even if you throw the rest away. Dating your
        campaigns lets you stack this quarter against last year at a glance, and
        they sort themselves clean in every report you ever open.
      </p>
      <blockquote>
        The single most valuable thing you can do for your analytics is agree on a
        short list of allowed sources and mediums, and then never type them by
        hand again.
      </blockquote>

      <h2>The mistakes that gut most tracking</h2>
      <ul>
        <li>
          <strong>Tagging internal links.</strong> The most common sin and the
          most damaging. It wipes the real source off every visitor who clicks.
        </li>
        <li>
          <strong>Mixed casing and spelling.</strong> <code>email</code> vs{" "}
          <code>Email</code>, <code>newsletter</code> vs <code>news-letter</code>
          . Every variant is a fresh, useless line in your report.
        </li>
        <li>
          <strong>Cramming ad copy into utm_campaign.</strong> Campaign is the
          initiative, not the keyword. Use <code>utm_term</code> and{" "}
          <code>utm_content</code> for the fine print.
        </li>
        <li>
          <strong>No shared source of truth.</strong> Leave the tags in five
          people&apos;s heads and you get five naming systems and one headache.
          Keep them in one place.
        </li>
      </ul>

      <h2>Building UTMs without losing your mind</h2>
      <p>
        You can write these by hand. They are only text. But the moment you are
        running more than a handful of campaigns, the manual grind turns feral,
        and one lazy typo can bury a whole channel&apos;s real numbers for a
        month before anyone notices.
      </p>
      <p>
        That is exactly why we built{" "}
        <Link href="/app">UTMBuilder</Link>. Set your approved sources, mediums,
        and campaign names once, then fire off consistent, correctly encoded
        links, one at a time or by the dozen, and your reports stay clean no
        matter who on the crew is doing the tagging. Buy the ticket, take the ride,
        but at least tag the ride so you know where it went.
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
    "A UTM is a small, vicious string of text that rats out where your visitors came from. Here is what each parameter confesses, how to build one that does not fall apart, and the mistakes that gut most tracking.",
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
