import { announcementError } from "./announcements";
import { cardsPerPlayer, createDeck, isKreuzDame } from "./cards";
import { isLegal, isSolo, trickWinner } from "./rules";
import { scoreRound } from "./scoring";
import type {
  AnnouncementLevel,
  GameType,
  Card,
  DoppelkopfState,
  GameOptions,
  NpcSlotConfig,
  Party,
  Reservation,
  RoundState,
  RuleVariants,
  Seat,
} from "./types";

export const NUM_SEATS = 4;
export const ROUND_CHOICES = [4, 8, 12, 16, 20, 24];

export type Shuffle = <T>(items: T[]) => T[];

export const nextSeat = (seat: Seat, n = 1): Seat => (seat + n) % NUM_SEATS;

/** Hochzeit: the partner is the winner of the first trick among the first three not taken by the Hochzeit player. */
const HOCHZEIT_TRICKS = 3;

export function newRound(number: number, dealer: Seat, options: GameOptions, shuffle: Shuffle): RoundState {
  const deck = shuffle(createDeck(options.withNines));
  const n = cardsPerPlayer(options.withNines);
  const hands: Card[][] = [0, 1, 2, 3].map((s) => deck.slice(s * n, (s + 1) * n));
  const first = nextSeat(dealer);
  return {
    number,
    dealer,
    hands,
    handCounts: hands.map((h) => h.length),
    reservations: [null, null, null, null],
    reservationTurn: first,
    gameType: null,
    soloist: null,
    parties: [null, null, null, null],
    alone: false,
    revealed: [false, false, false, false],
    currentTrick: { leader: first, cards: [] },
    tricks: [],
    toAct: first,
    announcements: { re: 0, kontra: 0 },
    announcementLog: [],
    clarifiedAfterTricks: null,
    thrown: null,
    result: null,
  };
}

export function initialState(
  options: GameOptions,
  npcSlots: NpcSlotConfig[],
  shuffle: Shuffle,
): DoppelkopfState {
  return {
    options,
    stage: "reservations",
    // The first round is dealt by the last seat, so seat 0 opens
    round: newRound(1, 3, options, shuffle),
    scores: [0, 0, 0, 0],
    history: [],
    ready: [false, false, false, false],
    npcSlots,
  };
}

export function hasHochzeit(hand: Card[]): boolean {
  return hand.filter(isKreuzDame).length === 2;
}

/** Schmeißen (house rule): five or more Neunen or five or more Könige. */
export const SCHMEISSEN_MIN = 5;

export function mayThrowIn(hand: Card[]): boolean {
  const count = (rank: Card["rank"]) => hand.filter((c) => c.rank === rank).length;
  return count("9") >= SCHMEISSEN_MIN || count("K") >= SCHMEISSEN_MIN;
}

/** Reservations `seat` may declare with `hand` under the table's rule variants. */
export function allowedReservations(hand: Card[], variants: RuleVariants = {}): Reservation[] {
  const out: Reservation[] = ["gesund"];
  if (hasHochzeit(hand)) out.push("hochzeit");
  if (variants.schmeissen && mayThrowIn(hand)) out.push("schmeissen");
  out.push("damen", "buben", "fleischlos", "kreuz", "pik", "herz", "karo");
  return out;
}

/**
 * Returns an error message or null on success. `shuffle` is needed for
 * "schmeissen", which deals the round again (same number, same dealer).
 */
export function declareReservation(
  G: DoppelkopfState,
  seat: Seat,
  reservation: Reservation,
  shuffle?: Shuffle,
): string | null {
  const round = G.round;
  if (G.stage !== "reservations") return "Keine Vorbehaltsabfrage";
  if (round.reservationTurn !== seat) return "Nicht an der Reihe";
  if (!allowedReservations(round.hands[seat], G.options).includes(reservation)) return "Vorbehalt nicht erlaubt";
  if (reservation === "schmeissen") {
    if (!shuffle) return "Neu geben nicht möglich";
    G.round = { ...newRound(round.number, round.dealer, G.options, shuffle), thrown: { seat, hand: round.hands[seat] } };
    return null;
  }
  round.reservations[seat] = reservation;
  const next = nextSeat(seat);
  if (next === nextSeat(round.dealer)) {
    resolveReservations(G);
  } else {
    round.reservationTurn = next;
  }
  return null;
}

function resolveReservations(G: DoppelkopfState): void {
  const round = G.round;
  round.reservationTurn = null;
  const order = [1, 2, 3, 4].map((i) => nextSeat(round.dealer, i));
  const first = nextSeat(round.dealer);

  const soloSeat = order.find((s) => isSolo(round.reservations[s] as GameType));
  const hochzeitSeat = order.find((s) => round.reservations[s] === "hochzeit");

  if (soloSeat !== undefined) {
    round.gameType = round.reservations[soloSeat] as RoundState["gameType"];
    playAlone(round, soloSeat);
    round.revealed = [true, true, true, true];
    // The soloist leads the first trick
    round.toAct = soloSeat;
    round.currentTrick = { leader: soloSeat, cards: [] };
  } else if (hochzeitSeat !== undefined) {
    round.gameType = "hochzeit";
    round.soloist = hochzeitSeat;
    round.parties = round.parties.map((_, s) => (s === hochzeitSeat ? "re" : null));
    round.revealed[hochzeitSeat] = true;
    round.toAct = first;
  } else {
    const silent = order.find((s) => hasHochzeit(round.hands[s]));
    if (silent !== undefined) {
      round.gameType = "stilleHochzeit";
      playAlone(round, silent);
    } else {
      round.gameType = "normal";
      round.parties = round.hands.map((h) => (h.some(isKreuzDame) ? "re" : "kontra"));
    }
    round.toAct = first;
  }
  G.stage = "playing";
}

