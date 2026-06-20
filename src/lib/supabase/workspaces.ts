import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspacePlan } from "@/lib/billing";
import type { WorkspaceRole, WorkspaceWithRole } from "@/lib/types";

type WorkspaceMemberRow = {
  role: WorkspaceRole;
  workspaces: {
    id: string;
    name: string;
    is_personal: boolean;
    plan: WorkspacePlan | null;
  } | null;
};

// Lists every workspace the current user belongs to, with their role in each.
export async function listMyWorkspaces(
  supabase: SupabaseClient
): Promise<WorkspaceWithRole[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name, is_personal, plan)")
    .returns<WorkspaceMemberRow[]>();

  if (error) throw error;

  return (data ?? [])
    .filter((row): row is WorkspaceMemberRow & { workspaces: NonNullable<WorkspaceMemberRow["workspaces"]> } =>
      row.workspaces !== null
    )
    .map((row) => ({
      id: row.workspaces.id,
      name: row.workspaces.name,
      isPersonal: row.workspaces.is_personal,
      plan: row.workspaces.plan ?? "free",
      role: row.role,
    }));
}

export function findPersonalWorkspace(
  workspaces: WorkspaceWithRole[]
): WorkspaceWithRole | undefined {
  return workspaces.find((w) => w.isPersonal);
}
