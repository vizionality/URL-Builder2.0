"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import {
  allBulkProjectRows,
  useBulkProjects,
  useGa4PropertyId,
  useSavedUrls,
  useUtmOptions,
} from "@/lib/storage";
import { defaultDateRange, useGa4CampaignSessions } from "@/lib/ga4";

const inputClass =
  "rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

type Row = { campaign: string; sessions: number | null };

export default function CampaignSessionsPage() {
  const [propertyId] = useGa4PropertyId();
  const [savedUrls] = useSavedUrls();
  const [projectsState] = useBulkProjects();
  const [options] = useUtmOptions();

  const [range, setRange] = useState(() => defaultDateRange());
  const ga4 = useGa4CampaignSessions(propertyId, range.startDate, range.endDate);

  // Distinct campaign names the user has built, from every source.
  const myCampaigns = useMemo(() => {
    const map = new Map<string, string>(); // lowercase -> display
    const add = (value: string) => {
      const name = value.trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), name);
      }
    };
    for (const row of savedUrls) add(row.campaign);
    for (const row of allBulkProjectRows(projectsState)) add(row.campaign);
    for (const name of options.campaigns) add(name);
    return map;
  }, [savedUrls, projectsState, options.campaigns]);

  const connected = Boolean(propertyId);
  const sessions = ga4.sessionsByCampaign;

  const rows: Row[] = useMemo(() => {
    return Array.from(myCampaigns.entries())
      .map(([key, display]) => ({
        campaign: display,
        sessions: sessions ? sessions.get(key) ?? 0 : null,
      }))
      .sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0));
  }, [myCampaigns, sessions]);

  // Campaigns GA4 reports sessions for that aren't in the user's built list —
  // usually a naming typo worth catching.
  const unmatched = useMemo(() => {
    if (!sessions) return [] as [string, number][];
    return Array.from(sessions.entries())
      .filter(([key]) => !myCampaigns.has(key))
      .sort((a, b) => b[1] - a[1]);
  }, [sessions, myCampaigns]);

  return (
    <>
      <Header
        title="Campaign Sessions"
        subtitle="Check whether your campaigns are showing sessions in GA4"
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        {!connected && (
          <Card>
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-zinc-700">
                Connect a GA4 property to see live session counts for each campaign.
              </p>
              <Link
                href="/integrations"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Connect GA4
              </Link>
            </div>
          </Card>
        )}

        {connected && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-zinc-500">From</label>
            <input
              type="date"
              className={inputClass}
              value={range.startDate}
              max={range.endDate}
              onChange={(e) =>
                setRange((r) => ({ ...r, startDate: e.target.value }))
              }
            />
            <label className="text-xs font-medium text-zinc-500">to</label>
            <input
              type="date"
              className={inputClass}
              value={range.endDate}
              min={range.startDate}
              onChange={(e) =>
                setRange((r) => ({ ...r, endDate: e.target.value }))
              }
            />
          </div>
        )}

        <Card
          dataTour="sessions-table"
          title="Your campaigns"
          description={
            connected
              ? "Sessions from GA4 for each campaign you've built."
              : "Campaigns you've built. Connect GA4 to see their sessions."
          }
        >
          {connected && ga4.loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-zinc-400">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-sm">Loading sessions…</p>
            </div>
          ) : connected && ga4.error ? (
            <p className="py-8 text-center text-sm text-red-600">{ga4.error}</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              No campaigns yet. Build UTMs to see them here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
                    <th className="px-2 py-2">Campaign</th>
                    <th className="px-2 py-2 text-right">Sessions</th>
                    <th className="px-2 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.campaign}
                      className="border-b border-zinc-100"
                    >
                      <td className="px-2 py-3 font-mono text-xs text-zinc-700">
                        {row.campaign}
                      </td>
                      <td className="px-2 py-3 text-right tabular-nums text-zinc-900">
                        {row.sessions === null ? "—" : row.sessions.toLocaleString()}
                      </td>
                      <td className="px-2 py-3 text-right">
                        {row.sessions === null ? (
                          <span className="text-xs text-zinc-400">Not connected</span>
                        ) : row.sessions > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <CheckCircle2 size={14} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                            <AlertCircle size={14} />
                            No sessions yet
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {connected && !ga4.loading && !ga4.error && unmatched.length > 0 && (
          <div className="mt-6">
            <Card
              title="Other campaigns in GA4"
              description="Campaigns with sessions that don't match one you built here — often a naming mismatch."
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
                      <th className="px-2 py-2">Campaign</th>
                      <th className="px-2 py-2 text-right">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmatched.map(([key, count]) => (
                      <tr key={key} className="border-b border-zinc-100">
                        <td className="px-2 py-3 font-mono text-xs text-zinc-700">
                          {key}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums text-zinc-900">
                          {count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
