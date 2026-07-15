import { defineConfig } from "tsup";
import { fixImportsPlugin } from "esbuild-fix-imports-plugin";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm"],
  target: "es2020",
  outDir: "./dist/packages/forward-builders/src",
  dts: true,
  clean: true,
  sourcemap: true,
  esbuildPlugins: [fixImportsPlugin()],
  platform: "node",
  external: [],
});
