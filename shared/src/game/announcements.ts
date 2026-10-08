import type { AnnouncementLevel, Party, RoundState, Seat } from "./types";

export const OTHER_PARTY: Record<Party, Party> = { re: "kontra", kontra: "re" };

export function levelName(party: Party, level: AnnouncementLevel): string {
  switch (level) {
    case 0:
      return "";
    case 1:
      return party === "re" ? "Re" : "Kontra";
    case 2:
      return "keine 90";
    case 3:
      return "keine 60";
    case 4:
      return "keine 30";
    case 5:
      return "schwarz";
  }
}

/**
 * Minimum number of cards the announcing player must still hold to make an
 * announcement of `level`, or null when not possible at all right now.
 *
 * Re/Kontra: cards per player − 1 (11 with 48 cards); every further level one
 * card fewer. Answering the other party's announcement (Erwiderung) allows
 * Re/Kontra one card later. In a Hochzeit announcements are only possible
 * after the clarifying trick and the deadlines move by that many tricks.
 */
export function minCardsFor(round: RoundState, party: Party, level: AnnouncementLevel, cardsPerPlayer: number): number | null {
  if (level < 1) return null;
  let shift = 0;
  if (round.gameType === "hochzeit") {
    if (round.clarifiedAfterTricks === null) return null;
    shift = round.clarifiedAfterTricks;
  }
  let min = cardsPerPlayer - level - shift;
  if (level === 1 && round.announcements[OTHER_PARTY[party]] >= 1) min -= 1;
  return Math.max(min, 1);
}

/** Why `seat` may not announce `level` right now, or null when it may. */
export function announcementError(
  round: RoundState,
  seat: Seat,
  level: AnnouncementLevel,
  cardsPerPlayer: number,
): string | null {
  const party = round.parties[seat];
  if (party === null) return "Partei steht noch nicht fest";
  if (level < 1 || level > 5) return "Ungültige Ansage";
  if (level <= round.announcements[party]) return "Bereits angesagt";
  const min = minCardsFor(round, party, level, cardsPerPlayer);
  if (min === null) return "Ansage noch nicht möglich";
  if (round.handCounts[seat] < min) return "Zu spät für diese Ansage";
  return null;
}

/** The next announcement `seat` could make now, or null. */
export function nextAnnouncement(round: RoundState, seat: Seat, cardsPerPlayer: number): AnnouncementLevel | null {
  const party = round.parties[seat];
  if (party === null) return null;
  const next = (round.announcements[party] + 1) as AnnouncementLevel;
  if (next > 5) return null;
  return announcementError(round, seat, next, cardsPerPlayer) === null ? next : null;
}

/** All levels `seat` could announce right now (e.g. [1, 2] = "Re" or directly "keine 90"). */
export function possibleAnnouncements(round: RoundState, seat: Seat, cardsPerPlayer: number): AnnouncementLevel[] {
  const out: AnnouncementLevel[] = [];
  for (let l = 1; l <= 5; l++) {
    const level = l as AnnouncementLevel;
    if (announcementError(round, seat, level, cardsPerPlayer) === null) out.push(level);
  }
  return out;
}
