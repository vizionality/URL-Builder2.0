"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
  Brush,
} from "recharts";
import type { SignalsPayload } from "@/lib/signals";
import { periodCandles } from "@/lib/indicators/candles";
import { sma } from "@/lib/indicators/movingAverages";

// Light palette matching the app.
const UP = "#12b795";
const DOWN = "#e5484d";
const FAST = "#0c7a65";
const SLOW = "#a1a1aa";
const LINE = "#12b795";
const BAND = "#d4d4d8";
const GRID = "#f1f5f4";
const TEXT = "#71717a";
const THRESH = "#a1a1aa";

type Timeframe = "daily" | "weekly" | "monthly";

const H_PRICE = 340;
const H_DESEAS = 240;
const H_CUSUM = 200;

const SMA_WINDOWS: Record<Timeframe, { fast: number; slow: number; label: string }> = {
  daily: { fast: 7, slow: 30, label: "7d / 30d SMA" },
  weekly: { fast: 4, slow: 12, label: "4w / 12w SMA" },
  monthly: { fast: 3, slow: 6, label: "3m / 6m SMA" },
};

// How many bars the brush shows by default when the pane opens; the rest is
// reachable by dragging the brush handles or sliding the window.
const DEFAULT_WINDOW: Record<Timeframe, number> = { daily: 120, weekly: 52, monthly: 24 };

const axis = { stroke: GRID, tick: { fill: TEXT, fontSize: 11 }, tickLine: false } as const;
const cursor = { stroke: "#a1a1aa", strokeDasharray: "3 3" } as const;

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// Crossovers of a fast line over a slow line, tagged with the value to place the
// marker at (candle close, or the daily value).
function crossPoints(
  times: string[],
  fast: (number | null)[],
  slow: (number | null)[],
  valueAt: number[]
): { time: string; y: number; direction: "up" | "down" }[] {
  const out: { time: string; y: number; direction: "up" | "down" }[] = [];
  for (let i = 1; i < times.length; i++) {
    const f0 = fast[i - 1], s0 = slow[i - 1], f1 = fast[i], s1 = slow[i];
    if (f0 == null || s0 == null || f1 == null || s1 == null) continue;
    if (f0 <= s0 && f1 > s1) out.push({ time: times[i], y: valueAt[i], direction: "up" });
    else if (f0 >= s0 && f1 < s1) out.push({ time: times[i], y: valueAt[i], direction: "down" });
  }
  return out;
}

type CandleShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { open: number; high: number; low: number; close: number };
};

// Draws one candle inside the pixel box recharts gives for the [low, high] range
// bar: wick from high to low, body between open and close.
function Candle({ x = 0, y = 0, width = 0, height = 0, payload }: CandleShapeProps) {
  if (!payload) return null;
  const { open, high, low, close } = payload;
  const range = high - low;
  const cx = x + width / 2;
  const up = close >= open;
  const color = up ? UP : DOWN;
  if (range <= 0) {
    return <line x1={x} x2={x + width} y1={y + height} y2={y + height} stroke={color} strokeWidth={1.5} />;
  }
  const ratio = height / range;
  const yOpen = y + (high - open) * ratio;
  const yClose = y + (high - close) * ratio;
  const bodyTop = Math.min(yOpen, yClose);
  const bodyH = Math.max(1, Math.abs(yClose - yOpen));
  const bw = Math.max(1, width * 0.6);
  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={cx - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} />
    </g>
  );
}

type PriceRow = {
  time: string;
  value?: number;
  range?: [number, number];
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  fast: number | null;
  slow: number | null;
};

