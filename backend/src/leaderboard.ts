/**
 * Eternal leaderboard: every finished match is folded into a small JSON file
 * that outlives the match storage. Players are identified by display name.
 * `counted` remembers match IDs so repeated metadata writes of one finished
 * match are only counted once.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";

export interface LeaderboardEntry {
  name: string;
  games: number;
  wins: number;
  points: number;
  best: number;
}

interface LeaderboardFile {
  players: Record<string, LeaderboardEntry>;
  counted: string[];
}

export interface RankingRow {
  name: string;
  score: number;
}

const MAX_COUNTED = 5000;

export class Leaderboard {
  constructor(private readonly file: string) {}

  private load(): LeaderboardFile {
    try {
      if (!existsSync(this.file)) return { players: Object.create(null), counted: [] };
      const raw = JSON.parse(readFileSync(this.file, "utf-8")) as LeaderboardFile;
      // Names are player-chosen: keep them off Object.prototype ("__proto__" etc.)
      const players: Record<string, LeaderboardEntry> = Object.create(null);
      for (const [name, entry] of Object.entries(raw.players ?? {})) {
        if (name !== "__proto__") players[name] = entry;
      }
      return { players, counted: raw.counted ?? [] };
    } catch {
      return { players: Object.create(null), counted: [] };
    }
  }

  private save(data: LeaderboardFile): void {
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, this.file);
  }

  /** `ranking` is sorted best first; equal top scores all count as winners. */
  record(matchID: string, ranking: RankingRow[]): void {
    if (ranking.length < 2) return;
    try {
      const data = this.load();
      if (data.counted.includes(matchID)) return;
      const top = ranking[0]!.score;
      for (const row of ranking) {
        if (typeof row.name !== "string" || row.name === "__proto__") continue;
        const e = (data.players[row.name] ??= { name: row.name, games: 0, wins: 0, points: 0, best: 0 });
        e.games += 1;
        if (row.score === top) e.wins += 1;
        e.points += row.score;
        e.best = Math.max(e.best, row.score);
      }
      data.counted.push(matchID);
      if (data.counted.length > MAX_COUNTED) data.counted.splice(0, data.counted.length - MAX_COUNTED);
      this.save(data);
    } catch (err) {
      console.warn("[Leaderboard] Could not record match:", err);
    }
  }

  list(): LeaderboardEntry[] {
    return Object.values(this.load().players).sort(
      (a, b) => b.wins - a.wins || b.points / b.games - a.points / a.games || b.games - a.games,
    );
  }
}
