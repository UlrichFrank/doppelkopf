/**
 * Bot tournament on the command line.
 *
 *   bun src/simulation/run.ts [games] [--rounds=8] [--a=professor] [--b=random] [--seed=1]
 *
 * Seats alternate a/b/a/b; across games the seating rotates so both kinds
 * play every position. Reports points per kind, game types and decision times.
 */
import { GAME_TYPE_NAME } from "shared";
import type { BotKind } from "../bots";
import { simulateGame } from "./simulate";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const games = parseInt(args.find((a) => !a.startsWith("--")) ?? "10", 10);
const rounds = parseInt(opt("rounds", "8"), 10);
const a = opt("a", "professor") as BotKind;
const b = opt("b", "random") as BotKind;
const seed = parseInt(opt("seed", "1"), 10);

const totals: Record<string, number> = { [a]: 0, [b]: 0 };
const types: Record<string, number> = {};
const times: Record<string, number[]> = {};
let announcements = 0;
let roundsPlayed = 0;

for (let g = 0; g < games; g++) {
  const kinds: BotKind[] = g % 2 === 0 ? [a, b, a, b] : [b, a, b, a];
  const run = simulateGame(kinds, rounds, seed + g);
  run.scores.forEach((s, seat) => (totals[kinds[seat]] += s / 2));
  for (const r of run.history) {
    types[GAME_TYPE_NAME[r.gameType]] = (types[GAME_TYPE_NAME[r.gameType]] ?? 0) + 1;
    if (r.announcements.re > 0 || r.announcements.kontra > 0) announcements++;
    roundsPlayed++;
  }
  for (const [k, list] of Object.entries(run.decisionMs)) (times[k] ??= []).push(...list);
}

const pct = (list: number[], p: number) => [...list].sort((x, y) => x - y)[Math.floor((list.length - 1) * p)] ?? 0;
console.log(`${games} Partien à ${rounds} Runden (${roundsPlayed} Runden)`);
console.log(`Punkte je Spieler:  ${a}: ${totals[a]}   ${b}: ${totals[b]}`);
console.log(`Spielarten: ${Object.entries(types).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`Runden mit Ansagen: ${announcements}`);
for (const [k, list] of Object.entries(times)) {
  console.log(`Entscheidungszeit ${k}: median ${pct(list, 0.5).toFixed(1)} ms, p95 ${pct(list, 0.95).toFixed(1)} ms, max ${Math.max(...list).toFixed(1)} ms`);
}
