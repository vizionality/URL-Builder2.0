"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { GoogleAnalyticsIcon, SearchConsoleIcon } from "@/components/integrations/IntegrationIcons";

type Connection = { connected: boolean; propertyId?: string; gscSiteUrl?: string | null };

// Integrations: one tile per platform; each opens its setup page.
export default function IntegrationsPage() {
  const [conn, setConn] = useState<Connection | null>(null);
  useEffect(() => {
    fetch("/api/ga4/connection")
      .then((r) => r.json())
      .then(setConn)
      .catch(() => setConn({ connected: false }));
  }, []);

  const tiles = [
    {
      href: "/integrations/google-analytics",
      name: "Google Analytics",
      description: "GA4 sessions, users and conversions for the dashboard.",
      Icon: GoogleAnalyticsIcon,
      status: !conn ? null : conn.connected && conn.propertyId ? "Connected" : conn.connected ? "Pick a property" : "Not connected",
    },
    {
      href: "/integrations/search-console",
      name: "Google Search Console",
      description: "Clicks, impressions, CTR and position for the SEO Dashboard.",
      Icon: SearchConsoleIcon,
      status: !conn ? null : conn.gscSiteUrl ? "Connected" : conn.connected ? "Pick a site" : "Not connected",
    },
  ];

  return (
    <>
      <Header title="Integrations" subtitle="Connect external data sources" />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map(({ href, name, description, Icon, status }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-green-300 hover:bg-green-50/30"
            >
              <Icon className="h-11 w-11 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-900">{name}</p>
                <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
                {status && (
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      status === "Connected" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {status}
                  </span>
                )}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300 group-hover:text-green-600" />
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
