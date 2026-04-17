import inject from "@rollup/plugin-inject";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import react from "@vitejs/plugin-react";
import path from "path";
import webfontDownload from "vite-plugin-webfont-dl";

export default defineConfig({
  plugins: [
    webfontDownload([
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
      "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap",
    ]),
    react(),
    nodePolyfills({
      globals: {
        Buffer: process.env.NODE_ENV == "development",
      },
      include: ["buffer"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "node-fetch": "isomorphic-fetch",
    },
  },
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "esnext", // Output ESNext code
    rollupOptions: {
      plugins: [inject({ Buffer: ["buffer", "Buffer"] })],
      // external: ['vite-plugin-node-polyfills/shims/buffer', 'stream', 'http', 'https', 'zlib'],
      output: {
        manualChunks: {
          "solana-vendor": ["@solana/web3.js", "@solana/spl-token"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
  },
});
