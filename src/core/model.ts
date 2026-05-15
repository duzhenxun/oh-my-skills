import type { AgentTool, SkillScope } from "./catalog";

export interface SkillRecord {
  id: string;
  title: string;
  summary: string;
  category: string;
  tool: AgentTool;
  scope: SkillScope;
  enabled: boolean;
  filePath: string;
  folderPath: string;
  locationKey: string;
  locationLabel: string;
  bytes: number;
  updatedAt: string;
  metadata: Record<string, unknown>;
  body?: string;
  raw?: string;
  files?: SkillFileEntry[];
}

export interface SkillFileEntry {
  id: string;
  name: string;
  relativePath: string;
  filePath: string;
  bytes: number;
  updatedAt: string;
  editable: boolean;
}

export interface HubSkill {
  id: string;
  name: string;
  description: string;
  slug?: string;
  url?: string;
  repoUrl?: string;
  owner?: string;
  source?: string;
  category?: string;
  version?: string;
  downloads?: number;
  installs?: number;
  stars?: number;
  updatedAt?: number;
  installed?: boolean;
  installedSkillId?: string;
  installedSkillTitle?: string;
  installedSkillPath?: string;
}
