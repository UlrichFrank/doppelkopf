import { GAME_TYPE_NAME, levelName } from "shared";
import type { AnnouncementLevel, DoppelkopfState, Party, Reservation, Seat } from "shared";

export const RESERVATION_LABEL: Record<Reservation | "vorbehalt", string> = {
  gesund: "gesund",
  vorbehalt: "Vorbehalt",
  hochzeit: "Hochzeit",
  damen: "Damensolo",
  buben: "Bubensolo",
  fleischlos: "Fleischloser",
  kreuz: "Kreuz-Solo",
  pik: "Pik-Solo",
  herz: "Herz-Solo",
  karo: "Karo-Solo",
};

export const partyName = (p: Party) => (p === "re" ? "Re" : "Kontra");

/** Highest announcement a seat made itself, e.g. "keine 90". */
export function seatAnnouncement(G: DoppelkopfState, seat: Seat): string | null {
  const own = G.round.announcementLog.filter((a) => a.seat === seat);
  if (own.length === 0) return null;
  const top = own.reduce((a, b) => (b.level > a.level ? b : a));
  return levelName(top.party, top.level as AnnouncementLevel);
}

/** Headline of the game type, from the viewer's knowledge. */
export function gameTitle(G: DoppelkopfState, names: string[]): string {
  const r = G.round;
  if (r.gameType === null) return "Vorbehalte";
  const type = GAME_TYPE_NAME[r.gameType];
  if (r.gameType === "normal") return type;
  if (r.gameType === "hochzeit") {
    const who = names[r.soloist!];
    if (r.clarifiedAfterTricks === null) return `Hochzeit von ${who}`;
    return r.alone ? `${who} spielt allein` : `Hochzeit von ${who}`;
  }
  return `${type} von ${names[r.soloist!]}`;
}
