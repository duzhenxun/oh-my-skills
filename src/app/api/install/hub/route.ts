import { NextRequest, NextResponse } from "next/server";
import { findInstalledSkill } from "@/core/install-match";
import { listSkills } from "@/core/reader";
import { installSkillHubPackage } from "@/core/skillhub-install";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const slug = String(body.slug || "");
  const name = String(body.name || slug);
  const destination = String(body.destination || "");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  if (!destination) return NextResponse.json({ error: "destination required" }, { status: 400 });
  try {
    const installed = findInstalledSkill({ id: slug, slug, name }, await listSkills());
    if (installed) return NextResponse.json({ error: `Already installed: ${installed.title}. Delete the existing skill manually before installing again.`, installedSkillId: installed.id, installedSkillPath: installed.filePath }, { status: 409 });
    const targetPath = await installSkillHubPackage(slug, name, destination, body.projectPath);
    return NextResponse.json({ ok: true, targetPath });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Install failed" }, { status: 500 });
  }
}
