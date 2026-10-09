import { Server, Origins } from "boardgame.io/server";
import { join } from "path";
import { Doppelkopf, GAME_NAME } from "shared";
import { BotRunner } from "./bot-runner";
import { FileStorage } from "./fileStorage";
import { patchWsTextFrames } from "./wsTextFrames";
import { serveStatic } from "./staticFiles";
import { assets } from "./embedded";

const PORT = parseInt(process.env.PORT ?? "3003", 10);
// Bind address; unset = all interfaces. In production 127.0.0.1, so only
// Traefik on the same host can reach the server.
const HOST = process.env.HOST || undefined;

// Additional allowed origins (comma-separated), e.g. the deployed frontend URL
const EXTRA_ORIGINS = (process.env.EXTRA_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Relative to the working directory: inside a compiled binary __dirname is virtual
const DATA_DIR = join(process.cwd(), ".data");
const MATCHES_FILE = process.env.MATCHES_FILE ?? join(DATA_DIR, "matches.json");
// NPC seat credentials — without them running NPC matches hang after a restart
const NPC_DATA_DIR = process.env.NPC_DATA_DIR ?? DATA_DIR;

// The in-process NPC clients connect to the address the server listens on;
// a wildcard bind is reachable via loopback.
const isWildcard = !HOST || HOST === "0.0.0.0" || HOST === "::";
const SELF_URL = `http://${isWildcard ? "127.0.0.1" : HOST.includes(":") ? `[${HOST}]` : HOST}:${PORT}`;

// Must run before the server creates its socket.io instance
patchWsTextFrames();

// Persisted so running matches survive a backend restart
const storage = new FileStorage(MATCHES_FILE);

const server = Server({
  games: [Doppelkopf],
  db: storage,
  origins: [Origins.LOCALHOST, "http://localhost:5173", "http://127.0.0.1:5173", ...EXTRA_ORIGINS],
});

// Game page embedded into the binary (empty in development — Vite serves it).
// Registered before run() adds the lobby router, so it is checked first.
server.app.use(serveStatic(assets) as never);

// server.run() only passes the port to listen(); add the bind address
if (HOST) {
  const listen = server.app.listen.bind(server.app) as (...args: unknown[]) => unknown;
  (server.app as unknown as { listen: (...args: unknown[]) => unknown }).listen = (port: unknown, ...rest: unknown[]) =>
    listen(port, HOST, ...rest);
}

const bots = new BotRunner(SELF_URL, join(NPC_DATA_DIR, "npc-credentials.json"));

server.run(PORT, () => {
  console.log(`Doppelkopf server running on ${HOST ?? "*"}:${PORT}`);
  console.log(`Lobby API: ${SELF_URL}/games/${GAME_NAME}`);
  console.log(`Matches: ${MATCHES_FILE}`);
  console.log(Object.keys(assets).length > 0 ? `Game page: ${Object.keys(assets).length} embedded files` : "Game page: served by Vite");
  // Let the server settle before the NPC clients connect to it
  setTimeout(() => {
    bots.start().catch((err) => console.error("[BotRunner] Failed to start:", err));
  }, 1000);
});

// systemd stops the service with SIGTERM: save the last moves before exiting
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    bots.stop();
    storage.flush();
    process.exit(0);
  });
}
