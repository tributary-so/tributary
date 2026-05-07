import { defineConfig } from "tsup";

export default defineConfig([
  // ESM and CJS builds
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    // we forcefully include our librs into the bundle to avoid
    // version incompatibilities at the cost of larger bundle sizes
    noExternal: ["@tributary-so/sdk", "@tributary-so/payments"],
    external: [
      "react",
      "react-dom",
      "@solana/web3.js",
      "@coral-xyz/anchor",
      "@solana/wallet-adapter-react",
    ],
  },
  // IIFE (UMD-like) build with externals
  {
    entry: ["src/index.ts"],
    format: ["iife"],
    globalName: "tributary",
    clean: false,
    sourcemap: true,
    outExtension: () => ({ js: ".umd.js" }),
    noExternal: ["@tributary-so/sdk", "@tributary-so/payments"],
    external: [
      "react",
      "react-dom",
      "@solana/web3.js",
      "@coral-xyz/anchor",
      "@solana/wallet-adapter-react",
    ],
  },
]);
