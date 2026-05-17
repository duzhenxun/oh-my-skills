import { NextRequest, NextResponse } from "next/server";
import { searchSkillHub } from "@/core/hub";
import { markInstalledHubSkills } from "@/core/install-match";
import { listSkills } from "@/core/reader";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await searchSkillHub(String(body.query || ""), {
    category: typeof body.category === "string" ? body.category : "",
    page: Number(body.page) || 1,
    pageSize: Number(body.pageSize) || 24,
  });
  const localSkills = await listSkills();
  return NextResponse.json({
    ...result,
    skills: markInstalledHubSkills(result.skills, localSkills),
  });
}
