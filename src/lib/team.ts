// Who is acting, and on whose account. A team member works in the owner's
// account: `id` is the owner's user id (every table is keyed by it), with the
// member's role and allowed clients. Server-only.
import { cache } from "react";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { atLeast, type Role } from "@/lib/roles";

export type AppUser = {
  id: string; // the account (owner) whose data is used
  sessionUserId: string; // who is signed in
  email: string;
  role: Role;
  clients: string[] | null; // allowed client slugs; null = all
  ownerEmail: string | null; // set for team members
};

export const getAppUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const email = user.email ?? "";
  try {
    const { data } = await createAdminClient()
      .from("team_members")
      .select("owner_id, role, client_slugs")
      .eq("member_user_id", user.id)
      .maybeSingle();
    if (data) {
      const { data: owner } = await createAdminClient().auth.admin.getUserById(data.owner_id as string);
      return {
        id: data.owner_id as string,
        sessionUserId: user.id,
        email,
        role: data.role as Role,
        clients: (data.client_slugs as string[] | null) ?? null,
        ownerEmail: owner?.user?.email ?? null,
      };
    }
  } catch {
    // No team table yet (migration not run): everyone is their own owner.
  }
  return { id: user.id, sessionUserId: user.id, email, role: "owner", clients: null, ownerEmail: null };
});

// 403 unless the signed-in person has at least `min`.
export function forbidUnless(user: AppUser, min: Role): NextResponse | null {
  if (atLeast(user.role, min)) return null;
  return NextResponse.json(
    { error: min === "analyst" ? "Your role is view-only." : "Only an admin can do that.", code: "forbidden" },
    { status: 403 }
  );
}
