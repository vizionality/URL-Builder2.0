"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { MEMBER_ROLES, type MemberRole } from "@/lib/roles";

type Member = {
  id: string;
  email: string;
  role: MemberRole;
  clients: string[] | null;
  status: "active" | "invited";
  inviteToken: string | null;
};
type ClientItem = { slug: string; name: string };

const selectClass =
  "rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

// Team members and roles (agency plan). Admins and the owner manage it.
export default function TeamPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [plan, setPlan] = useState<"business" | "agency">("business");
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("analyst");
  const [picked, setPicked] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/team")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setMembers(d.members);
        setPlan(d.plan);
      })
      .catch((e) => setError(e instanceof Error && e.message ? e.message : "Couldn't load the team."));
  }, []);
  useEffect(() => {
    load();
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => {});
  }, [load]);

  const inviteLink = (token: string) => `${window.location.origin}/invite/${token}`;
  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Copy this invite link:", inviteLink(token));
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role, clients: picked }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) {
      setError(d?.error ?? "Couldn't invite.");
      return;
    }
    setEmail("");
    setPicked(null);
    load();
    if (d.member?.inviteToken) copy(d.member.inviteToken);
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const r = await fetch("/api/team", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) setError(d?.error ?? "Couldn't update.");
    load();
  }

  async function remove(m: Member) {
    if (!window.confirm(`Remove ${m.email} from the team?`)) return;
    await fetch(`/api/team?id=${encodeURIComponent(m.id)}`, { method: "DELETE" }).catch(() => null);
    load();
  }

  const clientName = (slug: string) => clients.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <>
      <Header title="Team" subtitle="Invite people and choose what they can do" />
      <main className="flex-1 space-y-6 px-4 py-6 sm:px-6">
        {plan !== "agency" && members && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Team members are part of the Agency plan.</p>
        )}
        <Card title="Invite a team member" description="You'll get an invite link to send. They sign in with the invited email to join.">
          <form onSubmit={invite} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agency.com"
                className="min-w-56 flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className={selectClass} aria-label="Role">
                {MEMBER_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-zinc-500">{MEMBER_ROLES.find((r) => r.id === role)?.description}</p>
            <ClientPicker clients={clients} value={picked} onChange={setPicked} />
            <button
              type="submit"
              disabled={busy || plan !== "agency"}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} Create invite link
            </button>
          </form>
        </Card>

        <Card title="Members">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          {!members ? (
            !error && <p className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 size={14} className="animate-spin" /> Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-zinc-500">No team members yet. It&apos;s just you.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800">{m.email}</p>
                    <p className="text-xs text-zinc-400">
                      {m.status === "invited" ? "Invite not accepted yet" : "Active"} ·{" "}
                      {m.clients === null ? "All clients" : m.clients.length === 0 ? "No clients" : m.clients.map(clientName).join(", ")}
                    </p>
                  </div>
                  <select value={m.role} onChange={(e) => patch(m.id, { role: e.target.value })} className={selectClass} aria-label={`Role for ${m.email}`}>
                    {MEMBER_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">Clients</summary>
                    <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                      <ClientPicker clients={clients} value={m.clients} onChange={(v) => patch(m.id, { clients: v })} />
                    </div>
                  </details>
                  {m.inviteToken && (
                    <button type="button" onClick={() => copy(m.inviteToken!)} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                      {copied === m.inviteToken ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Invite link</>}
                    </button>
                  )}
                  <button type="button" onClick={() => remove(m)} aria-label={`Remove ${m.email}`} className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}

// All clients, or a chosen list.
function ClientPicker({ clients, value, onChange }: { clients: ClientItem[]; value: string[] | null; onChange: (v: string[] | null) => void }) {
  return (
    <div className="space-y-1.5 text-sm">
      <label className="flex items-center gap-2 text-zinc-700">
        <input type="radio" checked={value === null} onChange={() => onChange(null)} /> All clients
      </label>
      <label className="flex items-center gap-2 text-zinc-700">
        <input type="radio" checked={value !== null} onChange={() => onChange(value ?? [])} /> Only these clients
      </label>
      {value !== null && (
        <div className="ml-6 max-h-40 space-y-1 overflow-y-auto">
          {clients.map((c) => (
            <label key={c.slug} className="flex items-center gap-2 text-zinc-600">
              <input
                type="checkbox"
                checked={value.includes(c.slug)}
                onChange={(e) => onChange(e.target.checked ? [...value, c.slug] : value.filter((s) => s !== c.slug))}
              />
              {c.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
