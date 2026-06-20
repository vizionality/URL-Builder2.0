import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceRole } from "@/lib/types";

export type WorkspaceMember = {
  id: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  createdAt: string;
};

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  createdAt: string;
};

export type MyInvite = WorkspaceInvite & {
  workspaceName: string;
};

type MemberRow = {
  id: string;
  user_id: string;
  email: string;
  role: WorkspaceRole;
  created_at: string;
};

type InviteRow = {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  created_at: string;
};

type MyInviteRow = InviteRow & {
  workspaces: { name: string } | null;
};

export async function listWorkspaceMembers(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("id, user_id, email, role, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .returns<MemberRow[]>();

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  }));
}

export async function listPendingInvites(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceInvite[]> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("id, workspace_id, email, role, created_at")
    .eq("workspace_id", workspaceId)
    .eq("accepted", false)
    .order("created_at", { ascending: true })
    .returns<InviteRow[]>();

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  }));
}

export async function createInvite(
  supabase: SupabaseClient,
  workspaceId: string,
  email: string,
  role: WorkspaceRole
): Promise<void> {
  const { error } = await supabase
    .from("workspace_invites")
    .insert({ workspace_id: workspaceId, email, role });

  if (error) throw error;
}

export async function revokeInvite(
  supabase: SupabaseClient,
  inviteId: string
): Promise<void> {
  const { error } = await supabase
    .from("workspace_invites")
    .delete()
    .eq("id", inviteId);

  if (error) throw error;
}

export async function changeMemberRole(
  supabase: SupabaseClient,
  memberId: string,
  role: WorkspaceRole
): Promise<void> {
  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("id", memberId);

  if (error) throw error;
}

export async function removeMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;
}

// RLS already restricts rows to invites whose email matches the current user.
export async function listMyPendingInvites(
  supabase: SupabaseClient,
  email: string
): Promise<MyInvite[]> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("id, workspace_id, email, role, created_at, workspaces(name)")
    .eq("email", email)
    .eq("accepted", false)
    .returns<MyInviteRow[]>();

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    workspaceName: row.workspaces?.name ?? "Unknown workspace",
  }));
}

export async function acceptInvite(
  supabase: SupabaseClient,
  inviteId: string
): Promise<void> {
  const { error } = await supabase.rpc("accept_invite", { invite_id: inviteId });
  if (error) throw error;
}
