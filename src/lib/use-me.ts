"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/roles";

export type Me = { role: Role; clients: string[] | null; ownerEmail: string | null; email: string; plan: "business" | "agency" };

// The signed-in person's role, fetched once per page load (for hiding UI they
// can't use; the server enforces it regardless).
let cached: Promise<Me | null> | null = null;

export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    cached ??= fetch("/api/me").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    let alive = true;
    cached.then((m) => alive && setMe(m));
    return () => {
      alive = false;
    };
  }, []);
  return me;
}
