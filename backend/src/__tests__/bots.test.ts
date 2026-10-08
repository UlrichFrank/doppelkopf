import { describe, expect, test } from "bun:test";
import { initialState, viewFor } from "shared";
import { decide, type BotKind } from "../bots";
import { knownVoids, sampleHands } from "../bots/montecarlo";
import { mulberry32, shuffleWith, simulateGame } from "../simulation/simulate";

describe("Computergegner", () => {
  test("alle Persönlichkeiten spielen ganze Partien ohne ungültige Aktion", () => {
    const kinds: BotKind[] = ["hilde", "knut", "professor", "heuristic"];
    const run = simulateGame(kinds, 4, 42);
    expect(run.history).toHaveLength(4);
    expect(run.scores.reduce((a, b) => a + b, 0)).toBe(0);
  }, 60000);

  test("ohne Neunen", () => {
    const run = simulateGame(["knut", "hilde", "knut", "hilde"], 4, 7, false);
    expect(run.history).toHaveLength(4);
  }, 60000);

  test("Professor schlägt Zufallsspieler", () => {
    let professor = 0;
    for (let g = 0; g < 4; g++) {
      const kinds: BotKind[] = g % 2 === 0 ? ["professor", "random", "professor", "random"] : ["random", "professor", "random", "professor"];
      const run = simulateGame(kinds, 4, 1000 + g);
      run.scores.forEach((s, seat) => (professor += kinds[seat] === "professor" ? s : 0));
    }
    expect(professor).toBeGreaterThan(0);
  }, 120000);

  test("Bot handelt nur, wenn er gefragt ist", () => {
    const G = initialState({ rounds: 4, withNines: true }, [], shuffleWith(mulberry32(3)));
    expect(decide(viewFor(G, 1), 1, "professor")).toBeNull();
    expect(decide(viewFor(G, 0), 0, "professor")?.move).toBe("declareReservation");
  });

  test("Stichprobe respektiert Fehlfarben-Lücken und Kartenzahlen", () => {
    const rnd = mulberry32(5);
    const shuffle = shuffleWith(rnd);
    const G = initialState({ rounds: 4, withNines: true }, [], shuffle);
    // Normal game, seat 1 shows void in the led suit
    G.stage = "playing";
    G.round.gameType = "normal";
    G.round.reservationTurn = null;
    G.round.parties = G.round.hands.map((h) => (h.some((c) => c.suit === "kreuz" && c.rank === "D") ? "re" : "kontra"));
    const view = viewFor(G, 0);
    const hands = sampleHands(view, 0, rnd);
    expect(hands.map((h) => h.length)).toEqual([12, 12, 12, 12]);
    expect(new Set(hands.flat().map((c) => c.id)).size).toBe(48);
    expect(knownVoids(view).every((v) => v.size === 0)).toBe(true);
  });
});
