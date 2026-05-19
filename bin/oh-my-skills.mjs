#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = require.resolve("next/dist/bin/next");
const stateDir = path.join(os.homedir(), ".oh-my-skills");
const stateFile = path.join(stateDir, "server.json");
const defaultPort = process.env.PORT || "2525";
const packageName = "oh-my-skills";
const relaunchEnvKey = "OH_MY_SKILLS_UPGRADE_RELAUNCHED";
const currentVersion = (() => {
  try {
    return String(require("../package.json").version || "").trim();
  } catch {
    return "";
  }
})();

const args = process.argv.slice(2);

const help = `Oh My Skills CLI

Usage:
  oh-my-skills [start] [--port <port>] [--daemon] [--open]
  oh-my-skills stop [--port <port>]
  oh-my-skills restart [--port <port>] [--open]
  oh-my-skills status [--port <port>]
  oh-my-skills open [--port <port>]
  oh-my-skills --install

Short alias:
  oms <command> [options]

Server commands:
  start                 Start the web dashboard. Default command.
  stop                  Stop the dashboard process recorded by the CLI, or kill the port.
  restart               Stop then start in daemon mode.
  status                Print whether the dashboard responds.
  open                  Open the dashboard URL in the default browser.
  --port, -p <port>     Port to use. Default: ${defaultPort}. Without an explicit port, the CLI falls back to the next free port.
  --daemon              Run the dashboard in the background.
  --open                Open the browser after starting.

Agent skill:
  --install             Install the bundled oh-my-skills agent skill to ~/.agents/skills/oh-my-skills.

API/automation commands:
  skills list [--q <text>] [--location <key>] [--state enabled|disabled] [--json]
  skills toggle --id <id> --enabled true|false
  skills delete --id <id>
  skills bulk --ids <id,id> --action enable|disable|delete|copy [--destination <key>]
  hub search [--query <text>] [--json]
  hub install --slug <slug> [--name <name>] --destination <key>
  install manual --destination <key> --name <name> [--raw <text> | --file <path>]
  install repo --repo-url <url> [--skill-name <name> --destination <key>]
  copy --id <id> --destination <key>
  projects list [--discover] [--json]
  projects add --path <path>
  projects remove --path <path>
  api <GET|POST|PUT|DELETE> <path> [--data <json>] [--json]

Connection options:
  --host <url>          API host. Default: http://localhost:<port>.

Examples:
  npx oh-my-skills@latest
  npm i -g oh-my-skills && oms start --daemon --open
  oms skills list --state enabled
  oms hub search --query wiki-skill
  oms hub install --slug wiki-skill --destination global-agents
  oms api GET /api/skills --json
`;

function parseOptions(input) {
  const positional = [];
  const options = {};
  for (let index = 0; index < input.length; index += 1) {
    const arg = input[index];
    if (!arg.startsWith("-")) {
      positional.push(arg);
      continue;
    }
    if (arg.includes("=")) {
      const [key, ...rest] = arg.split("=");
      options[key.replace(/^-+/, "")] = rest.join("=");
      continue;
    }
    const key = arg.replace(/^-+/, "");
    const next = input[index + 1];
    if (!next || next.startsWith("-")) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  if (options.p && !options.port) options.port = options.p;
  if (options.h) options.help = true;
  return { positional, options };
}

function getPort(options) {
  return String(options.port || defaultPort);
}

function hasExplicitPort(options) {
  return Boolean(options.port || options.p || process.env.PORT);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(Number(port), "127.0.0.1");
  });
}

async function resolveStartPort(options) {
  const preferred = Number(getPort(options));
  if (hasExplicitPort(options)) return String(preferred);
  for (let port = preferred; port < preferred + 50; port += 1) {
    if (await isPortAvailable(port)) return String(port);
  }
  throw new Error(`No available port found from ${preferred} to ${preferred + 49}`);
}

function getHost(options) {
  return String(options.host || `http://localhost:${getPort(options)}`).replace(/\/$/, "");
}

