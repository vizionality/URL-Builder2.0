"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Trash2, UserPlus, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace-context";
import {
  changeMemberRole,
  createInvite,
  listPendingInvites,
  listWorkspaceMembers,
  removeMember,
  revokeInvite,
  type WorkspaceInvite,
  type WorkspaceMember,
} from "@/lib/supabase/members";
import type { WorkspaceRole } from "@/lib/types";

const INVITABLE_ROLES: WorkspaceRole[] = ["admin", "editor", "viewer"];
const ASSIGNABLE_ROLES: WorkspaceRole[] = ["owner", "admin", "editor", "viewer"];

const selectClass =
  "rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400";

function roleLabel(role: WorkspaceRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function MembersPage() {
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canManage =
    activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";
  const ownerCount = members.filter((m) => m.role === "owner").length;

  useEffect(() => {
    if (!activeWorkspace) return;
    const workspaceId = activeWorkspace.id;
    const workspaceRole = activeWorkspace.role;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setCurrentUserEmail(user?.email ?? null);

      const memberList = await listWorkspaceMembers(supabase, workspaceId);
      if (cancelled) return;
      setMembers(memberList);

      if (workspaceRole === "owner" || workspaceRole === "admin") {
        const inviteList = await listPendingInvites(supabase, workspaceId);
        if (!cancelled) setInvites(inviteList);
      } else {
        setInvites([]);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace]);

  async function handleInvite() {
    if (!activeWorkspace || !canManage) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteError("Enter an email address.");
      return;
    }
    setInviting(true);
    setInviteError(null);
    try {
      const supabase = createClient();
      await createInvite(supabase, activeWorkspace.id, email, inviteRole);
      const inviteList = await listPendingInvites(supabase, activeWorkspace.id);
      setInvites(inviteList);
      setInviteEmail("");
      setInviteRole("editor");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(invite: WorkspaceInvite) {
    if (!canManage) return;
    if (!window.confirm(`Revoke the invite for ${invite.email}?`)) return;
    const supabase = createClient();
    await revokeInvite(supabase, invite.id);
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  }

  async function handleRoleChange(member: WorkspaceMember, role: WorkspaceRole) {
    if (!canManage) return;
    if (member.role === "owner" && role !== "owner" && ownerCount <= 1) {
      window.alert("A workspace must always have at least one owner.");
      return;
    }
    const supabase = createClient();
    await changeMemberRole(supabase, member.id, role);
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role } : m))
    );
  }

  async function handleRemove(member: WorkspaceMember) {
    if (!canManage) return;
    if (member.role === "owner" && ownerCount <= 1) {
      window.alert("A workspace must always have at least one owner.");
      return;
    }
    if (!window.confirm(`Remove ${member.email} from this workspace?`)) return;
    const supabase = createClient();
    await removeMember(supabase, member.id);
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  }

  const isLoading = workspaceLoading || loading;

  return (
    <>
      <Header title="Members" subtitle="Manage who has access to this workspace" />
      <main className="flex-1 px-4 py-6 sm:px-6">
        {isLoading ? (
          <Card>
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-sm">Loading members…</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {canManage && (
              <Card title="Invite someone">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-56 flex-1">
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="teammate@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                      className={selectClass}
                    >
                      {INVITABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={inviting}
                    className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    <UserPlus size={16} />
                    {inviting ? "Sending…" : "Send Invite"}
                  </button>
                </div>
                {inviteError && (
                  <p className="mt-2 text-sm text-red-600">{inviteError}</p>
                )}
                <p className="mt-2 text-xs text-zinc-400">
                  No email is sent — the invite appears in-app for that address.
                </p>
              </Card>
            )}

            {canManage && (
              <Card title="Pending invites">
                {invites.length === 0 ? (
                  <p className="text-sm text-zinc-400">No pending invites.</p>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {invites.map((invite) => (
                      <li
                        key={invite.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <span className="flex items-center gap-2 text-sm text-zinc-700">
                          <Mail size={14} className="text-zinc-400" />
                          {invite.email}
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                            {roleLabel(invite.role)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRevoke(invite)}
                          aria-label="Revoke invite"
                          className="rounded-md border border-zinc-200 p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            <Card title="Members" description={`${members.length} member${members.length === 1 ? "" : "s"} in this workspace`}>
              <ul className="divide-y divide-zinc-100">
                {members.map((member) => {
                  const isLastOwner = member.role === "owner" && ownerCount <= 1;
                  return (
                    <li
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                    >
                      <span className="text-sm text-zinc-700">
                        {member.email}
                        {member.email === currentUserEmail && (
                          <span className="ml-1.5 text-xs text-zinc-400">(you)</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {canManage ? (
                          <select
                            value={member.role}
                            disabled={isLastOwner}
                            onChange={(e) =>
                              handleRoleChange(member, e.target.value as WorkspaceRole)
                            }
                            className={selectClass}
                          >
                            {ASSIGNABLE_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {roleLabel(role)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                            {roleLabel(member.role)}
                          </span>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleRemove(member)}
                            disabled={isLastOwner}
                            aria-label="Remove member"
                            className="rounded-md border border-zinc-200 p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
