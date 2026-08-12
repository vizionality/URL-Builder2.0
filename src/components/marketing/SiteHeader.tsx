import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export function SiteLogo() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 font-bold text-white">
        U
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-zinc-900">
          {SITE_NAME}
        </p>
        <p className="text-xs leading-tight text-zinc-500">{SITE_TAGLINE}</p>
      </div>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <SiteLogo />
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/blog"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Blog
          </Link>
          <Link
            href="/sign-in"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
