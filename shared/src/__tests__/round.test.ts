import { describe, expect, test } from "bun:test";
import { possibleAnnouncements } from "../game/announcements";
import {
  allowedReservations,
  announce,
  declareReservation,
  initialState,
  pendingAction,
  playCard,
  setReady,
} from "../game/round";
import { backColor, backsOf } from "../game/cards";
import { legalCards } from "../game/rules";
import type { DoppelkopfState, Reservation } from "../game/types";
import { viewFor } from "../game/view";
import { find, noShuffle, stateWithHands } from "./helpers";

function reserve(G: DoppelkopfState, list: Reservation[]) {
  // Seat 0 is first (dealer 3)
  list.forEach((r, seat) => expect(declareReservation(G, seat, r)).toBeNull());
}

/** Plays the first legal card for whoever is to act. */
function playAny(G: DoppelkopfState) {
  const seat = G.round.toAct;
  const card = legalCards(G.round.hands[seat], G.round.currentTrick.cards, G.round.gameType!)[0];
  expect(playCard(G, seat, card.id)).toBeNull();
}

describe("Rückseiten", () => {
  test("je Karte eine rote und eine blaue Kopie, Zählung pro Hand", () => {
    const G = initialState({ rounds: 4, withNines: true }, [], noShuffle);
    const all = G.round.hands.flat();
    expect(all.filter((c) => backColor(c) === "rot")).toHaveLength(24);
    expect(all.filter((c) => backColor(c) === "blau")).toHaveLength(24);
    expect(G.round.handBacks).toEqual(G.round.hands.map(backsOf));
  });

  test("ausgespielte Karte verringert die Farbe ihrer Rückseite", () => {
    const G = initialState({ rounds: 4, withNines: false }, [], noShuffle);
    reserve(G, ["gesund", "gesund", "gesund", "gesund"]);
    const seat = G.round.toAct;
    const before = { ...G.round.handBacks![seat] };
    const card = legalCards(G.round.hands[seat], [], G.round.gameType!)[0];
    playCard(G, seat, card.id);
    const color = backColor(card)!;
    expect(G.round.handBacks![seat][color]).toBe(before[color] - 1);
    // Public: other players see the backs, not the cards
    const view = viewFor(G, (seat + 1) % 4).round;
    expect(view.hands[seat]).toEqual([]);
    expect(view.handBacks![seat]).toEqual(G.round.handBacks![seat]);
  });
});

describe("Geben", () => {
  test("12 Karten je Spieler, Seat 0 eröffnet", () => {
    const G = initialState({ rounds: 4, withNines: true }, [], noShuffle);
    expect(G.round.hands.map((h) => h.length)).toEqual([12, 12, 12, 12]);
    expect(G.round.reservationTurn).toBe(0);
  });

  test("ohne Neunen 10 Karten", () => {
    const G = initialState({ rounds: 4, withNines: false }, [], noShuffle);
    expect(G.round.hands.map((h) => h.length)).toEqual([10, 10, 10, 10]);
  });

  test("Geberwechsel nach der Runde", () => {
    const G = initialState({ rounds: 4, withNines: false }, [], noShuffle);
    reserve(G, ["gesund", "gesund", "gesund", "gesund"]);
    while (G.stage === "playing") playAny(G);
    expect(G.stage).toBe("roundEnd");
    for (const s of [0, 1, 2, 3]) expect(pendingAction(G, s)).toBe("ready");
    [0, 1, 2, 3].forEach((s) => setReady(G, s, noShuffle));
    expect(G.round.number).toBe(2);
    expect(G.round.dealer).toBe(0);
    expect(G.round.reservationTurn).toBe(1);
  });
});

