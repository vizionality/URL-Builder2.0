"use client";

import { memo, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { geoAlbersUsa, geoCentroid, geoEqualEarth, geoMercator, type GeoProjection } from "d3-geo";
// World country shapes (world-atlas, ISC), bundled so the map never fetches at runtime.
import worldCountries from "world-atlas/countries-110m.json";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "@/components/Card";
import { bucketLabel, compact, formatDuration, shade, TIME_GRAINS, type TimeGrain } from "@/lib/report";
import {
  CHART_METRICS,
  CHART_WIDGET_BY_ID,
  COUNTRY_ALIASES,
  METRIC_BY_ID,
  METRIC_PICK_CHARTS,
  TIME_CHART_TYPES,
  type ChartData,
  type MetricFormat,
} from "@/lib/chart-widgets";
import type { ListData, TableData } from "@/lib/extra-widgets";

const GREEN = "#12b795";
const COLORS = ["#12b795", "#f59e0b", "#3b82f6", "#ec4899", "#22c55e", "#8b5cf6", "#14b8a6", "#eab308", "#64748b"];

export function formatMetric(v: number, format: MetricFormat): string {
  if (format === "percent") return `${v.toFixed(1)}%`;
  if (format === "decimal") return v.toFixed(2);
  if (format === "duration") return formatDuration(v);
  return compact(v);
}

// A chart-type widget card: its chart, and a metric dropdown where it applies.
export function ChartWidgetCard({
  id,
  data,
  loading,
  error,
  metric,
  onMetric,
  grain,
  onGrain,
}: {
  id: string;
  data: ChartData | undefined;
  loading: boolean;
  error: string | null;
  metric: string;
  onMetric: (m: string) => void;
  // Time charts: the picked grain (the data may lag behind while it loads).
  grain: TimeGrain;
  onGrain: (g: TimeGrain) => void;
}) {
  const def = CHART_WIDGET_BY_ID.get(id);
  if (!def) return null;
  const picks = METRIC_PICK_CHARTS.includes(def.chart);
  const timed = TIME_CHART_TYPES.includes(def.chart);
  const metricLabel = METRIC_BY_ID.get(metric)?.label ?? "Sessions";
  const format = METRIC_BY_ID.get(picks ? metric : def.subject)?.format ?? "number";
  const title = picks ? `${def.title} by ${metricLabel.toLowerCase()}` : def.title;

  let body: React.ReactNode;
  if (!data) {
    body = error ? (
      <p className="py-6 text-sm text-red-600">{error}</p>
    ) : (
      <div className="flex items-center gap-2 py-10 text-zinc-400">
        <Loader2 size={18} className="animate-spin" /> <span className="text-sm">Loading…</span>
      </div>
    );
  } else if (data.kind === "series") {
    body = <TimeChart kind={def.chart} rows={data.rows} format={data.format} label={title} grain={data.grain ?? "day"} />;
  } else if (data.kind === "stack") {
    body = <StackChart rows={data.rows} series={data.series} format={data.format} grain={data.grain ?? "day"} />;
  } else if (data.kind === "list") {
    body =
      data.rows.length === 0 ? <Empty /> :
      def.chart === "map" ? <WorldMap data={data} format={format} /> :
      def.chart === "hbar" ? <HBars data={data} format={format} label={metricLabel} /> :
      <Round data={data} donut={def.chart === "donut"} format={format} />;
  } else if (data.kind === "table") {
    body = <PagedTable data={data} labelHeader={def.title.replace(/ table$/, "")} />;
  }

  return (
    <div className={`h-full transition-opacity ${loading && data ? "opacity-60" : ""}`}>
      <Card title={title} description={def.description}>
        {timed && (
          <select
            value={grain}
            onChange={(e) => onGrain(e.target.value as TimeGrain)}
            aria-label={`${def.title} time grain`}
            className="-mt-2 mb-3 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700"
          >
            {TIME_GRAINS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        )}
        {picks && (
          <select
            value={metric}
            onChange={(e) => onMetric(e.target.value)}
            aria-label={`${def.title} metric`}
            className="-mt-2 mb-3 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700"
          >
            {CHART_METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        )}
        {body}
      </Card>
    </div>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-zinc-400">No data in this range.</p>;
}

function TimeChart({
  kind,
  rows,
  format,
  label,
  grain,
}: {
  kind: string;
  rows: { date: string; value: number }[];
  format: MetricFormat;
  label: string;
  grain: TimeGrain;
}) {
  if (rows.length === 0) return <Empty />;
  const axis = (
    <>
      <CartesianGrid stroke="#f1f5f4" vertical={false} />
      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => bucketLabel(String(v), grain)} minTickGap={28} />
      <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v) => formatMetric(Number(v), format)} />
      <Tooltip labelFormatter={(l) => bucketLabel(String(l), grain)} formatter={(v) => formatMetric(Number(v), format)} />
    </>
  );
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === "bar" ? (
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            {axis}
            <Bar name={label} dataKey="value" fill={GREEN} isAnimationActive={false} />
          </BarChart>
        ) : kind === "area" ? (
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            {axis}
            <Area name={label} dataKey="value" stroke={GREEN} fill={GREEN} fillOpacity={0.2} isAnimationActive={false} />
          </AreaChart>
        ) : (
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            {axis}
            <Line name={label} dataKey="value" stroke={GREEN} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function StackChart({
  rows,
  series,
  format,
  grain,
}: {
  rows: Record<string, number | string>[];
  series: string[];
  format: MetricFormat;
  grain: TimeGrain;
}) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#f1f5f4" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => bucketLabel(String(v), grain)} minTickGap={28} />
          <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v) => formatMetric(Number(v), format)} />
          <Tooltip labelFormatter={(l) => bucketLabel(String(l), grain)} formatter={(v) => formatMetric(Number(v), format)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((name, i) => (
            <Area
              key={name}
              name={name}
              dataKey={`s${i}`}
              stackId="1"
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.5}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Round({ data, donut, format }: { data: ListData; donut: boolean; format: MetricFormat }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.rows}
            dataKey="value"
            nameKey="label"
            cx="40%"
            cy="50%"
            innerRadius={donut ? 50 : 0}
            outerRadius={85}
            isAnimationActive={false}
          >
            {data.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => formatMetric(Number(v), format)} />
          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function HBars({ data, format, label }: { data: ListData; format: MetricFormat; label: string }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="#f1f5f4" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatMetric(Number(v), format)} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
          <Tooltip formatter={(v) => formatMetric(Number(v), format)} />
          <Bar name={label} dataKey="value" fill={GREEN} radius={[0, 3, 3, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const worldGeography = worldCountries as unknown as React.ComponentProps<typeof Geographies>["geography"];

// Country shapes as GeoJSON, for fitting the map to the whole world or one country.
type CountryFeature = Feature<Geometry, { name: string }>;
const worldTopo = worldCountries as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const WORLD_FEATURES = feature(worldTopo, worldTopo.objects.countries) as FeatureCollection<Geometry, { name: string }>;
const COUNTRY_FEATURES = new Map<string, CountryFeature>(WORLD_FEATURES.features.map((f) => [f.properties.name, f]));
export const WORLD_COUNTRY_NAMES = [...COUNTRY_FEATURES.keys()].sort((a, b) => a.localeCompare(b));

const MAP_W = 800;
const MAP_H = 420;
const PAD = 12;
// The whole world, fitted to the frame so nothing (Alaska, Canada) is cut off.
const WORLD_PROJECTION = geoEqualEarth().fitExtent([[PAD, PAD], [MAP_W - PAD, MAP_H - PAD]], WORLD_FEATURES);

// A projection fitted to one country. The US uses Albers USA (Alaska and
// Hawaii inset); others are Mercator rotated to the country's centre, so a
// country crossing the date line (e.g. Russia) stays in one piece.
function countryProjection(name: string): GeoProjection | null {
  const f = COUNTRY_FEATURES.get(name);
  if (!f) return null;
  const extent: [[number, number], [number, number]] = [[PAD, PAD], [MAP_W - PAD, MAP_H - PAD]];
  if (name === "United States of America") return geoAlbersUsa().fitExtent(extent, f);
  const [lon] = geoCentroid(f);
  return geoMercator().rotate([-lon, 0]).fitExtent(extent, f);
}

// Memoized: react-simple-maps re-serializes the geography on every render.
const WorldLayer = memo(function WorldLayer({
  values,
  max,
  focus,
  projection,
  onHover,
  onPick,
}: {
  values: Map<string, number>;
  max: number;
  focus: string | null;
  projection: GeoProjection;
  onHover: (h: { name: string; value: number } | null) => void;
  onPick: (name: string) => void;
}) {
  return (
    <ComposableMap projection={projection} width={MAP_W} height={MAP_H} style={{ width: "100%", height: "auto" }}>
      <Geographies geography={worldGeography}>
        {({ geographies }) =>
          geographies.map((geo) => {
            const name = String(geo.properties?.name ?? "");
            const value = values.get(name) ?? 0;
            // Zoomed in: other countries fade to grey for context.
            const faded = focus != null && focus !== name;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={faded ? "#f1f1f3" : shade(value, max)}
                stroke="#ffffff"
                strokeWidth={focus ? 1 : 0.5}
                className="cursor-pointer outline-none hover:fill-[#f59e0b]"
                onMouseEnter={() => onHover({ name, value })}
                onMouseLeave={() => onHover(null)}
                onClick={() => onPick(name)}
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
});

function WorldMap({ data, format }: { data: ListData; format: MetricFormat }) {
  const [hover, setHover] = useState<{ name: string; value: number } | null>(null);
  // The country zoomed into (a world-atlas name), or null for the whole world.
  const [focus, setFocus] = useState<string | null>(null);
  const values = useMemo(
    () => new Map(data.rows.map((r) => [COUNTRY_ALIASES[r.label] ?? r.label, r.value])),
    [data]
  );
  const max = Math.max(0, ...data.rows.map((r) => r.value));
  const projection = useMemo(() => (focus && countryProjection(focus)) || WORLD_PROJECTION, [focus]);
  // Countries with data first (highest first), then every other country A-Z.
  const withData = [...values.entries()]
    .filter(([name, v]) => v > 0 && COUNTRY_FEATURES.has(name))
    .sort((a, b) => b[1] - a[1]);
  const rest = WORLD_COUNTRY_NAMES.filter((n) => !values.get(n));
  const focusValue = focus ? values.get(focus) ?? 0 : null;

  return (
    <div>
      <div className="-mt-1 mb-2 flex flex-wrap items-center gap-2">
        <select
          value={focus ?? ""}
          onChange={(e) => setFocus(e.target.value || null)}
          aria-label="Zoom to country"
          className="max-w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700"
        >
          <option value="">World</option>
          {withData.length > 0 && (
            <optgroup label="With data">
              {withData.map(([name, v]) => (
                <option key={name} value={name}>{name} ({formatMetric(v, format)})</option>
              ))}
            </optgroup>
          )}
          <optgroup label="All countries">
            {rest.map((name) => <option key={name} value={name}>{name}</option>)}
          </optgroup>
        </select>
        {focus && (
          <button type="button" onClick={() => setFocus(null)} className="text-xs font-medium text-green-700 hover:underline">
            Back to world
          </button>
        )}
      </div>
      <WorldLayer
        values={values}
        max={max}
        focus={focus}
        projection={projection}
        onHover={setHover}
        onPick={(name) => setFocus((cur) => (cur === name ? null : name))}
      />
      <p className="mt-1 text-right text-xs text-zinc-600">
        {hover
          ? `${hover.name}: ${formatMetric(hover.value, format)}`
          : focus
            ? `${focus}: ${formatMetric(focusValue ?? 0, format)}`
            : "Hover a country, click to zoom"}
      </p>
    </div>
  );
}

const PER_PAGE = 10;
const th = "py-2 pr-3 text-left text-xs font-semibold text-zinc-500";
const td = "py-2 pr-3 text-sm text-zinc-700";

function PagedTable({ data, labelHeader }: { data: TableData; labelHeader: string }) {
  const [pageFor, setPageFor] = useState<{ data: TableData | null; page: number }>({ data: null, page: 0 });
  const count = Math.max(1, Math.ceil(data.rows.length / PER_PAGE));
  const page = pageFor.data === data ? Math.min(pageFor.page, count - 1) : 0;
  const start = page * PER_PAGE;
  const rows = data.rows.slice(start, start + PER_PAGE);
  if (data.rows.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className={th}>{labelHeader}</th>
            {data.columns.map((c) => <th key={c} className={`${th} text-right`}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.label}-${i}`} className="border-b border-zinc-100">
              <td className={`${td} max-w-[320px] truncate`} title={r.label}>
                <span className="mr-1.5 text-zinc-400">{start + i + 1}.</span>{r.label}
              </td>
              {r.values.map((v, j) => (
                <td key={j} className={`${td} text-right tabular-nums`}>{v.toLocaleString("en-US")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>{start + 1}-{start + rows.length} of {data.rows.length}</span>
        {count > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={page === 0}
              onClick={() => setPageFor({ data, page: page - 1 })}
              className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">Page {page + 1} of {count}</span>
            <button type="button" aria-label="Next page" disabled={page >= count - 1}
              onClick={() => setPageFor({ data, page: page + 1 })}
              className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
