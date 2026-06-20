export type UtmOptions = {
  sources: string[];
  mediums: string[];
  campaigns: string[];
};

export type SavedUrl = {
  id: string;
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  generatedUrl: string;
  createdAt: string;
};

export type BulkRow = {
  id: string;
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  generatedUrl: string;
};

export type BulkProject = {
  id: string;
  name: string;
  rows: BulkRow[];
};

export type BulkProjectsState = {
  projects: BulkProject[];
  activeProjectId: string;
};

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export type Workspace = {
  id: string;
  name: string;
  isPersonal: boolean;
};

export type WorkspaceWithRole = Workspace & {
  role: WorkspaceRole;
};

export type WorkspaceProject = {
  id: string;
  workspaceId: string;
  name: string;
  rows: BulkRow[];
  createdAt: string;
  updatedAt: string;
};
