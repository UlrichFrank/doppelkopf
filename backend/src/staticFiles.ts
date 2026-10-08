/**
 * Serves the game page (frontend build embedded into the binary) from the
 * boardgame.io server, so page, lobby API and Socket.IO share one origin.
 *
 * Registered before the lobby router:
 * - GET/HEAD of an embedded file → the file
 * - any other GET/HEAD path without a file extension → index.html (the page
 *   handles its own routes)
 * - /games and /games/... → untouched, the lobby API answers as before
 * Socket.IO requests never reach Koa: engine.io handles /socket.io/ first.
 */
import { extname } from "path";

/** Minimal Koa context — Koa itself is only a transitive dependency. */
export interface StaticContext {
  method: string;
  path: string;
  status: number;
  body: unknown;
  type: string;
  set(field: string, value: string): void;
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

/** Hashed build output never changes under the same name. */
const IMMUTABLE = "public, max-age=31536000, immutable";
/** Everything else (index.html, sw.js, manifest, icons) is revalidated. */
const REVALIDATE = "no-cache";

function isApiPath(path: string): boolean {
  return path === "/games" || path.startsWith("/games/");
}

/**
 * @param assets   URL path → readable file path (see embedded/index.ts)
 * @param readFile reads a file completely (injectable for tests)
 */
export function serveStatic(
  assets: Record<string, string>,
  readFile: (path: string) => Promise<Uint8Array> = async (path) =>
    new Uint8Array(await (globalThis as unknown as { Bun: { file(p: string): Blob } }).Bun.file(path).arrayBuffer()),
) {
  const cache = new Map<string, Uint8Array>();
  const hasPage = "/index.html" in assets;

  const load = async (urlPath: string) => {
    let data = cache.get(urlPath);
    if (!data) {
      data = await readFile(assets[urlPath]);
      cache.set(urlPath, data);
    }
    return data;
  };

  return async (ctx: StaticContext, next: () => Promise<unknown>): Promise<unknown> => {
    if ((ctx.method !== "GET" && ctx.method !== "HEAD") || isApiPath(ctx.path)) return next();

    let urlPath = ctx.path === "/" ? "/index.html" : ctx.path;
    if (!(urlPath in assets)) {
      // Unknown file → 404 from the router; unknown page route → the page
      if (!hasPage || extname(urlPath) !== "") return next();
      urlPath = "/index.html";
    }

    ctx.status = 200;
    ctx.type = CONTENT_TYPES[extname(urlPath).toLowerCase()] ?? "application/octet-stream";
    ctx.set("Cache-Control", urlPath.startsWith("/assets/") ? IMMUTABLE : REVALIDATE);
    ctx.body = Buffer.from(await load(urlPath));
    return undefined;
  };
}
