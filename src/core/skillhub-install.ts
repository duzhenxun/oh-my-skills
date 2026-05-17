import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import { copyFolderToDestination } from "./writer";

function assertSafeZipEntries(entries: string[]) {
  for (const entry of entries) {
    if (!entry || entry.startsWith("/") || entry.includes("\\") || entry.split("/").includes("..")) throw new Error(`Unsafe zip entry: ${entry}`);
  }
}

async function findExtractedSkillRoot(extractDir: string) {
  try {
    await fs.access(path.join(extractDir, "SKILL.md"));
    return extractDir;
  } catch {
    // Try nested package layouts.
  }
  const entries = await fs.readdir(extractDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const nested = path.join(extractDir, entry.name);
    try {
      await fs.access(path.join(nested, "SKILL.md"));
      return nested;
    } catch {
      // keep looking
    }
  }
  throw new Error("Downloaded package does not contain SKILL.md");
}

export async function installSkillHubPackage(slug: string, name: string, destinationKey: string, projectPath?: string) {
  const tempDir = path.join(os.tmpdir(), `oh-my-skills-hub-${Date.now()}`);
  const zipPath = path.join(tempDir, "skill.zip");
  const extractDir = path.join(tempDir, "extract");
  try {
    await fs.mkdir(extractDir, { recursive: true });
    const response = await fetch(`https://api.skillhub.cn/api/v1/download?slug=${encodeURIComponent(slug)}`);
    if (!response.ok) throw new Error(`SkillHub download failed (${response.status})`);
    await fs.writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries().map((e: { entryName: string }) => e.entryName);
    assertSafeZipEntries(entries);
    zip.extractAllTo(extractDir, true);
    const skillRoot = await findExtractedSkillRoot(extractDir);
    return await copyFolderToDestination(skillRoot, destinationKey, name || slug, projectPath, { uniqueName: true });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
