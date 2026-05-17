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

function metadataValue(skill: SkillRecord, keys: string[]) {
  for (const key of keys) {
    const value = skill.metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function urlContainsSlug(value: unknown, slug: string) {
  return typeof value === "string" && !!slug && value.toLowerCase().includes(slug.toLowerCase());
}

export function keysForHubSkill(skill: Pick<HubSkill, "slug" | "id">) {
  const keys = new Set<string>();
  addKey(keys, skill.slug);
  addKey(keys, skill.id);
  return keys;
}

export function keysForLocalSkill(skill: SkillRecord) {
  const keys = new Set<string>();
  addKey(keys, metadataValue(skill, ["slug", "skillhubSlug", "skillHubSlug", "hubSlug"]));
  return keys;
}

export function findInstalledSkill(hubSkill: Pick<HubSkill, "name" | "slug" | "id">, localSkills: SkillRecord[]) {
  const hubKeys = keysForHubSkill(hubSkill);
  return localSkills.find((skill) => {
    for (const key of keysForLocalSkill(skill)) if (hubKeys.has(key)) return true;
    const hubSlug = normalizeSkillKey(hubSkill.slug || hubSkill.id);
    if (urlContainsSlug(skill.metadata.homepage, hubSlug) || urlContainsSlug(skill.metadata.url, hubSlug)) return true;
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
