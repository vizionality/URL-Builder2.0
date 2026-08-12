import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check } from "lucide-react";
import { HeroBuilder } from "./HeroBuilder";

export function CampaignHero({
  eyebrow,
  icon: Icon,
  title,
  subtitle,
  bullets = [],
}: {
  eyebrow: string;
  icon?: LucideIcon;
  title: string;
  subtitle: string;
  bullets?: string[];
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            {Icon && <Icon size={14} />}
            {eyebrow}
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-lg text-lg text-zinc-600">{subtitle}</p>
          {bullets.length > 0 && (
            <ul className="mt-6 space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <Check size={13} />
                  </span>
                  <span className="text-sm text-zinc-700">{b}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
            >
              Start building free
              <ArrowRight size={16} />
            </Link>
            <p className="mt-3 text-sm text-zinc-500">
              Free to start, no credit card required
            </p>
          </div>
        </div>

        {/* The no-signup builder stays visible on every landing page. */}
        <div className="relative">
          <HeroBuilder />
        </div>
      </div>
    </section>
  );
}
