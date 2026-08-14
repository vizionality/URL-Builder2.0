import type { ReactNode } from "react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

// Shared shell for the public Privacy Policy and Terms pages: marketing
// header/footer plus a readable, prose-styled article column.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-zinc-500">Last updated: {updated}</p>
        </header>
        <article className="space-y-6 text-[15px] leading-relaxed text-zinc-700 [&_a]:font-medium [&_a]:text-green-700 [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
