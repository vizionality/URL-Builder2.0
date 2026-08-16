import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";

function Content() {
  return (
    <>
      <p>
        There is a report every growing team opens exactly once before the cold
        sweat sets in. It is the traffic source list in Google Analytics, and
        there they are, lined up like mugshots: <code>facebook</code>,{" "}
        <code>Facebook</code>, <code>fb</code>, <code>FB-Ads</code>, and{" "}
        <code>facebook.com</code>. Five separate rows. Every one of them a real
        campaign built by a real person doing their honest best. And together they
        have quietly hacked one channel into five pieces, so now nobody in the
        building can say with a straight face what Facebook actually did last
        quarter.
      </p>
      <p>
        This is not a discipline problem. Nobody woke up wanting to torch the
        reports. It is a missing source of truth, and when several people build
        tags with no shared definition of the right values, drift is not a risk,
        it is a law of nature. Here is how to fix it without appointing yourself
        sheriff of the naming police.
      </p>

      <h2>Why team tags drift into the swamp</h2>
      <p>
        No conspiracy here, just the usual small human failures piling up:
      </p>
      <ul>
        <li>
          <strong>Tribal knowledge.</strong> The convention lives in one
          person&apos;s skull, or in a Slack message that scrolled into the abyss
          eight months ago.
        </li>
        <li>
          <strong>Copy-paste archaeology.</strong> People dig up an old link and
          edit it, inheriting whatever disease it was already carrying.
        </li>
        <li>
          <strong>Honest disagreement.</strong> Is it <code>newsletter</code> or{" "}
          <code>email</code>? Both are defensible, so two reasonable people pick
          two different answers and both feel righteous.
        </li>
        <li>
          <strong>New hires.</strong> Every fresh marketer invents a private
          system until somebody stops them, and usually nobody does.
        </li>
      </ul>
      <p>
        The thread running through all of it is the same: tagging leans on memory
        and guesswork. A source of truth takes both out behind the barn.
      </p>

      <h2>What a source of truth actually is</h2>
      <p>
        It is not a document. Documents are where good conventions crawl off to
        die. A real source of truth has three moving parts:
      </p>
      <ul>
        <li>
          <strong>An approved list of values.</strong> The exact sources and
          mediums your team is allowed to use, written in one place and only one
          place.
        </li>
        <li>
          <strong>A naming format.</strong> One pattern for campaign names, like{" "}
          <code>year_quarter_initiative</code>, so <code>2026_q1_launch</code> is
          the only spelling that counts as correct.
        </li>
        <li>
          <strong>A way to pick, not type.</strong> This is the part that keeps
          the whole thing alive. If people select from a dropdown of approved
          values, they physically cannot misspell them.
        </li>
      </ul>
      <p>
        That last one is the entire ballgame. A convention you have to remember
        will be broken by Tuesday. A convention wired into the tool people already
        use will not.
      </p>

      <h2>Rolling it out without starting a war</h2>
      <ol>
        <li>
          <strong>Agree on the lists.</strong> Get the team in a room for thirty
          minutes and settle the sources and mediums like adults. Keep the medium
          list short. Six or seven values cover nearly the whole world.
        </li>
        <li>
          <strong>Pick one naming format and write one example.</strong> People
          copy a good example far more faithfully than they follow a rule.
        </li>
        <li>
          <strong>Put the lists where the links are actually born.</strong> If the
          approved values are dropdowns in the builder, adoption happens on its
          own. If they are in a wiki, adoption is a prayer.
        </li>
        <li>
          <strong>Give it one owner.</strong> One person or a small crew owns the
          lists and blesses additions. Everyone else builds from them. Ownership
          without a bottleneck.
        </li>
        <li>
          <strong>Review once a month.</strong> Open the source and medium report
          and read it like a police scanner. A brand new variant of an existing
          channel is your first sign somebody tagged off the reservation. Fix it
          while it is one row, not fifty.
        </li>
      </ol>

      <h2>The payoff, and it is a real one</h2>
      <p>
        When everyone tags from the same list, a few things happen at once and all
        of them feel like relief. Your channel reports collapse back to one honest
        row per channel. New hires are useful on day one because they pick from a
        menu instead of guessing in the dark. And you never again have to open the
        quarterly meeting with &quot;wait, which of these five Facebook rows is the
        real one?&quot;
      </p>

      <h2>How UTMBuilder hands you one source of truth</h2>
      <p>
        This is the precise mess the <Link href="/app">UTM Options</Link> and
        Campaign Creator features were built to end. You set your approved sources
        and mediums once, and every builder in the app, single or bulk, drinks
        from that same well. Campaign names come out in one format without anyone
        thinking about it. New marketers pick from dropdowns instead of inventing
        their own dialect, and every link the team builds gets saved into shared
        projects so nothing wanders off. The standard stops being a document and
        becomes the path of least resistance, which is the only kind of standard
        anyone ever actually follows.
      </p>
    </>
  );
}

export const post: BlogPost = {
  slug: "utm-single-source-of-truth-for-teams",
  title: "One Source of Truth for UTMs: Keeping a Team Consistent",
  description:
    "When several people build UTMs, naming drifts and your reports fragment. Here is how to create a single source of truth for UTM tagging that a whole team will actually follow.",
  excerpt:
    "Five people, five spellings of facebook lined up like mugshots, and a report nobody trusts. Here is how to build a single source of truth for UTM tagging your whole team follows, without becoming the naming police.",
  datePublished: "2026-08-15",
  author: "The UTMBuilder Team",
  readingTime: "6 min read",
  keywords: [
    "utm source of truth",
    "team utm naming",
    "utm governance",
    "utm naming convention for teams",
    "consistent utm tagging",
    "utm taxonomy",
  ],
  faqs: [
    {
      question: "What is a UTM source of truth?",
      answer:
        "One agreed place that defines the exact sources, mediums, and naming format everyone uses, so two people tagging the same channel produce identical tags. It works best when those values are dropdowns people pick from, not a document they have to remember.",
    },
    {
      question: "How do I get my team to follow a UTM convention?",
      answer:
        "Make it easier to follow than to ignore. Give people a dropdown of approved sources and mediums instead of a rules document, so they pick correct values rather than typing and misspelling them.",
    },
    {
      question: "Who should own UTM naming on a team?",
      answer:
        "One person or a small group owns the approved lists and the naming format and approves additions. Everyone else builds from that list. It is ownership without turning that person into a bottleneck.",
    },
    {
      question: "How often should we review our UTMs?",
      answer:
        "A quick monthly look at your source and medium report catches drift early. A brand new variant of an existing channel is the signal that someone tagged outside the standard, and it is far easier to fix when it is one row instead of fifty.",
    },
  ],
  Content,
};
