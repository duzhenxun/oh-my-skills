import { NextRequest, NextResponse } from "next/server";
import { addTrackedProject, discoverProjects, getTrackedProjects, projectMarkers, readDiscoverySnapshot, removeTrackedProject } from "@/core/workspace-store";

export async function GET(request: NextRequest) {
  const discover = request.nextUrl.searchParams.get("discover") === "1";
  const snapshot = discover ? await discoverProjects() : await readDiscoverySnapshot();
  return NextResponse.json({ tracked: await getTrackedProjects(), discovered: snapshot?.discovered || [], markers: projectMarkers(), snapshot });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const tracked = await addTrackedProject(String(body.path || ""));
  return NextResponse.json({ tracked });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const tracked = await removeTrackedProject(String(body.path || ""));
  return NextResponse.json({ tracked });
}
