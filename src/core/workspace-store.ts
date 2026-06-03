import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface TrackedProject {
  path: string;
  name: string;
  addedAt: string;
}

export interface ProjectViewState {
  tracked: TrackedProject[];
  availableDefaults: TrackedProject[];
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
const hiddenTrackedDefaultsFile = path.join(storeDir, "hidden-tracked-defaults.json");
const markers = [".agents/skills", ".codex/skills", ".cursor/skills", ".claude/skills", ".opencode/skills", ".trae/skills"];
const skipNames = new Set(["node_modules", ".git", "Library", "Applications", "System", "Volumes", "Pictures", "Movies", "Music", ".Trash"]);
const markerSet = new Set(markers);
const trackedDefaultProjects: Array<{ path: string; name: string }> = [
  { path: path.join(os.homedir(), ".agents/skills"), name: ".agents/skills" },
  { path: path.join(os.homedir(), ".codex/skills"), name: ".codex/skills" },
  { path: path.join(os.homedir(), ".codex/skills/.system"), name: ".codex/skills/.system" },
  { path: path.join(os.homedir(), ".cursor/skills"), name: ".cursor/skills" },
  { path: path.join(os.homedir(), ".claude/skills"), name: ".claude/skills" },
  { path: path.join(os.homedir(), ".opencode/skills"), name: ".opencode/skills" },
  { path: path.join(os.homedir(), ".trae/skills"), name: ".trae/skills" },
];
const availableDefaultProjects: Array<{ path: string; name: string }> = [
  { path: "/data/ai/my-skills", name: "my-skills" },
  { path: "/Users/dds/.understand-anything/repo/understand-anything-plugin", name: "understand-anything-plugin" },
];

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

async function getHiddenTrackedDefaults() {
  return readJson<string[]>(hiddenTrackedDefaultsFile, []);
}

function deriveProjectName(projectPath: string, projectName = path.basename(projectPath)) {
  if (projectName !== "skills" && projectName !== ".system") return projectName;
  const parentName = path.basename(path.dirname(projectPath));
  return parentName ? `${parentName}/${projectName}` : projectName;
}

function makeTrackedProject(projectPath: string, projectName = path.basename(projectPath)): TrackedProject {
  return {
    path: projectPath,
    name: deriveProjectName(projectPath, projectName),
    addedAt: new Date().toISOString(),
  };
}

async function existingProjects(projects: Array<{ path: string; name: string }>) {
  const found: TrackedProject[] = [];
  for (const project of projects) {
    try {
      const stat = await fs.stat(project.path);
      if (!stat.isDirectory()) continue;
      found.push(makeTrackedProject(project.path, project.name));
    } catch {
      // ignore missing defaults
    }
  }
  return found;
}

export async function getProjectViewState(): Promise<ProjectViewState> {
  await ensureStore();
  const manualTracked = (await getTrackedProjects()).map((project) => ({
    ...project,
    name: deriveProjectName(project.path, project.name),
  }));
  const trackedDefaults = await existingProjects(trackedDefaultProjects);
  const availableDefaultsSource = await existingProjects(availableDefaultProjects);
  const hiddenTrackedDefaults = new Set((await getHiddenTrackedDefaults()).map((item) => path.resolve(item)));
  const trackedMap = new Map<string, TrackedProject>();
  for (const project of trackedDefaults) {
    if (hiddenTrackedDefaults.has(path.resolve(project.path))) continue;
    trackedMap.set(project.path, project);
  }
  for (const project of manualTracked) trackedMap.set(project.path, project);
  const tracked = [...trackedMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  const trackedPaths = new Set(tracked.map((item) => item.path));
  const availableDefaults = availableDefaultsSource
    .filter((project) => !trackedPaths.has(project.path))
    .concat(trackedDefaults.filter((project) => hiddenTrackedDefaults.has(path.resolve(project.path)) && !trackedPaths.has(project.path)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { tracked, availableDefaults };
}

function normalizeTrackedProjectPath(inputPath: string) {
  const resolved = path.resolve(inputPath.replace(/^~/, os.homedir()));
  const normalized = resolved.replace(/[\\/]+$/, "");
  if ([...trackedDefaultProjects, ...availableDefaultProjects].some((item) => path.resolve(item.path) === normalized)) return normalized;
  for (const marker of markers) {
    if (normalized === marker) continue;
    if (normalized.endsWith(`/${marker}`) || normalized.endsWith(`\\${marker.replaceAll("/", "\\")}`)) {
      return normalized.slice(0, -marker.length - 1);
    }
  }
  return normalized;
}

export async function addTrackedProject(inputPath: string) {
  await ensureStore();
  const resolved = normalizeTrackedProjectPath(inputPath);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) throw new Error("Path is not a directory");
  const hiddenTrackedDefaults = (await getHiddenTrackedDefaults()).filter((item) => path.resolve(item) !== resolved);
  await fs.writeFile(hiddenTrackedDefaultsFile, JSON.stringify(hiddenTrackedDefaults, null, 2));
  const projects = await getTrackedProjects();
  if (!projects.some((item) => item.path === resolved)) {
    projects.push(makeTrackedProject(resolved));
    await fs.writeFile(projectsFile, JSON.stringify(projects, null, 2));
  }
  return projects;
}

export async function removeTrackedProject(inputPath: string) {
  await ensureStore();
  const resolved = normalizeTrackedProjectPath(inputPath);
  if (trackedDefaultProjects.some((project) => path.resolve(project.path) === resolved)) {
    const hiddenTrackedDefaults = await getHiddenTrackedDefaults();
    if (!hiddenTrackedDefaults.some((item) => path.resolve(item) === resolved)) {
      hiddenTrackedDefaults.push(resolved);
      await fs.writeFile(hiddenTrackedDefaultsFile, JSON.stringify(hiddenTrackedDefaults, null, 2));
    }
  }
  const projects = (await getTrackedProjects()).filter((item) => item.path !== resolved);
  await fs.writeFile(projectsFile, JSON.stringify(projects, null, 2));
  return projects;
}

export async function getEnabledGlobalLocationRoots() {
  const hiddenTrackedDefaults = new Set((await getHiddenTrackedDefaults()).map((item) => path.resolve(item)));
  return trackedDefaultProjects
    .map((project) => path.resolve(project.path))
    .filter((projectPath) => !hiddenTrackedDefaults.has(projectPath));
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
    if (depth > 8) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const dirMarker = path.basename(dir);
    const parentPath = path.dirname(dir);
    if (markerSet.has(dirMarker) && (await fs.stat(parentPath).catch(() => null))?.isDirectory()) {
      if (!tracked.has(parentPath)) found.add(parentPath);
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