function playAlone(round: RoundState, soloist: Seat): void {
  round.soloist = soloist;
  round.alone = true;
  round.parties = round.parties.map((_, s) => (s === soloist ? "re" : "kontra"));
}

export function playCard(G: DoppelkopfState, seat: Seat, cardId: string): string | null {
  const round = G.round;
  if (G.stage !== "playing" || round.gameType === null) return "Es wird gerade nicht gespielt";
  if (round.toAct !== seat) return "Nicht an der Reihe";
  const hand = round.hands[seat];
  const card = hand.find((c) => c.id === cardId);
  if (!card) return "Karte nicht auf der Hand";
  if (!isLegal(card, hand, round.currentTrick.cards, round.gameType)) return "Farbe muss bedient werden";

  round.hands[seat] = hand.filter((c) => c.id !== cardId);
  round.handCounts[seat] = round.hands[seat].length;
  round.currentTrick.cards.push({ seat, card });
  if (isKreuzDame(card) && (round.gameType === "normal" || round.gameType === "stilleHochzeit")) {
    round.revealed[seat] = true;
  }

  if (round.currentTrick.cards.length < NUM_SEATS) {
    round.toAct = nextSeat(seat);
    return null;
  }

  const winner = trickWinner(round.currentTrick.cards, round.gameType, G.options.secondDulleWins ?? false);
  round.tricks.push({ ...round.currentTrick, winner });
  round.currentTrick = { leader: winner, cards: [] };
  round.toAct = winner;
  if (round.gameType === "hochzeit" && round.clarifiedAfterTricks === null) clarifyHochzeit(round, winner);

  if (round.handCounts.every((n) => n === 0)) finishRound(G);
  return null;
}

function clarifyHochzeit(round: RoundState, winner: Seat): void {
  const soloist = round.soloist!;
  const played = round.tricks.length;
  if (winner !== soloist) {
    round.parties = round.parties.map((_, s) => (s === soloist || s === winner ? "re" : "kontra"));
  } else if (played >= HOCHZEIT_TRICKS) {
    playAlone(round, soloist);
  } else {
    return;
  }
  round.clarifiedAfterTricks = played;
  round.revealed = [true, true, true, true];
}

export function announce(G: DoppelkopfState, seat: Seat, level: AnnouncementLevel): string | null {
  const round = G.round;
  if (G.stage !== "playing") return "Ansagen nur während des Spiels";
  const error = announcementError(round, seat, level, cardsPerPlayer(G.options.withNines));
  if (error) return error;
  const party = round.parties[seat] as Party;
  round.announcements[party] = level;
  round.announcementLog.push({ seat, party, level, afterTricks: round.tricks.length });
  round.revealed[seat] = true;
  return null;
}

function finishRound(G: DoppelkopfState): void {
  const round = G.round;
  const result = scoreRound({
    roundNumber: round.number,
    gameType: round.gameType!,
    soloist: round.soloist,
    alone: round.alone,
    parties: round.parties as Party[],
    tricks: round.tricks,
    announcements: round.announcements,
  });
  round.result = result;
  round.revealed = [true, true, true, true];
  G.history.push(result);
  G.scores = G.scores.map((s, i) => s + result.points[i]);
  G.ready = [false, false, false, false];
  G.stage = round.number >= G.options.rounds ? "gameEnd" : "roundEnd";
}

/** "Weiter" after a round; deals the next round once everybody is ready. */
export function setReady(G: DoppelkopfState, seat: Seat, shuffle: Shuffle): string | null {
  if (G.stage !== "roundEnd") return "Keine Rundenpause";
  G.ready[seat] = true;
  if (G.ready.every(Boolean)) {
    G.round = newRound(G.round.number + 1, nextSeat(G.round.dealer), G.options, shuffle);
    G.ready = [false, false, false, false];
    G.stage = "reservations";
  }
  return null;
}

/** What `seat` is expected to do right now — drives NPCs and the UI. */
export type PendingAction = "reservation" | "play" | "ready" | null;

export function pendingAction(G: DoppelkopfState, seat: Seat): PendingAction {
  if (G.stage === "reservations") return G.round.reservationTurn === seat ? "reservation" : null;
  if (G.stage === "playing") return G.round.toAct === seat ? "play" : null;
  if (G.stage === "roundEnd") return G.ready[seat] ? null : "ready";
  return null;
}
