/*
 * Service worker of the Doppelkopf PWA.
 *
 * - Page navigations: network first, so a deploy is picked up right away;
 *   offline the cached page starts and shows "Keine Verbindung".
 * - Hashed build files (/assets/…): cache first, they never change.
 * - Icons, manifest: stale-while-revalidate.
 * - Lobby API (/games) and the game connection (/socket.io) are never cached.
 *
 * The version placeholder in CACHE is replaced at build time (vite.config.ts), so every
 * deploy gets its own cache and old caches are dropped on activation.
 */
const CACHE = "doppelkopf-__BUILD_VERSION__";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.svg"];

/** The build files index.html references (hashed bundles, fonts are loaded by the CSS). */
async function pageAssets() {
  const html = await (await fetch("/", { cache: "no-store" })).text();
  return [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      try {
        await cache.addAll(await pageAssets());
      } catch {
        /* cached on first use instead */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("doppelkopf-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/games") || url.pathname.startsWith("/socket.io")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/").then((cached) => cached || Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
