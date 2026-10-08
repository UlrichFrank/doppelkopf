import type { DoppelkopfState, Party, RoundState, Seat } from "./types";

/**
 * Parties `viewer` knows about: own party, publicly revealed parties, and
 * what follows necessarily — two known Re players make the others Kontra.
 * (Two known Kontra players do not prove the rest is Re: it may be a silent
 * Hochzeit.) Spectators (viewer null) only see public knowledge.
 */
export function knownParties(round: RoundState, viewer: Seat | null, roundOver: boolean): (Party | null)[] {
  if (roundOver) return [...round.parties];
  const known = round.parties.map((p, s) => (s === viewer || round.revealed[s] ? p : null));
  // A silent Hochzeit player knows everybody else is Kontra
  if (viewer !== null && round.gameType === "stilleHochzeit" && round.soloist === viewer) return [...round.parties];
  const reSeats = known.filter((p) => p === "re").length;
  if (reSeats >= 2) return known.map((p) => p ?? "kontra");
  return known;
}

/**
 * The state as `viewer` may see it: own hand only, parties as far as known,
 * other players' reservations hidden as "vorbehalt", a silent Hochzeit shown
 * as a normal game. Used as boardgame.io playerView.
 */
export function viewFor(G: DoppelkopfState, viewer: Seat | null): DoppelkopfState {
  const round = G.round;
  const roundOver = round.result !== null;
  const silentForViewer = round.gameType === "stilleHochzeit" && round.soloist !== viewer && !roundOver;
  const decided = round.gameType !== null;
  // The seat whose reservation decided the game type (shown to everybody)
  const decidingSeat =
    decided && round.gameType !== "normal" && round.gameType !== "stilleHochzeit" ? round.soloist : null;

  const view: RoundState = {
    ...round,
    hands: round.hands.map((h, s) => (s === viewer || roundOver ? h : [])),
    reservations: round.reservations.map((r, s) => {
      if (r === null || r === "gesund" || s === viewer || s === decidingSeat) return r;
      return "vorbehalt";
    }),
    gameType: silentForViewer ? "normal" : round.gameType,
    soloist: silentForViewer ? null : round.soloist,
    alone: silentForViewer ? false : round.alone,
    parties: knownParties(round, viewer, roundOver),
  };
  return { ...G, round: view };
}
