"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";
const labelClass = "block text-sm font-medium text-zinc-700 mb-1";

type Profile = {
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: string;
  createdAt: string | null;
  lastSignInAt: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function providerLabel(provider: string): string {
  if (provider === "google") return "Google";
  if (provider === "email") return "Email & password";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function AccountClient({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  const isEmailUser = profile.provider === "email";
  const initial =
    (profile.name || profile.email || "?").trim().charAt(0).toUpperCase();

  // Display name
  const [name, setName] = useState(profile.name);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setNameSaving(true);
    setNameMessage(null);
    setNameError(null);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });
    if (error) {
      setNameError(error.message);
    } else {
      setNameMessage("Display name updated.");
      router.refresh();
    }
    setNameSaving(false);
  }

  // Password
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);
    setPwError(null);
    if (password !== confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPwError(error.message);
    } else {
      setPwMessage("Password updated.");
      setPassword("");
      setConfirm("");
    }
    setPwSaving(false);
  }

  return (
    <>
      <Header title="Account" subtitle="Manage your profile and sign-in details" />
      <main className="flex-1 space-y-6 px-4 py-6 sm:px-6">
        <Card title="Profile">
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Google avatar URL, no loader needed
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-semibold text-green-700">
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-zinc-900">
                {profile.name || "—"}
              </p>
              <p className="truncate text-sm text-zinc-500">{profile.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Sign-in method
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {providerLabel(profile.provider)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Email
              </dt>
              <dd className="mt-1 break-all text-sm text-zinc-900">
                {profile.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Account created
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {formatDate(profile.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Last sign-in
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {formatDate(profile.lastSignInAt)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Display name"
          description="This name is shown across your account."
        >
          <form onSubmit={handleNameSave} className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="name">
                Display name
              </label>
              <input
                id="name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            {nameError && <p className="text-sm text-red-600">{nameError}</p>}
            {nameMessage && (
              <p className="text-sm text-green-700">{nameMessage}</p>
            )}
            <button
              type="submit"
              disabled={nameSaving || name.trim() === profile.name}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {nameSaving ? "Saving…" : "Save"}
            </button>
          </form>
        </Card>

        {isEmailUser && (
          <Card
            title="Password"
            description="Change the password you use to sign in."
          >
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="password">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="confirm">
                  Confirm new password
                </label>
                <input
                  id="confirm"
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  className={inputClass}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {pwError && <p className="text-sm text-red-600">{pwError}</p>}
              {pwMessage && <p className="text-sm text-green-700">{pwMessage}</p>}
              <button
                type="submit"
                disabled={pwSaving || password.length < 6}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {pwSaving ? "Updating…" : "Update password"}
              </button>
            </form>
          </Card>
        )}

        <Card
          title="Sign out"
          description="Sign out of UTM Builder on this device."
        >
          <SignOutButton className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60" />
        </Card>
      </main>
    </>
  );
}
