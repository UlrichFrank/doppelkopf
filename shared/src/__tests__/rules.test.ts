import { describe, expect, test } from "bun:test";
import { augen, createDeck } from "../game/cards";
import { isTrump, legalCards, sortHand, trickWinner } from "../game/rules";
import { c, cards } from "./helpers";

const trick = (codes: string) => cards(codes).map((card, seat) => ({ seat, card }));

describe("Kartensatz", () => {
  test("48 Karten, jede doppelt, 240 Augen", () => {
    const deck = createDeck(true);
    expect(deck).toHaveLength(48);
    expect(new Set(deck.map((d) => d.id)).size).toBe(48);
    expect(augen(deck)).toBe(240);
  });

  test("ohne Neunen: 40 Karten, 240 Augen", () => {
    const deck = createDeck(false);
    expect(deck).toHaveLength(40);
    expect(deck.some((d) => d.rank === "9")).toBe(false);
    expect(augen(deck)).toBe(240);
  });
});

describe("Stichvergabe Normalspiel", () => {
  test("Dulle schlägt Kreuz-Dame", () => {
    expect(trickWinner(trick("cD h10 sD dA"), "normal")).toBe(1);
  });

  test("zwei Dullen: die erste gewinnt (DDV)", () => {
    expect(trickWinner(trick("h10 cD h10 dA"), "normal")).toBe(0);
  });

  test("Hausregel: zweite Dulle schlägt die erste", () => {
    expect(trickWinner(trick("h10 cD h10 dA"), "normal", true)).toBe(2);
    expect(trickWinner(trick("h10 h10 h9 hK"), "damen", true)).toBe(0);
  });

  test("gleiche Karten: die erste gewinnt", () => {
    expect(trickWinner(trick("cD cD dA d10"), "normal")).toBe(0);
  });

  test("Fehl: höchste Karte der angespielten Farbe", () => {
    expect(trickWinner(trick("s9 sA hA s10"), "normal")).toBe(1);
  });

  test("Trumpf sticht Fehl", () => {
    expect(trickWinner(trick("sA d9 s10 sK"), "normal")).toBe(1);
  });

  test("abgeworfene fremde Farbe gewinnt nicht", () => {
    expect(trickWinner(trick("s9 cA hA sK"), "normal")).toBe(3);
  });

  test("Trumpfreihenfolge", () => {
    const order = cards("h10 cD sD hD dD cB sB hB dB dA d10 dK d9");
    expect(sortHand([...order].reverse(), "normal").map((x) => x.suit + x.rank)).toEqual(
      order.map((x) => x.suit + x.rank),
    );
  });

  test("Herz-Zehn ist kein Herz-Fehl", () => {
    expect(isTrump(c("h10"), "normal")).toBe(true);
    expect(legalCards(cards("h10 hK"), trick("hA"), "normal").map((x) => x.rank)).toEqual(["K"]);
  });
});

describe("Solos", () => {
  test("Damensolo: Buben sind Fehl", () => {
    expect(isTrump(c("sB"), "damen")).toBe(false);
    expect(isTrump(c("dD"), "damen")).toBe(true);
    expect(trickWinner(trick("cK sB cB c9"), "damen")).toBe(0);
    expect(trickWinner(trick("c9 cB cK dD"), "damen")).toBe(3);
  });

  test("Bubensolo: nur Buben Trumpf", () => {
    expect(isTrump(c("cD"), "buben")).toBe(false);
    expect(trickWinner(trick("cD cK dB cA"), "buben")).toBe(2);
  });

  test("Fleischloser: kein Trumpf, Ass vor Zehn vor König vor Dame", () => {
    expect(isTrump(c("h10"), "fleischlos")).toBe(false);
    expect(trickWinner(trick("hD hK h10 cA"), "fleischlos")).toBe(2);
  });

  test("Kreuz-Solo: Karo ist Fehl", () => {
    expect(isTrump(c("dA"), "kreuz")).toBe(false);
    expect(isTrump(c("c9"), "kreuz")).toBe(true);
    expect(trickWinner(trick("c9 dA"), "kreuz")).toBe(0);
  });

  test("Herz-Solo: Herz-Zehn bleibt Dulle", () => {
    expect(trickWinner(trick("hA h10 cD hK"), "herz")).toBe(1);
    expect(trickWinner(trick("hA hK h9 cB"), "herz")).toBe(3);
  });

  test("Damensolo: zwei Herz-Zehnen – die erste gewinnt (keine Dulle)", () => {
    expect(trickWinner(trick("h10 h10 h9 hK"), "damen")).toBe(0);
  });
});

describe("Bedienpflicht", () => {
  test("Fehl muss bedient werden", () => {
    const hand = cards("sK cA dA");
    expect(legalCards(hand, trick("sA"), "normal").map((x) => x.suit)).toEqual(["pik"]);
  });

  test("ohne passende Farbe ist alles erlaubt", () => {
    const hand = cards("cK cA dA");
    expect(legalCards(hand, trick("sA"), "normal")).toHaveLength(3);
  });

  test("Trumpf muss mit Trumpf bedient werden", () => {
    const hand = cards("sK cB hA");
    expect(legalCards(hand, trick("d9"), "normal").map((x) => x.rank)).toEqual(["B"]);
  });
});
