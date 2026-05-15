import { NextRequest, NextResponse } from "next/server";
import { getSkillFile } from "@/core/reader";
import { saveSkillFile } from "@/core/writer";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params;
  const result = await getSkillFile(id, fileId);
  if (!result) return NextResponse.json({ error: "File not found" }, { status: 404 });
  return NextResponse.json(result);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  const { id, fileId } = await params;
  const result = await getSkillFile(id, fileId);
  if (!result) return NextResponse.json({ error: "File not found" }, { status: 404 });
  if (!result.file.editable) return NextResponse.json({ error: "File is not editable" }, { status: 400 });
  const body = await request.json();
  await saveSkillFile(result.file.filePath, String(body.raw || ""));
  return NextResponse.json({ ok: true });
}
