import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Server } from "boardgame.io/server";
import { Doppelkopf } from "shared";
import { serveStatic } from "../staticFiles";

// A real boardgame.io server with the static middleware in front of the
// lobby router, serving a small fake page build from a temp directory.
const PORT = 39000 + Math.floor(Math.random() * 900);
const base = `http://127.0.0.1:${PORT}`;
let server: ReturnType<typeof Server>;

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), "doppelkopf-static-"));
  mkdirSync(join(dir, "assets"));
  mkdirSync(join(dir, "icons"));
  const files: Record<string, string> = {
    "/index.html": "<!doctype html><title>Doppelkopf</title>",
    "/assets/index-abc123.js": "console.log('game')",
    "/icons/icon-192.png": "PNG",
    "/manifest.webmanifest": "{}",
    "/sw.js": "self",
  };
  const assets: Record<string, string> = {};
  for (const [url, content] of Object.entries(files)) {
    const path = join(dir, url);
    writeFileSync(path, content);
    assets[url] = path;
  }
  const origError = console.warn;
  console.warn = () => {}; // "origins not set" etc.
  server = Server({ games: [Doppelkopf], origins: [] });
  console.warn = origError;
  server.app.use(serveStatic(assets) as never);
  await server.run(PORT);
});

afterAll(() => {
  (server.app as unknown as { server?: { close(): void } }).server?.close();
});

describe("static game page", () => {
  it("serves index.html on /", async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("cache-control")).toBe("no-cache");
    expect(await res.text()).toContain("<title>Doppelkopf</title>");
  });

  it("serves hashed build files as immutable", async () => {
    const res = await fetch(`${base}/assets/index-abc123.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(await res.text()).toBe("console.log('game')");
  });

  it("serves icons from subdirectories", async () => {
    const res = await fetch(`${base}/icons/icon-192.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("answers HEAD without a body", async () => {
    const res = await fetch(`${base}/icons/icon-192.png`, { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  it("serves manifest and service worker uncached with proper types", async () => {
    const manifest = await fetch(`${base}/manifest.webmanifest`);
    expect(manifest.headers.get("content-type")).toContain("application/manifest+json");
    expect(manifest.headers.get("cache-control")).toBe("no-cache");
    const sw = await fetch(`${base}/sw.js`);
    expect(sw.headers.get("content-type")).toContain("text/javascript");
    expect(sw.headers.get("cache-control")).toBe("no-cache");
  });

  it("serves the page for unknown page routes", async () => {
    const res = await fetch(`${base}/irgendwas`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<title>Doppelkopf</title>");
  });

  it("answers 404 for unknown files", async () => {
    const res = await fetch(`${base}/assets/missing-file.js`);
    expect(res.status).toBe(404);
  });

  it("leaves the lobby API untouched", async () => {
    const list = await fetch(`${base}/games`);
    expect(list.status).toBe(200);
    expect(await list.json()).toEqual(["doppelkopf"]);

    const missing = await fetch(`${base}/games/doppelkopf/doesnotexist`);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("Match doesnotexist not found");
  });

  it("does not answer POST with the page", async () => {
    const res = await fetch(`${base}/irgendwas`, { method: "POST" });
    expect(res.status).toBe(404);
  });
});

describe("static game page without embedded build", () => {
  it("passes every request on (development: Vite serves the page)", async () => {
    const middleware = serveStatic({});
    let passed = 0;
    const ctx = { method: "GET", path: "/", status: 404, body: undefined, type: "", set() {} };
    await middleware(ctx, async () => {
      passed++;
    });
    expect(passed).toBe(1);
    expect(ctx.body).toBeUndefined();
  });
});
