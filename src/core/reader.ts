import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { globalLocations, type AgentTool, type SkillLocation } from "./catalog";
import { getTrackedProjects } from "./workspace-store";
import { categoryFor } from "./names";
import type { SkillFileEntry, SkillRecord } from "./model";

function makeId(filePath: string) {
  return Buffer.from(filePath).toString("base64url");
}

function parseId(id: string) {
  try {
    return Buffer.from(id, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function isEditableFile(filePath: string) {
  return /\.(md|mdc|txt|json|ya?ml|toml|js|ts|tsx|jsx|css|html|sh|py)$/i.test(filePath);
}

function assertInsideFolder(folderPath: string, filePath: string) {
  const relative = path.relative(folderPath, filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("File is outside skill folder");
  return relative;
}

async function readMarkdown(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);
  const title = typeof parsed.data.name === "string" && parsed.data.name.trim() ? parsed.data.name.trim() : path.basename(path.dirname(filePath));
  const summary = typeof parsed.data.description === "string" ? parsed.data.description : "";
  return { raw, body: parsed.content, metadata: parsed.data as Record<string, unknown>, title, summary };
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function recordFromFile(filePath: string, folderPath: string, location: SkillLocation, enabled: boolean): Promise<SkillRecord | null> {
  try {
    const parsed = await readMarkdown(filePath);
    const stat = await fs.stat(filePath);
    const title = parsed.title || path.basename(folderPath);
    return {
      id: makeId(filePath),
      title,
      summary: parsed.summary,
      category: categoryFor(title),
      tool: location.tool,
      scope: location.scope,
      enabled,
      filePath,
      folderPath,
      locationKey: location.key,
      locationLabel: location.label,
      bytes: stat.size,
      updatedAt: stat.mtime.toISOString(),
      metadata: parsed.metadata,
    };
  } catch {
    return null;
  }
}

async function scanLocation(location: SkillLocation): Promise<SkillRecord[]> {
  const found: SkillRecord[] = [];
  let entries;
  try {
    entries = await fs.readdir(location.root, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const fullPath = path.join(location.root, entry.name);
    if (entry.isDirectory()) {
      const enabledFile = path.join(fullPath, "SKILL.md");
      const disabledFile = path.join(fullPath, "SKILL.md.disabled");
      if (await fileExists(enabledFile)) {
        const record = await recordFromFile(enabledFile, fullPath, location, true);
        if (record) found.push(record);
      } else if (await fileExists(disabledFile)) {
        const record = await recordFromFile(disabledFile, fullPath, location, false);
        if (record) found.push(record);
      }
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(md|mdc)(\.disabled)?$/i.test(entry.name)) continue;
    const record = await recordFromFile(fullPath, location.root, location, !entry.name.endsWith(".disabled"));
    if (record) found.push(record);
  }
  return found;
}

function projectLocations(projectPath: string, projectName: string): SkillLocation[] {
  return [[".agents/skills", "agents"], [".codex/skills", "codex"], [".cursor/skills", "cursor"], [".claude/skills", "claude"], [".opencode/skills", "opencode"], [".trae/skills", "trae"]].map(([root, tool]) => ({
    key: `project-${tool}-${projectPath}`,
    label: `${projectName} (${tool})`,
    root: path.join(projectPath, root),
    tool: tool as AgentTool,
    scope: "project" as const,
    format: "skill-dir" as const,
  }));
}

export async function listSkills() {
  const batches = await Promise.all(globalLocations.map(scanLocation));
  const projects = await getTrackedProjects();
  for (const project of projects) {
    batches.push(...await Promise.all(projectLocations(project.path, project.name).map(scanLocation)));
  }
  return batches.flat().sort((a, b) => a.title.localeCompare(b.title));
}

export async function getSkill(id: string): Promise<SkillRecord | null> {
  const filePath = parseId(id);
  if (!filePath) return null;
  const all = await listSkills();
  const record = all.find((item) => item.filePath === filePath);
  if (!record) return null;
  const parsed = await readMarkdown(record.filePath);
  return { ...record, raw: parsed.raw, body: parsed.body, metadata: parsed.metadata, files: await listSkillFiles(record.folderPath) };
}

export async function getSkillByFilePath(filePath: string) {
  return getSkill(makeId(filePath));
}

export function pathsForToggle(filePath: string, enabled: boolean) {
  const disabled = filePath.endsWith(".disabled") ? filePath : `${filePath}.disabled`;
  const active = filePath.endsWith(".disabled") ? filePath.slice(0, -".disabled".length) : filePath;
  return enabled ? { from: filePath, to: active } : { from: filePath, to: disabled };
}

export async function listSkillFiles(folderPath: string): Promise<SkillFileEntry[]> {
  const files: SkillFileEntry[] = [];
  async function walk(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        files.push({ id: makeId(fullPath), name: entry.name, relativePath: assertInsideFolder(folderPath, fullPath), filePath: fullPath, bytes: stat.size, updatedAt: stat.mtime.toISOString(), editable: isEditableFile(fullPath) });
      }
    }
  }
  await walk(folderPath);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function getSkillFile(skillId: string, fileId: string) {
  const skill = await getSkill(skillId);
  if (!skill) return null;
  const filePath = parseId(fileId);
  if (!filePath) return null;
  const relativePath = assertInsideFolder(skill.folderPath, filePath);
  const stat = await fs.stat(filePath);
  return { skill, file: { id: fileId, name: path.basename(filePath), relativePath, filePath, bytes: stat.size, updatedAt: stat.mtime.toISOString(), editable: isEditableFile(filePath) } satisfies SkillFileEntry, raw: await fs.readFile(filePath, "utf8") };
}

export { makeId, parseId };
