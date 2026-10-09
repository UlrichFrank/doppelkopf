/**
 * Headless games against the rules engine (no server): every bot decides on
 * its own filtered view, the result is applied to the real state. Checks rule
 * invariants on the way.
 */
import { announce, declareReservation, initialState, playCard, setReady, viewFor } from "shared";
import type { DoppelkopfState, RoundResult, RuleVariants } from "shared";
import { decide, type BotKind } from "../bots";
import type { Rng } from "../bots/montecarlo";

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith(rnd: Rng) {
  return <T>(items: T[]): T[] => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
}

export interface GameRun {
  scores: number[];
  history: RoundResult[];
  /** Milliseconds spent per decision, by kind. */
  decisionMs: Record<string, number[]>;
}

/** Plays a whole game (`rounds` deals) with the given bot per seat. */
export function simulateGame(
  kinds: BotKind[],
  rounds: number,
  seed: number,
  withNines = true,
  variants: RuleVariants = {},
): GameRun {
  const rnd = mulberry32(seed);
  const shuffle = shuffleWith(rnd);
  const G: DoppelkopfState = initialState({ rounds, withNines, ...variants }, [], shuffle);
  const decisionMs: Record<string, number[]> = {};
  let steps = 0;

  while (G.stage !== "gameEnd") {
    if (steps++ > 100000) throw new Error("game does not terminate");
    let acted = false;
    for (let seat = 0; seat < 4; seat++) {
      const t0 = performance.now();
      const action = decide(viewFor(G, seat), seat, kinds[seat], rnd);
      if (!action) continue;
      (decisionMs[kinds[seat]] ??= []).push(performance.now() - t0);
      let error: string | null;
      switch (action.move) {
        case "declareReservation":
          error = declareReservation(G, seat, action.args[0], shuffle);
          break;
        case "playCard":
          error = playCard(G, seat, action.args[0]);
          break;
        case "announce":
          error = announce(G, seat, action.args[0]);
          break;
        case "ready":
          error = setReady(G, seat, shuffle);
          break;
      }
      if (error) throw new Error(`${kinds[seat]} on seat ${seat}: illegal ${action.move}(${action.args}) – ${error}`);
      checkInvariants(G);
      acted = true;
      break;
    }
    if (!acted) throw new Error(`nobody can act in stage ${G.stage}`);
  }
  return { scores: G.scores, history: G.history, decisionMs };
}

function checkInvariants(G: DoppelkopfState): void {
  const r = G.round;
  const inHands = r.hands.reduce((s, h) => s + h.length, 0);
  const played = r.tricks.length * 4 + r.currentTrick.cards.length;
  const total = G.options.withNines ? 48 : 40;
  if (inHands + played !== total) throw new Error(`card count ${inHands + played} != ${total}`);
  if (r.result) {
    if (r.result.augen.re + r.result.augen.kontra !== 240) throw new Error("augen != 240");
    if (r.result.points.reduce((a, b) => a + b, 0) !== 0) throw new Error("points do not sum to 0");
  }
}
