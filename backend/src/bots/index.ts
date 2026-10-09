/**
 * NPC decisions. Every function works on the bot's filtered view of the
 * game (boardgame.io playerView) — a bot never sees more than a human on
 * its seat would.
 */
import {
  backsOf,
  cardsPerPlayer,
  createDeck,
  hasHochzeit,
  isKreuzDame,
  mayThrowIn,
  isTrump,
  legalCards,
  nextAnnouncement,
  pendingAction,
} from "shared";
import type { AnnouncementLevel, Card, DoppelkopfState, GameType, NpcPersona, Reservation, Seat, SoloType } from "shared";
import { chooseCardHeuristic } from "./heuristic";
import { dealByBacks, evaluateCandidates, playOut, type Rng, type Rollout } from "./montecarlo";
import { PERSONA_PARAMS, type PersonaParams } from "./personas";

export type BotAction =
  | { move: "declareReservation"; args: [Reservation] }
  | { move: "playCard"; args: [string] }
  | { move: "announce"; args: [AnnouncementLevel] }
  | { move: "ready"; args: [] };

/** "random" plays any legal card — only for simulations and tests. */
export type BotKind = NpcPersona | "random" | "heuristic";

/** The next action of `seat`, or null when it has nothing to do. */
export function decide(view: DoppelkopfState, seat: Seat, kind: BotKind, rnd: Rng = Math.random): BotAction | null {
  switch (pendingAction(view, seat)) {
    case "reservation":
      return { move: "declareReservation", args: [chooseReservation(view, seat, kind, rnd)] };
    case "play":
      return choosePlay(view, seat, kind, rnd);
    case "ready":
      return { move: "ready", args: [] };
    default:
      return null;
  }
}

// ── Card play and announcements ─────────────────────────────────────────────

function choosePlay(view: DoppelkopfState, seat: Seat, kind: BotKind, rnd: Rng): BotAction {
  const r = view.round;
  if (kind === "random") {
    const legal = legalCards(r.hands[seat], r.currentTrick.cards, r.gameType!);
    return { move: "playCard", args: [legal[Math.floor(rnd() * legal.length)].id] };
  }
  if (kind === "heuristic") return { move: "playCard", args: [heuristicCard(view, seat, rnd).id] };

  const params = PERSONA_PARAMS[kind];
  const stats = evaluateCandidates(view, seat, params.samples, rnd);
  const best = stats.reduce((a, b) => (b.value > a.value ? b : a));

  const level = nextAnnouncement(r, seat, cardsPerPlayer(view.options.withNines));
  if (level !== null && announcementLikely(best.rollouts, level) >= params.announce[level]) {
    return { move: "announce", args: [level] };
  }
  return { move: "playCard", args: [best.card.id] };
}

function heuristicCard(view: DoppelkopfState, seat: Seat, rnd: Rng): Card {
  const r = view.round;
  return chooseCardHeuristic(
    {
      seat,
      hand: r.hands[seat],
      gameType: r.gameType!,
      trick: r.currentTrick.cards,
      tricks: r.tricks,
      parties: r.parties,
      secondDulleWins: view.options.secondDulleWins,
    },
    rnd,
  );
}

/** Share of rollouts in which the announcement of `level` would hold. */
export function announcementLikely(rollouts: Rollout[], level: AnnouncementLevel): number {
  if (rollouts.length === 0) return 0;
  const holds = (x: Rollout) => {
    switch (level) {
      case 1:
        return x.ownAugen >= 121;
      case 2:
        return x.oppAugen < 90;
      case 3:
        return x.oppAugen < 60;
      case 4:
        return x.oppAugen < 30;
      case 5:
        return x.oppTricks === 0;
      default:
        return false;
    }
  };
  return rollouts.filter(holds).length / rollouts.length;
}

// ── Reservations ───────────────────────────────────────────────────────────

const TRUMP_SOLOS: SoloType[] = ["kreuz", "pik", "herz", "karo"];

/** Solo types worth simulating for this hand (cheap pre-filter). */
function soloCandidates(hand: Card[]): SoloType[] {
  const out: SoloType[] = [];
  for (const solo of TRUMP_SOLOS) if (hand.filter((c) => isTrump(c, solo)).length >= hand.length / 2) out.push(solo);
  if (hand.filter((c) => c.rank === "D").length >= 4) out.push("damen");
  if (hand.filter((c) => c.rank === "B").length >= 4) out.push("buben");
  if (hand.filter((c) => c.rank === "A").length >= 4) out.push("fleischlos");
  return out;
}

/** Average points of `seat` when the round is played as `gameType` (sampled). */
export function simulateGameType(
  view: DoppelkopfState,
  seat: Seat,
  gameType: GameType,
  samples: number,
  rnd: Rng,
): number {
  const r = view.round;
  const hand = r.hands[seat];
  const own = new Set(hand.map((c) => c.id));
  const rest = createDeck(view.options.withNines).filter((c) => !own.has(c.id));
  const n = hand.length;
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const others = [0, 1, 2, 3].filter((s) => s !== seat);
    const hands = dealByBacks(rest, others, [n, n, n, n], r.handBacks, rnd);
    hands[seat] = [...hand];
    const solo = gameType !== "normal";
    const queens = hands.map((h) => h.filter(isKreuzDame).length);
    const silent = !solo ? queens.findIndex((q) => q === 2) : -1;
    const first = (r.dealer + 1) % 4;
    const leader = solo ? seat : first;
    const world: DoppelkopfState = {
      ...view,
      stage: "playing",
      history: [],
      scores: [0, 0, 0, 0],
      options: { ...view.options, rounds: Number.MAX_SAFE_INTEGER },
      round: {
        ...r,
        hands,
        handCounts: hands.map((h) => h.length),
        handBacks: hands.map(backsOf),
        gameType: solo ? gameType : silent >= 0 ? "stilleHochzeit" : "normal",
        soloist: solo ? seat : silent >= 0 ? silent : null,
        alone: solo || silent >= 0,
        parties: hands.map((_, s) =>
          solo ? (s === seat ? "re" : "kontra") : silent >= 0 ? (s === silent ? "re" : "kontra") : queens[s] > 0 ? "re" : "kontra",
        ),
        revealed: [true, true, true, true],
        currentTrick: { leader, cards: [] },
        tricks: [],
        toAct: leader,
        announcements: { re: 0, kontra: 0 },
        announcementLog: [],
        result: null,
      },
    };
    playOut(world, rnd);
    total += world.round.result!.points[seat];
  }
  return total / samples;
}

function chooseReservation(view: DoppelkopfState, seat: Seat, kind: BotKind, rnd: Rng): Reservation {
  const hand = view.round.hands[seat];
  if (kind === "random") return "gesund";
  // Five Neunen or Könige make a weak hand: throw it in when the table allows it
  const fallback: Reservation =
    view.options.schmeissen && mayThrowIn(hand) ? "schmeissen" : hasHochzeit(hand) ? "hochzeit" : "gesund";
  if (kind === "heuristic") return fallback;
  const params: PersonaParams = PERSONA_PARAMS[kind];
  const candidates = soloCandidates(hand);
  if (candidates.length === 0) return fallback;

  const samples = params.reservationSamples;
  const normal = simulateGameType(view, seat, "normal", samples, rnd);
  let best: { solo: SoloType; value: number } | null = null;
  for (const solo of candidates) {
    const value = simulateGameType(view, seat, solo, samples, rnd);
    if (!best || value > best.value) best = { solo, value };
  }
  if (best && best.value >= params.soloMin && best.value - normal >= params.soloMargin) return best.solo;
  return fallback;
}