function PricePane({ payload, tf }: { payload: SignalsPayload; tf: Timeframe }) {
  const win = SMA_WINDOWS[tf];
  const { data, crosses, isCandle } = useMemo<{
    data: PriceRow[];
    crosses: { time: string; y: number; direction: "up" | "down" }[];
    isCandle: boolean;
  }>(() => {
    if (tf === "daily") {
      const values = payload.daily.map((p) => p.value);
      const fast = sma(values, win.fast);
      const slow = sma(values, win.slow);
      const rows = payload.daily.map((p, i) => ({
        time: p.date,
        value: p.value,
        fast: fast[i],
        slow: slow[i],
      }));
      const cr = crossPoints(payload.daily.map((p) => p.date), fast, slow, values);
      return { data: rows, crosses: cr, isCandle: false };
    }
    const candles = periodCandles(payload.daily, tf === "weekly" ? "week" : "month");
    const closes = candles.map((c) => c.close);
    const fast = sma(closes, win.fast);
    const slow = sma(closes, win.slow);
    const rows = candles.map((c, i) => ({
      time: c.time,
      range: [c.low, c.high] as [number, number],
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      fast: fast[i],
      slow: slow[i],
    }));
    const cr = crossPoints(candles.map((c) => c.time), fast, slow, closes);
    return { data: rows, crosses: cr, isCandle: true };
  }, [payload.daily, tf, win.fast, win.slow]);

  const startIndex = Math.max(0, data.length - DEFAULT_WINDOW[tf]);

  return (
    <ResponsiveContainer width="100%" height={H_PRICE}>
      {/* key={tf} remounts on a timeframe switch so the brush window resets. */}
      <ComposedChart key={tf} data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="time" {...axis} tickFormatter={shortDate} minTickGap={40} />
        <YAxis {...axis} width={44} domain={["auto", "auto"]} />
        <Tooltip cursor={cursor} labelFormatter={(l) => shortDate(String(l))} />
        {isCandle && <Bar dataKey="range" shape={<Candle />} isAnimationActive={false} />}
        {!isCandle && (
          <Line type="monotone" dataKey="value" stroke={LINE} strokeWidth={2} dot={false} isAnimationActive={false} />
        )}
        <Line type="monotone" dataKey="fast" stroke={FAST} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        <Line type="monotone" dataKey="slow" stroke={SLOW} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        {crosses.map((c, i) => (
          <ReferenceDot key={i} x={c.time} y={c.y} r={4} fill={c.direction === "up" ? UP : DOWN} stroke="#fff" strokeWidth={1} />
        ))}
        <Brush
          dataKey="time"
          height={22}
          stroke={LINE}
          fill="#f8faf9"
          travellerWidth={8}
          startIndex={startIndex}
          tickFormatter={(v) => shortDate(String(v))}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function DeseasPane({ payload }: { payload: SignalsPayload }) {
  const data = useMemo(() => {
    const band = new Map(payload.controlBand.map((b) => [b.date, b]));
    return payload.deseasonalized.map((p) => {
      const b = band.get(p.date);
      return { time: p.date, value: p.value, lower: b?.lower ?? null, upper: b?.upper ?? null };
    });
  }, [payload.deseasonalized, payload.controlBand]);

  const valueByDate = useMemo(
    () => new Map(payload.deseasonalized.map((p) => [p.date, p.value])),
    [payload.deseasonalized]
  );

  return (
    <ResponsiveContainer width="100%" height={H_DESEAS}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="time" {...axis} tickFormatter={shortDate} minTickGap={40} />
        <YAxis {...axis} width={44} domain={["auto", "auto"]} />
        <Tooltip cursor={cursor} labelFormatter={(l) => shortDate(String(l))} />
        <Line type="monotone" dataKey="upper" stroke={BAND} strokeWidth={1} dot={false} isAnimationActive={false} connectNulls />
        <Line type="monotone" dataKey="lower" stroke={BAND} strokeWidth={1} dot={false} isAnimationActive={false} connectNulls />
        <Line type="monotone" dataKey="value" stroke={LINE} strokeWidth={2} dot={false} isAnimationActive={false} />
        {payload.signals.map((s, i) => {
          const y = valueByDate.get(s.date);
          if (y == null) return null;
          return (
            <ReferenceDot key={i} x={s.date} y={y} r={4} fill={s.direction === "up" ? UP : DOWN} stroke="#fff" strokeWidth={1} />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CusumPane({ payload }: { payload: SignalsPayload }) {
  return (
    <ResponsiveContainer width="100%" height={H_CUSUM}>
      <ComposedChart data={payload.cusum} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" {...axis} tickFormatter={shortDate} minTickGap={40} />
        <YAxis {...axis} width={44} domain={["auto", "auto"]} />
        <Tooltip cursor={cursor} labelFormatter={(l) => shortDate(String(l))} />
        {payload.cusumThreshold > 0 && (
          <ReferenceLine y={payload.cusumThreshold} stroke={THRESH} strokeDasharray="4 4" />
        )}
        <Line type="monotone" dataKey="cplus" stroke={UP} strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="cminus" stroke={DOWN} strokeWidth={2} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function Pane({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
      {children}
    </div>
  );
}

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export default function SignalsChart({ payload }: { payload: SignalsPayload }) {
  const [tf, setTf] = useState<Timeframe>("weekly");
  const priceLabel =
    tf === "daily"
      ? `Daily line + trend (${SMA_WINDOWS.daily.label})`
      : `${tf === "weekly" ? "Weekly" : "Monthly"} candles + trend (${SMA_WINDOWS[tf].label})`;

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
        {TIMEFRAMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTf(t.id)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tf === t.id ? "bg-green-600 text-white" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Pane label={priceLabel}>
        <PricePane payload={payload} tf={tf} />
      </Pane>
      <Pane label="Deseasonalized daily + control band">
        <DeseasPane payload={payload} />
      </Pane>
      <Pane label="CUSUM change detector (C+ / C-, threshold h)">
        <CusumPane payload={payload} />
      </Pane>
    </div>
  );
}