async function ensureStateDir() {
  await fsp.mkdir(stateDir, { recursive: true });
}

async function readState() {
  try {
    return JSON.parse(await fsp.readFile(stateFile, "utf8"));
  } catch {
    return null;
  }
}

async function writeState(state) {
  await ensureStateDir();
  await fsp.writeFile(stateFile, JSON.stringify(state, null, 2));
}

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function requestApi(method, apiPath, data, options = {}) {
  const host = getHost(options);
  const target = apiPath.startsWith("http") ? apiPath : `${host}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
  const response = await fetch(target, {
    method,
    headers: data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload ? payload.error : response.statusText;
    throw new Error(String(message || `HTTP ${response.status}`));
  }
  return payload;
}

function printPayload(payload, asJson = false) {
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  if (Array.isArray(payload?.skills)) {
    for (const skill of payload.skills) {
      console.log(`${skill.enabled ? "on " : "off"} ${skill.title || skill.name}  [${skill.locationLabel || skill.source || ""}]`);
      if (skill.summary || skill.description) console.log(`    ${skill.summary || skill.description}`);
    }
    return;
  }
  if (Array.isArray(payload?.tracked) || Array.isArray(payload?.discovered)) {
    console.log(`Tracked: ${payload.tracked?.length || 0}`);
    for (const item of payload.tracked || []) console.log(`  ${item.name}: ${item.path}`);
    console.log(`Discovered: ${payload.discovered?.length || 0}`);
    for (const item of payload.discovered || []) console.log(`  ${item}`);
    return;
  }
  console.log(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
}

function openBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const commandArgs = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  spawn(command, commandArgs, { detached: true, stdio: "ignore" }).unref();
}

function compareVersions(left, right) {
  const leftParts = String(left).split(".").map((part) => Number.parseInt(part, 10));
  const rightParts = String(right).split(".").map((part) => Number.parseInt(part, 10));
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const a = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
    const b = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

function isNpxExecution() {
  const command = String(process.env.npm_command || "").toLowerCase();
  const execPath = String(process.env.npm_execpath || "").toLowerCase();
  const userAgent = String(process.env.npm_config_user_agent || "").toLowerCase();
  const argvText = process.argv.join(" ").toLowerCase();
  return command === "exec"
    || execPath.includes("npx")
    || argvText.includes(`${path.sep}_npx${path.sep}`.toLowerCase())
    || userAgent.includes("npm/") && argvText.includes(`${path.sep}_npx${path.sep}`.toLowerCase());
}

function isDirectCliExecution() {
  const entry = String(process.argv[1] || "").toLowerCase();
  return entry.includes(`${path.sep}oms`)
    || entry.includes(`${path.sep}oh-my-skills`)
    || entry.endsWith(`${path.sep}bin${path.sep}oh-my-skills.mjs`);
}

async function fetchLatestVersion() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return "";
    const payload = await response.json().catch(() => null);
    return typeof payload?.version === "string" ? payload.version.trim() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

async function confirmUpgrade(latestVersion) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`发现 ${packageName} 有新版本可用 / A newer ${packageName} version is available (${currentVersion} -> ${latestVersion}). 现在升级并继续？ / Upgrade now and continue? [y/N] `);
    return ["y", "yes"].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

function printUpgradeHint(latestVersion) {
  console.log(`发现 ${packageName} 有新版本可用 / A newer ${packageName} version is available (${currentVersion} -> ${latestVersion}).`);
  console.log(`请运行以下命令升级 / Upgrade with: npm i -g ${packageName}@latest`);
}

async function relaunchLatest() {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(command, ["-y", `${packageName}@latest`, ...args], {
    stdio: "inherit",
    env: { ...process.env, [relaunchEnvKey]: "1" },
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      resolve(code ?? 0);
    });
  });
  process.exit(Number(exitCode));
}

async function maybeUpgradePrompt() {
  if (process.env[relaunchEnvKey] === "1") return;
  if (!currentVersion) return;
  const latestVersion = await fetchLatestVersion();
  if (!latestVersion || compareVersions(currentVersion, latestVersion) >= 0) return;
  if (isNpxExecution()) {
    const shouldUpgrade = await confirmUpgrade(latestVersion);
    if (!shouldUpgrade) return;
    await relaunchLatest();
    return;
  }
  if (isDirectCliExecution()) printUpgradeHint(latestVersion);
}

async function startServer(options, daemon = false) {
  const port = await resolveStartPort(options);
  const childArgs = [nextBin, "start", "-p", port];
  if (daemon) {
    const child = spawn(process.execPath, childArgs, {
      cwd: packageRoot,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, PORT: port },
    });
    child.unref();
    writeState({ pid: child.pid, port, url: `http://localhost:${port}`, startedAt: new Date().toISOString() }).catch(() => undefined);
    console.log(`Oh My Skills started: http://localhost:${port}`);
    if (options.open) openBrowser(`http://localhost:${port}`);
    return;
  }
  const child = spawn(process.execPath, childArgs, {
    cwd: packageRoot,
    stdio: "inherit",
    env: { ...process.env, PORT: port },
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

async function stopServer(options) {
  const state = await readState();
  const port = getPort(options);
  if (state?.pid && isProcessAlive(state.pid)) {
    process.kill(state.pid, "SIGTERM");
    console.log(`Stopped Oh My Skills process ${state.pid}.`);
    return;
  }
  const result = spawnSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" });
  const pids = result.stdout.split(/\s+/).filter(Boolean);
  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGTERM");
    } catch {
      // Already gone.
    }
  }
  console.log(pids.length ? `Stopped process(es) on port ${port}: ${pids.join(", ")}` : `No Oh My Skills process found on port ${port}.`);
}

