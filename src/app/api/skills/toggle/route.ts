import { NextRequest, NextResponse } from "next/server";
import { getSkillByFilePath } from "@/core/reader";
import { setSkillEnabled } from "@/core/writer";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const filePath = await setSkillEnabled(String(body.id), Boolean(body.enabled));
  const skill = await getSkillByFilePath(filePath);
  return NextResponse.json({ ok: true, skill });
}
