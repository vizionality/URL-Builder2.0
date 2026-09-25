"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { geoCentroid, geoEqualEarth, geoMercator, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { getCached, setCached } from "@/lib/response-cache";
// World country shapes (world-atlas, ISC), bundled so the map never fetches at runtime.
import worldCountries from "world-atlas/countries-110m.json";
import usStates from "us-atlas/states-10m.json";
import canadaProvinces from "@/data/canada-provinces.json";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "@/components/Card";
import { bucketLabel, compact, formatDuration, shade, TIME_GRAINS, type TimeGrain } from "@/lib/report";
import {
  CHART_METRICS,
  CHART_WIDGET_BY_ID,
  COUNTRY_ALIASES,
  METRIC_BY_ID,
  METRIC_PICK_CHARTS,
  SUBDIVIDED_COUNTRIES,
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
  query,
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
  // Page dates + filters (the world map's state drill-down fetches cities).
  query: string;
}) {
  // World map: which part of the world it's zoomed to.
  const [region, setRegion] = useState("world");
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
      def.chart === "map" ? (
        <WorldMap
          // A new region starts fresh (no leftover state drill-down).
          key={region}
          data={data}
          format={format}
          region={region}
          metric={metric}
          query={query}
          onRegionBack={() => setRegion("world")}
        />
      ) :
      def.chart === "hbar" ? <HBars data={data} format={format} label={metricLabel} /> :
      <Round data={data} donut={def.chart === "donut"} format={format} />;
  } else if (data.kind === "table") {
    body = <PagedTable data={data} labelHeader={def.title.replace(/ table$/, "")} />;
  }

  return (
    <div className={`h-full transition-opacity ${loading && data ? "opacity-60" : ""}`}>
      <Card title={title} description={def.description}>
        <div className="-mt-2 mb-3 flex flex-wrap items-center gap-2">
          {timed && (
            <select
              value={grain}
              onChange={(e) => onGrain(e.target.value as TimeGrain)}
              aria-label={`${def.title} time grain`}
              className={selectClass}
            >
              {TIME_GRAINS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          )}
          {picks && (
            <select
              value={metric}
              onChange={(e) => onMetric(e.target.value)}
              aria-label={`${def.title} metric`}
              className={selectClass}
            >
              {CHART_METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          )}
          {def.chart === "map" && (
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label="Zoom to region"
              className={selectClass}
            >
              {WORLD_REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          )}
        </div>
        {body}
      </Card>
    </div>
  );
}

const selectClass = "rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700";

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

// State / province shapes for the North America view: us-atlas for the US,
// Natural Earth (public domain) for Canada, bundled so nothing is fetched.
type SubdividedCountry = (typeof SUBDIVIDED_COUNTRIES)[number];
type SubdivisionLayer = { country: SubdividedCountry; values: Map<string, number>; max: number };
const SUBDIVISION_SHAPES: Record<SubdividedCountry, React.ComponentProps<typeof Geographies>["geography"]> = {
  "United States": usStates as unknown as React.ComponentProps<typeof Geographies>["geography"],
  Canada: canadaProvinces as unknown as React.ComponentProps<typeof Geographies>["geography"],
};
const worldGeography = worldCountries as unknown as React.ComponentProps<typeof Geographies>["geography"];

// Country shapes as GeoJSON, to fit the whole world in the frame.
const worldTopo = worldCountries as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const WORLD_FEATURES = feature(worldTopo, worldTopo.objects.countries) as FeatureCollection<Geometry, { name: string }>;

const MAP_W = 800;
const MAP_H = 420;
const PAD = 12;
const EXTENT: [[number, number], [number, number]] = [[PAD, PAD], [MAP_W - PAD, MAP_H - PAD]];

// Regions to zoom to, as lon/lat boxes [west, south, east, north].
export const WORLD_REGIONS: { id: string; label: string; box?: [number, number, number, number] }[] = [
  { id: "world", label: "World" },
  { id: "northAmerica", label: "North America", box: [-168, 7, -52, 72] },
  { id: "centralAmerica", label: "Central America & Caribbean", box: [-118, 5, -59, 33] },
  { id: "southAmerica", label: "South America", box: [-82, -56, -34, 13] },
  { id: "europe", label: "Europe", box: [-25, 34, 45, 71] },
  { id: "middleEast", label: "Middle East", box: [25, 12, 63, 42] },
  { id: "africa", label: "Africa", box: [-19, -35, 52, 38] },
  { id: "asia", label: "Asia", box: [60, -11, 150, 56] },
  { id: "southeastAsia", label: "Southeast Asia", box: [92, -11, 142, 29] },
  { id: "oceania", label: "Oceania", box: [110, -48, 180, 0] },
];

// The whole world fitted to the frame (so the far north isn't cut off), or a
// region's box fitted with Mercator.
function regionProjection(regionId: string): GeoProjection {
  const box = WORLD_REGIONS.find((r) => r.id === regionId)?.box;
  if (!box) return geoEqualEarth().fitExtent(EXTENT, WORLD_FEATURES);
  const [w, s, e, n] = box;
  return geoMercator().fitExtent(EXTENT, { type: "MultiPoint", coordinates: [[w, s], [e, n], [w, n], [e, s]] });
}

// Memoized: react-simple-maps re-serializes the geography on every render.
type Hover = { name: string; value: number } | null;
type CityPoint = { city: string; value: number; lat: number; lng: number; t: number };

// Yellow -> orange -> red as intensity (0..1) rises, like the Geo Map's cities.
function heat(t: number): string {
  const stops = [[250, 204, 21], [249, 115, 22], [220, 38, 38]];
  const x = Math.min(1, Math.max(0, t)) * 2;
  const i = Math.min(1, Math.floor(x));
  const f = x - i;
  return `rgb(${stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f)).join(",")})`;
}

// Memoized: react-simple-maps re-serializes the geography on every render.
const WorldLayer = memo(function WorldLayer({
  values,
  max,
  projection,
  states,
  focusState,
  cities,
  onHover,
  onPickState,
}: {
  values: Map<string, number>;
  max: number;
  projection: GeoProjection;
  // US states shaded on their own scale (North America and state views), or null.
  states: SubdivisionLayer[] | null;
  // Drilled into this state: others fade, and its cities are plotted.
  focusState: string | null;
  cities: CityPoint[];
  onHover: (h: Hover) => void;
  onPickState: (name: string, country: SubdividedCountry, geo: GeoPermissibleObjects) => void;
}) {
  return (
    <ComposableMap projection={projection} width={MAP_W} height={MAP_H} style={{ width: "100%", height: "auto" }}>
      <Geographies geography={worldGeography}>
        {({ geographies }) =>
          geographies.map((geo) => {
            const name = String(geo.properties?.name ?? "");
            const value = values.get(name) ?? 0;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={focusState ? "#f4f4f5" : shade(value, max)}
                stroke="#ffffff"
                strokeWidth={0.5}
                className="outline-none hover:fill-[#f59e0b]"
                onMouseEnter={() => onHover({ name, value })}
                onMouseLeave={() => onHover(null)}
              />
            );
          })
        }
      </Geographies>
      {/* US states and Canadian provinces (North America view), each shaded on its own scale. */}
      {states?.map((layer) => (
        <Geographies key={layer.country} geography={SUBDIVISION_SHAPES[layer.country]}>
          {({ geographies }) =>
            geographies.map((geo) => {
              // GA4 `region` values are full state / province names, matching the shapes' `name`.
              const name = String(geo.properties?.name ?? "");
              const value = layer.values.get(name) ?? 0;
              const faded = focusState != null && focusState !== name;
              return (
                <Geography
                  key={`${layer.country}-${geo.rsmKey}`}
                  geography={geo}
                  fill={faded ? "#f4f4f5" : focusState ? "#e8f3ef" : shade(value, layer.max)}
                  stroke={faded ? "#e4e4e7" : "#ffffff"}
                  strokeWidth={0.6}
                  className="cursor-pointer outline-none hover:fill-[#f59e0b]"
                  onMouseEnter={() => onHover({ name, value })}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onPickState(name, layer.country, geo as unknown as GeoPermissibleObjects)}
                />
              );
            })
          }
        </Geographies>
      ))}
      {/* City heat: a soft glow plus a dot, bigger and hotter for higher values. */}
      {cities.map((c) => (
        <Marker key={`g-${c.city}`} coordinates={[c.lng, c.lat]}>
          <circle r={(4 + c.t * 16) * 2} fill={heat(c.t)} opacity={0.3} pointerEvents="none" />
        </Marker>
      ))}
      {cities.map((c) => (
        <Marker key={c.city} coordinates={[c.lng, c.lat]}>
          <circle
            r={4 + c.t * 16}
            fill={heat(c.t)}
            fillOpacity={0.8}
            stroke="#ffffff"
            strokeWidth={1}
            className="cursor-pointer"
            onMouseEnter={() => onHover({ name: c.city, value: c.value })}
            onMouseLeave={() => onHover(null)}
          />
        </Marker>
      ))}
    </ComposableMap>
  );
});