async function installAgentSkill() {
  const targetDir = path.join(os.homedir(), ".agents", "skills", "oh-my-skills");
  const targetFile = path.join(targetDir, "SKILL.md");
  const sourceFile = path.join(packageRoot, "skills", "oh-my-skills", "SKILL.md");
  await fsp.mkdir(targetDir, { recursive: true });
  if (fs.existsSync(sourceFile)) {
    await fsp.copyFile(sourceFile, targetFile);
  } else {
    await fsp.writeFile(targetFile, bundledSkillContent, "utf8");
  }
  console.log(`Installed oh-my-skills agent skill: ${targetFile}`);
}

async function runApiCommand(command, subcommand, options, positional) {
  if (command === "skills" && subcommand === "list") {
    const params = new URLSearchParams();
    if (options.q) params.set("q", String(options.q));
    if (options.location) params.set("location", String(options.location));
    if (options.state) params.set("state", String(options.state));
    return printPayload(await requestApi("GET", `/api/skills${params.size ? `?${params}` : ""}`, undefined, options), Boolean(options.json));
  }
  if (command === "skills" && subcommand === "toggle") return printPayload(await requestApi("POST", "/api/skills/toggle", { id: options.id, enabled: String(options.enabled) === "true" }, options), Boolean(options.json));
  if (command === "skills" && subcommand === "delete") return printPayload(await requestApi("DELETE", `/api/skills/${encodeURIComponent(String(options.id))}`, undefined, options), Boolean(options.json));
  if (command === "skills" && subcommand === "bulk") return printPayload(await requestApi("POST", "/api/skills/bulk", { ids: String(options.ids || "").split(",").filter(Boolean), action: options.action, destination: options.destination }, options), Boolean(options.json));
  if (command === "hub" && subcommand === "search") return printPayload(await requestApi("POST", "/api/install/hub-search", { query: options.query || "" }, options), Boolean(options.json));
  if (command === "hub" && subcommand === "install") return printPayload(await requestApi("POST", "/api/install/hub", { slug: options.slug, name: options.name || options.slug, destination: options.destination }, options), Boolean(options.json));
  if (command === "install" && subcommand === "manual") {
    const raw = options.file ? await fsp.readFile(String(options.file), "utf8") : options.raw;
    return printPayload(await requestApi("POST", "/api/install/manual", { destination: options.destination, name: options.name, raw }, options), Boolean(options.json));
  }
  if (command === "install" && subcommand === "repo") return printPayload(await requestApi("POST", "/api/install/repo", { repoUrl: options["repo-url"], skillName: options["skill-name"], destination: options.destination }, options), Boolean(options.json));
  if (command === "copy") return printPayload(await requestApi("POST", "/api/install/copy", { id: options.id, destination: options.destination }, options), Boolean(options.json));
  if (command === "projects" && subcommand === "list") return printPayload(await requestApi("GET", `/api/projects${options.discover ? "?discover=1" : ""}`, undefined, options), Boolean(options.json));
  if (command === "projects" && subcommand === "add") return printPayload(await requestApi("POST", "/api/projects", { path: options.path }, options), Boolean(options.json));
  if (command === "projects" && subcommand === "remove") return printPayload(await requestApi("DELETE", "/api/projects", { path: options.path }, options), Boolean(options.json));
  if (command === "api") {
    const method = String(subcommand || "GET").toUpperCase();
    const apiPath = positional[2] || "/";
    const data = options.data ? JSON.parse(String(options.data)) : undefined;
    return printPayload(await requestApi(method, apiPath, data, options), Boolean(options.json));
  }
  throw new Error(`Unknown command. Run "oh-my-skills -h" for help.`);
}

