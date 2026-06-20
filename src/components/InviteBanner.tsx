"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace-context";
import { acceptInvite, listMyPendingInvites, type MyInvite } from "@/lib/supabase/members";

export function InviteBanner() {
  const { refreshWorkspaces } = useWorkspace();
  const [invites, setInvites] = useState<MyInvite[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user?.email) return;
      const list = await listMyPendingInvites(supabase, user.email);
      if (!cancelled) setInvites(list);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAccept(invite: MyInvite) {
    setAcceptingId(invite.id);
    const supabase = createClient();
    try {
      await acceptInvite(supabase, invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      await refreshWorkspaces(invite.workspaceId);
    } finally {
      setAcceptingId(null);
    }
  }

  if (invites.length === 0) return null;

  return (
    <div className="space-y-2 border-b border-green-200 bg-green-50 px-4 py-3 sm:px-6">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <p className="flex items-center gap-2 text-sm text-green-800">
            <Mail size={16} />
            You&rsquo;ve been invited to{" "}
            <span className="font-medium">{invite.workspaceName}</span> as{" "}
            <span className="font-medium">{invite.role}</span>.
          </p>
          <button
            type="button"
            onClick={() => handleAccept(invite)}
            disabled={acceptingId === invite.id}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {acceptingId === invite.id ? "Accepting…" : "Accept"}
          </button>
        </div>
      ))}
    </div>
  );
}
