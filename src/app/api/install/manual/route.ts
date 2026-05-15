import { NextRequest, NextResponse } from "next/server";
import { createSkill } from "@/core/writer";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const filePath = await createSkill(String(body.destination), String(body.name), body.raw ? String(body.raw) : undefined, body.projectPath);
  return NextResponse.json({ ok: true, filePath });
}
