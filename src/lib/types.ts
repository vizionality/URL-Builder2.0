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
