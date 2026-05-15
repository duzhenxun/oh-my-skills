import { NextRequest, NextResponse } from "next/server";
import { copySkillTo, removeSkill, setSkillEnabled } from "@/core/writer";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
  const action = String(body.action || "");
  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      if (action === "enable") await setSkillEnabled(id, true);
      else if (action === "disable") await setSkillEnabled(id, false);
      else if (action === "delete") await removeSkill(id);
      else if (action === "copy") await copySkillTo(id, String(body.destination || ""), body.projectPath);
      else throw new Error("Invalid action");
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }
  return NextResponse.json({ succeeded, failed });
}
