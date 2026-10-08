import { describe, it, expect } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { FileStorage } from "../fileStorage";

const DAY = 24 * 60 * 60 * 1000;

function snapshotWith(matches: Record<string, { phase: string; age: number; G: object }>) {
  const state: Record<string, unknown> = {};
  const metadata: Record<string, unknown> = {};
  for (const [id, m] of Object.entries(matches)) {
    state[id] = { G: m.G, ctx: { phase: m.phase }, _stateID: 1 };
    metadata[id] = { gameName: "doppelkopf", players: {}, createdAt: 0, updatedAt: Date.now() - m.age };
  }
  return { state, initial: {}, metadata, log: {} };
}

describe("FileStorage", () => {
  it("drops matches untouched for more than 7 days", () => {
    const file = join(mkdtempSync(join(tmpdir(), "doppelkopf-")), "matches.json");
    const G = { stage: "playing" };
    writeFileSync(
      file,
      JSON.stringify(
        snapshotWith({
          running: { phase: "default", age: 1 * DAY, G },
          stale: { phase: "default", age: 30 * DAY, G },
        }),
      ),
    );
    const storage = new FileStorage(file);
    expect(storage.listMatches().sort()).toEqual(["running"]);
  });

  it("flush() writes pending changes immediately", () => {
    const file = join(mkdtempSync(join(tmpdir(), "doppelkopf-")), "matches.json");
    const storage = new FileStorage(file);
    const metadata = { gameName: "doppelkopf", players: {}, createdAt: 0, updatedAt: Date.now() };
    storage.createMatch("m1", { initialState: { G: {}, ctx: {} } as never, metadata } as never);
    expect(existsSync(file)).toBe(false); // write is still pending
    storage.flush();
    expect(Object.keys(JSON.parse(readFileSync(file, "utf8")).metadata)).toEqual(["m1"]);
  });
});
