import { NextRequest, NextResponse } from "next/server";
import { installSkillHubPackage } from "@/core/skillhub-install";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const slug = String(body.slug || "");
  const name = String(body.name || slug);
  const destination = String(body.destination || "");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  if (!destination) return NextResponse.json({ error: "destination required" }, { status: 400 });
  try {
    const targetPath = await installSkillHubPackage(slug, name, destination, body.projectPath);
    return NextResponse.json({ ok: true, targetPath });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Install failed" }, { status: 500 });
  }
}