const bundledSkillContent = `---
name: oh-my-skills
description: Manage Oh My Skills from an agent or terminal. Use this when the user wants to start, stop, restart, inspect, install, edit, or automate local AI agent skills through the oh-my-skills CLI.
---

# Oh My Skills

Use the \`oh-my-skills\` or \`oms\` command to manage the local skill dashboard and call its APIs from an agent workflow.

Common commands:

- \`npx oh-my-skills@latest\`: install/run the dashboard.
- \`npm i -g oh-my-skills\`: recommended global install.
- \`oms start --daemon --open\`: start in the background and open the UI. Default port is 2525; if unavailable, the CLI uses the next free port.
- \`oms stop --port 2525\`: stop the local service.
- \`oms restart --port 2525 --open\`: restart the service.
- \`oms status --port 2525\`: check the service.
- \`oms skills list --json\`: list local skills.
- \`oms hub search --query wiki-skill --json\`: search SkillHub.
- \`oms hub install --slug wiki-skill --destination global-agents\`: install from SkillHub.
- \`oms projects list --discover --json\`: scan projects.

When the user asks to install the oh-my-skills agent skill, run \`oh-my-skills --install\`. This installs this skill to \`~/.agents/skills/oh-my-skills/SKILL.md\`.
`;

async function main() {
  const { positional, options } = parseOptions(args);
  const command = positional[0] || "start";
  const subcommand = positional[1] || "";

  await maybeUpgradePrompt();

  if (options.help || command === "help") {
    console.log(help);
    return;
  }
  if (options.install || command === "--install") return installAgentSkill();
  if (command === "start") return startServer(options, Boolean(options.daemon));
  if (command === "stop") return stopServer(options);
  if (command === "restart") {
    await stopServer(options);
    return startServer({ ...options, daemon: true }, true);
  }
  if (command === "status") {
    try {
      await requestApi("GET", "/api/skills", undefined, options);
      console.log(`Oh My Skills is running at ${getHost(options)}`);
    } catch {
      console.log(`Oh My Skills is not responding at ${getHost(options)}`);
      process.exitCode = 1;
    }
    return;
  }
  if (command === "open") {
    openBrowser(getHost(options));
    console.log(`Opened ${getHost(options)}`);
    return;
  }
  await runApiCommand(command, subcommand, options, positional);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
