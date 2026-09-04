"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { SignalsPayload } from "@/lib/signals";
import { periodCandles } from "@/lib/indicators/candles";
import { sma } from "@/lib/indicators/movingAverages";

// Light palette matching the app: candles read clearly on a white card, moving
// averages in the app's green accent, muted grid and axes.
const PANEL = "transparent"; // sit on the white Card
const GRID = "#f1f5f4"; // very subtle gridlines
const TEXT = "#71717a"; // axis + label text
const UP = "#12b795"; // candle up / positive (app green)
const DOWN = "#e5484d"; // candle down / negative
const FAST = "#0c7a65"; // fast SMA (deep green)
const SLOW = "#a1a1aa"; // slow SMA (muted)
const LINEC = "#12b795"; // daily line
const BAND = "#d4d4d8"; // control band
const THRESH = "#a1a1aa"; // cusum threshold

type Timeframe = "daily" | "weekly" | "monthly";

// Taller than before so the panes read like a real charting terminal.
const H_PRICE = 340;
const H_DESEAS = 240;
const H_CUSUM = 200;

// SMA windows per timeframe, in units of that timeframe's bar.
const SMA_WINDOWS: Record<Timeframe, { fast: number; slow: number; label: string }> = {
  daily: { fast: 7, slow: 30, label: "7d / 30d SMA" },
  weekly: { fast: 4, slow: 12, label: "4w / 12w SMA" },
  monthly: { fast: 3, slow: 6, label: "3m / 6m SMA" },
};

function toTime(iso: string): UTCTimestamp {
  return (Date.parse(`${iso}T00:00:00Z`) / 1000) as UTCTimestamp;
}

function baseOptions(height: number) {
  return {
    height,
    layout: {
      background: { type: ColorType.Solid, color: PANEL },
      textColor: TEXT,
      fontSize: 11,
    },
    grid: { vertLines: { color: GRID }, horzLines: { color: GRID } },
    rightPriceScale: { borderColor: GRID, scaleMargins: { top: 0.12, bottom: 0.12 } },
    timeScale: { borderColor: GRID, timeVisible: false, rightOffset: 4 },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: "#d4d4d8", width: 1 as const, style: LineStyle.Dashed, labelBackgroundColor: "#52525b" },
      horzLine: { color: "#d4d4d8", width: 1 as const, style: LineStyle.Dashed, labelBackgroundColor: "#52525b" },
    },
  };
}

// Crossover markers from two aligned moving-average arrays over the same dates.
function crossMarkers(
  dates: string[],
  fast: (number | null)[],
  slow: (number | null)[]
): SeriesMarker<Time>[] {
  const out: SeriesMarker<Time>[] = [];
  for (let i = 1; i < dates.length; i++) {
    const f0 = fast[i - 1], s0 = slow[i - 1], f1 = fast[i], s1 = slow[i];
    if (f0 == null || s0 == null || f1 == null || s1 == null) continue;
    if (f0 <= s0 && f1 > s1) {
      out.push({ time: toTime(dates[i]) as Time, position: "belowBar", color: UP, shape: "arrowUp", text: "cross up" });
    } else if (f0 >= s0 && f1 < s1) {
      out.push({ time: toTime(dates[i]) as Time, position: "aboveBar", color: DOWN, shape: "arrowDown", text: "cross down" });
    }
  }
  return out;
}

function line(arr: (number | null)[], dates: string[]) {
  return dates
    .map((d, i) => ({ time: toTime(d) as Time, value: arr[i] }))
    .filter((p): p is { time: Time; value: number } => p.value != null);
}

