import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createSkill } from "./writer";

const execFileAsync = promisify(execFile);

export async function listRepoSkills(repoUrl: string) {
  const tempDir = path.join(os.tmpdir(), `oh-my-skills-repo-${Date.now()}`);
  try {
    await execFileAsync("git", ["clone", "--depth", "1", repoUrl, tempDir]);
    const found: string[] = [];
    for (const base of [path.join(tempDir, "skills"), tempDir]) {
      let entries;
      try {
        entries = await fs.readdir(base, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        try {
          await fs.access(path.join(base, entry.name, "SKILL.md"));
          found.push(entry.name);
        } catch {
          // not a skill
        }
      }
    }
    return [...new Set(found)].sort();
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function installFromRepo(repoUrl: string, skillName: string, destinationKey: string, projectPath?: string) {
  const tempDir = path.join(os.tmpdir(), `oh-my-skills-repo-${Date.now()}`);
  try {
    await execFileAsync("git", ["clone", "--depth", "1", repoUrl, tempDir]);
    const possible = [path.join(tempDir, "skills", skillName, "SKILL.md"), path.join(tempDir, skillName, "SKILL.md")];
    for (const filePath of possible) {
      try {
        const raw = await fs.readFile(filePath, "utf8");
        return await createSkill(destinationKey, skillName, raw, projectPath);
      } catch {
        // keep looking
      }
    }
    throw new Error("Skill not found in repository");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
