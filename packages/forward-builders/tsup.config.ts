import { defineConfig } from "tsup";
import { fixImportsPlugin } from "esbuild-fix-imports-plugin";

export default defineConfig({
  entry: ["./src/index.ts", "./src/config.ts"],
  format: ["esm"],
  target: "es2020",
  outDir: "./dist/packages/forward-builders/src",
  dts: true,
  clean: true,
  sourcemap: true,
  esbuildPlugins: [fixImportsPlugin()],
  platform: "node",
  external: [
    "@meteora-ag/dlmm",
    "@raydium-io/raydium-sdk-v2",
    "@orca-so/whirlpools",
    "@solana/kit",
  ],
});
