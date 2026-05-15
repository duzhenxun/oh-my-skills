import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface TrackedProject {
  path: string;
  name: string;
  addedAt: string;
}

export interface DiscoverySnapshot {
  discovered: string[];
  scannedAt: string;
  roots: string[];
  durationMs: number;
}

const storeDir = path.join(os.homedir(), ".oh-my-skills");
const projectsFile = path.join(storeDir, "projects.json");
const discoveryFile = path.join(storeDir, "project-discovery.json");
const markers = [".agents/skills", ".codex/skills", ".cursor/skills", ".claude/skills", ".opencode/skills", ".trae/skills"];
const skipNames = new Set(["node_modules", ".git", "Library", "Applications", "System", "Volumes", "Pictures", "Movies", "Music", ".Trash"]);

async function ensureStore() {
  await fs.mkdir(storeDir, { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function getTrackedProjects() {
  return readJson<TrackedProject[]>(projectsFile, []);
}

export async function addTrackedProject(inputPath: string) {
  await ensureStore();
  const resolved = path.resolve(inputPath.replace(/^~/, os.homedir()));
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) throw new Error("Path is not a directory");
  const projects = await getTrackedProjects();
  if (!projects.some((item) => item.path === resolved)) {
    projects.push({ path: resolved, name: path.basename(resolved), addedAt: new Date().toISOString() });
    await fs.writeFile(projectsFile, JSON.stringify(projects, null, 2));
  }
  return projects;
}

export async function removeTrackedProject(inputPath: string) {
  await ensureStore();
  const resolved = path.resolve(inputPath.replace(/^~/, os.homedir()));
  const projects = (await getTrackedProjects()).filter((item) => item.path !== resolved);
  await fs.writeFile(projectsFile, JSON.stringify(projects, null, 2));
  return projects;
}

async function hasSkillMarker(projectPath: string) {
  for (const marker of markers) {
    try {
      await fs.access(path.join(projectPath, marker));
      return true;
    } catch {
      // keep checking
    }
  }
  return false;
}

export function projectMarkers() {
  return markers;
}

export async function readDiscoverySnapshot() {
  return readJson<DiscoverySnapshot | null>(discoveryFile, null);
}

export async function discoverProjects() {
  await ensureStore();
  const started = Date.now();
  const roots = [os.homedir(), "/data", "/Users", "/opt"].filter(Boolean);
  const tracked = new Set((await getTrackedProjects()).map((item) => item.path));
  const found = new Set<string>();

  async function walk(dir: string, depth: number) {
    if (depth > 5) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (await hasSkillMarker(dir)) {
      if (!tracked.has(dir)) found.add(dir);
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === ".claude" || skipNames.has(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".codex") continue;
      await walk(path.join(dir, entry.name), depth + 1);
    }
  }

  for (const root of roots) await walk(root, 0);
  const snapshot: DiscoverySnapshot = {
    discovered: [...found].sort(),
    scannedAt: new Date().toISOString(),
    roots,
    durationMs: Date.now() - started,
  };
  await fs.writeFile(discoveryFile, JSON.stringify(snapshot, null, 2));
  return snapshot;
}
