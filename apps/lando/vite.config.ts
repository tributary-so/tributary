import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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
    tailwindcss(),
  ],
  server: {
    host: "0.0.0.0",
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
      output: {
        manualChunks: {
          "ui-vendor": ["@tailwindcss/vite"],
        },
      },
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
