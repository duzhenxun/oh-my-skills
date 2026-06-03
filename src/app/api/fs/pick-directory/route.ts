import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

export async function POST() {
  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      'POSIX path of (choose folder with prompt "Select a project or skills directory")',
    ]);
    return NextResponse.json({ path: stdout.trim() });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("(-128)")) {
      return NextResponse.json({ canceled: true, path: "" });
    }
    return NextResponse.json({ error: errorMessage || "Failed to pick directory" }, { status: 500 });
  }
}
