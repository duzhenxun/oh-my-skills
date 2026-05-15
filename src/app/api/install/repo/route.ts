import { NextRequest, NextResponse } from "next/server";
import { installFromRepo, listRepoSkills } from "@/core/repo-install";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const repoUrl = String(body.repoUrl || "");
  if (body.skillName && body.destination) {
    const filePath = await installFromRepo(repoUrl, String(body.skillName), String(body.destination), body.projectPath);
    return NextResponse.json({ ok: true, filePath });
  }
  const skills = await listRepoSkills(repoUrl);
  return NextResponse.json({ skills });
}
