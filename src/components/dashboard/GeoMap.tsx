"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { geoAlbersUsa, geoMercator, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { ArrowLeft, Loader2, Minus, Plus, RotateCcw } from "lucide-react";
// US state shapes, bundled at build time so the map never fetches at runtime.
import usStates from "us-atlas/states-10m.json";
import { shade } from "@/lib/report";
import { getCached, setCached } from "@/lib/response-cache";

// us-atlas ships TopoJSON. react-simple-maps converts TopoJSON at runtime, but
// its prop type only lists GeoJSON, so narrow-cast to the prop's own type.
const geography = usStates as unknown as React.ComponentProps<typeof Geographies>["geography"];

const WIDTH = 800;
const HEIGHT = 500;

type Hover = { name: string; value: number } | null;
type Selected = { name: string; projection: GeoProjection } | null;
// Pan/zoom position: map coordinates at the view's center, and zoom factor.
type Pos = { center: [number, number]; zoom: number };
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

// Drag to pan, pinch on touch, and ctrl/cmd + wheel to zoom. A plain wheel is
// left to the page so scrolling past the map doesn't get stuck zooming it.
function allowZoomEvent(e: Event): boolean {
  if (e.type === "wheel") return (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey;
  return true;
}

// The map layer is memoized and never depends on hover state. react-simple-maps
// re-serializes the whole geography on every render, so hover is handled with
// a CSS :hover fill plus a stable setter, and moving the mouse only re-renders
// the small readout below, not the ~100KB map.
const MapLayer = memo(function MapLayer({
  byState,
  max,
  selected,
  points,
  pos,
  onMove,
  onHover,
  onSelect,
}: {
  byState: Map<string, number>;
  max: number;
  selected: Selected;
  points: CityPoint[];
  pos: Pos;
  onMove: (p: Pos) => void;
  onHover: (h: Hover) => void;
  onSelect: (name: string, geo: GeoPermissibleObjects) => void;
}) {
  return (
    <ComposableMap
      projection={selected ? selected.projection : US_PROJECTION}
      width={WIDTH}
      height={HEIGHT}
      style={{ width: "100%", height: "auto" }}
    >
      <ZoomableGroup
        center={pos.center}
        zoom={pos.zoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        filterZoomEvent={allowZoomEvent}
        onMoveEnd={({ coordinates, zoom }) => coordinates && zoom != null && onMove({ center: coordinates, zoom })}
        className="cursor-grab active:cursor-grabbing"
      >
      <Geographies geography={geography}>
        {({ geographies }) =>
          geographies.map((geo) => {
            // GA4 `region` values are full state names, matching us-atlas `name`.
            const name = String(geo.properties?.name ?? "");
            const value = byState.get(name) ?? 0;
            // Zoomed in: the chosen state keeps its shade, neighbors fade to context.
            const isOther = selected != null && selected.name !== name;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={isOther ? "#f4f4f5" : selected ? "#e8f3ef" : shade(value, max)}
                stroke={isOther ? "#e4e4e7" : "#ffffff"}
                strokeWidth={(selected ? 1.5 : 0.75) / pos.zoom}
                // Any state other than the zoomed one can be clicked to jump to it.
                className={
                  selected && !isOther
                    ? "outline-none"
                    : isOther
                      ? "cursor-pointer outline-none hover:fill-[#d9f5ec]"
                      : "cursor-pointer outline-none hover:fill-[#f59e0b]"
                }
                onMouseEnter={() => onHover({ name, value })}
                onMouseLeave={() => onHover(null)}
                onClick={() => (isOther || !selected) && onSelect(name, geo as unknown as GeoPermissibleObjects)}
              />
            );
          })
        }
      </Geographies>
      {/* City heat: a soft blurred glow per city plus a crisp dot. Bigger and
          hotter means more new users. Biggest drawn first so small ones stay on top. */}
      {points.length > 0 && (
        <defs>
          <filter id="city-heat" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
      )}
      {points.map((p) => (
        <Marker key={`g-${p.city}`} coordinates={[p.lng, p.lat]}>
          <circle r={(p.r * 2.2) / pos.zoom} fill={heat(p.t)} opacity={0.45} filter="url(#city-heat)" pointerEvents="none" />
        </Marker>
      ))}
      {points.map((p) => (
        <Marker key={p.city} coordinates={[p.lng, p.lat]}>
          <circle
            r={p.r / pos.zoom}
            fill={heat(p.t)}
            fillOpacity={0.75}
            stroke="#ffffff"
            strokeWidth={1 / pos.zoom}
            className="cursor-pointer"
            onMouseEnter={() => onHover({ name: p.city, value: p.newUsers })}
            onMouseLeave={() => onHover(null)}
          />
        </Marker>
      ))}
      </ZoomableGroup>
    </ComposableMap>
  );
});

type City = { city: string; newUsers: number; lat?: number; lng?: number };
type Cities = { region: string; cities: City[] };
// A plotted city: `t` is 0..1 intensity, `r` the dot radius in map units.
type CityPoint = { city: string; newUsers: number; lat: number; lng: number; t: number; r: number };

// Yellow -> orange -> red as intensity rises.
function heat(t: number): string {
  const stops = [[250, 204, 21], [249, 115, 22], [220, 38, 38]];
  const x = Math.min(1, Math.max(0, t)) * 2;
  const i = Math.min(1, Math.floor(x));
  const f = x - i;
  const [a, b] = [stops[i], stops[i + 1]];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;
}
const NO_POINTS: CityPoint[] = [];

// Starting view: the map coordinates at the middle of the frame, unzoomed.
// ZoomableGroup centers on these, so this matches the un-panned projection.
function homeOf(projection: GeoProjection): Pos {
  const c = projection.invert?.([WIDTH / 2, HEIGHT / 2]);
  return { center: c ? [c[0], c[1]] : [-96, 38], zoom: 1 };
}
// The same projection ComposableMap builds for "geoAlbersUsa", kept as one
// stable object so the pan/zoom handlers aren't rebuilt on every render.
const US_PROJECTION = geoAlbersUsa().translate([WIDTH / 2, HEIGHT / 2]);
const US_HOME = homeOf(US_PROJECTION);

// Choropleth of new users by US state. Clicking a state zooms into it and
// shows a city heat map plus a ranked list. GA4 has no city coordinates; the
// server attaches them from a bundled gazetteer, and unmatched cities are
// listed but not plotted. `query` carries the dashboard's date range and filters.
export function GeoMap({ data, query }: { data: { region: string; newUsers: number }[]; query: string }) {
  const [hover, setHover] = useState<Hover>(null);
  const [selected, setSelected] = useState<Selected>(null);
  const [cities, setCities] = useState<{ loading: boolean; error: string | null; data: Cities | null }>(
    { loading: false, error: null, data: null }
  );

  const byState = useMemo(() => new Map(data.map((d) => [d.region, d.newUsers])), [data]);
  const max = useMemo(() => Math.max(0, ...data.map((d) => d.newUsers)), [data]);

  const [pos, setPos] = useState<Pos>(US_HOME);

  const onSelect = useMemo(
    () => (name: string, geo: GeoPermissibleObjects) => {
      const projection = geoMercator().fitExtent([[24, 24], [WIDTH - 24, HEIGHT - 24]], geo);
      setHover(null);
      setSelected({ name, projection });
      setPos(homeOf(projection));
    },
    []
  );
  const showAllStates = () => {
    setSelected(null);
    setPos(US_HOME);
  };
  const zoomBy = (f: number) =>
    setPos((p) => ({ ...p, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, p.zoom * f)) }));
  const resetView = () => setPos(selected ? homeOf(selected.projection) : US_HOME);

  const stateName = selected?.name;
  useEffect(() => {
    if (!stateName) return;
    const url = `/api/ga4/cities?${query}&region=${encodeURIComponent(stateName)}`;
    const cached = getCached<Cities>(url);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- serve a cached report synchronously
      setCities({ loading: false, error: null, data: cached });
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    setCities({ loading: true, error: null, data: null });
    fetch(url, { signal: ac.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load cities.");
        return d as Cities;
      })
      .then((d) => {
        if (cancelled) return;
        setCached(url, d);
        setCities({ loading: false, error: null, data: d });
      })
      .catch((e) => {
        if (cancelled) return;
        setCities({ loading: false, error: e instanceof Error ? e.message : "Failed to load cities.", data: null });
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [stateName, query]);

  const cityList = useMemo(() => cities.data?.cities ?? [], [cities.data]);
  const cityMax = Math.max(0, ...cityList.map((c) => c.newUsers));
  const points = useMemo(() => {
    if (!selected || cityList.length === 0) return NO_POINTS;
    const top = Math.max(1, ...cityList.map((c) => c.newUsers));
    return cityList
      .filter((c): c is City & { lat: number; lng: number } => c.lat != null && c.lng != null)
      .map((c) => {
        const t = Math.sqrt(c.newUsers / top);
        return { city: c.city, newUsers: c.newUsers, lat: c.lat, lng: c.lng, t, r: 4 + t * 18 };
      })
      .sort((a, b) => b.newUsers - a.newUsers);
  }, [selected, cityList]);
  const unplotted = cityList.length - points.length;

  return (
    <div>
      {selected && (
        <button
          type="button"
          onClick={showAllStates}
          className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All states
        </button>
      )}

      <div className="relative">
        <MapLayer
          byState={byState}
          max={max}
          selected={selected}
          points={points}
          pos={pos}
          onMove={setPos}
          onHover={setHover}
          onSelect={onSelect}
        />
        <div className="absolute right-1 top-1 flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
          <button type="button" onClick={() => zoomBy(1.5)} aria-label="Zoom in" className="p-1.5 text-zinc-600 hover:bg-zinc-50">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out" className="border-t border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={resetView} aria-label="Reset view" className="border-t border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!selected ? (
        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span>1</span>
            <div
              className="h-2 w-28 rounded-sm"
              style={{ background: `linear-gradient(to right, ${shade(1, 100)}, ${shade(100, 100)})` }}
            />
            <span>{max.toLocaleString("en-US")}</span>
          </div>
          <span className="truncate text-zinc-700">
            {hover ? `${hover.name}: ${hover.value.toLocaleString("en-US")} new users` : "Click a state for cities. Drag to move."}
          </span>
        </div>
      ) : (
        <div className="mt-2">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium text-zinc-800">{selected.name} by city</span>
            <span className="text-xs text-zinc-500">
              {hover
                ? `${hover.name}: ${hover.value.toLocaleString("en-US")} new users`
                : `${(byState.get(selected.name) ?? 0).toLocaleString("en-US")} new users`}
            </span>
          </div>
          {cities.loading && (
            <div className="flex items-center gap-2 py-3 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading cities…
            </div>
          )}
          {cities.error && <p className="py-2 text-xs text-red-600">{cities.error}</p>}
          {!cities.loading && !cities.error && cityList.length === 0 && (
            <p className="py-2 text-xs text-zinc-500">No city data for this state in this range.</p>
          )}
          {unplotted > 0 && !cities.loading && (
            <p className="mb-2 text-[11px] text-zinc-400">
              {unplotted} {unplotted === 1 ? "city has" : "cities have"} no known location and {unplotted === 1 ? "is" : "are"} listed only.
            </p>
          )}
          {cityList.length > 0 && (
            <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {cityList.map((c) => (
                <li key={c.city} className="flex items-center gap-2 text-xs">
                  <span className="w-32 shrink-0 truncate text-zinc-700" title={c.city}>{c.city}</span>
                  <div className="h-2 flex-1 rounded-sm bg-zinc-100">
                    <div
                      className="h-2 rounded-sm"
                      style={{ width: `${(c.newUsers / cityMax) * 100}%`, background: shade(c.newUsers, cityMax) }}
                    />
                  </div>
                  <span className="w-12 text-right tabular-nums text-zinc-600">{c.newUsers.toLocaleString("en-US")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
