import type { Game, MoveFn } from "boardgame.io";
import { ActivePlayers, INVALID_MOVE } from "boardgame.io/core";
import { announce, declareReservation, initialState, playCard, setReady } from "./round";
import type { AnnouncementLevel, DoppelkopfState, Reservation, SetupData } from "./types";
import { viewFor } from "./view";

export const GAME_NAME = "doppelkopf";

/** The lobby offers ROUND_CHOICES; tests and the smoke run use shorter games. */
const validRounds = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 48;

const valid = (error: string | null) => (error === null ? undefined : INVALID_MOVE);

/**
 * Server-only moves: a client only has its filtered view (no other hands)
 * and could not compute the result of a move optimistically.
 */
const serverMove = (fn: MoveFn<DoppelkopfState, Record<string, unknown>>) => ({ move: fn, client: false });

/**
 * Doppelkopf for exactly four seats.
 *
 * All players are always active: announcements and "Weiter" are allowed out
 * of turn, so whose turn it is lives in G (`round.reservationTurn`,
 * `round.toAct`) and every move checks it itself. `G.stage` drives the
 * round: reservations → playing → roundEnd → … → gameEnd.
 */
export const Doppelkopf: Game<DoppelkopfState, Record<string, unknown>, SetupData> = {
  name: GAME_NAME,
  minPlayers: 4,
  maxPlayers: 4,

  setup({ random }, setupData) {
    const rounds = validRounds(setupData?.rounds) ? setupData!.rounds! : 8;
    const withNines = setupData?.withNines ?? true;
    const npcSlots = (setupData?.npcSlots ?? []).filter((s) => s.seat >= 1 && s.seat <= 3);
    const variants = { secondDulleWins: setupData?.secondDulleWins === true, schmeissen: setupData?.schmeissen === true };
    return initialState({ rounds, withNines, ...variants }, npcSlots, (items) => random.Shuffle(items));
  },

  validateSetupData(setupData, numPlayers) {
    if (numPlayers !== 4) return "Doppelkopf wird zu viert gespielt";
    if (setupData?.rounds !== undefined && !validRounds(setupData.rounds)) return "Ungültige Rundenzahl";
    return undefined;
  },

  playerView: ({ G, playerID }) => viewFor(G, playerID === null || playerID === undefined ? null : Number(playerID)),

  turn: { activePlayers: ActivePlayers.ALL },

  moves: {
    declareReservation: serverMove(({ G, playerID, random }, reservation: Reservation) =>
      valid(declareReservation(G, Number(playerID), reservation, (items) => random.Shuffle(items))),
    ),
    playCard: serverMove(({ G, playerID }, cardId: string) => valid(playCard(G, Number(playerID), cardId))),
    announce: serverMove(({ G, playerID }, level: AnnouncementLevel) => valid(announce(G, Number(playerID), level))),
    ready: serverMove(({ G, playerID, random }) =>
      valid(setReady(G, Number(playerID), (items) => random.Shuffle(items))),
    ),
  },

  endIf({ G }) {
    if (G.stage !== "gameEnd") return undefined;
    const best = Math.max(...G.scores);
    return { scores: G.scores, winners: G.scores.flatMap((s, i) => (s === best ? [String(i)] : [])) };
  },
};
