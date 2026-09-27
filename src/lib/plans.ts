// Plans: Business (one client, one Google login) and Agency (unlimited).
// Pure limits here; the user's plan is read server-side (lib/plan-store.ts).

export type Plan = "business" | "agency";

export const PLAN_LIMITS: Record<Plan, { clients: number; googleAccounts: number }> = {
  business: { clients: 1, googleAccounts: 1 },
  agency: { clients: Infinity, googleAccounts: Infinity },
};

export const PLAN_LABELS: Record<Plan, string> = { business: "Business", agency: "Agency" };

export function parsePlan(v: unknown): Plan {
  return v === "agency" ? "agency" : "business";
}

export function canAddClient(plan: Plan, clientCount: number): boolean {
  return clientCount < PLAN_LIMITS[plan].clients;
}

// A Google login already connected (same email) never counts against the limit.
export function canAddGoogleAccount(plan: Plan, emails: string[], email: string | null): boolean {
  if (email && emails.includes(email)) return true;
  return emails.length < PLAN_LIMITS[plan].googleAccounts;
}
