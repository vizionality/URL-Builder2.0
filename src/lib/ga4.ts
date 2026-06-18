"use client";

import { useEffect, useState } from "react";

export type Ga4ReportType =
  | "campaigns"
  | "daily-sessions"
  | "engagement-by-source"
  | "summary";

export type Ga4ReportRow = {
  dimensions: string[];
  metrics: string[];
};

export type Ga4ReportResponse = {
  rows: Ga4ReportRow[];
  totals: string[];
};

export async function fetchGa4Report(params: {
  propertyId: string;
  startDate: string;
  endDate: string;
  reportType: Ga4ReportType;
}): Promise<Ga4ReportResponse> {
  const res = await fetch("/api/ga4/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to fetch GA4 report.");
  }
  return data;
}

export function monthKey(yyyymmdd: string): string {
  return yyyymmdd.slice(0, 6);
}

export function formatMonthLabel(monthKey: string): string {
  const year = monthKey.slice(0, 4);
  const month = Number(monthKey.slice(4, 6));
  const date = new Date(Number(year), month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function formatDateLabel(yyyymmdd: string): string {
  const year = Number(yyyymmdd.slice(0, 4));
  const month = Number(yyyymmdd.slice(4, 6)) - 1;
  const day = Number(yyyymmdd.slice(6, 8));
  const date = new Date(year, month, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const SAMPLE_ACTIVE_CAMPAIGNS = [
  { month: "Feb 26", activeCampaigns: 3 },
  { month: "Mar 26", activeCampaigns: 5 },
  { month: "Apr 26", activeCampaigns: 4 },
  { month: "May 26", activeCampaigns: 6 },
  { month: "Jun 26", activeCampaigns: 7 },
];

export const SAMPLE_DAILY_CLICKS = [
  { date: "Jun 11", clicks: 142 },
  { date: "Jun 12", clicks: 168 },
  { date: "Jun 13", clicks: 131 },
  { date: "Jun 14", clicks: 187 },
  { date: "Jun 15", clicks: 204 },
  { date: "Jun 16", clicks: 176 },
  { date: "Jun 17", clicks: 198 },
];

export const SAMPLE_ENGAGEMENT_BY_SOURCE = [
  { name: "google", value: 62 },
  { name: "facebook", value: 48 },
  { name: "newsletter", value: 71 },
  { name: "twitter", value: 39 },
];

export const SAMPLE_SUMMARY = {
  totalSessions: 1284,
  activeCampaigns: 6,
  avgEngagementRate: 58.2,
};

export const SAMPLE_CLICKS = 1284;
export const SAMPLE_ENGAGEMENT_RATE = 58.2;

export function defaultDateRange(days = 28) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export type Ga4Summary = {
  totalSessions: number;
  activeCampaigns: number;
  avgEngagementRate: number;
};

export function useGa4Summary(
  propertyId: string,
  startDate: string,
  endDate: string
) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: Ga4Summary | null;
  }>({ loading: false, error: null, data: null });

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mark loading before the async fetch starts
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchGa4Report({ propertyId, startDate, endDate, reportType: "summary" })
      .then((res) => {
        if (cancelled) return;
        const totalSessions = Math.round(Number(res.totals[0] ?? 0));
        const avgEngagementRate = Number(res.totals[1] ?? 0) * 100;
        const activeCampaigns = res.rows.length;
        setState({
          loading: false,
          error: null,
          data: { totalSessions, activeCampaigns, avgEngagementRate },
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load GA4 data.",
          data: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, startDate, endDate]);

  return state;
}

export type ActiveCampaignsPoint = { month: string; activeCampaigns: number };
export type DailyClicksPoint = { date: string; clicks: number };
export type EngagementBySourcePoint = { name: string; value: number };

export function useGa4Charts(
  propertyId: string,
  startDate: string,
  endDate: string
) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    campaigns: ActiveCampaignsPoint[] | null;
    dailyClicks: DailyClicksPoint[] | null;
    engagementBySource: EngagementBySourcePoint[] | null;
  }>({
    loading: false,
    error: null,
    campaigns: null,
    dailyClicks: null,
    engagementBySource: null,
  });

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mark loading before the async fetch starts
    setState((s) => ({ ...s, loading: true, error: null }));

    Promise.all([
      fetchGa4Report({ propertyId, startDate, endDate, reportType: "campaigns" }),
      fetchGa4Report({ propertyId, startDate, endDate, reportType: "daily-sessions" }),
      fetchGa4Report({
        propertyId,
        startDate,
        endDate,
        reportType: "engagement-by-source",
      }),
    ])
      .then(([campaignsRes, dailyRes, engagementRes]) => {
        if (cancelled) return;

        const monthly = new Map<string, Set<string>>();
        for (const row of campaignsRes.rows) {
          const [date, campaign] = row.dimensions;
          const sessions = Number(row.metrics[0] ?? 0);
          if (sessions <= 0 || !campaign) continue;
          const key = monthKey(date);
          if (!monthly.has(key)) monthly.set(key, new Set());
          monthly.get(key)!.add(campaign);
        }
        const campaigns = Array.from(monthly.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, names]) => ({
            month: formatMonthLabel(key),
            activeCampaigns: names.size,
          }));

        const dailyClicks = dailyRes.rows
          .map((row) => ({
            rawDate: row.dimensions[0],
            clicks: Number(row.metrics[0] ?? 0),
          }))
          .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
          .map((row) => ({ date: formatDateLabel(row.rawDate), clicks: row.clicks }));

        const engagementBySource = engagementRes.rows
          .map((row) => ({
            name: row.dimensions[0],
            value: Number(row.metrics[0] ?? 0) * 100,
          }))
          .sort((a, b) => b.value - a.value);

        setState({ loading: false, error: null, campaigns, dailyClicks, engagementBySource });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load GA4 charts.",
          campaigns: null,
          dailyClicks: null,
          engagementBySource: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId, startDate, endDate]);

  return state;
}
