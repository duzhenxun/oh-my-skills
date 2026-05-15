import { NextRequest, NextResponse } from "next/server";
import { getSkill } from "@/core/reader";
import { removeSkill } from "@/core/writer";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skill = await getSkill(id);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  return NextResponse.json({ skill });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await removeSkill(id);
  return NextResponse.json({ ok: true });
}
