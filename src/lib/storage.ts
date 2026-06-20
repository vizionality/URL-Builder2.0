"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { BulkProjectsState, BulkRow, SavedUrl, UtmOptions } from "@/lib/types";

const EVENT_PREFIX = "utm-builder:event:";

export const STORAGE_KEYS = {
  utmOptions: "utm-builder:utmOptions",
  savedUrls: "utm-builder:savedUrls",
  bulkRows: "utm-builder:bulkRows",
  ga4PropertyId: "utm-builder:ga4PropertyId",
  bulkProjects: "bulk-utm-projects",
} as const;

export const DEFAULT_UTM_OPTIONS: UtmOptions = {
  sources: ["google", "facebook", "newsletter", "twitter"],
  mediums: ["cpc", "banner", "email", "social"],
  campaigns: ["spring_sale", "product_launch", "black_friday"],
};

const cache = new Map<string, { raw: string | null; value: unknown }>();

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  const cached = cache.get(key);
  if (cached && cached.raw === raw) {
    return cached.value as T;
  }
  let value: T = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function writeStorage<T>(key: string, value: T) {
  const raw = JSON.stringify(value);
  window.localStorage.setItem(key, raw);
  cache.set(key, { raw, value });
  window.dispatchEvent(new Event(EVENT_PREFIX + key));
}

function subscribe(key: string, callback: () => void) {
  const eventName = EVENT_PREFIX + key;
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
}

export function useStoredState<T>(key: string, fallback: T) {
  const fallbackRef = useRef(fallback);

  const subscribeFn = useCallback(
    (callback: () => void) => subscribe(key, callback),
    [key]
  );
  const getSnapshot = useCallback(
    () => readStorage(key, fallbackRef.current),
    [key]
  );
  const getServerSnapshot = useCallback(() => fallbackRef.current, []);

  const value = useSyncExternalStore(subscribeFn, getSnapshot, getServerSnapshot);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = readStorage(key, fallbackRef.current);
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
      writeStorage(key, resolved);
    },
    [key]
  );

  return [value, update] as const;
}

export function useUtmOptions() {
  return useStoredState<UtmOptions>(STORAGE_KEYS.utmOptions, DEFAULT_UTM_OPTIONS);
}

export function useSavedUrls() {
  return useStoredState<SavedUrl[]>(STORAGE_KEYS.savedUrls, []);
}

export function useBulkRows() {
  return useStoredState<BulkRow[]>(STORAGE_KEYS.bulkRows, []);
}

// Fixed (non-random) ids so the default state is identical on the server
// and client render, avoiding a hydration mismatch.
const DEFAULT_BULK_PROJECTS_STATE: BulkProjectsState = {
  projects: [
    {
      id: "project-1",
      name: "Project 1",
      rows: [
        {
          id: "project-1-row-1",
          baseUrl: "",
          source: "",
          medium: "",
          campaign: "",
          generatedUrl: "",
        },
      ],
    },
  ],
  activeProjectId: "project-1",
};

export function useBulkProjects() {
  return useStoredState<BulkProjectsState>(
    STORAGE_KEYS.bulkProjects,
    DEFAULT_BULK_PROJECTS_STATE
  );
}

export function useGa4PropertyId() {
  return useStoredState<string>(STORAGE_KEYS.ga4PropertyId, "");
}

export function distinctCampaignCount(
  savedUrls: SavedUrl[],
  bulkRows: BulkRow[]
): number {
  const names = new Set<string>();
  for (const row of bulkRows) {
    if (row.campaign.trim()) names.add(row.campaign.trim().toLowerCase());
  }
  for (const row of savedUrls) {
    if (row.campaign.trim()) names.add(row.campaign.trim().toLowerCase());
  }
  return names.size;
}