// City values come back for these metrics; others fall back to sessions.
const CITY_METRICS = new Set(["totalUsers", "newUsers", "sessions", "engagedSessions", "keyEvents"]);
type CityRow = { city: string; lat?: number; lng?: number; values?: Record<string, number> };

function WorldMap({
  data,
  format,
  region,
  metric,
  query,
  onRegionBack,
}: {
  data: ListData;
  format: MetricFormat;
  region: string;
  metric: string;
  // Page dates + filters, for the state drill-down's city report.
  query: string;
  // Back one level from a region to the world.
  onRegionBack: () => void;
}) {
  const [hover, setHover] = useState<Hover>(null);
  // Drilled into a US state (from the North America view).
  const [drill, setDrill] = useState<{ state: string; country: SubdividedCountry; projection: GeoProjection } | null>(null);
  const [cityRows, setCityRows] = useState<{ state: string; rows: CityRow[]; loading: boolean; error: string | null } | null>(
    null
  );
  const values = useMemo(
    () => new Map(data.rows.map((r) => [COUNTRY_ALIASES[r.label] ?? r.label, r.value])),
    [data]
  );
  const max = Math.max(0, ...data.rows.map((r) => r.value));
  const regionProj = useMemo(() => regionProjection(region), [region]);
  // Only North America can drill into a state.
  const activeDrill = region === "northAmerica" ? drill : null;
  const projection = activeDrill?.projection ?? regionProj;
  // North America: US states and Canadian provinces, each country on its own
  // shading scale (older data without a country is the US).
  const states = useMemo((): SubdivisionLayer[] | null => {
    if (region !== "northAmerica" || !data.regions?.length) return null;
    return SUBDIVIDED_COUNTRIES.map((country) => {
      const rows = data.regions!.filter((r) => (r.country ?? "United States") === country);
      return {
        country,
        values: new Map(rows.map((r) => [r.label, r.value])),
        max: Math.max(0, ...rows.map((r) => r.value)),
      };
    });
  }, [region, data]);

  const cityMetric = CITY_METRICS.has(metric) ? metric : "sessions";
  const drillState = activeDrill?.state ?? null;
  const drillCountry = activeDrill?.country ?? null;
  useEffect(() => {
    if (!drillState) return;
    const url = `/api/ga4/cities?${query}&region=${encodeURIComponent(drillState)}&country=${encodeURIComponent(drillCountry ?? "United States")}`;
    const cached = getCached<{ cities: CityRow[] }>(url);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- serve a cached report synchronously
      setCityRows({ state: drillState, rows: cached.cities, loading: false, error: null });
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    setCityRows({ state: drillState, rows: [], loading: true, error: null });
    fetch(url, { signal: ac.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load cities.");
        return d as { cities: CityRow[] };
      })
      .then((d) => {
        if (cancelled) return;
        setCached(url, d);
        setCityRows({ state: drillState, rows: d.cities, loading: false, error: null });
      })
      .catch((e) => {
        if (!cancelled) setCityRows({ state: drillState, rows: [], loading: false, error: e instanceof Error ? e.message : "Failed to load cities." });
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [drillState, drillCountry, query]);

  const cities = useMemo((): CityPoint[] => {
    if (!drillState || cityRows?.state !== drillState) return [];
    const withValue = cityRows.rows
      .filter((c): c is CityRow & { lat: number; lng: number } => c.lat != null && c.lng != null)
      .map((c) => ({ city: c.city, lat: c.lat, lng: c.lng, value: c.values?.[cityMetric] ?? 0 }))
      .filter((c) => c.value > 0);
    const top = Math.max(1, ...withValue.map((c) => c.value));
    return withValue
      .map((c) => ({ ...c, t: Math.sqrt(c.value / top) }))
      .sort((x, y) => y.value - x.value);
  }, [drillState, cityRows, cityMetric]);

  const pickState = useCallback((name: string, country: SubdividedCountry, geo: GeoPermissibleObjects) => {
    setHover(null);
    // Rotated to the state's centre so a far-north province (Nunavut) fits well.
    const [lon] = geoCentroid(geo);
    setDrill({ state: name, country, projection: geoMercator().rotate([-lon, 0]).fitExtent(EXTENT, geo) });
  }, []);
  // Back one level: state -> North America -> World.
  const back = activeDrill ? () => setDrill(null) : region !== "world" ? onRegionBack : null;
  const cityFormat: MetricFormat = CITY_METRICS.has(metric) ? format : "number";

  return (
    <div className="relative overflow-hidden">
      {back && (
        <button
          type="button"
          onClick={back}
          className="absolute left-0 top-0 z-10 inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white/90 px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {activeDrill ? "North America" : "World"}
        </button>
      )}
      <WorldLayer
        values={values}
        max={max}
        projection={projection}
        states={states}
        focusState={drillState}
        cities={cities}
        onHover={setHover}
        onPickState={pickState}
      />
      <p className="mt-1 text-right text-xs text-zinc-600">
        {hover
          ? `${hover.name}: ${formatMetric(hover.value, drillState ? cityFormat : format)}`
          : drillState
            ? cityRows?.loading
              ? `Loading ${drillState} cities…`
              : cityRows?.error
                ? cityRows.error
                : `${drillState} by city${CITY_METRICS.has(metric) ? "" : " (sessions)"}. Hover a city`
            : states
              ? "US states and Canadian provinces. Click one for cities"
              : "Hover a country"}
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
