import Link from "next/link";
import type { BlogPost } from "@/lib/blog/types";

function Content() {
  return (
    <>
      <p>
        Here is a report almost every growing team eventually opens: the traffic
        source list in Google Analytics, showing <code>facebook</code>,{" "}
        <code>Facebook</code>, <code>fb</code>, <code>FB-Ads</code>, and{" "}
        <code>facebook.com</code> as five separate rows. Each one is a real
        campaign. Each one was tagged by a real person doing their best. And
        together they have quietly split one channel into five, so nobody can say
        with confidence what Facebook actually drove last quarter.
      </p>
      <p>
        This is not a discipline problem. It is a missing source of truth. When
        several people build UTMs and there is no shared definition of the right
        values, drift is not a risk, it is a certainty. Here is how to fix it
        without turning yourself into the naming police.
      </p>

      <h2>Why team UTMs drift</h2>
      <p>
        Nobody sets out to break the reports. Drift happens because of a few
        ordinary things:
      </p>
      <ul>
        <li>
          <strong>Tribal knowledge.</strong> The conventions live in one
          person&apos;s head, or in a Slack message from eight months ago.
        </li>
        <li>
          <strong>Copy-paste archaeology.</strong> People grab an old link and
          edit it, inheriting whatever inconsistency it already had.
        </li>
        <li>
          <strong>Reasonable disagreement.</strong> Is it <code>newsletter</code>{" "}
          or <code>email</code>? Both are defensible, so different people pick
          differently.
        </li>
        <li>
          <strong>New hires.</strong> Every new marketer invents their own system
          until someone tells them otherwise, and often no one does.
        </li>
      </ul>
      <p>
        The common thread is that tagging depends on memory and guesswork. A
        source of truth removes both.
      </p>

      <h2>What a source of truth actually is</h2>
      <p>
        It is not a document. Documents are where conventions go to be ignored. A
        real source of truth has three parts:
      </p>
      <ul>
        <li>
          <strong>An approved list of values.</strong> The exact sources and
          mediums your team is allowed to use, written down in one place.
        </li>
        <li>
          <strong>A naming format.</strong> One pattern for campaign names, like{" "}
          <code>year_quarter_initiative</code>, so <code>2026_q1_launch</code> is
          the only correct way to write it.
        </li>
        <li>
          <strong>A way to pick, not type.</strong> The part that makes it stick.
          If people select from a dropdown of approved values, they cannot
          misspell them.
        </li>
      </ul>
      <p>
        That last point is the whole game. A convention you have to remember will
        be broken. A convention built into the tool people already use will not.
      </p>

      <h2>Rolling it out without a fight</h2>
      <ol>
        <li>
          <strong>Agree on the lists.</strong> Get the team in a room for thirty
          minutes and settle the sources and mediums. Keep the medium list short.
          Six or seven values cover almost everything.
        </li>
        <li>
          <strong>Pick one naming format and write one example.</strong> People
          copy examples far more reliably than they follow rules.
        </li>
        <li>
          <strong>Put the lists where the links get built.</strong> If the
          approved values are dropdowns in your builder, adoption is automatic.
          If they are in a wiki, adoption is aspirational.
        </li>
        <li>
          <strong>Give it one owner.</strong> One person or a small group owns the
          lists and approves additions. Everyone else builds from them. Ownership
          without a bottleneck.
        </li>
        <li>
          <strong>Review once a month.</strong> Open your source and medium
          report. A brand new variant of an existing channel is your early
          warning that someone tagged outside the standard. Fix it while it is one
          row, not fifty.
        </li>
      </ol>

      <h2>The payoff</h2>
      <p>
        When everyone tags from the same list, a few things change at once. Your
        channel reports collapse back down to one row per channel. New team
        members are productive on day one because they pick from a menu instead of
        guessing. And you stop having the quarterly conversation that starts with
        &quot;wait, which of these five Facebook rows is the real one?&quot;
      </p>

      <h2>How UTMBuilder gives you one source of truth</h2>
      <p>
        This is the exact problem the <Link href="/app">UTM Options</Link> and
        Campaign Creator features were built for. You set your approved sources
        and mediums once, and every builder in the app, single or bulk, pulls
        from that same list. Campaign names come out in one consistent format
        automatically. New marketers pick from dropdowns instead of inventing
        their own spelling, and every link the team builds is saved in shared
        projects so nothing gets lost. The standard stops being a document and
        becomes the path of least resistance.
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
    "Five people, five spellings of facebook, and a report nobody trusts. Here is how to build a single source of truth for UTM tagging that your whole team follows, without becoming the naming police.",
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
