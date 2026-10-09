import { isDulle } from "./cards";
import type { Card, GameType, PlayedCard, Rank, Seat, SoloType, Suit } from "./types";

/** Effective suit of a card in a game: its colour, or "trumpf". */
export type EffectiveSuit = Suit | "trumpf";

const SUIT_POWER: Record<Suit, number> = { kreuz: 4, pik: 3, herz: 2, karo: 1 };

export const SOLO_TYPES: SoloType[] = ["damen", "buben", "fleischlos", "kreuz", "pik", "herz", "karo"];

export function isSolo(gameType: GameType | null): gameType is SoloType {
  return gameType !== null && (SOLO_TYPES as string[]).includes(gameType);
}

/** Suit whose cards are trump besides Dulle, Damen and Buben; null in Damen-/Buben-/Fleischlos-Solo. */
export function trumpSuit(gameType: GameType): Suit | null {
  switch (gameType) {
    case "damen":
    case "buben":
    case "fleischlos":
      return null;
    case "herz":
    case "pik":
    case "kreuz":
      return gameType;
    default:
      return "karo";
  }
}

/** Damen, Buben, Dulle are trump in every game with a trump suit. */
function hasStandardTrumps(gameType: GameType): boolean {
  return trumpSuit(gameType) !== null;
}

export function isTrump(card: Card, gameType: GameType): boolean {
  if (gameType === "damen") return card.rank === "D";
  if (gameType === "buben") return card.rank === "B";
  if (gameType === "fleischlos") return false;
  if (isDulle(card) || card.rank === "D" || card.rank === "B") return true;
  return card.suit === trumpSuit(gameType);
}

export function effectiveSuit(card: Card, gameType: GameType): EffectiveSuit {
  return isTrump(card, gameType) ? "trumpf" : card.suit;
}

const TRUMP_SUIT_POWER: Partial<Record<Rank, number>> = { A: 700, "10": 600, K: 500, "9": 400 };

/** Fehl order: A, 10, K, D, B, 9 (D and B only occur as Fehl in solos). */
const FEHL_POWER: Record<Rank, number> = { A: 6, "10": 5, K: 4, D: 3, B: 2, "9": 1 };

/**
 * Strength of a card within its effective suit; higher wins. Trumps are
 * ≥ 100, Fehl cards below.
 */
export function power(card: Card, gameType: GameType): number {
  if (!isTrump(card, gameType)) return FEHL_POWER[card.rank];
  if (!hasStandardTrumps(gameType)) return 900 + SUIT_POWER[card.suit]; // Damen-/Buben-Solo
  if (isDulle(card)) return 1000;
  if (card.rank === "D") return 900 + SUIT_POWER[card.suit];
  if (card.rank === "B") return 800 + SUIT_POWER[card.suit];
  return TRUMP_SUIT_POWER[card.rank] ?? 0;
}

/**
 * True when `card` played later beats `best` (the current winner of the trick).
 * Of two equal cards the first one wins (DDV), unless the house rule
 * `secondDulleWins` lets the second Herz-Zehn beat the first.
 */
function beats(card: Card, best: Card, leadSuit: EffectiveSuit, gameType: GameType, secondDulleWins: boolean): boolean {
  const cardSuit = effectiveSuit(card, gameType);
  const bestSuit = effectiveSuit(best, gameType);
  if (cardSuit === "trumpf" && bestSuit !== "trumpf") return true;
  if (cardSuit !== bestSuit) return false;
  if (cardSuit !== "trumpf" && cardSuit !== leadSuit) return false;
  const p = power(card, gameType);
  const b = power(best, gameType);
  if (p === b) return secondDulleWins && cardSuit === "trumpf" && isDulle(card) && hasStandardTrumps(gameType);
  return p > b;
}

/** Index (into `cards`) of the card that wins the trick. */
export function winningIndex(cards: PlayedCard[], gameType: GameType, secondDulleWins = false): number {
  if (cards.length === 0) return -1;
  const leadSuit = effectiveSuit(cards[0].card, gameType);
  let best = 0;
  for (let i = 1; i < cards.length; i++) {
    if (beats(cards[i].card, cards[best].card, leadSuit, gameType, secondDulleWins)) best = i;
  }
  return best;
}

export function trickWinner(cards: PlayedCard[], gameType: GameType, secondDulleWins = false): Seat {
  return cards[winningIndex(cards, gameType, secondDulleWins)].seat;
}

/** Cards of `hand` that may be played onto `trickCards` (Bedienpflicht). */
export function legalCards(hand: Card[], trickCards: PlayedCard[], gameType: GameType): Card[] {
  if (trickCards.length === 0) return hand;
  const lead = effectiveSuit(trickCards[0].card, gameType);
  const following = hand.filter((c) => effectiveSuit(c, gameType) === lead);
  return following.length > 0 ? following : hand;
}

export function isLegal(card: Card, hand: Card[], trickCards: PlayedCard[], gameType: GameType): boolean {
  return legalCards(hand, trickCards, gameType).some((c) => c.id === card.id);
}

/** Display order of Fehl suits: alternating colours. */
const FEHL_ORDER: Suit[] = ["kreuz", "herz", "pik", "karo"];

/** Sorts a hand for display: trumps (highest first), then Fehl suits. */
export function sortHand(hand: Card[], gameType: GameType): Card[] {
  const key = (c: Card) =>
    isTrump(c, gameType) ? 10000 - power(c, gameType) : 20000 + FEHL_ORDER.indexOf(c.suit) * 100 - power(c, gameType);
  return [...hand].sort((a, b) => key(a) - key(b) || a.id.localeCompare(b.id));
}

export const GAME_TYPE_NAME: Record<GameType, string> = {
  normal: "Normalspiel",
  hochzeit: "Hochzeit",
  stilleHochzeit: "Stille Hochzeit",
  damen: "Damensolo",
  buben: "Bubensolo",
  fleischlos: "Fleischloser",
  kreuz: "Kreuz-Solo",
  pik: "Pik-Solo",
  herz: "Herz-Solo",
  karo: "Karo-Solo",
};
