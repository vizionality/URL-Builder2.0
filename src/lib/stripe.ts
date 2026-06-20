import Stripe from "stripe";
import type { WorkspacePlan } from "@/lib/billing";

// Server-only: never import this file from a client component.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export const STRIPE_PRICE_IDS: Partial<Record<WorkspacePlan, string>> = {
  pro: process.env.STRIPE_PRICE_PRO,
  team: process.env.STRIPE_PRICE_TEAM,
};

export function planFromPriceId(priceId: string | null | undefined): WorkspacePlan | null {
  if (!priceId) return null;
  if (priceId === STRIPE_PRICE_IDS.pro) return "pro";
  if (priceId === STRIPE_PRICE_IDS.team) return "team";
  return null;
}
