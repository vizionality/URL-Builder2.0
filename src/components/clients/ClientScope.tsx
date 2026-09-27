"use client";

import { useEffect } from "react";
import { setCurrentClient } from "@/lib/client-scope";

// Marks this tab's client before its pages render, so their API calls carry it.
export function ClientScope({ slug, children }: { slug: string; children: React.ReactNode }) {
  // Browser only: module state on the server is shared between requests.
  if (typeof window !== "undefined") setCurrentClient(slug);
  useEffect(() => setCurrentClient(slug), [slug]);
  return <>{children}</>;
}
