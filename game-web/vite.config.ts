import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA as in TeamWERK: manifest generated here, service worker src/sw.ts
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      injectManifest: {
        // index.html stays out of the precache: navigations are network first (sw.ts)
        globPatterns: ["**/*.{js,css,woff2}", "icons/*.{png,svg}", "favicon.svg"],
      },
      manifest: {
        name: "Doppelkopf",
        short_name: "Doppelkopf",
        description: "Doppelkopf online – mit Freunden oder gegen Computergegner.",
        lang: "de",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#2b1d15",
        theme_color: "#2b1d15",
        categories: ["games"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          // Full-bleed walnut, motif inside the 80 % safe zone (icons/icon.svg)
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      shared: path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: { port: 5173 },
});
