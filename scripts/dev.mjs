import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = String(process.env.OMS_API_PORT || 25253);

function run(command, args, env = {}, cwd = root) {
  const child = spawn(command, args, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
  child.on("exit", (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

const children = [];

// Build the server bundle once, then run it as the API backend.
await new Promise((resolve, reject) => {
  const build = spawn(process.execPath, [path.join(root, "scripts/build-server.mjs")], { cwd: root, stdio: "inherit" });
  build.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`server build failed (${code})`))));
});

children.push(run(process.execPath, [path.join(root, "server/main.mjs")], { PORT: apiPort }));
children.push(run(process.platform === "win32" ? "npx.cmd" : "npx", ["vite"], { OMS_API_PORT: apiPort }));

function shutdown() {
  for (const child of children) child.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
