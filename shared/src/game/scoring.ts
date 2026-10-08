import { OTHER_PARTY } from "./announcements";
import { AUGEN, augen, isCard } from "./cards";
import { winningIndex } from "./rules";
import type { AnnouncementLevel, GameType, Party, RoundResult, RoundState, ScoreLine } from "./types";

export interface ScoringInput {
  roundNumber: number;
  gameType: GameType;
  soloist: number | null;
  alone: boolean;
  parties: Party[];
  tricks: RoundState["tricks"];
  announcements: Record<Party, AnnouncementLevel>;
}

const ABSAGE_LIMIT: Record<number, number> = { 2: 90, 3: 60, 4: 30 };

/** Does `party` reach its goal? See spec "abrechnung" — Gewinnermittlung. */
export function reachesGoal(
  party: Party,
  points: Record<Party, number>,
  tricksWon: Record<Party, number>,
  announcements: Record<Party, AnnouncementLevel>,
): boolean {
  const other = OTHER_PARTY[party];
  const own = announcements[party];
  const opp = announcements[other];
  if (own >= 2) {
    // Fulfil the own highest absage
    if (own === 5) return tricksWon[other] === 0;
    return points[other] < ABSAGE_LIMIT[own];
  }
  if (opp >= 2) {
    // The opponent's absage lowers the own target
    if (opp === 5) return tricksWon[party] > 0;
    return points[party] >= ABSAGE_LIMIT[opp];
  }
  const onlyKontraAnnounced = announcements.kontra >= 1 && announcements.re === 0;
  if (party === "re") return points.re >= (onlyKontraAnnounced ? 120 : 121);
  return points.kontra >= (onlyKontraAnnounced ? 121 : 120);
}

export function scoreRound(input: ScoringInput): RoundResult {
  const { parties, tricks, announcements, gameType, alone } = input;
  const points: Record<Party, number> = { re: 0, kontra: 0 };
  const tricksWon: Record<Party, number> = { re: 0, kontra: 0 };
  for (const trick of tricks) {
    const p = parties[trick.winner!];
    points[p] += augen(trick.cards.map((c) => c.card));
    tricksWon[p] += 1;
  }

  const reWins = reachesGoal("re", points, tricksWon, announcements);
  const kontraWins = reachesGoal("kontra", points, tricksWon, announcements);
  const winner: Party | null = reWins && !kontraWins ? "re" : kontraWins && !reWins ? "kontra" : null;

  const lines: ScoreLine[] = [];
  if (winner) {
    const sign = winner === "re" ? 1 : -1;
    const loser = OTHER_PARTY[winner];
    const add = (label: string, n = 1) => lines.push({ label, re: sign * n });
    add(winner === "re" ? "Gewonnen (Re)" : "Gewonnen (Kontra)");
    if (points[loser] < 90) add("Gegner unter 90");
    if (points[loser] < 60) add("Gegner unter 60");
    if (points[loser] < 30) add("Gegner unter 30");
    if (tricksWon[loser] === 0) add("Gegner schwarz");
    if (announcements.re >= 1) add("Re angesagt", 2);
    if (announcements.kontra >= 1) add("Kontra angesagt", 2);
    for (const party of ["re", "kontra"] as Party[]) {
      const name = party === "re" ? "Re" : "Kontra";
      if (announcements[party] >= 2) add(`${name}: keine 90 abgesagt`);
      if (announcements[party] >= 3) add(`${name}: keine 60 abgesagt`);
      if (announcements[party] >= 4) add(`${name}: keine 30 abgesagt`);
      if (announcements[party] >= 5) add(`${name}: schwarz abgesagt`);
    }
    const opp = announcements[loser];
    if (opp >= 2 && points[winner] >= 120) add("120 gegen keine 90");
    if (opp >= 3 && points[winner] >= 90) add("90 gegen keine 60");
    if (opp >= 4 && points[winner] >= 60) add("60 gegen keine 30");
    if (opp >= 5 && points[winner] >= 30) add("30 gegen schwarz");
    if (winner === "kontra" && !alone) add("Gegen die Alten");
  }

  // Special points only in games two against two
  if (!alone) {
    tricks.forEach((trick, i) => {
      const takers = parties[trick.winner!];
      const sign = takers === "re" ? 1 : -1;
      const name = takers === "re" ? "Re" : "Kontra";
      for (const { seat, card } of trick.cards) {
        if (isCard(card, "karo", "A") && parties[seat] !== takers) {
          lines.push({ label: `${name}: Fuchs gefangen`, re: sign });
        }
      }
      if (trick.cards.reduce((s, c) => s + AUGEN[c.card.rank], 0) >= 40) {
        lines.push({ label: `${name}: Doppelkopf`, re: sign });
      }
      if (i === tricks.length - 1) {
        const winning = trick.cards[winningIndex(trick.cards, gameType)].card;
        if (isCard(winning, "kreuz", "B")) lines.push({ label: `${name}: Karlchen`, re: sign });
      }
    });
  }

  const reValue = lines.reduce((s, l) => s + l.re, 0);
  const seatPoints = parties.map((p, seat) => {
    if (alone) return seat === input.soloist ? 3 * reValue : -reValue;
    return p === "re" ? reValue : -reValue;
  });

  return {
    roundNumber: input.roundNumber,
    gameType,
    soloist: input.soloist,
    alone,
    parties: [...parties],
    augen: points,
    tricksWon,
    announcements: { ...announcements },
    winner,
    lines,
    reValue,
    points: seatPoints.map((p) => p + 0), // avoid -0
  };
}
