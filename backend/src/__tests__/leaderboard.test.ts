import { expect, test } from "bun:test";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Leaderboard } from "../leaderboard";

const fresh = () => new Leaderboard(join(mkdtempSync(join(tmpdir(), "lb-")), "lb.json"));

test("counts a match once and ranks by wins", () => {
  const lb = fresh();
  const rows = [
    { name: "Anna", score: 30 },
    { name: "Knut", score: -10 },
  ];
  lb.record("m1", rows);
  lb.record("m1", rows);
  const [first, second] = lb.list();
  expect(first).toMatchObject({ name: "Anna", games: 1, wins: 1, points: 30, best: 30 });
  expect(second).toMatchObject({ name: "Knut", games: 1, wins: 0 });
});

test("player-chosen names cannot touch the prototype", () => {
  const lb = fresh();
  lb.record("m1", [
    { name: "__proto__", score: 5 },
    { name: "constructor", score: 1 },
  ]);
  expect(({} as Record<string, unknown>).games).toBeUndefined();
  expect(lb.list().map((e) => e.name)).toEqual(["constructor"]);
});
