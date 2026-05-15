import path from "node:path";
import type { HubSkill, SkillRecord } from "./model";
import { slugifySkillName } from "./names";

function normalizeSkillKey(value: unknown) {
  if (typeof value !== "string") return "";
  return slugifySkillName(value).toLowerCase();
}

function addKey(keys: Set<string>, value: unknown) {
  const key = normalizeSkillKey(value);
  if (key) keys.add(key);
}

export function keysForHubSkill(skill: Pick<HubSkill, "name" | "slug" | "id">) {
  const keys = new Set<string>();
  addKey(keys, skill.slug);
  addKey(keys, skill.name);
  addKey(keys, skill.id);
  return keys;
}

export function keysForLocalSkill(skill: SkillRecord) {
  const keys = new Set<string>();
  addKey(keys, skill.title);
  addKey(keys, skill.metadata.name);
  addKey(keys, path.basename(skill.folderPath));
  return keys;
}

export function findInstalledSkill(hubSkill: Pick<HubSkill, "name" | "slug" | "id">, localSkills: SkillRecord[]) {
  const hubKeys = keysForHubSkill(hubSkill);
  return localSkills.find((skill) => {
    for (const key of keysForLocalSkill(skill)) if (hubKeys.has(key)) return true;
    return false;
  });
}

export function markInstalledHubSkills(skills: HubSkill[], localSkills: SkillRecord[]): HubSkill[] {
  return skills.map((skill) => {
    const installed = findInstalledSkill(skill, localSkills);
    if (!installed) return { ...skill, installed: false };
    return { ...skill, installed: true, installedSkillId: installed.id, installedSkillTitle: installed.title, installedSkillPath: installed.filePath };
  });
}
