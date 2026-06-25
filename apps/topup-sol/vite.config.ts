import { nodePolyfills } from "vite-plugin-node-polyfills";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";
import inject from "@rollup/plugin-inject";

export default defineConfig({
  define: {
    global: {},
  },
  resolve: {
    alias: {
      "node-fetch": "isomorphic-fetch",
    },
  },
  base: "./",
  server: {
    host: "0.0.0.0",
  },
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: process.env.NODE_ENV == "development",
      },
      include: ["buffer"],
    }),
    viteTsconfigPaths({
      root: resolve(__dirname),
    }),
  ],
  build: {
    target: "esnext",
    rollupOptions: {
      plugins: [inject({ Buffer: ["buffer", "Buffer"] })],
      output: {
        manualChunks: {
          "solana-vendor": ["@solana/web3.js", "@solana/spl-token"],
          "wallet-adapter": [
            "@solana/wallet-adapter-react",
            "@solana/wallet-adapter-react-ui",
          ],
          "meteora-vendor": ["@meteora-ag/dlmm"],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
      supported: {
        "import-assertions": true,
      },
    },
  },
});
