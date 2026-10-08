import { describe, expect, test } from "bun:test";
import { Client } from "boardgame.io/client";
import { Doppelkopf } from "../game/game";
import { legalCards } from "../game/rules";
import type { DoppelkopfState } from "../game/types";

describe("boardgame.io-Spiel", () => {
  test("eine Partie (Standard: 8 Runden) läuft über die Client-API bis zum Ende", () => {
    const client = Client({ game: Doppelkopf, numPlayers: 4, });
    client.start();
    let guard = 0;
    while (!client.getState()!.ctx.gameover && guard++ < 1000) {
      // The unfiltered state: the local client is its own master
      const G = (client as unknown as { store: { getState(): { G: DoppelkopfState } } }).store.getState().G;
      if (G.stage === "reservations") {
        client.updatePlayerID(String(G.round.reservationTurn));
        client.moves.declareReservation("gesund");
      } else if (G.stage === "playing") {
        const seat = G.round.toAct;
        client.updatePlayerID(String(seat));
        const card = legalCards(G.round.hands[seat], G.round.currentTrick.cards, G.round.gameType!)[0];
        client.moves.playCard(card.id);
      } else if (G.stage === "roundEnd") {
        for (const s of [0, 1, 2, 3]) {
          client.updatePlayerID(String(s));
          client.moves.ready();
        }
      }
    }
    const { ctx, G } = client.getState()!;
    expect(ctx.gameover).toBeDefined();
    expect(G.history).toHaveLength(8);
    expect(G.scores.reduce((a: number, b: number) => a + b, 0)).toBe(0);
  });

  test("ungültige Karte wird abgelehnt", () => {
    const client = Client({ game: Doppelkopf, numPlayers: 4 });
    client.start();
    client.updatePlayerID("1");
    client.moves.declareReservation("gesund"); // not seat 1's turn
    const G = client.getState()!.G as DoppelkopfState;
    expect(G.round.reservations[1]).toBeNull();
  });
});
