import { NextRequest, NextResponse } from "next/server";
import { searchSkillHub } from "@/core/hub";
import { markInstalledHubSkills } from "@/core/install-match";
import { listSkills } from "@/core/reader";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const skills = await searchSkillHub(String(body.query || ""));
  const localSkills = await listSkills();
  return NextResponse.json({ skills: markInstalledHubSkills(skills, localSkills) });
}
