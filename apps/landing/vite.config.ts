import { defineConfig } from "vite";
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
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    host: "0.0.0.0",
  },
});
