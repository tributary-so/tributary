import { defineConfig } from "tsup";

export default defineConfig([
  // ESM and CJS builds
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
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
    external: [
      "react",
      "react-dom",
      "@solana/web3.js",
      "@coral-xyz/anchor",
      "@solana/wallet-adapter-react",
    ],
  },
]);
