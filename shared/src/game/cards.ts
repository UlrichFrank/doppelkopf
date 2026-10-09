import type { Card, Rank, Suit } from "./types";

export const SUITS: Suit[] = ["kreuz", "pik", "herz", "karo"];
export const RANKS: Rank[] = ["A", "10", "K", "D", "B", "9"];

export const AUGEN: Record<Rank, number> = { A: 11, "10": 10, K: 4, D: 3, B: 2, "9": 0 };

export const SUIT_SYMBOL: Record<Suit, string> = { kreuz: "♣", pik: "♠", herz: "♥", karo: "♦" };
export const SUIT_NAME: Record<Suit, string> = { kreuz: "Kreuz", pik: "Pik", herz: "Herz", karo: "Karo" };
export const RANK_NAME: Record<Rank, string> = { A: "Ass", "10": "Zehn", K: "König", D: "Dame", B: "Bube", "9": "Neun" };

/**
 * Back of a card. A Doppelkopf pack is two packs mixed: one copy of every
 * card has a red back, the other a blue one — visible to everybody.
 */
export type BackColor = "rot" | "blau";
export const BACK_COLORS: BackColor[] = ["rot", "blau"];

/** Red/blue backs of a hand, as the other players see them. */
export type Backs = Record<BackColor, number>;

/** 48 cards (with nines) or 40 cards; every card twice (copy 0 red back, copy 1 blue). */
export function createDeck(withNines: boolean): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (rank === "9" && !withNines) continue;
      for (const copy of [0, 1]) deck.push({ id: `${suit}-${rank}-${copy}`, suit, rank });
    }
  }
  return deck;
}

export function cardsPerPlayer(withNines: boolean): number {
  return withNines ? 12 : 10;
}

export function augen(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + AUGEN[c.rank], 0);
}

export function isCard(card: Card, suit: Suit, rank: Rank): boolean {
  return card.suit === suit && card.rank === rank;
}

export const isKreuzDame = (c: Card) => isCard(c, "kreuz", "D");
export const isDulle = (c: Card) => isCard(c, "herz", "10");

export function cardLabel(card: Card): string {
  return `${SUIT_SYMBOL[card.suit]}${card.rank}`;
}

export function cardName(card: Card): string {
  return `${SUIT_NAME[card.suit]}-${RANK_NAME[card.rank]}`;
}

/** Back colour from the card id ("herz-10-0" red, "herz-10-1" blue); null for ids outside a deck. */
export function backColor(card: Card): BackColor | null {
  const copy = card.id.slice(card.id.lastIndexOf("-") + 1);
  return copy === "0" ? "rot" : copy === "1" ? "blau" : null;
}

export function backsOf(hand: Card[]): Backs {
  const out: Backs = { rot: 0, blau: 0 };
  for (const c of hand) {
    const color = backColor(c);
    if (color) out[color]++;
  }
  return out;
}
