"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { SearchConsoleCard } from "@/components/SearchConsoleCard";
import { BackToIntegrations } from "@/components/integrations/IntegrationIcons";

export default function SearchConsoleIntegrationPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/ga4/connection")
      .then((r) => r.json())
      .then((d) => setConnected(Boolean(d.connected)))
      .catch(() => setConnected(false));
  }, []);
  return (
    <>
      <Header title="Google Search Console" subtitle="Integration setup" />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <BackToIntegrations />
        {connected === null ? (
          <p className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 size={14} className="animate-spin" /> Loading…</p>
        ) : (
          <SearchConsoleCard googleConnected={connected} />
        )}
      </main>
    </>
  );
}
