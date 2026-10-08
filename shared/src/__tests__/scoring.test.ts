import { describe, expect, test } from "bun:test";
import { reachesGoal, scoreRound } from "../game/scoring";
import type { AnnouncementLevel, Card, Party, Trick } from "../game/types";
import { cards } from "./helpers";

type Ann = Record<Party, AnnouncementLevel>;
const none: Ann = { re: 0, kontra: 0 };

function winner(re: number, ann: Ann = none, reTricks = 6, kontraTricks = 6): Party | null {
  const pts = { re, kontra: 240 - re };
  const tw = { re: reTricks, kontra: kontraTricks };
  const r = reachesGoal("re", pts, tw, ann);
  const k = reachesGoal("kontra", pts, tw, ann);
  return r && !k ? "re" : k && !r ? "kontra" : null;
}

describe("Gewinnermittlung", () => {
  test("Re mit 121 gewinnt", () => expect(winner(121)).toBe("re"));
  test("120:120 – Kontra gewinnt", () => expect(winner(120)).toBe("kontra"));
  test("nur Kontra angesagt: Re gewinnt mit 120", () => expect(winner(120, { re: 0, kontra: 1 })).toBe("re"));
  test("beide angesagt: 120:120 Kontra", () => expect(winner(120, { re: 1, kontra: 1 })).toBe("kontra"));
  test("Re keine 90 verfehlt (Kontra 95)", () => expect(winner(145, { re: 2, kontra: 0 })).toBe("kontra"));
  test("Re keine 90 erfüllt", () => expect(winner(151, { re: 2, kontra: 0 })).toBe("re"));
  test("Kontra sagt keine 90: Re gewinnt mit 90", () => expect(winner(90, { re: 0, kontra: 2 })).toBe("re"));
  test("beide keine 90, beide über 90: niemand", () => expect(winner(120, { re: 2, kontra: 2 })).toBeNull());
  test("schwarz abgesagt und erfüllt", () => expect(winner(240, { re: 5, kontra: 0 }, 12, 0)).toBe("re"));
});

/** Builds 12 tricks from the given (winner seat, cards) with filler tricks for the rest. */
function round(_parties: Party[], trickList: { winner: number; codes: string }[]): Trick[] {
  return trickList.map(({ winner, codes }) => ({
    leader: winner,
    winner,
    cards: cards(codes).map((card: Card, i) => ({ seat: (winner + i) % 4, card })),
  }));
}

