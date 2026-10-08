/**
 * Makes engine.io 4 (socket.io 3, pulled in by boardgame.io) work with Bun's
 * WebSocket server.
 *
 * Bun's built-in `ws` follows ws@8 semantics and emits text frames as
 * Buffers. engine.io 4 expects ws@7 semantics (text frames as strings) and
 * decodes a Buffer as a binary packet, so the socket.io namespace handshake
 * fails and every WebSocket connection is closed right away. Clients then
 * fall back to HTTP long-polling, which exhausts the browser's per-host
 * connection limit when one page runs several clients (own seat + NPCs) and
 * delays moves by several seconds.
 *
 * engine.io loads a custom engine via `require(<name>)` at runtime, which a
 * compiled single binary cannot resolve. Instead, the default "ws" server is
 * patched in place — under Bun every `require("ws")` returns the same module,
 * so engine.io picks up the patch. On Node (ws@7) messages carry no
 * `isBinary` flag and pass through unchanged.
 */
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";

interface WsSocket {
  emit(event: string, ...args: unknown[]): boolean;
}

type UpgradeCallback = (ws: WsSocket, req: IncomingMessage) => void;

interface WsServerPrototype {
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, cb: UpgradeCallback): void;
  __textFramesPatched?: boolean;
}

/** Patches `ws`'s server so text frames reach engine.io as strings. Idempotent. */
export function patchWsTextFrames(): void {
  const { Server } = require("ws") as { Server: { prototype: WsServerPrototype } };
  const proto = Server.prototype;
  if (proto.__textFramesPatched) return;
  const original = proto.handleUpgrade;
  proto.handleUpgrade = function (req, socket, head, cb) {
    original.call(this, req, socket, head, (ws, request) => {
      const emit = ws.emit.bind(ws);
      ws.emit = (event: string, ...args: unknown[]) => {
        const [data, isBinary, ...rest] = args;
        if (event === "message" && isBinary === false && Buffer.isBuffer(data)) {
          return emit(event, data.toString(), isBinary, ...rest);
        }
        return emit(event, ...args);
      };
      cb(ws, request);
    });
  };
  proto.__textFramesPatched = true;
}
