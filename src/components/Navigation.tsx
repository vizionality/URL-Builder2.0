"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, UserRound } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useWorkspace } from "@/lib/workspace-context";

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

function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, loading, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (loading) {
    return (
      <div className="mx-3 mb-2 h-9 animate-pulse rounded-lg bg-zinc-100" />
    );
  }

  if (workspaces.length === 0) return null;

  return (
    <div className="relative mx-3 mb-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <span className="truncate">{activeWorkspace?.name ?? "Select workspace"}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
          <ul className="max-h-64 overflow-y-auto">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspace?.id;
              return (
                <li key={workspace.id}>
                  <button
                    type="button"
                    onClick={() => {
                      switchWorkspace(workspace.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-50"
                  >
                    <Check
                      size={14}
                      className={isActive ? "text-green-600" : "text-transparent"}
                    />
                    <span
                      className={`truncate ${
                        isActive ? "font-medium text-green-700" : "text-zinc-700"
                      }`}
                    >
                      {workspace.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
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
      <WorkspaceSwitcher />
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          if (item.comingSoon) {
            return (
              <div
                key={item.href}
                aria-disabled="true"
                title="Coming soon"
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
  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-3 py-2 md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        if (item.comingSoon) {
          return (
            <div
              key={item.href}
              aria-disabled="true"
              title="Coming soon"
              className="flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-300"
            >
              <Icon size={14} />
              {item.label}
              <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
                Soon
              </span>
            </div>
          );
        }
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
      <Link
        href="/account"
        className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
          pathname === "/account"
            ? "bg-green-50 text-green-700"
            : "text-zinc-600 hover:bg-zinc-100"
        }`}
      >
        <UserRound size={14} />
        Account
      </Link>
      <SignOutButton className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-600 hover:bg-zinc-100 disabled:opacity-60" />
    </nav>
  );
}
