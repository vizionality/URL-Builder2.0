"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { SignalsPayload } from "@/lib/signals";

// Colors pulled from the app's green accent so the panes match the rest of the UI.
const GREEN = "#12b795";
const GREEN_DARK = "#0c7a65";
const UP = "#12b795";
const DOWN = "#e5484d";
const GRID = "#f1f5f4";
const TEXT = "#71717a";

function toTime(iso: string): UTCTimestamp {
  // Midnight UTC for the day; lightweight-charts sorts numeric times reliably.
  return (Date.parse(`${iso}T00:00:00Z`) / 1000) as UTCTimestamp;
}

function baseOptions(height: number) {
  return {
    height,
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor: TEXT,
      fontSize: 11,
    },
    grid: {
      vertLines: { color: GRID },
      horzLines: { color: GRID },
    },
    rightPriceScale: { borderColor: GRID },
    timeScale: { borderColor: GRID, timeVisible: false },
    handleScroll: false,
    handleScale: false,
  };
}

// Pane 1: weekly candles with fast/slow SMA overlays and crossover markers.
function drawCandles(el: HTMLDivElement, payload: SignalsPayload): IChartApi {
  const chart = createChart(el, baseOptions(220));
  const candles = chart.addCandlestickSeries({
    upColor: UP,
    downColor: DOWN,
    wickUpColor: UP,
    wickDownColor: DOWN,
    borderVisible: false,
  });
  candles.setData(
    payload.candles.map((c) => ({
      time: toTime(c.time) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
  );

  const fast = chart.addLineSeries({ color: GREEN, lineWidth: 2 });
  const slow = chart.addLineSeries({ color: GREEN_DARK, lineWidth: 2, lineStyle: LineStyle.Dashed });
  fast.setData(
    payload.candles
      .map((c, i) => ({ time: toTime(c.time) as Time, value: payload.smaFast[i] }))
      .filter((p): p is { time: Time; value: number } => p.value != null)
  );
  slow.setData(
    payload.candles
      .map((c, i) => ({ time: toTime(c.time) as Time, value: payload.smaSlow[i] }))
      .filter((p): p is { time: Time; value: number } => p.value != null)
  );

  const markers: SeriesMarker<Time>[] = payload.crossovers.map((x) => ({
    time: toTime(x.date) as Time,
    position: x.direction === "up" ? "belowBar" : "aboveBar",
    color: x.direction === "up" ? UP : DOWN,
    shape: x.direction === "up" ? "arrowUp" : "arrowDown",
    text: x.direction === "up" ? "cross up" : "cross down",
  }));
  candles.setMarkers(markers);
  chart.timeScale().fitContent();
  return chart;
}

// Pane 2: deseasonalized daily series with its control band.
function drawDeseasonalized(el: HTMLDivElement, payload: SignalsPayload): IChartApi {
  const chart = createChart(el, baseOptions(180));
  const bandUpper = chart.addLineSeries({ color: "#d4d4d8", lineWidth: 1 });
  const bandLower = chart.addLineSeries({ color: "#d4d4d8", lineWidth: 1 });
  bandUpper.setData(payload.controlBand.map((b) => ({ time: toTime(b.date) as Time, value: b.upper })));
  bandLower.setData(payload.controlBand.map((b) => ({ time: toTime(b.date) as Time, value: b.lower })));

  const line = chart.addLineSeries({ color: GREEN, lineWidth: 2 });
  line.setData(payload.deseasonalized.map((p) => ({ time: toTime(p.date) as Time, value: p.value })));

  const markers: SeriesMarker<Time>[] = payload.signals.map((s) => ({
    time: toTime(s.date) as Time,
    position: s.direction === "up" ? "belowBar" : "aboveBar",
    color: s.direction === "up" ? UP : DOWN,
    shape: "circle",
    text: s.provisional ? "provisional" : s.direction,
  }));
  line.setMarkers(markers);
  chart.timeScale().fitContent();
  return chart;
}

// Pane 3: CUSUM Cplus / Cminus with the decision threshold h.
function drawCusum(el: HTMLDivElement, payload: SignalsPayload): IChartApi {
  const chart = createChart(el, baseOptions(160));
  const cplus = chart.addLineSeries({ color: UP, lineWidth: 2 });
  const cminus = chart.addLineSeries({ color: DOWN, lineWidth: 2 });
  cplus.setData(payload.cusum.map((p) => ({ time: toTime(p.date) as Time, value: p.cplus })));
  cminus.setData(payload.cusum.map((p) => ({ time: toTime(p.date) as Time, value: p.cminus })));

  if (payload.cusumThreshold > 0 && payload.cusum.length) {
    const h = chart.addLineSeries({
      color: TEXT,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      crosshairMarkerVisible: false,
    });
    h.setData(
      payload.cusum.map((p) => ({ time: toTime(p.date) as Time, value: payload.cusumThreshold }))
    );
  }
  chart.timeScale().fitContent();
  return chart;
}

function Pane({
  label,
  draw,
  payload,
}: {
  label: string;
  draw: (el: HTMLDivElement, payload: SignalsPayload) => IChartApi;
  payload: SignalsPayload;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = draw(el, payload);
    const onResize = () => chart.applyOptions({ width: el.clientWidth });
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [draw, payload]);

  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <div ref={ref} className="w-full" />
    </div>
  );
}

export default function SignalsChart({ payload }: { payload: SignalsPayload }) {
  return (
    <div className="space-y-4">
      <Pane label="Weekly candles + trend (4w / 12w SMA)" draw={drawCandles} payload={payload} />
      <Pane label="Deseasonalized daily + control band" draw={drawDeseasonalized} payload={payload} />
      <Pane label="CUSUM change detector (C+ / C-, threshold h)" draw={drawCusum} payload={payload} />
    </div>
  );
}
