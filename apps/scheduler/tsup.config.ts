import { defineConfig } from "tsup";
import { fixImportsPlugin } from "esbuild-fix-imports-plugin";
import { readFileSync, readdirSync, cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ponytail: after bundling, scan the output for *.wasm references and copy
// them into dist/. esbuild inlines JS but can't track assets loaded via
// fs.readFileSync(path.join(__dirname, "...wasm")) at runtime — those stay
// in node_modules and the bundle would crash trying to open them. This makes
// dist/ self-contained: the Dockerfile just copies dist/ and never reaches
// into node_modules. Auto-discovers any future wasm deps the same way.
function copyRuntimeWasmAssets() {
  const bundle = readFileSync("dist/index.js", "utf8");
  const wasmNames = new Set(
    [...bundle.matchAll(/['"]([\w./@-]+\.wasm)['"]/g)]
      .map((m) => m[1].split("/").pop()!)
      .filter(Boolean)
  );
  if (!wasmNames.size) return;
  // .pnpm lives at the workspace root, not per-package — walk up to find it.
  let pnpmDir: string | null = null;
  for (let dir = process.cwd(); dir !== "/"; dir = resolve(dir, "..")) {
    const candidate = resolve(dir, "node_modules/.pnpm");
    if (existsSync(candidate)) {
      pnpmDir = candidate;
      break;
    }
  }
  if (!pnpmDir)
    throw new Error("copyRuntimeWasmAssets: no node_modules/.pnpm found");
  const copied = new Set<string>();
  for (const f of readdirSync(pnpmDir, { recursive: true })) {
    const name = String(f).split("/").pop()!;
    // ponytail: prefer nodejs over browser variant (matches bundle's platform)
    if (!wasmNames.has(name) || copied.has(name)) continue;
    if (String(f).includes("/browser/")) continue;
    cpSync(resolve(pnpmDir, String(f)), resolve("dist", name));
    copied.add(name);
  }
}

// ponytail: bundled CJS deps (safe-buffer, node-cron, …) use require(),
// __dirname, __filename — none defined in ESM scope. Banner wires real ones
// via createRequire + import.meta.url so the bundle runs under plain node.
const cjsBanner = `import { createRequire as __createRequire } from "module";
import { fileURLToPath as __fileURLToPath } from "url";
import { dirname as __dirname2 } from "path";
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname2(__filename);`;

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm"],
  target: "es2020",
  outDir: "./dist",
  dts: false,
  clean: true,
  sourcemap: true,
  esbuildPlugins: [fixImportsPlugin()],
  platform: "node",
  banner: { js: cjsBanner },
  // Resolve every dep to its CJS build. @coral-xyz/anchor ships a malformed
  // ESM build (raw `exports.X=` in an ESM file) that esbuild can't wrap; its
  // CJS build bundles cleanly into our ESM output with proper interop.
  esbuildOptions(opts) {
    opts.mainFields = ["main"];
    opts.conditions = ["require", "node"];
  },
  // Bundle everything (incl. @meteora-ag/dlmm + @coral-xyz/anchor) so esbuild
  // resolves the CJS-named-export + directory-import interop at build time —
  // the whole point of switching off the tsx runtime loader. Only native
  // optional addons stay external (esbuild can't bundle .node files).
  noExternal: [/.*/],
  external: ["bufferutil", "utf-8-validate"],
  onSuccess: async () => {
    copyRuntimeWasmAssets();
  },
});
