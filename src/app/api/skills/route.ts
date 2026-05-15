import { NextRequest, NextResponse } from "next/server";
import { listSkills } from "@/core/reader";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("q")?.toLowerCase() || "";
  const location = request.nextUrl.searchParams.get("location") || "";
  const state = request.nextUrl.searchParams.get("state") || "";
  let skills = await listSkills();
  if (search) skills = skills.filter((skill) => `${skill.title} ${skill.summary}`.toLowerCase().includes(search));
  if (location) skills = skills.filter((skill) => skill.locationKey === location);
  if (state === "enabled") skills = skills.filter((skill) => skill.enabled);
  if (state === "disabled") skills = skills.filter((skill) => !skill.enabled);
  return NextResponse.json({ skills });
}
