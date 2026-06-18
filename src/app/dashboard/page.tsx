"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { downloadCsv } from "@/lib/csv";
import { useGa4PropertyId } from "@/lib/storage";
import {
  SAMPLE_ACTIVE_CAMPAIGNS,
  SAMPLE_DAILY_CLICKS,
  SAMPLE_ENGAGEMENT_BY_SOURCE,
  SAMPLE_SUMMARY,
  defaultDateRange,
  useGa4Charts,
  useGa4Summary,
} from "@/lib/ga4";

const GREEN_PALETTE = ["#16a34a", "#4ade80", "#15803d", "#86efac", "#22c55e", "#bbf7d0"];

const inputClass =
  "rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

export default function DashboardPage() {
  const [propertyId] = useGa4PropertyId();
  const [{ startDate, endDate }, setRange] = useState(() => defaultDateRange());

  const summary = useGa4Summary(propertyId, startDate, endDate);
  const charts = useGa4Charts(propertyId, startDate, endDate);

  const isSample = !propertyId;
  const activeCampaignsData = isSample
    ? SAMPLE_ACTIVE_CAMPAIGNS
    : charts.campaigns ?? [];
  const dailyClicksData = isSample ? SAMPLE_DAILY_CLICKS : charts.dailyClicks ?? [];
  const engagementBySourceData = isSample
    ? SAMPLE_ENGAGEMENT_BY_SOURCE
    : charts.engagementBySource ?? [];
  const summaryData = isSample ? SAMPLE_SUMMARY : summary.data ?? SAMPLE_SUMMARY;

  function handleExport() {
    downloadCsv(
      "dashboard-clicks.csv",
      dailyClicksData.map((row) => ({ date: row.date, clicks: String(row.clicks) }))
    );
  }

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Campaign performance overview"
        onExport={handleExport}
        onSave={() => {}}
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {isSample && (
              <p className="text-sm text-amber-600">
                Showing sample data — connect GA4 in Integrations to see real metrics.
              </p>
            )}
            {!isSample && (charts.error || summary.error) && (
              <p className="text-sm text-red-600">
                {charts.error ?? summary.error}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className={inputClass}
              value={startDate}
              max={endDate}
              onChange={(e) =>
                setRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
            <span className="text-sm text-zinc-400">to</span>
            <input
              type="date"
              className={inputClass}
              value={endDate}
              min={startDate}
              onChange={(e) =>
                setRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Sessions"
            value={summaryData.totalSessions.toLocaleString()}
            sublabel={isSample ? "Sample data" : "From GA4"}
            sample={isSample}
          />
          <StatCard
            label="Active Campaigns"
            value={String(summaryData.activeCampaigns)}
            sublabel={isSample ? "Sample data" : "From GA4"}
            sample={isSample}
          />
          <StatCard
            label="Avg. Engagement Rate"
            value={`${summaryData.avgEngagementRate.toFixed(1)}%`}
            sublabel={isSample ? "Sample data" : "From GA4"}
            sample={isSample}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Active Campaigns" description="Monthly">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeCampaignsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="activeCampaigns" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Clicks" description="Daily">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyClicksData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Engagement Rate" description="By source">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={engagementBySourceData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {engagementBySourceData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={GREEN_PALETTE[index % GREEN_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
