import { nodePolyfills } from "vite-plugin-node-polyfills";
import viteTsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import inject from "@rollup/plugin-inject";

// https://vite.dev/config/
export default defineConfig({
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      stream: "stream-browserify", // Alias stream to stream-browserify
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext", // Output ESNext code
    rollupOptions: {
      plugins: [inject({ Buffer: ["buffer", "Buffer"] })],
      external: [
        "vite-plugin-node-polyfills/shims/buffer",
        "stream",
        "http",
        "https",
        "zlib",
      ],
    },
  },
  optimizeDeps: {
    include: ["stream"], // Ensure stream is bundled during development
    esbuildOptions: {
      target: "esnext", // Ensure dependency pre-bundling supports ESNext
      supported: {
        "import-assertions": true, // Explicitly enable import assertions in esbuild
      },
    },
  },
});