describe("Vorbehalte", () => {
  test("Solo schlägt Hochzeit", () => {
    const G = stateWithHands([[], ["cD", "cD"]]);
    reserve(G, ["gesund", "hochzeit", "damen", "gesund"]);
    expect(G.round.gameType).toBe("damen");
    expect(G.round.soloist).toBe(2);
    expect(G.round.parties).toEqual(["kontra", "kontra", "re", "kontra"]);
    expect(G.round.toAct).toBe(2); // Solist kommt raus
  });

  test("erstes Solo in Reihenfolge gilt", () => {
    const G = stateWithHands([]);
    reserve(G, ["gesund", "kreuz", "damen", "gesund"]);
    expect(G.round.gameType).toBe("kreuz");
    expect(G.round.soloist).toBe(1);
  });

  test("Schmeißen nur als Hausregel und mit fünf Neunen oder Königen", () => {
    const G = stateWithHands([["c9", "c9", "s9", "s9", "h9"], ["cK", "cK", "sK", "sK"]]);
    expect(allowedReservations(G.round.hands[0], G.options)).not.toContain("schmeissen");
    expect(declareReservation(G, 0, "schmeissen", noShuffle)).not.toBeNull();
    G.options.schmeissen = true;
    expect(allowedReservations(G.round.hands[0], G.options)).toContain("schmeissen");
    expect(allowedReservations(G.round.hands[1], G.options)).not.toContain("schmeissen");
  });

  test("Schmeißen: gleicher Geber gibt neu, Runde zählt nicht", () => {
    const G = stateWithHands([["c9", "c9", "s9", "s9", "h9"]]);
    G.options.schmeissen = true;
    const thrownHand = G.round.hands[0];
    expect(declareReservation(G, 0, "schmeissen", noShuffle)).toBeNull();
    expect(G.stage).toBe("reservations");
    expect(G.round.number).toBe(1);
    expect(G.round.dealer).toBe(3);
    expect(G.round.reservationTurn).toBe(0);
    expect(G.round.thrown).toEqual({ seat: 0, hand: thrownHand });
    expect(G.round.hands.map((h) => h.length)).toEqual([12, 12, 12, 12]);
    // The thrown hand is public
    expect(viewFor(G, 2).round.thrown?.hand).toHaveLength(12);
  });

  test("Hochzeit nur mit beiden Kreuz-Damen", () => {
    const G = stateWithHands([["cD"], ["cD"]]);
    expect(declareReservation(G, 0, "hochzeit")).not.toBeNull();
  });

  test("Normalspiel: Kreuz-Damen sind Re", () => {
    const G = stateWithHands([["cD"], [], ["cD"]]);
    reserve(G, ["gesund", "gesund", "gesund", "gesund"]);
    expect(G.round.gameType).toBe("normal");
    expect(G.round.parties).toEqual(["re", "kontra", "re", "kontra"]);
  });

  test("stille Hochzeit: allein Re", () => {
    const G = stateWithHands([[], [], ["cD", "cD"]]);
    reserve(G, ["gesund", "gesund", "gesund", "gesund"]);
    expect(G.round.gameType).toBe("stilleHochzeit");
    expect(G.round.alone).toBe(true);
    expect(G.round.parties).toEqual(["kontra", "kontra", "re", "kontra"]);
    // Others see a normal game
    expect(viewFor(G, 0).round.gameType).toBe("normal");
    expect(viewFor(G, 2).round.gameType).toBe("stilleHochzeit");
  });
});

describe("Hochzeit", () => {
  test("Partner ist der erste fremde Stichgewinner", () => {
    // Seat 0: Hochzeit. Seat 0 leads h10 → wins trick 1. Then leads cD... seat 2 wins trick 2 with h10
    const G = stateWithHands([
      ["cD", "cD", "h10", "dA", "cA"],
      ["d9", "d9", "dK", "dK"],
      ["h10", "d10", "d10", "dA"],
      ["dB", "dB", "hB", "hB"],
    ]);
    reserve(G, ["hochzeit", "gesund", "gesund", "gesund"]);
    expect(G.round.gameType).toBe("hochzeit");
    expect(viewFor(G, 1).round.parties).toEqual(["re", null, null, null]);
    // Trick 1: 0 plays h10 and wins
    playCard(G, 0, find(G, 0, "h10").id);
    playCard(G, 1, find(G, 1, "d9").id);
    playCard(G, 2, find(G, 2, "d10").id);
    playCard(G, 3, find(G, 3, "dB").id);
    expect(G.round.tricks[0].winner).toBe(0);
    expect(G.round.clarifiedAfterTricks).toBeNull();
    // Announcements are not possible before clarification
    expect(announce(G, 0, 1)).not.toBeNull();
    // Trick 2: 0 leads dA, 2 takes with h10
    playCard(G, 0, find(G, 0, "dA").id);
    playCard(G, 1, find(G, 1, "d9").id);
    playCard(G, 2, find(G, 2, "h10").id);
    playCard(G, 3, find(G, 3, "dB").id);
    expect(G.round.tricks[1].winner).toBe(2);
    expect(G.round.clarifiedAfterTricks).toBe(2);
    expect(G.round.parties).toEqual(["re", "kontra", "re", "kontra"]);
    expect(G.round.alone).toBe(false);
    // Deadline shifted by two tricks: Re still possible with 9 cards (seat 2 holds 10)
    expect(possibleAnnouncements(G.round, 2, 12)).toContain(1);
  });

  test("Hochzeiter macht die ersten drei Stiche: allein", () => {
    const G = stateWithHands([["cD", "cD", "h10", "h10", "sD"], ["d9"], ["d9"], ["dK"]]);
    reserve(G, ["hochzeit", "gesund", "gesund", "gesund"]);
    for (const code of ["h10", "h10", "cD"]) {
      playCard(G, 0, find(G, 0, code).id);
      for (const s of [1, 2, 3]) {
        const card = legalCards(G.round.hands[s], G.round.currentTrick.cards, "hochzeit")[0];
        playCard(G, s, card.id);
      }
    }
    expect(G.round.tricks.map((t) => t.winner)).toEqual([0, 0, 0]);
    expect(G.round.alone).toBe(true);
    expect(G.round.parties).toEqual(["re", "kontra", "kontra", "kontra"]);
  });
});

