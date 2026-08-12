import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check } from "lucide-react";

export type FeatureSectionProps = {
  eyebrow: string;
  icon: LucideIcon;
  title: string;
  body: string;
  benefits: string[];
  visual: React.ReactNode;
  /** Place the visual on the left (desktop) for alternating layouts. */
  reverse?: boolean;
  /** Tint the section background for alternating rhythm. */
  tint?: boolean;
  /** Optional badge, e.g. "Coming soon". */
  badge?: string;
};

export function FeatureSection({
  eyebrow,
  icon: Icon,
  title,
  body,
  benefits,
  visual,
  reverse = false,
  tint = false,
  badge,
}: FeatureSectionProps) {
  return (
    <section
      className={`border-t border-zinc-200 ${tint ? "bg-zinc-50" : "bg-white"}`}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
        {/* Copy (always first in the DOM so mobile leads with it) */}
        <div className={reverse ? "lg:order-2" : "lg:order-1"}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <Icon size={14} />
              {eyebrow}
            </span>
            {badge && (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                {badge}
              </span>
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-zinc-600">{body}</p>
          <ul className="mt-6 space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <Check size={13} />
                </span>
                <span className="text-sm text-zinc-700">{b}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/sign-up"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-green-600 px-5 py-3 text-sm font-medium text-white hover:bg-green-700"
          >
            Start building free
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Visual */}
        <div className={reverse ? "lg:order-1" : "lg:order-2"}>{visual}</div>
      </div>
    </section>
  );
}
