import http from "node:http";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getSkill, getSkillByFilePath, getSkillFile, listSkills } from "@/core/reader";
import { copySkillTo, createSkill, removeSkill, saveSkillFile, setSkillEnabled } from "@/core/writer";
import { addTrackedProject, getProjectViewState, projectMarkers, removeTrackedProject } from "@/core/workspace-store";
import { searchSkillHub } from "@/core/hub";
import { markInstalledHubSkills } from "@/core/install-match";
import { installSkillHubPackage } from "@/core/skillhub-install";
import { installFromRepo, listRepoSkills } from "@/core/repo-install";

const execFileAsync = promisify(execFile);
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(serverDir, "../dist");
const port = Number(process.env.PORT || 25251);
const host = process.env.HOST || "127.0.0.1";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res: http.ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function serveStatic(res: http.ServerResponse, pathname: string) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let filePath = path.resolve(distDir, relative);
  if (filePath !== distDir && !filePath.startsWith(distDir + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    filePath = path.join(distDir, "index.html");
  }
  let finalStat;
  try {
    finalStat = await fs.stat(filePath);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  if (!finalStat.isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const immutable = /-[A-Za-z0-9_]{8,}\.(js|css|woff2?|png|jpe?g|svg|gif|webp|ico)$/.test(path.basename(filePath));
  res.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-cache" : immutable ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  });
  createReadStream(filePath).pipe(res);
}

function invalid(res: http.ServerResponse, message: string, status = 400) {
  return sendJson(res, status, { error: message });
}

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL, pathname: string) {
  const method = (req.method || "GET").toUpperCase();
  const route = pathname.split("/").filter(Boolean).slice(1);
  const query = url.searchParams;

  if (route.length === 1 && route[0] === "skills" && method === "GET") {
    const search = query.get("q")?.toLowerCase() || "";
    const location = query.get("location") || "";
    const state = query.get("state") || "";
    let skills = await listSkills();
    if (search) skills = skills.filter((skill) => `${skill.title} ${skill.summary}`.toLowerCase().includes(search));
    if (location) skills = skills.filter((skill) => skill.locationKey === location);
    if (state === "enabled") skills = skills.filter((skill) => skill.enabled);
    if (state === "disabled") skills = skills.filter((skill) => !skill.enabled);
    return sendJson(res, 200, { skills });
  }

  if (route.length === 2 && route[0] === "skills" && route[1] === "bulk" && method === "POST") {
    const body = await readJsonBody(req);
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    const action = String(body.action || "");
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        if (action === "enable") await setSkillEnabled(id, true);
        else if (action === "disable") await setSkillEnabled(id, false);
        else if (action === "delete") await removeSkill(id);
        else if (action === "copy") await copySkillTo(id, String(body.destination || ""), body.projectPath as string | undefined);
        else throw new Error("Invalid action");
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }
    return sendJson(res, 200, { succeeded, failed });
  }

  if (route.length === 2 && route[0] === "skills" && route[1] === "toggle" && method === "POST") {
    const body = await readJsonBody(req);
    const filePath = await setSkillEnabled(String(body.id), Boolean(body.enabled));
    const skill = await getSkillByFilePath(filePath);
    return sendJson(res, 200, { ok: true, skill });
  }

  if (route.length === 4 && route[0] === "skills" && route[2] === "files") {
    const skillId = route[1];
    const fileId = route[3];
    if (method === "GET") {
      const result = await getSkillFile(skillId, fileId);
      if (!result) return invalid(res, "File not found", 404);
      return sendJson(res, 200, result);
    }
    if (method === "PUT") {
      const result = await getSkillFile(skillId, fileId);
      if (!result) return invalid(res, "File not found", 404);
      if (!result.file.editable) return invalid(res, "File is not editable", 400);
      const body = await readJsonBody(req);
      await saveSkillFile(result.file.filePath, String(body.raw || ""));
      return sendJson(res, 200, { ok: true });
    }
  }

  if (route.length === 2 && route[0] === "skills") {
    const id = route[1];
    if (method === "GET") {
      const skill = await getSkill(id);
      if (!skill) return invalid(res, "Skill not found", 404);
      return sendJson(res, 200, { skill });
    }
    if (method === "DELETE") {
      await removeSkill(id);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (route.length === 1 && route[0] === "projects") {
    if (method === "GET") {
      const state = await getProjectViewState();
      return sendJson(res, 200, { tracked: state.tracked, availableDefaults: state.availableDefaults, markers: projectMarkers() });
    }
    if (method === "POST") {
      const body = await readJsonBody(req);
      const tracked = await addTrackedProject(String(body.path || ""));
      return sendJson(res, 200, { tracked });
    }
    if (method === "DELETE") {
      const body = await readJsonBody(req);
      const tracked = await removeTrackedProject(String(body.path || ""));
      return sendJson(res, 200, { tracked });
    }
  }

  if (route.length === 2 && route[0] === "fs" && route[1] === "pick-directory" && method === "POST") {
    try {
      const { stdout } = await execFileAsync("osascript", ["-e", 'POSIX path of (choose folder with prompt "Select a project or skills directory")']);
      return sendJson(res, 200, { path: stdout.trim() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("(-128)")) return sendJson(res, 200, { canceled: true, path: "" });
      return invalid(res, message || "Failed to pick directory", 500);
    }
  }

  if (route.length === 2 && route[0] === "install") {
    if (route[1] === "copy") {
      if (method === "GET") {
        const skill = await getSkill(query.get("id") || "");
        if (!skill) return invalid(res, "Skill not found", 404);
        return sendJson(res, 200, { skill });
      }
      if (method === "POST") {
        const body = await readJsonBody(req);
        const targetPath = await copySkillTo(String(body.id), String(body.destination), body.projectPath as string | undefined);
        return sendJson(res, 200, { ok: true, targetPath });
      }
    }
    if (route[1] === "hub-search" && method === "POST") {
      const body = await readJsonBody(req);
      const result = await searchSkillHub(String(body.query || ""), {
        category: typeof body.category === "string" ? body.category : "",
        page: Number(body.page) || 1,
        pageSize: Number(body.pageSize) || 24,
      });
      const localSkills = await listSkills();
      return sendJson(res, 200, { ...result, skills: markInstalledHubSkills(result.skills, localSkills) });
    }
    if (route[1] === "hub" && method === "POST") {
      const body = await readJsonBody(req);
      const slug = String(body.slug || "");
      const name = String(body.name || slug);
      const destination = String(body.destination || "");
      if (!slug) return invalid(res, "slug required", 400);
      if (!destination) return invalid(res, "destination required", 400);
      try {
        const targetPath = await installSkillHubPackage(slug, name, destination, body.projectPath as string | undefined);
        return sendJson(res, 200, { ok: true, targetPath });
      } catch (error) {
        return invalid(res, error instanceof Error ? error.message : "Install failed", 500);
      }
    }
    if (route[1] === "manual" && method === "POST") {
      const body = await readJsonBody(req);
      const filePath = await createSkill(String(body.destination), String(body.name), body.raw ? String(body.raw) : undefined, body.projectPath as string | undefined);
      return sendJson(res, 200, { ok: true, filePath });
    }
    if (route[1] === "repo" && method === "POST") {
      const body = await readJsonBody(req);
      const repoUrl = String(body.repoUrl || "");
      if (body.skillName && body.destination) {
        const filePath = await installFromRepo(repoUrl, String(body.skillName), String(body.destination), body.projectPath as string | undefined);
        return sendJson(res, 200, { ok: true, filePath });
      }
      const skills = await listRepoSkills(repoUrl);
      return sendJson(res, 200, { skills });
    }
  }

  return invalid(res, "Not found", 404);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    // keep raw pathname
  }
  try {
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      await handleApi(req, res, url, pathname);
      return;
    }
    await serveStatic(res, pathname);
  } catch (error) {
    if (!res.headersSent) sendJson(res, 500, { error: error instanceof Error ? error.message : "Server error" });
    else res.end();
  }
});

server.listen(port, host, () => {
  console.log(`Oh My Skills server listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
