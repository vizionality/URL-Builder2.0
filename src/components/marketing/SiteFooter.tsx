import Link from "next/link";
import { SiteLogo } from "@/components/marketing/SiteHeader";
import { BLOG_ENABLED, SITE_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <SiteLogo />
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {BLOG_ENABLED && (
            <Link href="/blog" className="text-zinc-600 hover:text-zinc-900">
              Blog
            </Link>
          )}
          <Link href="/app" className="text-zinc-600 hover:text-zinc-900">
            UTM Builder
          </Link>
          <Link href="/sign-in" className="text-zinc-600 hover:text-zinc-900">
            Sign in
          </Link>
          <Link href="/sign-up" className="text-zinc-600 hover:text-zinc-900">
            Get started
          </Link>
        </nav>
      </div>
      <div className="border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <p className="text-xs text-zinc-500">
            © {new Date().getFullYear()} {SITE_NAME}. Build, standardize &amp;
            track campaign URLs.
          </p>
        </div>
      </div>
    </footer>
  );
}
