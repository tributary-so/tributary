import { nodePolyfills } from "vite-plugin-node-polyfills";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import { resolve } from "node:path";
import inject from "@rollup/plugin-inject";

// https://vite.dev/config/
export default defineConfig({
  define: {
    global: {},
  },
  resolve: {
    alias: {
      // https://stackoverflow.com/posts/75778243/revisions
      "node-fetch": "isomorphic-fetch",
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: ["tributary.so.local"],
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
      //
      root: resolve(__dirname),
    }),
  ],
  build: {
    target: "esnext", // Output ESNext code
    rollupOptions: {
      plugins: [inject({ Buffer: ["buffer", "Buffer"] })],
      // external: ['vite-plugin-node-polyfills/shims/buffer', 'stream', 'http', 'https', 'zlib'],
      output: {
        manualChunks: {
          "solana-vendor": ["@solana/web3.js"],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext", // Ensure dependency pre-bundling supports ESNext
      supported: {
        "import-assertions": true, // Explicitly enable import assertions in esbuild
      },
    },
  },
});
