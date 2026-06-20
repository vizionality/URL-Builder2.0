export type WorkspacePlan = "free" | "pro" | "team";

export const PLAN_MEMBER_LIMITS: Record<WorkspacePlan, number> = {
  free: 3,
  pro: 5,
  team: Infinity,
};

export const PLAN_DETAILS: Record<
  WorkspacePlan,
  { label: string; priceLabel: string; memberLimitLabel: string }
> = {
  free: { label: "Free", priceLabel: "$0/mo", memberLimitLabel: "Up to 3 members" },
  pro: { label: "Pro", priceLabel: "$5.99/mo", memberLimitLabel: "Up to 5 members" },
  team: { label: "Team", priceLabel: "$14.99/mo", memberLimitLabel: "Unlimited members" },
};

export const UPGRADABLE_PLANS: WorkspacePlan[] = ["pro", "team"];
