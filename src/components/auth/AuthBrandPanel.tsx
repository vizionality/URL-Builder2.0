import { Table2, Sparkles, ArrowRight } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

const CARDS = [
  {
    icon: Table2,
    title: "Bulk Builder",
    body: "Create dozens of tagged URLs at once, organize them into projects, and export to CSV. No more spreadsheets that freeze.",
  },
  {
    icon: Sparkles,
    title: "Campaign Creator",
    body: "Standardize every campaign name in one format and keep your whole team tagging the same way.",
  },
];

// The promotional panel shown beside the auth form on large screens.
// NOTE: drop the Vizionality logo file into /public (e.g. vizionality.svg) and
// swap the wordmark below for <img src="/vizionality.svg" ... /> when available.
export function AuthBrandPanel() {
  return (
    <aside className="relative hidden w-1/2 shrink-0 overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-green-900 lg:flex">
      {/* Soft decorative glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/4 rounded-full bg-emerald-400/20 blur-3xl"
      />

      <div className="relative z-10 flex w-full flex-col justify-center px-12 py-16 xl:px-16">
        {/* Brand lockup */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white font-bold text-green-700">
            U
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">
              {SITE_NAME}
            </p>
            <p className="text-xs leading-tight text-green-100/80">
              by Vizionality
            </p>
          </div>
        </div>

        <h2 className="mt-10 max-w-md text-4xl font-bold leading-tight tracking-tight text-white">
          Build. Standardize. Track.
          <br />
          All in one place.
        </h2>
        <p className="mt-4 max-w-md text-green-50/90">
          Clean, consistent UTM links for your whole team, with real GA4
          reporting when you connect it.
        </p>

        <div className="mt-10 space-y-4">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {card.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-green-50/85">
                  {card.body}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-green-700">
                  Free to start
                  <ArrowRight size={13} />
                </span>
              </div>
            );
          })}
        </div>

        {/* Honest trust signals (no fabricated partner logos) */}
        <div className="mt-12">
          <p className="text-[11px] font-medium uppercase tracking-widest text-green-100/70">
            What you get
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Correct encoding, every time",
              "Shared naming for teams",
              "Free · no credit card",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-green-50/90"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
