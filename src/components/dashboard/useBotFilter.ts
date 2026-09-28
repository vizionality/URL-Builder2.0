"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-scope";
import { clearCache } from "@/lib/response-cache";
import type { BotDimension } from "@/lib/bot-signals";

export type BotRuleView = { id: string; dimension: BotDimension; value: string; createdBy: string | null; createdAt: string };
export type BotFilterState = { enabled: boolean; rules: BotRuleView[]; error: string | null; loaded: boolean };

// The client's bot filter, with add / remove / on-off. Any change clears the
// report cache so dashboards refetch with (or without) the filter.
export function useBotFilter() {
  const [state, setState] = useState<BotFilterState>({ enabled: true, rules: [], error: null, loaded: false });

  const load = useCallback(() => {
    fetch(api("/api/bot-filter"))
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setState({ enabled: d.enabled, rules: d.rules, error: null, loaded: true });
      })
      .catch((e) => setState((s) => ({ ...s, loaded: true, error: e instanceof Error && e.message ? e.message : "Couldn't load the bot filter." })));
  }, []);
  useEffect(load, [load]);

  const call = useCallback(
    async (method: string, path: string, body?: unknown) => {
      const r = await fetch(api(path), {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      }).catch(() => null);
      const d = await r?.json().catch(() => ({}));
      if (!r?.ok) {
        setState((s) => ({ ...s, error: d?.error ?? "Couldn't update the bot filter." }));
        return;
      }
      clearCache();
      load();
    },
    [load]
  );

  return {
    ...state,
    has: (dimension: BotDimension, value: string) => state.rules.find((r) => r.dimension === dimension && r.value === value),
    add: (rules: { dimension: BotDimension; value: string }[]) => call("POST", "/api/bot-filter", { rules }),
    remove: (id: string) => call("DELETE", `/api/bot-filter?id=${encodeURIComponent(id)}`),
    setEnabled: (enabled: boolean) => call("PATCH", "/api/bot-filter", { enabled }),
  };
}