// Pane 1: price. Daily renders a line; weekly/monthly render OHLC candles. Both
// carry fast/slow SMA overlays and crossover markers for the timeframe.
function drawPrice(el: HTMLDivElement, payload: SignalsPayload, tf: Timeframe): IChartApi {
  const chart = createChart(el, baseOptions(H_PRICE));
  const win = SMA_WINDOWS[tf];

  if (tf === "daily") {
    const dates = payload.daily.map((p) => p.date);
    const values = payload.daily.map((p) => p.value);
    const fast = sma(values, win.fast);
    const slow = sma(values, win.slow);
    const s = chart.addLineSeries({ color: LINEC, lineWidth: 2, priceLineVisible: false });
    s.setData(payload.daily.map((p) => ({ time: toTime(p.date) as Time, value: p.value })));
    chart.addLineSeries({ color: FAST, lineWidth: 2, priceLineVisible: false }).setData(line(fast, dates));
    chart.addLineSeries({ color: SLOW, lineWidth: 2, priceLineVisible: false }).setData(line(slow, dates));
    s.setMarkers(crossMarkers(dates, fast, slow));
    chart.timeScale().fitContent();
    return chart;
  }

  const candles = periodCandles(payload.daily, tf === "weekly" ? "week" : "month");
  const dates = candles.map((c) => c.time);
  const closes = candles.map((c) => c.close);
  const fast = sma(closes, win.fast);
  const slow = sma(closes, win.slow);
  const cs = chart.addCandlestickSeries({
    upColor: UP,
    downColor: DOWN,
    wickUpColor: UP,
    wickDownColor: DOWN,
    borderVisible: true,
    borderUpColor: UP,
    borderDownColor: DOWN,
    priceLineVisible: false,
  });
  cs.setData(candles.map((c) => ({ time: toTime(c.time) as Time, open: c.open, high: c.high, low: c.low, close: c.close })));
  chart.addLineSeries({ color: FAST, lineWidth: 2, priceLineVisible: false }).setData(line(fast, dates));
  chart.addLineSeries({ color: SLOW, lineWidth: 2, priceLineVisible: false }).setData(line(slow, dates));
  cs.setMarkers(crossMarkers(dates, fast, slow));
  chart.timeScale().fitContent();
  return chart;
}

function drawDeseasonalized(el: HTMLDivElement, payload: SignalsPayload): IChartApi {
  const chart = createChart(el, baseOptions(H_DESEAS));
  chart.addLineSeries({ color: BAND, lineWidth: 1, priceLineVisible: false }).setData(
    payload.controlBand.map((b) => ({ time: toTime(b.date) as Time, value: b.upper }))
  );
  chart.addLineSeries({ color: BAND, lineWidth: 1, priceLineVisible: false }).setData(
    payload.controlBand.map((b) => ({ time: toTime(b.date) as Time, value: b.lower }))
  );
  const l = chart.addLineSeries({ color: LINEC, lineWidth: 2, priceLineVisible: false });
  l.setData(payload.deseasonalized.map((p) => ({ time: toTime(p.date) as Time, value: p.value })));
  l.setMarkers(
    payload.signals.map((s) => ({
      time: toTime(s.date) as Time,
      position: s.direction === "up" ? "belowBar" : "aboveBar",
      color: s.direction === "up" ? UP : DOWN,
      shape: "circle",
      text: s.provisional ? "provisional" : s.direction,
    }))
  );
  chart.timeScale().fitContent();
  return chart;
}

function drawCusum(el: HTMLDivElement, payload: SignalsPayload): IChartApi {
  const chart = createChart(el, baseOptions(H_CUSUM));
  chart.addLineSeries({ color: UP, lineWidth: 2 }).setData(
    payload.cusum.map((p) => ({ time: toTime(p.date) as Time, value: p.cplus }))
  );
  chart.addLineSeries({ color: DOWN, lineWidth: 2 }).setData(
    payload.cusum.map((p) => ({ time: toTime(p.date) as Time, value: p.cminus }))
  );
  if (payload.cusumThreshold > 0 && payload.cusum.length) {
    chart.addLineSeries({ color: THRESH, lineWidth: 1, lineStyle: LineStyle.Dashed, crosshairMarkerVisible: false }).setData(
      payload.cusum.map((p) => ({ time: toTime(p.date) as Time, value: payload.cusumThreshold }))
    );
  }
  chart.timeScale().fitContent();
  return chart;
}

function Pane({ label, draw }: { label: string; draw: (el: HTMLDivElement) => IChartApi }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = draw(el);
    const onResize = () => chart.applyOptions({ width: el.clientWidth });
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [draw]);
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        {label}
      </p>
      <div ref={ref} className="w-full" />
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

  const priceDraw = useCallback((el: HTMLDivElement) => drawPrice(el, payload, tf), [payload, tf]);
  const deseasDraw = useCallback((el: HTMLDivElement) => drawDeseasonalized(el, payload), [payload]);
  const cusumDraw = useCallback((el: HTMLDivElement) => drawCusum(el, payload), [payload]);

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
              tf === t.id
                ? "bg-green-600 text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Pane label={priceLabel} draw={priceDraw} />
      <Pane label="Deseasonalized daily + control band" draw={deseasDraw} />
      <Pane label="CUSUM change detector (C+ / C-, threshold h)" draw={cusumDraw} />
    </div>
  );
}
