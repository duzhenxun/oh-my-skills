import fs from "node:fs/promises";
import path from "node:path";
import { resolveDestination } from "./catalog";
import { getSkill, pathsForToggle } from "./reader";
import { slugifySkillName } from "./names";

export async function saveSkillFile(filePath: string, content: string) {
  await fs.writeFile(filePath, content, "utf8");
}

export async function setSkillEnabled(skillId: string, enabled: boolean) {
  const skill = await getSkill(skillId);
  if (!skill) throw new Error("Skill not found");
  if (skill.enabled === enabled) return skill.filePath;
  const { from, to } = pathsForToggle(skill.filePath, enabled);
  await fs.rename(from, to);
  return to;
}

export async function removeSkill(skillId: string) {
  const skill = await getSkill(skillId);
  if (!skill) throw new Error("Skill not found");
  if (path.basename(skill.filePath).startsWith("SKILL.md")) await fs.rm(skill.folderPath, { recursive: true, force: true });
  else await fs.rm(skill.filePath, { force: true });
}

export async function copyTree(source: string, target: string) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) await copyTree(from, to);
    else await fs.copyFile(from, to);
  }
}

async function ensureVacant(targetPath: string) {
  try {
    await fs.access(targetPath);
    throw new Error(`Target already exists: ${targetPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

export async function copyFolderToDestination(sourceFolder: string, destinationKey: string, name: string, projectPath?: string) {
  const destination = resolveDestination(destinationKey, projectPath);
  if (!destination) throw new Error("Invalid destination");
  const targetFolder = path.join(destination.resolvedRoot, slugifySkillName(name));
  await ensureVacant(targetFolder);
  await copyTree(sourceFolder, targetFolder);
  return targetFolder;
}

export async function createSkill(destinationKey: string, name: string, rawContent?: string, projectPath?: string) {
  const destination = resolveDestination(destinationKey, projectPath);
  if (!destination) throw new Error("Invalid destination");
  const safeName = slugifySkillName(name);
  const folder = path.join(destination.resolvedRoot, safeName);
  await ensureVacant(folder);
  await fs.mkdir(folder, { recursive: true });
  const filePath = path.join(folder, "SKILL.md");
  const content = rawContent?.trim() ? rawContent : `---\nname: ${safeName}\ndescription: TODO\n---\n\n# ${safeName}\n\nDescribe when and how this skill should be used.\n`;
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

export async function copySkillTo(skillId: string, destinationKey: string, projectPath?: string) {
  const skill = await getSkill(skillId);
  if (!skill) throw new Error("Skill not found");
  const destination = resolveDestination(destinationKey, projectPath);
  if (!destination) throw new Error("Invalid destination");
  const targetFolder = path.join(destination.resolvedRoot, slugifySkillName(skill.title));
  await ensureVacant(targetFolder);
  await copyTree(skill.folderPath, targetFolder);
  return targetFolder;
}
