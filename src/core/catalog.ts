import os from "node:os";
import path from "node:path";

export type AgentTool = "agents" | "codex" | "cursor" | "claude" | "opencode" | "trae" | "windsurf" | "cline" | "continue" | "roo";
export type SkillScope = "global" | "project";

export interface SkillLocation {
  key: string;
  label: string;
  root: string;
  tool: AgentTool;
  scope: SkillScope;
  format: "skill-dir" | "markdown";
}

const home = os.homedir();

export const globalLocations: SkillLocation[] = [
  { key: "global-agents", label: "Agents Global", root: path.join(home, ".agents/skills"), tool: "agents", scope: "global", format: "skill-dir" },
  { key: "global-codex", label: "Codex Global", root: path.join(home, ".codex/skills"), tool: "codex", scope: "global", format: "skill-dir" },
  { key: "global-codex-system", label: "Codex System", root: path.join(home, ".codex/skills/.system"), tool: "codex", scope: "global", format: "skill-dir" },
  { key: "global-cursor", label: "Cursor Global", root: path.join(home, ".cursor/skills"), tool: "cursor", scope: "global", format: "skill-dir" },
  { key: "global-claude", label: "Claude Global", root: path.join(home, ".claude/skills"), tool: "claude", scope: "global", format: "skill-dir" },
  { key: "global-opencode", label: "OpenCode Global", root: path.join(home, ".opencode/skills"), tool: "opencode", scope: "global", format: "skill-dir" },
  { key: "global-trae", label: "Trae Global", root: path.join(home, ".trae/skills"), tool: "trae", scope: "global", format: "skill-dir" },
  { key: "global-windsurf", label: "Windsurf Rules", root: path.join(home, ".windsurf/rules"), tool: "windsurf", scope: "global", format: "markdown" },
  { key: "global-cline", label: "Cline Rules", root: path.join(home, ".cline/rules"), tool: "cline", scope: "global", format: "markdown" },
  { key: "global-continue", label: "Continue Rules", root: path.join(home, ".continue/rules"), tool: "continue", scope: "global", format: "markdown" },
  { key: "global-roo", label: "Roo Rules", root: path.join(home, ".roo/rules"), tool: "roo", scope: "global", format: "markdown" },
];

export function resolveDestination(key: string, projectPath?: string) {
  const global = globalLocations.find((item) => item.key === key);
  if (global) return { ...global, resolvedRoot: global.root };
  if (!projectPath) return null;
  const projectMap: Record<string, { root: string; tool: AgentTool; label: string }> = {
    "project-agents": { root: ".agents/skills", tool: "agents", label: "Project Agents" },
    "project-codex": { root: ".codex/skills", tool: "codex", label: "Project Codex" },
    "project-cursor": { root: ".cursor/skills", tool: "cursor", label: "Project Cursor" },
    "project-claude": { root: ".claude/skills", tool: "claude", label: "Project Claude" },
    "project-opencode": { root: ".opencode/skills", tool: "opencode", label: "Project OpenCode" },
    "project-trae": { root: ".trae/skills", tool: "trae", label: "Project Trae" },
  };
  const item = projectMap[key];
  if (!item) return null;
  return {
    key,
    label: item.label,
    root: item.root,
    resolvedRoot: path.join(projectPath, item.root),
    tool: item.tool,
    scope: "project" as const,
    format: "skill-dir" as const,
  };
}
