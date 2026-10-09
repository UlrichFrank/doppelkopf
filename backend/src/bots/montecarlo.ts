/**
 * Monte-Carlo card choice (perfect-information sampling): the cards the bot
 * cannot see are dealt at random to the other players — consistent with what
 * the bot knows (suits a player failed to follow, Kreuz-Damen of known
 * parties, how many red and blue backs every hand shows) — and every candidate card is played out to the end of the round
 * with the heuristic policy for all four seats.
 */
import { backColor, backsOf, createDeck, effectiveSuit, isKreuzDame, legalCards, playCard } from "shared";
import type { BackColor, Backs, Card, DoppelkopfState, Party, PlayedCard, Seat } from "shared";
import { chooseCardHeuristic } from "./heuristic";

export type Rng = () => number;

export interface Rollout {
  /** Points of the bot's seat. */
  points: number;
  ownAugen: number;
  oppAugen: number;
  oppTricks: number;
  won: boolean;
}

export interface CandidateStats {
  card: Card;
  value: number;
  rollouts: Rollout[];
}

function allPlayed(view: DoppelkopfState): PlayedCard[] {
  const out: PlayedCard[] = [];
  for (const t of view.round.tricks) out.push(...t.cards);
  out.push(...view.round.currentTrick.cards);
  return out;
}

/** For every seat, the effective suits it is known not to hold. */
export function knownVoids(view: DoppelkopfState): Set<string>[] {
  const gt = view.round.gameType!;
  const voids = [0, 1, 2, 3].map(() => new Set<string>());
  const tricks = [...view.round.tricks, view.round.currentTrick];
  for (const t of tricks) {
    if (t.cards.length === 0) continue;
    const lead = effectiveSuit(t.cards[0].card, gt);
    for (const { seat, card } of t.cards.slice(1)) {
      if (effectiveSuit(card, gt) !== lead) voids[seat].add(lead);
    }
  }
  return voids;
}

