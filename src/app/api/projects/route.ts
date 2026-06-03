import { NextRequest, NextResponse } from "next/server";
import { addTrackedProject, getProjectViewState, projectMarkers, removeTrackedProject } from "@/core/workspace-store";

export async function GET(_request: NextRequest) {
  const state = await getProjectViewState();
  return NextResponse.json({ tracked: state.tracked, availableDefaults: state.availableDefaults, markers: projectMarkers() });
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
