"use client";

import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card } from "@/components/Card";
import { useGa4Health, type HealthAlert } from "@/lib/ga4";

const CHECK_LABEL: Record<HealthAlert["check"], string> = {
  tracking: "Tracking",
  traffic: "Traffic",
  quality: "Data quality",
  landing: "Landing page",
};

function SeverityTag({ severity }: { severity: HealthAlert["severity"] }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        severity === "HIGH"
          ? "bg-zinc-800 text-white"
          : "bg-zinc-200 text-zinc-700"
      }`}
    >
      {severity}
    </span>
  );
}

export function HealthPanel({ propertyId }: { propertyId: string }) {
  const { loading, error, data } = useGa4Health(propertyId);

  // Monochrome by design: greyscale shading and bold for emphasis, not color.
  return (
    <Card
      title="Tracking Health"
      description="Daily checks vs. a same-weekday median baseline. Catches events that silently stop firing, plus traffic, quality, and landing-page drops."
    >
      {!propertyId ? (
        <p className="py-6 text-sm text-zinc-400">
          Connect Google Analytics in Integrations to run tracking health checks.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 py-6 text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Running checks…</span>
        </div>
      ) : error ? (
        <p className="py-4 text-sm text-red-600">{error}</p>
      ) : !data ? null : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {data.summary.total === 0 ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
                <ShieldCheck size={16} className="text-zinc-500" />
                No issues detected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-800">
                <ShieldAlert size={16} className="text-zinc-600" />
                {data.summary.high} high · {data.summary.medium} medium
              </span>
            )}
            <span className="text-xs text-zinc-400">
              Checked {data.target}
            </span>
          </div>

          {data.alerts.length > 0 && (
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-md border border-zinc-200">
              {data.alerts.map((a, i) => (
                <li
                  key={`${a.check}-${a.subject}-${i}`}
                  className={`flex items-start gap-3 px-3 py-2.5 ${
                    a.severity === "HIGH" ? "bg-zinc-100" : "bg-white"
                  }`}
                >
                  <SeverityTag severity={a.severity} />
                  <div className="min-w-0">
                    <p
                      className={`text-sm ${
                        a.severity === "HIGH"
                          ? "font-semibold text-zinc-900"
                          : "font-medium text-zinc-800"
                      }`}
                    >
                      {CHECK_LABEL[a.check]}: {a.subject}
                    </p>
                    <p className="text-sm text-zinc-600">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {data.notes.length > 0 && (
            <p className="text-xs text-zinc-400">{data.notes.join(" ")}</p>
          )}
        </div>
      )}
    </Card>
  );
}