describe("Ansagen", () => {
  function normalGame() {
    const G = stateWithHands([["cD"], [], ["cD"], []]);
    reserve(G, ["gesund", "gesund", "gesund", "gesund"]);
    return G;
  }

  test("Re mit 12 Karten, sichtbar für alle", () => {
    const G = normalGame();
    expect(announce(G, 0, 1)).toBeNull();
    expect(G.round.announcements.re).toBe(1);
    expect(viewFor(G, 1).round.parties[0]).toBe("re");
  });

  test("falsche Partei", () => {
    const G = normalGame();
    // seat 1 is Kontra: level 1 means "Kontra" for it — it can never announce for Re
    expect(announce(G, 1, 1)).toBeNull();
    expect(G.round.announcements.kontra).toBe(1);
    expect(G.round.announcements.re).toBe(0);
  });

  test("zu spät: Re mit 10 Karten", () => {
    const G = normalGame();
    G.round.handCounts[0] = 10;
    expect(announce(G, 0, 1)).not.toBeNull();
  });

  test("Erwiderung: Kontra mit 10 Karten nach Re", () => {
    const G = normalGame();
    announce(G, 0, 1);
    G.round.handCounts[1] = 10;
    expect(announce(G, 1, 1)).toBeNull();
  });

  test("direkte Absage keine 90 schließt Kontra ein", () => {
    const G = normalGame();
    G.round.handCounts[1] = 10;
    expect(announce(G, 1, 2)).toBeNull();
    expect(G.round.announcements.kontra).toBe(2);
    expect(announce(G, 1, 1)).not.toBeNull(); // already included
  });

  test("Ansage außerhalb der Reihe", () => {
    const G = normalGame();
    expect(G.round.toAct).toBe(0);
    expect(announce(G, 3, 1)).toBeNull();
  });
});

describe("verdeckte Information", () => {
  test("nur eigene Karten sichtbar", () => {
    const G = initialState({ rounds: 4, withNines: true }, [], noShuffle);
    const v = viewFor(G, 2);
    expect(v.round.hands[2]).toHaveLength(12);
    expect(v.round.hands[0]).toHaveLength(0);
    expect(v.round.handCounts).toEqual([12, 12, 12, 12]);
    expect(viewFor(G, null).round.hands.every((h) => h.length === 0)).toBe(true);
  });

  test("Vorbehalt verdeckt bis zur Auflösung", () => {
    const G = stateWithHands([]);
    declareReservation(G, 0, "damen");
    expect(viewFor(G, 2).round.reservations[0]).toBe("vorbehalt");
    expect(viewFor(G, 0).round.reservations[0]).toBe("damen");
  });

  test("Partner unbekannt, Kreuz-Dame verrät Re", () => {
    const G = stateWithHands([["cD", "sA"], ["s9"], ["cD"], ["s9"]]);
    reserve(G, ["gesund", "gesund", "gesund", "gesund"]);
    expect(viewFor(G, 1).round.parties).toEqual([null, "kontra", null, null]);
    expect(viewFor(G, 0).round.parties).toEqual(["re", null, null, null]);
    playCard(G, 0, find(G, 0, "cD").id);
    expect(viewFor(G, 1).round.parties[0]).toBe("re");
  });

  test("zwei bekannte Re: Rest ist Kontra", () => {
    const G = stateWithHands([["cD"], [], ["cD"], []]);
    reserve(G, ["gesund", "gesund", "gesund", "gesund"]);
    announce(G, 0, 1);
    expect(announce(G, 2, 1)).not.toBeNull(); // Re is already announced
    G.round.revealed[2] = true; // e.g. played a Kreuz-Dame
    expect(viewFor(G, 1).round.parties).toEqual(["re", "kontra", "re", "kontra"]);
  });
});

describe("ganze Partie", () => {
  test("Runden laufen bis zum Partieende, Punkte summieren sich zu 0", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const shuffle = <T,>(items: T[]) => {
      const a = [...items];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const G = initialState({ rounds: 8, withNines: true }, [], shuffle);
    while (G.stage !== "gameEnd") {
      if (G.stage === "reservations") declareReservation(G, G.round.reservationTurn!, "gesund");
      else if (G.stage === "playing") playAny(G);
      else [0, 1, 2, 3].forEach((s) => setReady(G, s, shuffle));
    }
    expect(G.history).toHaveLength(8);
    for (const r of G.history) {
      expect(r.augen.re + r.augen.kontra).toBe(240);
      expect(r.points.reduce((a, b) => a + b, 0)).toBe(0);
    }
    expect(G.scores.reduce((a, b) => a + b, 0)).toBe(0);
  });
});
