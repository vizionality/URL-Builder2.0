import type { SupabaseClient } from "@supabase/supabase-js";
import type { BulkRow, WorkspaceProject } from "@/lib/types";

export const MAX_PROJECTS_PER_WORKSPACE = 5;

type ProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  rows: BulkRow[];
  created_at: string;
  updated_at: string;
};

function fromRow(row: ProjectRow): WorkspaceProject {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    rows: row.rows ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProjects(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceProject[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, workspace_id, name, rows, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .returns<ProjectRow[]>();

  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createProject(
  supabase: SupabaseClient,
  workspaceId: string,
  name: string,
  rows: BulkRow[] = []
): Promise<WorkspaceProject> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ workspace_id: workspaceId, name, rows })
    .select("id, workspace_id, name, rows, created_at, updated_at")
    .single<ProjectRow>();

  if (error) throw error;
  return fromRow(data);
}

export async function renameProject(
  supabase: SupabaseClient,
  projectId: string,
  name: string
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", projectId);

  if (error) throw error;
}

export async function deleteProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function updateProjectRows(
  supabase: SupabaseClient,
  projectId: string,
  rows: BulkRow[]
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ rows })
    .eq("id", projectId);

  if (error) throw error;
}
