import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [path.join(root, "src/server/main.ts")],
  outfile: path.join(root, "server/main.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  minify: true,
  legalComments: "none",
  logLevel: "info",
  tsconfig: path.join(root, "tsconfig.json"),
  banner: {
    js: 'import { createRequire as __omsCreateRequire } from "node:module";\nconst require = __omsCreateRequire(import.meta.url);',
  },
});

console.log("Built server bundle: server/main.mjs");
