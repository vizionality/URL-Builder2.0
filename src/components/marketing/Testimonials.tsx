import { TESTIMONIALS } from "@/lib/marketing/testimonials";

// Renders nothing until real testimonials exist. See the note in
// src/lib/marketing/testimonials.ts.
export function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          What marketers say
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={`${t.name}-${t.quote.slice(0, 24)}`}
              className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <blockquote className="text-sm leading-relaxed text-zinc-700">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-4">
                <p className="text-sm font-semibold text-zinc-900">{t.name}</p>
                <p className="text-xs text-zinc-500">{t.title}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
