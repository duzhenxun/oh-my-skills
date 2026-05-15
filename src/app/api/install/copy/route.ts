import { NextRequest, NextResponse } from "next/server";
import { getSkill } from "@/core/reader";
import { copySkillTo } from "@/core/writer";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  const skill = await getSkill(id);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  return NextResponse.json({ skill });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const targetPath = await copySkillTo(String(body.id), String(body.destination), body.projectPath);
  return NextResponse.json({ ok: true, targetPath });
}
