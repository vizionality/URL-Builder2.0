"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Check, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { useGa4PropertyId } from "@/lib/storage";
import {
  useSignals,
  acknowledgeSignal,
  SIGNAL_METRICS,
  DISABLED_METRICS,
  type SignalMetricId,
  type UiSignal,
} from "@/lib/signals";

// lightweight-charts touches the DOM at construction, so the chart is client
// only: no server render, no hydration mismatch.
const SignalsChart = dynamic(() => import("@/components/signals/SignalsChart"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 py-10 text-zinc-400">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">Rendering charts…</span>
    </div>
  ),
});

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// One explicit empty state instead of a misleading chart.
function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}

function SignalRow({
  metric,
  signal,
  onAck,
}: {
  metric: string;
  signal: UiSignal;
  onAck: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const acked = Boolean(signal.acknowledgedAt);

  async function handleAck() {
    setBusy(true);
    try {
      await acknowledgeSignal(metric, signal.direction, signal.date);
      onAck();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          signal.direction === "up"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {signal.direction === "up" ? (
          <TrendingUp size={15} />
        ) : (
          <TrendingDown size={15} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900">
          {signal.direction === "up" ? "Level shift up" : "Level shift down"}
          {signal.provisional && (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
              Provisional
            </span>
          )}
        </p>
        <p className="text-xs text-zinc-500">
          {formatDate(signal.date)}
          {signal.baselineMean != null &&
            ` · baseline ${signal.baselineMean.toFixed(1)}`}
        </p>
      </div>
      {acked ? (
        <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
          <Check size={14} /> Acknowledged
        </span>
      ) : signal.provisional ? (
        <span className="text-xs text-zinc-400">Awaiting settled data</span>
      ) : (
        <button
          type="button"
          onClick={handleAck}
          disabled={busy}
          className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {busy ? "…" : "Acknowledge"}
        </button>
      )}
    </li>
  );
}

export default function SignalsPage() {
  const [propertyId] = useGa4PropertyId();
  const [metric, setMetric] = useState<SignalMetricId>("sessions");
  const { loading, error, data, reload } = useSignals(propertyId, metric);

  const flags = data?.flags;
  const emptyReason = !flags
    ? null
    : flags.insufficientHistory
      ? {
          title: "Not enough history yet",
          detail:
            "The engine needs at least 56 days of data to estimate weekly seasonality. Check back once this property has more history.",
        }
      : flags.insufficientVolume
        ? {
            title: "Not enough volume",
            detail:
              "Daily counts are too low for a stable change detector on this metric. Signals resume once volume rises.",
          }
        : null;

  return (
    <>
      <Header
        title="Signals"
        subtitle="Trend and change-point detection on your GA4 metrics"
      />
      <div className="space-y-6 p-4 sm:p-6">
        {/* Metric picker */}
        <div className="flex flex-wrap items-center gap-2">
          {SIGNAL_METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetric(m.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                metric === m.id
                  ? "bg-green-600 text-white"
                  : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {m.label}
            </button>
          ))}
          {DISABLED_METRICS.map((m) => (
            <span
              key={m.label}
              title={m.reason}
              className="cursor-not-allowed rounded-md border border-dashed border-zinc-200 px-3 py-1.5 text-sm text-zinc-300"
            >
              {m.label}
            </span>
          ))}
          <button
            type="button"
            onClick={reload}
            disabled={!propertyId || loading}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {!propertyId ? (
          <Card>
            <EmptyState
              title="Google Analytics not connected"
              detail="Connect a GA4 property in Integrations to compute signals from your real traffic."
            />
          </Card>
        ) : loading ? (
          <Card>
            <div className="flex items-center gap-2 py-10 text-zinc-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Computing signals from GA4…</span>
            </div>
          </Card>
        ) : error ? (
          <Card>
            <p className="py-6 text-sm text-red-600">{error}</p>
          </Card>
        ) : !data ? null : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card
                title={`${data.metricLabel} indicators`}
                description="Weekly trend, deseasonalized level with a control band, and a CUSUM change detector. The last two days are treated as provisional while GA4 restates them."
              >
                {emptyReason ? (
                  <EmptyState title={emptyReason.title} detail={emptyReason.detail} />
                ) : (
                  <SignalsChart payload={data} />
                )}
              </Card>
            </div>

            <div>
              <Card
                title="Detected signals"
                description="Sustained level changes, newest first. Acknowledge one to clear it."
              >
                {emptyReason ? (
                  <p className="py-4 text-sm text-zinc-400">
                    No signals while the metric is in an empty state.
                  </p>
                ) : data.signals.length === 0 ? (
                  <EmptyState
                    title="No signals"
                    detail="No sustained level changes detected in the available history."
                  />
                ) : (
                  <ul className="divide-y divide-zinc-100 overflow-hidden rounded-md border border-zinc-200">
                    {[...data.signals]
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((s) => (
                        <SignalRow
                          key={`${s.direction}-${s.date}`}
                          metric={data.metric}
                          signal={s}
                          onAck={reload}
                        />
                      ))}
                  </ul>
                )}
                {data.notes && data.notes.length > 0 && (
                  <p className="mt-3 text-xs text-zinc-400">{data.notes.join(" ")}</p>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
