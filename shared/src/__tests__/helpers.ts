import { createDeck } from "../game/cards";
import { initialState } from "../game/round";
import type { Card, DoppelkopfState, Rank, Suit } from "../game/types";

const SUIT_BY_LETTER: Record<string, Suit> = { c: "kreuz", s: "pik", h: "herz", d: "karo" };

let counter = 0;
/** "cD" = Kreuz-Dame, "h10" = Herz-Zehn, "dA" = Karo-Ass. */
export function c(code: string): Card {
  const suit = SUIT_BY_LETTER[code[0]];
  const rank = code.slice(1) as Rank;
  return { id: `${suit}-${rank}-t${counter++}`, suit, rank };
}

export const cards = (codes: string) => codes.split(/\s+/).filter(Boolean).map(c);

/** Identity shuffle — the deck is dealt in creation order. */
export const noShuffle = <T>(items: T[]) => [...items];

/**
 * A game whose hands are dealt so that the given seats hold the given cards
 * first; the remaining deck fills the hands up.
 */
export function stateWithHands(hands: string[][], withNines = true): DoppelkopfState {
  const G = initialState({ rounds: 4, withNines }, [], noShuffle);
  const deck = createDeck(withNines);
  const n = withNines ? 12 : 10;
  const want = hands.map((h) => h.map((code) => ({ suit: SUIT_BY_LETTER[code[0]], rank: code.slice(1) as Rank })));
  const taken = new Set<string>();
  const result: Card[][] = [[], [], [], []];
  want.forEach((list, seat) => {
    for (const w of list) {
      const card = deck.find((d) => !taken.has(d.id) && d.suit === w.suit && d.rank === w.rank);
      if (!card) throw new Error(`card ${w.suit} ${w.rank} not available`);
      taken.add(card.id);
      result[seat].push(card);
    }
  });
  const rest = deck.filter((d) => !taken.has(d.id));
  for (const hand of result) while (hand.length < n) hand.push(rest.shift()!);
  G.round.hands = result;
  G.round.handCounts = result.map((h) => h.length);
  return G;
}

/** Finds a card in a seat's hand by code. */
export function find(G: DoppelkopfState, seat: number, code: string): Card {
  const suit = SUIT_BY_LETTER[code[0]];
  const rank = code.slice(1);
  const card = G.round.hands[seat].find((x) => x.suit === suit && x.rank === rank);
  if (!card) throw new Error(`seat ${seat} has no ${code}`);
  return card;
}
