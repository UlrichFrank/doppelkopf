/**
 * Plays a complete game against a running server over the lobby API and
 * Socket.IO: seats 1–3 are NPCs (BotRunner of the server), seat 0 is played
 * by this script with the heuristic bot.
 *
 *   bun scripts/smoke-game.ts http://localhost:3003 [--rounds=4] [--timeout=600]
 *
 * Start the server with NPC_THINK_FACTOR=0.05 for a fast run.
 */
import { Client, LobbyClient } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import { Doppelkopf, GAME_NAME } from "shared";
import type { DoppelkopfState } from "shared";
import { decide } from "../src/bots";

const url = process.argv[2];
if (!url) {
  console.error("Usage: bun scripts/smoke-game.ts <server-url> [--rounds=4] [--timeout=600]");
  process.exit(1);
}
const opt = (name: string, fallback: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const rounds = parseInt(opt("rounds", "4"), 10);
const timeoutS = parseInt(opt("timeout", "600"), 10);

const lobby = new LobbyClient({ server: url });
const { matchID } = await lobby.createMatch(GAME_NAME, {
  numPlayers: 4,
  setupData: {
    rounds,
    withNines: true,
    npcSlots: [
      { seat: 1, persona: "hilde" },
      { seat: 2, persona: "knut" },
      { seat: 3, persona: "professor" },
    ],
  },
});
const { playerCredentials } = await lobby.joinMatch(GAME_NAME, matchID, { playerID: "0", playerName: "Smoke" });
console.log(`Match ${matchID} created, seat 0 joined`);

const client = Client({
  game: Doppelkopf,
  multiplayer: SocketIO({ server: url }),
  matchID,
  playerID: "0",
  credentials: playerCredentials,
  debug: false,
});
client.start();

let lastStateID = -1;
let lastLog = "";
const done = new Promise<{ scores: number[] }>((resolve) => {
  client.subscribe((state) => {
    if (!state) return;
    const G = state.G as DoppelkopfState;
    const log = `Runde ${G.round.number}/${G.options.rounds} – ${G.stage}`;
    if (log !== lastLog) console.log(log + (G.round.gameType ? ` (${G.round.gameType})` : ""));
    lastLog = log;
    if (state.ctx.gameover) {
      resolve(state.ctx.gameover as { scores: number[] });
      return;
    }
    if (state._stateID === lastStateID) return;
    const action = decide(G, 0, "heuristic");
    if (!action) return;
    lastStateID = state._stateID;
    setTimeout(() => (client.moves as Record<string, (...a: unknown[]) => void>)[action.move](...action.args), 20);
  });
});

const timeout = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error(`no game over after ${timeoutS}s`)), timeoutS * 1000),
);

try {
  const result = await Promise.race([done, timeout]);
  console.log(`✓ Game over after ${rounds} rounds. Scores: ${result.scores.join(", ")}`);
  client.stop();
  process.exit(0);
} catch (err) {
  console.error(`✗ ${(err as Error).message}`);
  process.exit(1);
}