function shuffleInPlace<T>(a: T[], rnd: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Colour bucket of a card for dealing: its back colour, or one shared bucket when backs are unknown. */
const bucket = (card: Card, byBacks: boolean): BackColor => (byBacks ? (backColor(card) ?? "rot") : "rot");

/**
 * Free places per seat and colour. With `byBacks` the seat takes exactly as
 * many red and blue cards as its hand shows; otherwise one bucket per seat.
 */
function placesFor(seats: Seat[], counts: number[], backs: Backs[] | undefined, byBacks: boolean): Backs[] {
  return [0, 1, 2, 3].map((s) => {
    if (!seats.includes(s)) return { rot: 0, blau: 0 };
    return byBacks ? { ...backs![s] } : { rot: counts[s], blau: 0 };
  });
}

/**
 * Deals `cards` at random to `seats` so that every seat gets as many red and
 * blue backs as `backs` says (or just `counts` cards when backs are unknown).
 */
export function dealByBacks(
  cards: Card[],
  seats: Seat[],
  counts: number[],
  backs: Backs[] | undefined,
  rnd: Rng,
): Card[][] {
  const byBacks = backs !== undefined && cards.every((c) => backColor(c) !== null);
  const places = placesFor(seats, counts, backs, byBacks);
  const hands: Card[][] = [[], [], [], []];
  for (const card of shuffleInPlace([...cards], rnd)) {
    const color = bucket(card, byBacks);
    const open = seats.filter((s) => places[s][color] > 0);
    const seat = open[Math.floor(rnd() * open.length)];
    hands[seat].push(card);
    places[seat][color]--;
  }
  return hands;
}

/**
 * Deals the unknown cards to the other seats. Returns hands for all seats
 * (the bot's own hand unchanged).
 */
export function sampleHands(view: DoppelkopfState, me: Seat, rnd: Rng): Card[][] {
  const round = view.round;
  const gt = round.gameType!;
  const played = allPlayed(view);
  const known = new Set<string>([...round.hands[me].map((c) => c.id), ...played.map((p) => p.card.id)]);
  const unknown = createDeck(view.options.withNines).filter((c) => !known.has(c.id));
  const voids = knownVoids(view);
  const others = [0, 1, 2, 3].filter((s) => s !== me);

  // Kreuz-Damen constraints
  const queenAllowed = (seat: Seat) => {
    if (gt === "hochzeit" && round.soloist !== null && round.soloist !== me) return seat === round.soloist;
    if (gt === "normal" || gt === "stilleHochzeit") return round.parties[seat] !== "kontra";
    return true;
  };
  const mustHoldQueen = others.filter(
    (s) =>
      (gt === "normal" || gt === "stilleHochzeit") &&
      round.parties[s] === "re" &&
      !played.some((p) => p.seat === s && isKreuzDame(p.card)),
  );

  const allowed = (seat: Seat, card: Card, strict: boolean) => {
    if (isKreuzDame(card) && !queenAllowed(seat)) return false;
    return !strict || !voids[seat].has(effectiveSuit(card, gt));
  };

  // The backs every player shows are part of the public information
  const byBacks = round.handBacks !== undefined && unknown.every((c) => backColor(c) !== null);

  for (let attempt = 0; attempt < 60; attempt++) {
    const strict = attempt < 50;
    const hands: Card[][] = [[], [], [], []];
    hands[me] = round.hands[me];
    const capacity = placesFor(others, round.handCounts, round.handBacks, byBacks);
    const cards = shuffleInPlace([...unknown], rnd);
    // Most constrained cards first
    const options = cards.map((c) => others.filter((s) => allowed(s, c, strict)));
    const order = cards.map((_, i) => i).sort((a, b) => options[a].length - options[b].length);
    let ok = true;
    for (const i of order) {
      const color = bucket(cards[i], byBacks);
      const open = options[i].filter((s) => capacity[s][color] > 0);
      if (open.length === 0) {
        ok = false;
        break;
      }
      const seat = open[Math.floor(rnd() * open.length)];
      hands[seat].push(cards[i]);
      capacity[seat][color]--;
    }
    if (!ok) continue;
    if (strict && !mustHoldQueen.every((s) => hands[s].some(isKreuzDame))) continue;
    return hands;
  }
  // Give up on voids and Kreuz-Damen: random deal that still matches the backs
  const hands = dealByBacks(unknown, others, round.handCounts, round.handBacks, rnd);
  hands[me] = round.hands[me];
  return hands;
}

/** A complete-information state for one sampled deal. */
export function buildWorld(view: DoppelkopfState, hands: Card[][]): DoppelkopfState {
  const round = view.round;
  const world: DoppelkopfState = {
    ...view,
    history: [],
    scores: [0, 0, 0, 0],
    ready: [false, false, false, false],
    // The world must never trigger the next deal
    options: { ...view.options, rounds: Number.MAX_SAFE_INTEGER },
    round: {
      ...round,
      hands: hands.map((h) => [...h]),
      handCounts: hands.map((h) => h.length),
      handBacks: hands.map(backsOf),
      currentTrick: { leader: round.currentTrick.leader, cards: [...round.currentTrick.cards] },
      tricks: [...round.tricks],
      parties: [...round.parties],
      revealed: [true, true, true, true],
      announcements: { ...round.announcements },
      announcementLog: [],
      result: null,
    },
  };
  const gt = round.gameType;
  if (gt === "normal" || gt === "stilleHochzeit") {
    const played = allPlayed(view);
    const queens = [0, 1, 2, 3].map(
      (s) => hands[s].filter(isKreuzDame).length + played.filter((p) => p.seat === s && isKreuzDame(p.card)).length,
    );
    const silent = queens.findIndex((q) => q === 2);
    if (silent >= 0) {
      world.round.gameType = "stilleHochzeit";
      world.round.alone = true;
      world.round.soloist = silent;
      world.round.parties = queens.map((_, s) => (s === silent ? "re" : "kontra"));
    } else {
      world.round.gameType = "normal";
      world.round.alone = false;
      world.round.soloist = null;
      world.round.parties = queens.map((q) => (q > 0 ? "re" : "kontra"));
    }
  }
  return world;
}

/** Plays the round to its end with the heuristic for every seat. */
export function playOut(world: DoppelkopfState, rnd: Rng): void {
  let guard = 0;
  while (world.stage === "playing" && guard++ < 60) {
    const r = world.round;
    const seat = r.toAct;
    const card = chooseCardHeuristic(
      {
        seat,
        hand: r.hands[seat],
        gameType: r.gameType!,
        trick: r.currentTrick.cards,
        tricks: r.tricks,
        parties: r.parties,
        secondDulleWins: world.options.secondDulleWins,
      },
      rnd,
    );
    playCard(world, seat, card.id);
  }
}

function rolloutResult(world: DoppelkopfState, me: Seat): Rollout {
  const result = world.round.result!;
  const own: Party = result.parties[me];
  const opp: Party = own === "re" ? "kontra" : "re";
  return {
    points: result.points[me],
    ownAugen: result.augen[own],
    oppAugen: result.augen[opp],
    oppTricks: result.tricksWon[opp],
    won: result.winner === own,
  };
}

/** Distinct legal cards (both copies of a card are equivalent). */
export function candidateCards(view: DoppelkopfState, me: Seat): Card[] {
  const r = view.round;
  const legal = legalCards(r.hands[me], r.currentTrick.cards, r.gameType!);
  const seen = new Set<string>();
  return legal.filter((c) => {
    const key = c.suit + c.rank;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Evaluates every candidate over `samples` sampled deals. */
export function evaluateCandidates(view: DoppelkopfState, me: Seat, samples: number, rnd: Rng): CandidateStats[] {
  const candidates = candidateCards(view, me);
  const stats: CandidateStats[] = candidates.map((card) => ({ card, value: 0, rollouts: [] }));
  for (let i = 0; i < samples; i++) {
    const hands = sampleHands(view, me, rnd);
    for (const s of stats) {
      const world = buildWorld(view, hands);
      playCard(world, me, s.card.id);
      playOut(world, rnd);
      const r = rolloutResult(world, me);
      s.rollouts.push(r);
      // Points dominate; Augen break ties between equally scored lines
      s.value += r.points * 30 + r.ownAugen;
    }
  }
  for (const s of stats) s.value /= Math.max(1, samples);
  return stats;
}
