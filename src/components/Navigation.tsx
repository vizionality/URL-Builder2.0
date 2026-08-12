"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, UserRound, X } from "lucide-react";
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

export type SidebarProfile = {
  email: string;
  name: string;
  avatarUrl: string | null;
};

function ProfileMenu({ profile }: { profile?: SidebarProfile }) {
  const pathname = usePathname();
  const active = pathname === "/account";
  const initial =
    (profile?.name || profile?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <Link
      href="/account"
      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
        active ? "bg-green-50" : "hover:bg-zinc-100"
      }`}
    >
      {profile?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Google avatar URL, no loader needed
        <img
          src={profile.avatarUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
          {initial}
        </span>
      )}
      <span className="min-w-0">
        <span
          className={`block truncate text-sm font-medium ${
            active ? "text-green-700" : "text-zinc-900"
          }`}
        >
          {profile?.name || "Account"}
        </span>
        {profile?.email && (
          <span className="block truncate text-xs text-zinc-400">
            {profile.email}
          </span>
        )}
      </span>
    </Link>
  );
}

export function Sidebar({ profile }: { profile?: SidebarProfile }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
      <Logo />
      <nav data-tour="nav" className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          if (item.comingSoon) {
            return (
              <div
                key={item.href}
                aria-disabled="true"
                title="Coming Soon"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300"
              >
                <Icon size={18} />
                <span>{item.label}</span>
                <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  Soon
                </span>
              </div>
            );
          }
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
      <div className="space-y-1 border-t border-zinc-200 px-3 py-3">
        <ProfileMenu profile={profile} />
        <SignOutButton />
      </div>
    </aside>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the menu on navigation.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setOpen(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Close on Escape, and lock body scroll while the overlay is open.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-sm font-bold text-white">
            U
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-zinc-900">
              UTMBuilder
            </p>
            <p className="text-[10px] leading-tight text-zinc-500">
              Campaign Tracker
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black/30"
          />
          <nav className="fixed inset-x-0 top-0 z-40 max-h-[85vh] overflow-y-auto rounded-b-xl border-b border-zinc-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-sm font-bold text-white">
                  U
                </div>
                <p className="text-sm font-semibold text-zinc-900">UTMBuilder</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1 p-3">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                if (item.comingSoon) {
                  return (
                    <div
                      key={item.href}
                      aria-disabled="true"
                      title="Coming Soon"
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300"
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                      <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                        Soon
                      </span>
                    </div>
                  );
                }
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
            </div>
            <div className="space-y-1 border-t border-zinc-200 p-3">
              <Link
                href="/account"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === "/account"
                    ? "bg-green-50 text-green-700"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <UserRound size={18} />
                Account
              </Link>
              <SignOutButton className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-60" />
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
