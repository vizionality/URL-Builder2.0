"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { geoMercator, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { ArrowLeft, Loader2 } from "lucide-react";
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

// The map layer is memoized and never depends on hover state. react-simple-maps
// re-serializes the whole geography on every render, so hover is handled with
// a CSS :hover fill plus a stable setter, and moving the mouse only re-renders
// the small readout below, not the ~100KB map.
const MapLayer = memo(function MapLayer({
  byState,
  max,
  selected,
  onHover,
  onSelect,
}: {
  byState: Map<string, number>;
  max: number;
  selected: Selected;
  onHover: (h: Hover) => void;
  onSelect: (name: string, geo: GeoPermissibleObjects) => void;
}) {
  return (
    <ComposableMap
      projection={selected ? selected.projection : "geoAlbersUsa"}
      width={WIDTH}
      height={HEIGHT}
      style={{ width: "100%", height: "auto" }}
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
                fill={isOther ? "#f4f4f5" : shade(value, max)}
                stroke={isOther ? "#e4e4e7" : "#ffffff"}
                strokeWidth={selected ? 1.5 : 0.75}
                className={isOther || selected ? "outline-none" : "cursor-pointer outline-none hover:fill-[#f59e0b]"}
                onMouseEnter={() => !isOther && onHover({ name, value })}
                onMouseLeave={() => onHover(null)}
                onClick={() => !selected && onSelect(name, geo as unknown as GeoPermissibleObjects)}
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
});

type Cities = { region: string; cities: { city: string; newUsers: number }[] };

// Choropleth of new users by US state. Clicking a state zooms into it and
// lists new users by city (GA4 has no city coordinates, so cities are a list,
// not dots). `query` carries the dashboard's date range and filters.
export function GeoMap({ data, query }: { data: { region: string; newUsers: number }[]; query: string }) {
  const [hover, setHover] = useState<Hover>(null);
  const [selected, setSelected] = useState<Selected>(null);
  const [cities, setCities] = useState<{ loading: boolean; error: string | null; data: Cities | null }>(
    { loading: false, error: null, data: null }
  );

  const byState = useMemo(() => new Map(data.map((d) => [d.region, d.newUsers])), [data]);
  const max = useMemo(() => Math.max(0, ...data.map((d) => d.newUsers)), [data]);

  const onSelect = useMemo(
    () => (name: string, geo: GeoPermissibleObjects) => {
      const projection = geoMercator().fitExtent([[24, 24], [WIDTH - 24, HEIGHT - 24]], geo);
      setHover(null);
      setSelected({ name, projection });
    },
    []
  );

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

  const cityList = cities.data?.cities ?? [];
  const cityMax = Math.max(0, ...cityList.map((c) => c.newUsers));

  return (
    <div>
      {selected && (
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All states
        </button>
      )}

      <MapLayer byState={byState} max={max} selected={selected} onHover={setHover} onSelect={onSelect} />

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
            {hover ? `${hover.name}: ${hover.value.toLocaleString("en-US")} new users` : "Click a state for cities"}
          </span>
        </div>
      ) : (
        <div className="mt-2">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium text-zinc-800">{selected.name} by city</span>
            <span className="text-xs text-zinc-500">
              {(byState.get(selected.name) ?? 0).toLocaleString("en-US")} new users
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
