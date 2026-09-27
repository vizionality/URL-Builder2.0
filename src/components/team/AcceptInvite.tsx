"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

export function AcceptInvite({
  token,
  inviteEmail,
  role,
  ownerEmail,
  signedInEmail,
}: {
  token: string;
  inviteEmail: string;
  role: string;
  ownerEmail: string;
  signedInEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = signedInEmail.toLowerCase() === inviteEmail.toLowerCase();

  async function accept() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) setError(d?.error ?? "Couldn't accept the invite.");
    else router.push("/clients");
  }

  return (
    <>
      <Users className="h-6 w-6 text-green-600" />
      <h1 className="mt-3 text-lg font-semibold text-zinc-900">Join {ownerEmail}&apos;s team</h1>
      <p className="mt-1 text-sm text-zinc-500">
        You&apos;re invited as <span className="font-medium capitalize text-zinc-700">{role}</span> ({inviteEmail}).
      </p>
      {!matches ? (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You&apos;re signed in as {signedInEmail || "someone else"}. Sign out and sign in with {inviteEmail} to accept.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-zinc-400">
            While you&apos;re on this team, the app shows this team&apos;s clients instead of your own.
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={accept}
            disabled={busy}
            className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {busy ? "Joining…" : "Accept invite"}
          </button>
        </>
      )}
    </>
  );
}
