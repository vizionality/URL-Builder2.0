"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { useWorkspace } from "@/lib/workspace-context";
import { PLAN_DETAILS, UPGRADABLE_PLANS, type WorkspacePlan } from "@/lib/billing";

export default function BillingPage() {
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();
  const [pendingPlan, setPendingPlan] = useState<WorkspacePlan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("checkout") === "cancelled"
      ? "Checkout was cancelled. No changes were made."
      : null;
  });

  const isOwner = activeWorkspace?.role === "owner";
  const currentPlan: WorkspacePlan = activeWorkspace?.plan ?? "free";

  async function handleUpgrade(plan: WorkspacePlan) {
    if (!activeWorkspace || !isOwner) return;
    setActionError(null);
    setPendingPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace.id, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start checkout.");
      window.location.assign(data.url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start checkout.");
      setPendingPlan(null);
    }
  }

  async function handleManageBilling() {
    if (!activeWorkspace || !isOwner) return;
    setActionError(null);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspace.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to open billing portal.");
      window.location.assign(data.url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to open billing portal.");
      setPortalLoading(false);
    }
  }

  return (
    <>
      <Header title="Billing" subtitle="Manage your workspace's plan" />
      <main className="flex-1 px-4 py-6 sm:px-6">
        {workspaceLoading ? (
          <Card>
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-sm">Loading billing…</p>
            </div>
          </Card>
        ) : !activeWorkspace ? (
          <Card>
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-zinc-400">
              <p className="text-sm">No workspace available.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {!isOwner && (
              <Card>
                <p className="text-sm text-zinc-500">
                  Only the workspace owner can manage billing. You&rsquo;re currently on the{" "}
                  <span className="font-medium text-zinc-700">{PLAN_DETAILS[currentPlan].label}</span> plan.
                </p>
              </Card>
            )}

            {actionError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              {(Object.keys(PLAN_DETAILS) as WorkspacePlan[]).map((plan) => {
                const details = PLAN_DETAILS[plan];
                const isCurrent = plan === currentPlan;
                const isUpgradable = UPGRADABLE_PLANS.includes(plan);
                return (
                  <Card key={plan}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-zinc-900">{details.label}</h3>
                      {isCurrent && (
                        <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          <Check size={12} />
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-zinc-900">{details.priceLabel}</p>
                    <p className="mt-2 text-sm text-zinc-500">{details.memberLimitLabel}</p>
                    {isOwner && isUpgradable && !isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleUpgrade(plan)}
                        disabled={pendingPlan !== null}
                        className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {pendingPlan === plan ? "Redirecting…" : `Upgrade to ${details.label}`}
                      </button>
                    )}
                  </Card>
                );
              })}
            </div>

            {isOwner && currentPlan !== "free" && (
              <Card title="Manage subscription">
                <p className="text-sm text-zinc-500">
                  Update your payment method, view invoices, or cancel your subscription.
                </p>
                <button
                  type="button"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="mt-3 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {portalLoading ? "Opening…" : "Manage Billing"}
                </button>
              </Card>
            )}
          </div>
        )}
      </main>
    </>
  );
}