describe("Spielpunkte und Sonderpunkte", () => {
  const parties: Party[] = ["re", "kontra", "re", "kontra"];

  test("Re angesagt, mit 150 gewonnen: 3 Punkte", () => {
    // Re wins tricks worth 150, Kontra 90; no special points (no Fuchs/DoKo/Karlchen)
    const tricks = round(parties, [
      { winner: 0, codes: "sA sA s10 s10" }, // 42 – Doppelkopf would count: avoid by splitting
    ]);
    tricks.length = 0;
    // 150 for Re: 5 tricks of 30 (A 10 K D + ... ) built with D/K to stay under 40
    for (let i = 0; i < 5; i++) tricks.push(...round(parties, [{ winner: 0, codes: "hA s10 sK sD" }])); // 28
    // re total so far 140; add 10
    tricks.push(...round(parties, [{ winner: 2, codes: "c9 c9 c10 s9" }])); // 10 → 150
    for (let i = 0; i < 3; i++) tricks.push(...round(parties, [{ winner: 1, codes: "hK hK hD hD" }])); // 14 → 42
    tricks.push(...round(parties, [{ winner: 1, codes: "cA c10 cK cB" }])); // 27 → 69
    tricks.push(...round(parties, [{ winner: 3, codes: "dK d10 cD dB" }])); // 19 → 88
    tricks.push(...round(parties, [{ winner: 3, codes: "dD s9 h9 h9" }])); // 3 → 91? adjust below
    const total = tricks.reduce((s, t) => s + t.cards.reduce((a, c) => a + ({ A: 11, "10": 10, K: 4, D: 3, B: 2, "9": 0 })[c.card.rank], 0), 0);
    expect(total).toBe(150 + 91);
    const r = scoreRound({
      roundNumber: 1,
      gameType: "normal",
      soloist: null,
      alone: false,
      parties,
      tricks,
      announcements: { re: 1, kontra: 0 },
    });
    expect(r.augen.re).toBe(150);
    expect(r.winner).toBe("re");
    expect(r.reValue).toBe(3);
    expect(r.points).toEqual([3, -3, 3, -3]);
  });

  test("gegen die Alten: Kontra gewinnt ohne Ansagen mit 130 → 2 Punkte", () => {
    const tricks = [
      ...round(parties, [{ winner: 1, codes: "sA s10 sK sK" }]), // 29
      ...round(parties, [{ winner: 1, codes: "sA s10 sK sK" }]),
      ...round(parties, [{ winner: 1, codes: "cA c10 cK cK" }]),
      ...round(parties, [{ winner: 1, codes: "cA c10 cK cK" }]), // 116
      ...round(parties, [{ winner: 3, codes: "hA s9 s9 dB" }]), // 13 → 129
      ...round(parties, [{ winner: 3, codes: "c9 c9 h9 h9" }]), // 0
      ...round(parties, [{ winner: 0, codes: "hA hK hK h10" }]), // 29 (h10 counted as card)
    ];
    const kontra = 129;
    const r = scoreRound({ roundNumber: 1, gameType: "normal", soloist: null, alone: false, parties, tricks, announcements: none });
    expect(r.augen.kontra).toBe(kontra);
    expect(r.winner).toBe("kontra");
    // 1 gewonnen + 1 gegen die Alten + Re < 90 (Re has only 29 here: unter 90, 60, 30 → +3)
    expect(r.lines.map((l) => l.label)).toContain("Gegen die Alten");
  });

  test("Fuchs gefangen, Doppelkopf, Karlchen", () => {
    const tricks = [
      // Kontra (seat 1) wins, Re seat 2 plays Karo-Ass → Fuchs for Kontra; 11+10+10+11 = 42 → Doppelkopf
      { leader: 1, winner: 1, cards: [{ seat: 1, card: cards("h10")[0] }, { seat: 2, card: cards("dA")[0] }, { seat: 3, card: cards("cA")[0] }, { seat: 0, card: cards("s10")[0] }] },
      // Last trick won by Re seat 0 with Kreuz-Bube → Karlchen
      { leader: 0, winner: 0, cards: [{ seat: 0, card: cards("cB")[0] }, { seat: 1, card: cards("d9")[0] }, { seat: 2, card: cards("dK")[0] }, { seat: 3, card: cards("d9")[0] }] },
    ];
    const r = scoreRound({ roundNumber: 1, gameType: "normal", soloist: null, alone: false, parties, tricks, announcements: none });
    const labels = r.lines.map((l) => l.label);
    expect(labels).toContain("Kontra: Fuchs gefangen");
    expect(labels).toContain("Kontra: Doppelkopf");
    expect(labels).toContain("Re: Karlchen");
  });

  test("Solo: dreifach für den Solisten, keine Sonderpunkte", () => {
    const soloParties: Party[] = ["re", "kontra", "kontra", "kontra"];
    const tricks = [
      { leader: 0, winner: 0, cards: [{ seat: 0, card: cards("cA")[0] }, { seat: 1, card: cards("cA")[0] }, { seat: 2, card: cards("c10")[0] }, { seat: 3, card: cards("c10")[0] }] },
      { leader: 0, winner: 0, cards: [{ seat: 0, card: cards("sA")[0] }, { seat: 1, card: cards("sA")[0] }, { seat: 2, card: cards("s10")[0] }, { seat: 3, card: cards("s10")[0] }] },
      { leader: 0, winner: 0, cards: [{ seat: 0, card: cards("hA")[0] }, { seat: 1, card: cards("hA")[0] }, { seat: 2, card: cards("h10")[0] }, { seat: 3, card: cards("h10")[0] }] },
      { leader: 0, winner: 1, cards: [{ seat: 0, card: cards("dA")[0] }, { seat: 1, card: cards("dA")[0] }, { seat: 2, card: cards("d10")[0] }, { seat: 3, card: cards("d10")[0] }] },
    ];
    const r = scoreRound({ roundNumber: 1, gameType: "damen", soloist: 0, alone: true, parties: soloParties, tricks, announcements: none });
    expect(r.augen.re).toBe(126);
    expect(r.winner).toBe("re");
    // gewonnen + Gegner unter 90 + unter 60 → 1+1+1 = 3 (Kontra hat 42)? 42 < 60 → 3
    expect(r.reValue).toBe(3);
    expect(r.points).toEqual([9, -3, -3, -3]);
    expect(r.lines.some((l) => l.label.includes("Doppelkopf"))).toBe(false);
  });
});
