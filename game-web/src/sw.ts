/// <reference lib="webworker" />
/*
 * Service worker of the PWA (same set-up as TeamWERK, via vite-plugin-pwa
 * injectManifest):
 * - Build files (hashed JS/CSS, fonts, icons): precached, cache first.
 * - Page navigations: network first (3 s), so a deploy shows up on the next
 *   start; offline the last good page starts from the 'app-shell' cache.
 *   index.html is deliberately not precached.
 * - Lobby API (/games) and game connection (/socket.io): never cached.
 * - Other images (cards, textures, …): stale-while-revalidate.
 * The page asks the waiting worker to take over (SKIP_WAITING) when the
 * player confirms the "Neue Version" banner.
 */
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<string | { url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Lobby API and game connection first (first match wins)
registerRoute(({ url }) => url.pathname === "/games" || url.pathname.startsWith("/games/"), new NetworkOnly());
registerRoute(({ url }) => url.pathname.startsWith("/socket.io"), new NetworkOnly());

registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "app-shell",
    networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

registerRoute(
  ({ request, url }) => request.destination === "image" && url.origin === self.location.origin,
  new StaleWhileRevalidate({
    cacheName: "images",
    plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

self.addEventListener("message", (event) => {
  if ((event.data as { type?: string } | null)?.type === "SKIP_WAITING") void self.skipWaiting();
});
