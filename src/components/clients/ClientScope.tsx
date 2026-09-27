"use client";

import { useEffect } from "react";
import { setCurrentClient } from "@/lib/client-scope";

// Marks this tab's client before its pages render, so their API calls carry it.
export function ClientScope({
  slug,
  legacyOwner = false,
  children,
}: {
  slug: string;
  // The oldest client, which inherits builder data saved before clients existed.
  legacyOwner?: boolean;
  children: React.ReactNode;
}) {
  // Browser only: module state on the server is shared between requests.
  if (typeof window !== "undefined") setCurrentClient(slug, legacyOwner);
  useEffect(() => setCurrentClient(slug, legacyOwner), [slug, legacyOwner]);
  return <>{children}</>;
}
