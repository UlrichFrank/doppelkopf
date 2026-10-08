import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

/**
 * Stamps the build version into dist/sw.js, so every deploy gets a fresh
 * service worker cache (see public/sw.js).
 */
function serviceWorkerVersion(): Plugin {
  return {
    name: "sw-version",
    apply: "build",
    closeBundle() {
      const file = path.resolve(__dirname, "dist/sw.js");
      const version = new Date().toISOString().replace(/[-:.TZ]/g, "");
      writeFileSync(file, readFileSync(file, "utf8").replaceAll("__BUILD_VERSION__", version));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorkerVersion()],
  resolve: {
    alias: {
      shared: path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: { port: 5173 },
});
