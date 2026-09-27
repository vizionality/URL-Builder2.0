"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Loader2, Plus, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { GoogleAnalyticsIcon, SearchConsoleIcon } from "@/components/integrations/IntegrationIcons";
import { siteLabel } from "@/lib/gsc-report";
import { matchSite } from "@/lib/site-match";

type Account = {
  id: string;
  email: string;
  properties: { id: string; name: string; account: string }[];
  sites: string[];
  error: string | null;
};
type Data = { plan: "business" | "agency"; limits: { clients: number | null; googleAccounts: number | null }; accounts: Account[] };
type Draft = {
  step: number;
  name: string;
  website: string;
  property: { accountId: string; id: string; name: string } | null;
  site: { accountId: string; url: string } | null;
};

const DRAFT_KEY = "addClientDraft";
const EMPTY: Draft = { step: 0, name: "", website: "", property: null, site: null };
const STEPS = ["Client", "Google Analytics", "Search Console", "Review"];
const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

// The draft survives the round trip to Google when connecting another login.
function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

// Add client wizard (agency mode): name and website, GA4 property from any
// connected Google login, the matching Search Console site, then create.
export default function AddClientPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clientsInfo, setClientsInfo] = useState<{ canAddClient: boolean; count: number } | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const s = new URLSearchParams(window.location.search).get("ga4");
    if (s === "connected") return "Google account connected.";
    if (s === "plan_limit") return "Your Business plan includes one Google account. Upgrade to Agency to connect more.";
    if (s === "error" || s === "norefresh") return "Connecting to Google didn't finish. Try again.";
    return null;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved draft once on mount
    setDraft(loadDraft());
    fetch("/api/google-accounts")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setLoadError(e instanceof Error && e.message ? e.message : "Couldn't load Google accounts."));
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setClientsInfo({ canAddClient: Boolean(d.canAddClient), count: (d.clients ?? []).length }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage blocked: the draft just won't survive a reload.
    }
  }, [draft]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const allSites = useMemo(
    () => (data?.accounts ?? []).flatMap((a) => a.sites.map((url) => ({ accountId: a.id, url }))),
    [data]
  );
  const atGoogleLimit = data?.limits.googleAccounts != null && data.accounts.length >= data.limits.googleAccounts;

  // Entering the Search Console step: pick the site matching the website.
  function goToSites() {
    let site = draft.site;
    if (!site) {
      const match = matchSite(draft.website, allSites.map((s) => s.url));
      const hit = match ? allSites.find((s) => s.url === match) : undefined;
      if (hit) site = hit;
    }
    update({ step: 2, site });
  }

  async function create() {
    setSaving(true);
    setSaveError(null);
    const r = await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        domain: draft.website,
        googleAccountId: draft.property?.accountId,
        propertyId: draft.property?.id,
        propertyName: draft.property?.name,
        gscGoogleAccountId: draft.site?.accountId,
        gscSiteUrl: draft.site?.url,
      }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setSaving(false);
    if (!r?.ok) {
      setSaveError(d?.error ?? "Couldn't add the client.");
      return;
    }
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
    router.push(`/c/${d.client.slug}/dashboard`);
  }

  const connectHref = "/api/ga4/oauth/start?return=clients-new";
  const q = query.trim().toLowerCase();

  if (clientsInfo && !clientsInfo.canAddClient) {
    return (
      <>
        <Header title="Add client" subtitle="Agency plan" />
        <main className="flex-1 px-4 py-6 sm:px-6">
          <Card title="Your plan includes one client" description="The Business plan covers one business and one Google Analytics account.">
            <p className="text-sm text-zinc-600">
              Upgrade to the Agency plan to manage several clients, each with its own GA4 property, Search Console site
              and dashboards, and to connect more than one Google account.
            </p>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Add client" subtitle="Connect a client's Google Analytics and Search Console" />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    i < draft.step ? "bg-green-600 text-white" : i === draft.step ? "border-2 border-green-600 text-green-700" : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {i < draft.step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={i === draft.step ? "font-medium text-zinc-900" : "text-zinc-500"}>{label}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-zinc-200" />}
              </li>
            ))}
          </ol>

          {notice && <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}
          {loadError && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}

          {draft.step === 0 && (
            <Card title="Client details">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.name.trim()) update({ step: 1 });
                }}
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor="client-name">Client name</label>
                  <input id="client-name" autoFocus required maxLength={80} className={inputClass} value={draft.name}
                    onChange={(e) => update({ name: e.target.value })} placeholder="Hearthside Doors" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor="client-site">Website</label>
                  <input id="client-site" className={inputClass} value={draft.website}
                    onChange={(e) => update({ website: e.target.value })} placeholder="hearthsidedoors.com" />
                  <p className="mt-1 text-xs text-zinc-400">Used to find the matching Search Console site.</p>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={!draft.name.trim()}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                    Next
                  </button>
                </div>
              </form>
            </Card>
          )}

          {draft.step === 1 && (
            <Card title="Google Analytics property" description="Properties from every Google account you've connected.">
              <div className="mb-3 flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5">
                <Search className="h-4 w-4 text-zinc-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search properties"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
              </div>
              {!data ? (
                <p className="flex items-center gap-2 py-4 text-sm text-zinc-400"><Loader2 size={14} className="animate-spin" /> Loading properties…</p>
              ) : (
                <div className="max-h-96 space-y-4 overflow-y-auto">
                  {data.accounts.length === 0 && <p className="text-sm text-zinc-500">No Google account connected yet.</p>}
                  {data.accounts.map((a) => {
                    const props = a.properties.filter((p) => !q || `${p.name} ${p.account} ${p.id}`.toLowerCase().includes(q));
                    return (
                      <div key={a.id}>
                        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          <GoogleAnalyticsIcon className="h-4 w-4" /> {a.email}
                        </p>
                        {a.error && <p className="text-sm text-red-600">{a.error}</p>}
                        {!a.error && props.length === 0 && <p className="text-sm text-zinc-400">No matching properties.</p>}
                        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
                          {props.map((p) => {
                            const on = draft.property?.id === p.id && draft.property.accountId === a.id;
                            return (
                              <li key={p.id}>
                                <button type="button" onClick={() => update({ property: { accountId: a.id, id: p.id, name: p.name } })}
                                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${on ? "bg-green-50" : "hover:bg-zinc-50"}`}>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-zinc-800">{p.name}</span>
                                    <span className="block truncate text-xs text-zinc-400">{p.account} · {p.id}</span>
                                  </span>
                                  {on && <Check className="h-4 w-4 text-green-600" />}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4">
                {atGoogleLimit ? (
                  <p className="text-xs text-zinc-500">Connecting more Google accounts is part of the Agency plan.</p>
                ) : (
                  <a href={connectHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline">
                    <Plus className="h-4 w-4" /> Connect another Google account
                  </a>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => update({ step: 0 })} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                  <button type="button" onClick={goToSites} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                    {draft.property ? "Next" : "Skip for now"}
                  </button>
                </div>
              </div>
            </Card>
          )}

          {draft.step === 2 && (
            <Card title="Search Console site" description="Sites from every connected Google account. The one matching the website is picked for you.">
              {!data ? (
                <p className="flex items-center gap-2 py-4 text-sm text-zinc-400"><Loader2 size={14} className="animate-spin" /> Loading sites…</p>
              ) : allSites.length === 0 ? (
                <p className="text-sm text-zinc-500">No verified Search Console sites on your connected Google accounts.</p>
              ) : (
                <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto rounded-md border border-zinc-200">
                  {allSites.map((s) => {
                    const on = draft.site?.url === s.url && draft.site.accountId === s.accountId;
                    const email = data.accounts.find((a) => a.id === s.accountId)?.email;
                    return (
                      <li key={`${s.accountId}:${s.url}`}>
                        <button type="button" onClick={() => update({ site: s })}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${on ? "bg-green-50" : "hover:bg-zinc-50"}`}>
                          <SearchConsoleIcon className="h-5 w-5 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-zinc-800">{siteLabel(s.url)}</span>
                            <span className="block truncate text-xs text-zinc-400">{email}</span>
                          </span>
                          {on && <Check className="h-4 w-4 text-green-600" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-4 flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button type="button" onClick={() => update({ step: 1 })} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button type="button" onClick={() => update({ step: 3 })} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                  {draft.site ? "Next" : "Skip for now"}
                </button>
              </div>
            </Card>
          )}

          {draft.step === 3 && (
            <Card title="Review">
              <dl className="divide-y divide-zinc-100 text-sm">
                <div className="flex justify-between gap-4 py-2"><dt className="text-zinc-500">Client</dt><dd className="font-medium text-zinc-900">{draft.name}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-zinc-500">Website</dt><dd className="text-zinc-800">{draft.website || "Not set"}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-zinc-500">GA4 property</dt><dd className="text-zinc-800">{draft.property ? `${draft.property.name} (${draft.property.id})` : "Not set"}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-zinc-500">Search Console</dt><dd className="text-zinc-800">{draft.site ? siteLabel(draft.site.url) : "Not set"}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-zinc-400">You can change the property and site later on the client&apos;s Integrations page.</p>
              {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}
              <div className="mt-4 flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button type="button" onClick={() => update({ step: 2 })} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button type="button" onClick={create} disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />} Create client
                </button>
              </div>
            </Card>
          )}

          <p className="mt-4 text-center text-xs text-zinc-400">
            <Link href="/dashboard" className="hover:underline">Cancel</Link>
          </p>
        </div>
      </main>
    </>
  );
}
