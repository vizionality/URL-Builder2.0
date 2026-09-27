// Team roles and what they may do. Pure and unit-tested.

export type Role = "owner" | "admin" | "analyst" | "viewer";
export type MemberRole = Exclude<Role, "owner">;

export const MEMBER_ROLES: { id: MemberRole; label: string; description: string }[] = [
  { id: "admin", label: "Admin", description: "Everything, including team, clients and Google accounts." },
  { id: "analyst", label: "Analyst", description: "Works on their clients: dashboards, UTMs, portal links." },
  { id: "viewer", label: "Viewer", description: "Views their clients' dashboards. No changes." },
];

const RANK: Record<Role, number> = { viewer: 0, analyst: 1, admin: 2, owner: 3 };

// Whether `role` is at least `min`.
export function atLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

export function parseMemberRole(v: unknown): MemberRole | null {
  return v === "admin" || v === "analyst" || v === "viewer" ? v : null;
}

// A member limited to some clients can only reach those; null means all.
export function canSeeClient(allowed: string[] | null, slug: string): boolean {
  return allowed === null || allowed.includes(slug);
}
