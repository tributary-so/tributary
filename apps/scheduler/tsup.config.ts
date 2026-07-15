import { defineConfig } from "tsup";
import { fixImportsPlugin } from "esbuild-fix-imports-plugin";

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
});
