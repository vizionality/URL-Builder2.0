"use client";

import { memo, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
// US state shapes, bundled at build time so the map never fetches at runtime.
import usStates from "us-atlas/states-10m.json";
import { shade } from "@/lib/report";

// us-atlas ships TopoJSON. react-simple-maps converts TopoJSON at runtime, but
// its prop type only lists GeoJSON, so narrow-cast to the prop's own type.
const geography = usStates as unknown as React.ComponentProps<typeof Geographies>["geography"];

type Hover = { name: string; value: number } | null;

// The map layer is memoized and never depends on hover state. react-simple-maps
// re-serializes the whole geography on every render, so hover is handled with
// a CSS :hover fill plus a stable setter, and moving the mouse only re-renders
// the small readout below, not the ~100KB map.
const MapLayer = memo(function MapLayer({
  byState,
  max,
  onHover,
}: {
  byState: Map<string, number>;
  max: number;
  onHover: (h: Hover) => void;
}) {
  return (
    <ComposableMap projection="geoAlbersUsa" width={800} height={500} style={{ width: "100%", height: "auto" }}>
      <Geographies geography={geography}>
        {({ geographies }) =>
          geographies.map((geo) => {
            // GA4 `region` values are full state names, matching us-atlas `name`.
            const name = String(geo.properties?.name ?? "");
            const value = byState.get(name) ?? 0;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={shade(value, max)}
                stroke="#ffffff"
                strokeWidth={0.75}
                className="cursor-pointer outline-none hover:fill-[#f59e0b]"
                onMouseEnter={() => onHover({ name, value })}
                onMouseLeave={() => onHover(null)}
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
});

// Choropleth of new users by US state.
export function GeoMap({ data }: { data: { region: string; newUsers: number }[] }) {
  const [hover, setHover] = useState<Hover>(null);

  const byState = useMemo(() => new Map(data.map((d) => [d.region, d.newUsers])), [data]);
  const max = useMemo(() => Math.max(0, ...data.map((d) => d.newUsers)), [data]);

  return (
    <div>
      <MapLayer byState={byState} max={max} onHover={setHover} />

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
          {hover ? `${hover.name}: ${hover.value.toLocaleString("en-US")} new users` : "Hover a state"}
        </span>
      </div>
    </div>
  );
}
