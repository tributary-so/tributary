import { defineConfig } from "tsup";
import { fixImportsPlugin } from "esbuild-fix-imports-plugin";

const nodeBuiltins = [
  "fs",
  "path",
  "crypto",
  "stream",
  "buffer",
  "util",
  "events",
  "querystring",
  "url",
  "timers",
];

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2020",
  outDir: "lib",
  dts: true,
  clean: true,
  sourcemap: true,
  esbuildPlugins: [fixImportsPlugin()],
  platform: "node",
  external: nodeBuiltins,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
