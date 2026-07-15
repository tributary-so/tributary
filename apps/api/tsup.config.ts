import { defineConfig } from "tsup";

// ponytail: CJS output, bundle EVERYTHING. The API is a server application,
// not a library — a single self-contained bundle is the correct artifact.
//
// CJS avoids the "Dynamic require of X is not supported" error that ESM
// hits when bundling CJS deps like dotenv/express.
//
// Bundling everything also sidesteps the pnpm-deploy transitive-hoist gap:
// @metaplex-foundation/* (transitive via @tributary-so/sdk) doesn't get
// hoisted into the deploy's flat node_modules, but if it's inlined into
// the bundle, that doesn't matter.
//
// Only ws optional native addons stay external — they're C addons that
// can't be inlined.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "es2020",
  outDir: "dist",
  platform: "node",
  sourcemap: true,
  clean: true,
  splitting: false,
  external: ["bufferutil", "utf-8-validate"],
  // Bundle ALL deps including workspace packages. tsup auto-externalizes
  // package.json `dependencies` by default — this overrides that.
  noExternal: [/.*/],
  outExtension() {
    return { js: ".js" };
  },
});
