import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";
import type { LogEntry, Server, State, StorageAPI } from "boardgame.io";
import { Sync } from "boardgame.io/internal";

/** Matches not updated for this long are dropped when the file is loaded. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const WRITE_DELAY_MS = 200;

interface Snapshot {
  state: Record<string, State>;
  initial: Record<string, State>;
  metadata: Record<string, Server.MatchData>;
  log: Record<string, LogEntry[]>;
}

/**
 * In-memory match storage that is mirrored to a JSON file, so running
 * matches survive a backend restart (and `bun --hot` reloads).
 * Behaves like boardgame.io's InMemory storage otherwise.
 */
export class FileStorage extends Sync {
  private state = new Map<string, State>();
  private initial = new Map<string, State>();
  private metadata = new Map<string, Server.MatchData>();
  private log = new Map<string, LogEntry[]>();
  private writeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly file: string) {
    super();
    this.load();
  }

  createMatch(matchID: string, opts: StorageAPI.CreateMatchOpts): void {
    this.initial.set(matchID, opts.initialState);
    this.state.set(matchID, opts.initialState);
    this.metadata.set(matchID, opts.metadata);
    this.scheduleWrite();
  }

  setMetadata(matchID: string, metadata: Server.MatchData): void {
    this.metadata.set(matchID, metadata);
    this.scheduleWrite();
  }

  setState(matchID: string, state: State, deltalog?: LogEntry[]): void {
    if (deltalog && deltalog.length > 0) {
      this.log.set(matchID, [...(this.log.get(matchID) ?? []), ...deltalog]);
    }
    this.state.set(matchID, state);
    this.scheduleWrite();
  }

  fetch<O extends StorageAPI.FetchOpts>(matchID: string, opts: O): StorageAPI.FetchResult<O> {
    const result: Partial<StorageAPI.FetchFields> = {};
    if (opts.state) result.state = this.state.get(matchID);
    if (opts.metadata) result.metadata = this.metadata.get(matchID);
    if (opts.log) result.log = this.log.get(matchID) ?? [];
    if (opts.initialState) result.initialState = this.initial.get(matchID);
    return result as StorageAPI.FetchResult<O>;
  }

  wipe(matchID: string): void {
    this.state.delete(matchID);
    this.initial.delete(matchID);
    this.metadata.delete(matchID);
    this.log.delete(matchID);
    this.scheduleWrite();
  }

  listMatches(opts?: StorageAPI.ListMatchesOpts): string[] {
    return [...this.metadata.entries()]
      .filter(([, metadata]) => {
        if (!opts) return true;
        if (opts.gameName !== undefined && metadata.gameName !== opts.gameName) return false;
        const where = opts.where;
        if (where?.isGameover !== undefined && (metadata.gameover !== undefined) !== where.isGameover) return false;
        if (where?.updatedBefore !== undefined && metadata.updatedAt >= where.updatedBefore) return false;
        if (where?.updatedAfter !== undefined && metadata.updatedAt <= where.updatedAfter) return false;
        return true;
      })
      .map(([matchID]) => matchID);
  }

  private load(): void {
    if (!existsSync(this.file)) return;
    try {
      const snapshot = JSON.parse(readFileSync(this.file, "utf8")) as Snapshot;
      const minUpdatedAt = Date.now() - MAX_AGE_MS;
      for (const [matchID, metadata] of Object.entries(snapshot.metadata)) {
        const state = snapshot.state[matchID];
        if (!state) continue;
        if (metadata.updatedAt < minUpdatedAt) continue;
        this.metadata.set(matchID, metadata);
        this.state.set(matchID, state);
        if (snapshot.initial[matchID]) this.initial.set(matchID, snapshot.initial[matchID]);
        if (snapshot.log[matchID]) this.log.set(matchID, snapshot.log[matchID]);
      }
    } catch (err) {
      console.error(`Could not load matches from ${this.file}:`, err);
    }
  }

  /** Writes pending changes right away (on shutdown, so no move is lost). */
  flush(): void {
    if (this.writeTimer === null) return;
    clearTimeout(this.writeTimer);
    this.writeTimer = null;
    this.write();
  }

  private scheduleWrite(): void {
    if (this.writeTimer !== null) return;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      this.write();
    }, WRITE_DELAY_MS);
  }

  private write(): void {
    const snapshot: Snapshot = {
      state: Object.fromEntries(this.state),
      initial: Object.fromEntries(this.initial),
      metadata: Object.fromEntries(this.metadata),
      log: Object.fromEntries(this.log),
    };
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      // Write to a temp file first so a crash never leaves a truncated file
      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, JSON.stringify(snapshot));
      renameSync(tmp, this.file);
    } catch (err) {
      console.error(`Could not save matches to ${this.file}:`, err);
    }
  }
}
