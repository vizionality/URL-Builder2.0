import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { AcceptInvite } from "@/components/team/AcceptInvite";

export const metadata: Metadata = { title: "Team invite", robots: { index: false, follow: false } };

// Team invite link. Signed-out visitors are sent to sign in first (middleware)
// and come back here.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: invite } = await createAdminClient()
    .from("team_members")
    .select("email, role, owner_id")
    .eq("invite_token", token)
    .is("accepted_at", null)
    .maybeSingle();
  const owner = invite ? (await createAdminClient().auth.admin.getUserById(invite.owner_id as string)).data.user : null;
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {!invite ? (
          <>
            <h1 className="text-lg font-semibold text-zinc-900">This invite isn&apos;t valid</h1>
            <p className="mt-1 text-sm text-zinc-500">It may have been used or removed. Ask for a new one.</p>
          </>
        ) : (
          <AcceptInvite
            token={token}
            inviteEmail={invite.email as string}
            role={invite.role as string}
            ownerEmail={owner?.email ?? "an agency"}
            signedInEmail={user?.email ?? ""}
          />
        )}
      </div>
    </main>
  );
}
