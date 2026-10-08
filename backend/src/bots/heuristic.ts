/**
 * Rule-based card play. Used directly by NPCs and as the rollout policy of
 * the Monte-Carlo search, so it must be cheap: no allocation-heavy work.
 */
import { AUGEN, createDeck, effectiveSuit, isTrump, legalCards, power, winningIndex } from "shared";
import type { Card, GameType, Party, PlayedCard, Seat, Trick } from "shared";

export interface PlayContext {
  seat: Seat;
  hand: Card[];
  gameType: GameType;
  trick: PlayedCard[];
  /** Completed tricks of this round. */
  tricks: Trick[];
  /** Parties as known to this player (null = unknown). */
  parties: (Party | null)[];
}

const FULL_DECK = createDeck(true);

const trickAugen = (cards: PlayedCard[]) => cards.reduce((s, c) => s + AUGEN[c.card.rank], 0);

/** Is this a "valuable" trump the player should not waste on a cheap trick? */
function isHighTrump(card: Card, gameType: GameType): boolean {
  return isTrump(card, gameType) && power(card, gameType) >= 900;
}

/** Cost of giving a card away: its points plus a premium for strong trumps. */
function discardCost(card: Card, gameType: GameType): number {
  const trump = isTrump(card, gameType);
  return AUGEN[card.rank] * 2 + (trump ? power(card, gameType) / 60 : 0);
}

function minBy<T>(items: T[], key: (t: T) => number): T {
  let best = items[0];
  let bestKey = key(best);
  for (let i = 1; i < items.length; i++) {
    const k = key(items[i]);
    if (k < bestKey) {
      best = items[i];
      bestKey = k;
    }
  }
  return best;
}

const maxBy = <T>(items: T[], key: (t: T) => number) => minBy(items, (t) => -key(t));

/** Fehl suits (in this game type) that were already led in a completed trick. */
function ledSuits(tricks: Trick[], gameType: GameType): Set<string> {
  const out = new Set<string>();
  for (const t of tricks) out.add(effectiveSuit(t.cards[0].card, gameType));
  return out;
}

/** Highest trump power still out (not yet played and not in own hand). */
function highestOutstandingTrump(ctx: PlayContext): number {
  const played = new Set<string>();
  for (const t of ctx.tricks) for (const c of t.cards) played.add(c.card.id);
  for (const c of ctx.trick) played.add(c.card.id);
  for (const c of ctx.hand) played.add(c.id);
  let best = 0;
  for (const c of FULL_DECK) {
    if (played.has(c.id) || !isTrump(c, ctx.gameType)) continue;
    const p = power(c, ctx.gameType);
    if (p > best) best = p;
  }
  return best;
}

export function chooseCardHeuristic(ctx: PlayContext, rnd: () => number = Math.random): Card {
  const { gameType, trick, hand, seat, parties } = ctx;
  const legal = legalCards(hand, trick, gameType);
  if (legal.length === 1) return legal[0];
  const myParty = parties[seat];

  if (trick.length === 0) return chooseLead(ctx, legal, rnd);

  const bestIdx = winningIndex(trick, gameType);
  const best = trick[bestIdx];
  const partnerWinning = myParty !== null && best.seat !== seat && parties[best.seat] === myParty;
  const last = trick.length === 3;
  const value = trickAugen(trick);
  const winners = legal.filter((c) => winningIndex([...trick, { seat, card: c }], gameType) === trick.length);

  if (partnerWinning) {
    const bestPower = isTrump(best.card, gameType) ? power(best.card, gameType) : 0;
    const safe = last || bestPower >= highestOutstandingTrump(ctx) || (bestPower >= 900 && trick.length === 2);
    if (safe) {
      // Schmieren: give points, but no strong trumps
      const fat = legal.filter((c) => !isHighTrump(c, gameType));
      if (fat.length > 0) return maxBy(fat, (c) => AUGEN[c.rank] * 10 - (isTrump(c, gameType) ? power(c, gameType) / 100 : 0));
    }
    return minBy(legal, (c) => discardCost(c, gameType));
  }

  if (winners.length > 0) {
    const cheapest = minBy(winners, (c) => power(c, gameType) + AUGEN[c.rank]);
    if (last) {
      // Worth it unless a strong trump would go for an empty trick
      if (value + AUGEN[cheapest.rank] >= 8 || !isHighTrump(cheapest, gameType)) return cheapest;
    } else {
      const top = highestOutstandingTrump(ctx);
      const sure = winners.filter((c) => isTrump(c, gameType) && power(c, gameType) >= top);
      if (value >= 14 && sure.length > 0) return minBy(sure, (c) => power(c, gameType));
      if (value >= 10) {
        const strong = winners.filter((c) => !isTrump(c, gameType) || power(c, gameType) >= 900);
        if (strong.length > 0) return minBy(strong, (c) => power(c, gameType));
      }
      // Fehl follow: winning with an Ass is natural
      if (!isTrump(cheapest, gameType) && cheapest.rank === "A") return cheapest;
      if (!isHighTrump(cheapest, gameType) && AUGEN[cheapest.rank] <= 4) return cheapest;
    }
  }
  return minBy(legal, (c) => discardCost(c, gameType));
}

function chooseLead(ctx: PlayContext, legal: Card[], rnd: () => number): Card {
  const { gameType, tricks } = ctx;
  const led = ledSuits(tricks, gameType);
  const trumps = legal.filter((c) => isTrump(c, gameType));
  const fehl = legal.filter((c) => !isTrump(c, gameType));

  // A Fehl Ass in a suit not led yet usually comes home
  const aces = fehl.filter((c) => c.rank === "A" && !led.has(c.suit));
  if (aces.length > 0) {
    // Prefer the suit we hold fewest of (less likely to be trumped later... and keeps length)
    return minBy(aces, (a) => fehl.filter((c) => c.suit === a.suit).length + rnd() * 0.1);
  }

  const alone = ctx.parties[ctx.seat] === "re" && ctx.parties.filter((p) => p === "re").length === 1 &&
    ctx.parties.every((p, s) => s === ctx.seat || p === "kontra");
  if (trumps.length > 0) {
    const top = highestOutstandingTrump(ctx);
    const winnersNow = trumps.filter((t) => power(t, gameType) >= top);
    // Soloist with many trumps: pull trumps with sure winners
    if ((alone || trumps.length >= 7) && winnersNow.length > 0) return winnersNow[0];
    if (alone && trumps.length >= legal.length / 2) return maxBy(trumps, (c) => power(c, gameType));
  }

  // Otherwise lead something cheap: a low Fehl card from a short suit, or a low trump
  if (fehl.length > 0) {
    return minBy(fehl, (c) => AUGEN[c.rank] * 2 + fehl.filter((x) => x.suit === c.suit).length + rnd() * 0.5);
  }
  return minBy(trumps, (c) => discardCost(c, gameType) + rnd() * 0.5);
}
