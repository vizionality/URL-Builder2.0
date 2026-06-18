"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { SignOutButton } from "@/components/auth/SignOutButton";

function Logo() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 font-bold text-white">
        U
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-zinc-900">UTMBuilder</p>
        <p className="text-xs leading-tight text-zinc-500">Campaign Tracker</p>
      </div>
    </div>
  );
}

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
      <Logo />
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-green-50 text-green-700"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 px-3 py-3">
        {userEmail && (
          <p className="mb-1 truncate px-3 text-xs text-zinc-400" title={userEmail}>
            {userEmail}
          </p>
        )}
        <SignOutButton />
      </div>
    </aside>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-3 py-2 md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              active
                ? "bg-green-50 text-green-700"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Icon size={14} />
            {item.label}
          </Link>
        );
      })}
      <SignOutButton className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-600 hover:bg-zinc-100 disabled:opacity-60" />
    </nav>
  );
}
