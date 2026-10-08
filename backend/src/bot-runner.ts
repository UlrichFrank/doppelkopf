/**
 * BotRunner — seats and plays the NPCs of all matches (pattern from Portale
 * von Molthar).
 *
 * 1. On start and every few seconds the lobby is scanned for matches with
 *    `setupData.npcSlots`.
 * 2. For each NPC seat the runner joins the match (credentials are persisted
 *    so a restarted server can take its seats again) and starts a
 *    boardgame.io client — the bot sees exactly the filtered state a human
 *    on that seat would see.
 * 3. On every state change: if the seat has something to do, pause briefly,
 *    decide on the fresh state, dispatch.
 * 4. On game over the clients are stopped and the credentials dropped.
 */
import { Client, LobbyClient } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import { Doppelkopf, GAME_NAME, legalCards, pendingAction, personaName } from "shared";
import type { DoppelkopfState, NpcPersona, NpcSlotConfig } from "shared";
import { decide, type BotAction, type BotKind } from "./bots";

interface BotClient {
  matchID: string;
  seat: number;
  persona: NpcPersona;
  client: ReturnType<typeof Client>;
  unsubscribe: (() => void) | null;
  isThinking: boolean;
  thinkingSince: number | null;
  /** `_stateID` the last dispatched move was based on — used to spot rejections. */
  lastDispatchStateID: number | null;
  /** Consecutive moves the server refused. Resets as soon as one lands. */
  rejectedMoves: number;
  /**
   * Set when the client is stopped. A stopped client keeps its last state,
   * so a pending think() would otherwise retry a move forever.
   */
  stopped: boolean;
}

/** A bot "thinking" longer than this is wedged; the watchdog resets it. */
const MAX_THINKING_MS = 15000;
const SCAN_INTERVAL_MS = 3000;
const WATCHDOG_INTERVAL_MS = 3000;

/**
 * Bots pause before acting so play feels human. `NPC_THINK_FACTOR` scales
 * the pause — the smoke test sets it near zero to play whole games quickly.
 */
const THINK_FACTOR = Math.max(0, parseFloat(process.env.NPC_THINK_FACTOR ?? "1"));

function randomDelay(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * THINK_FACTOR);
}

interface ClientState {
  G: DoppelkopfState;
  ctx: { gameover?: unknown };
  _stateID: number;
}

export class BotRunner {
  private bots = new Map<string, BotClient>(); // key: matchID:seat
  private lobby: LobbyClient;
  private credentials: Record<string, string>;
  private finished = new Set<string>();
  private timers: ReturnType<typeof setInterval>[] = [];
  private scanFailing = false;
  /** A scan awaits joins; the next interval must not start a second one meanwhile. */
  private scanning = false;

  constructor(
    private readonly serverUrl: string,
    private readonly credentialsFile: string,
  ) {
    this.lobby = new LobbyClient({ server: serverUrl });
    this.credentials = this.loadCredentials();
  }

  async start(): Promise<void> {
    await this.scan();
    this.timers.push(setInterval(() => this.scan(), SCAN_INTERVAL_MS));
    this.timers.push(setInterval(() => this.watchdog(), WATCHDOG_INTERVAL_MS));
  }

  stop(): void {
    for (const t of this.timers) clearInterval(t);
    for (const bot of this.bots.values()) this.stopBot(bot);
    this.bots.clear();
  }

  /** Finds matches with NPC seats that have no running bot yet. */
  async scan(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    try {
      await this.scanOnce();
    } finally {
      this.scanning = false;
    }
  }

  private async scanOnce(): Promise<void> {
    let matches;
    try {
      ({ matches } = await this.lobby.listMatches(GAME_NAME));
      if (this.scanFailing) console.log("[BotRunner] Lobby scan recovered.");
      this.scanFailing = false;
    } catch (err) {
      if (!this.scanFailing) console.error("[BotRunner] Lobby scan failing — NPCs cannot join:", err);
      this.scanFailing = true;
      return;
    }
    for (const match of matches) {
      if (match.gameover !== undefined || this.finished.has(match.matchID)) continue;
      const slots = ((match.setupData as { npcSlots?: NpcSlotConfig[] } | undefined)?.npcSlots ?? []).filter(
        (s) => s.seat >= 1 && s.seat <= 3,
      );
      for (const slot of slots) {
        if (this.bots.has(`${match.matchID}:${slot.seat}`)) continue;
        const seatTaken = match.players.find((p) => p.id === slot.seat)?.name !== undefined;
        await this.attach(match.matchID, slot, seatTaken);
      }
    }
  }

  private async attach(matchID: string, slot: NpcSlotConfig, seatTaken: boolean): Promise<void> {
    const key = `${matchID}:${slot.seat}`;
    // A credential for a seat that is still empty is stale: join properly
    if (!seatTaken) delete this.credentials[key];
    let credentials = this.credentials[key];
    if (!credentials) {
      if (seatTaken) return; // someone else holds the seat and we have no credential
      try {
        const res = await this.lobby.joinMatch(GAME_NAME, matchID, {
          playerID: String(slot.seat),
          playerName: personaName(slot.persona),
        });
        credentials = res.playerCredentials;
        this.credentials[key] = credentials;
        this.saveCredentials();
      } catch (err) {
        console.warn(`[BotRunner] Could not join seat ${slot.seat} of ${matchID}, retrying:`, err);
        return;
      }
    }

    const client = Client({
      game: Doppelkopf,
      multiplayer: SocketIO({ server: this.serverUrl }),
      matchID,
      playerID: String(slot.seat),
      credentials,
      debug: false,
    });
    const bot: BotClient = {
      matchID,
      seat: slot.seat,
      persona: slot.persona,
      client,
      unsubscribe: null,
      isThinking: false,
      thinkingSince: null,
      lastDispatchStateID: null,
      rejectedMoves: 0,
      stopped: false,
    };
    this.bots.set(key, bot);
    client.start();
    bot.unsubscribe = client.subscribe(() => this.onStateChange(bot));
    console.log(`[BotRunner] ${personaName(slot.persona)} sits at seat ${slot.seat} of ${matchID}`);
  }

  private state(bot: BotClient): ClientState | null {
    return (bot.client.getState() as unknown as ClientState | null) ?? null;
  }

  /** All seats taken? Bots wait for the humans before acting. */
  private tableFull(bot: BotClient): boolean {
    const players = bot.client.matchData;
    return !players || players.every((p) => p.name !== undefined);
  }

  private onStateChange(bot: BotClient): void {
    if (bot.isThinking || bot.stopped) return;
    const state = this.state(bot);
    if (!state) return;
    if (state.ctx.gameover !== undefined) {
      this.finishMatch(bot.matchID);
      return;
    }
    if (!this.tableFull(bot)) return;
    const pending = pendingAction(state.G, bot.seat);
    if (!pending) return;
    if (bot.lastDispatchStateID !== null && state._stateID !== bot.lastDispatchStateID) bot.rejectedMoves = 0;

    const r = state.G.round;
    let delay: number;
    if (pending === "ready") delay = randomDelay(1500, 3000);
    else if (pending === "reservation") delay = randomDelay(700, 1400);
    // Leading a new trick: leave the completed one visible a moment
    else if (r.currentTrick.cards.length === 0 && r.tricks.length > 0) delay = randomDelay(1700, 2400);
    else delay = randomDelay(600, 1800);

    this.think(bot, delay);
  }

  private think(bot: BotClient, delayMs: number): void {
    bot.isThinking = true;
    bot.thinkingSince = Date.now();
    setTimeout(() => {
      try {
        if (bot.stopped) return;
        const state = this.state(bot);
        if (!state || state.ctx.gameover !== undefined) return;
        const action = this.decide(bot, state);
        if (!action) return;
        bot.lastDispatchStateID = state._stateID;
        const moves = bot.client.moves as Record<string, (...args: unknown[]) => void>;
        moves[action.move]?.(...action.args);
      } catch (err) {
        console.error(`[BotRunner] Seat ${bot.seat} in ${bot.matchID} threw:`, err);
      } finally {
        bot.isThinking = false;
        bot.thinkingSince = null;
        // The dispatch re-entered onStateChange while still thinking: look again
        setImmediate(() => this.onStateChange(bot));
      }
    }, delayMs);
  }

  private decide(bot: BotClient, state: ClientState): BotAction | null {
    const kind: BotKind = bot.rejectedMoves >= 3 ? "random" : bot.persona;
    if (bot.rejectedMoves >= 3) console.warn(`[BotRunner] Seat ${bot.seat} in ${bot.matchID}: moves refused, falling back`);
    const action = decide(state.G, bot.seat, kind);
    // After a refused announcement, just play
    if (action?.move === "announce" && bot.rejectedMoves > 0) {
      const r = state.G.round;
      const card = legalCards(r.hands[bot.seat], r.currentTrick.cards, r.gameType!)[0];
      return card ? { move: "playCard", args: [card.id] } : null;
    }
    return action;
  }

  /**
   * A refused move changes nothing, so no subscription fires and the bot
   * would sit on its turn forever. Re-trigger bots that still have something
   * to do; break a wedged "thinking" flag open.
   */
  private watchdog(): void {
    for (const bot of this.bots.values()) {
      const state = this.state(bot);
      if (!state || state.ctx.gameover !== undefined) continue;
      if (!pendingAction(state.G, bot.seat)) continue;
      if (bot.isThinking) {
        if (Date.now() - (bot.thinkingSince ?? Date.now()) < MAX_THINKING_MS) continue;
        bot.isThinking = false;
      }
      if (bot.lastDispatchStateID !== null && state._stateID === bot.lastDispatchStateID) bot.rejectedMoves++;
      this.onStateChange(bot);
    }
  }

  private finishMatch(matchID: string): void {
    for (const [key, bot] of this.bots) {
      if (bot.matchID !== matchID) continue;
      this.stopBot(bot);
      this.bots.delete(key);
      delete this.credentials[key];
    }
    this.finished.add(matchID);
    this.saveCredentials();
  }

  private stopBot(bot: BotClient): void {
    bot.stopped = true;
    bot.unsubscribe?.();
    try {
      bot.client.stop();
    } catch {
      /* already stopped */
    }
  }

  private loadCredentials(): Record<string, string> {
    try {
      if (existsSync(this.credentialsFile)) return JSON.parse(readFileSync(this.credentialsFile, "utf8"));
    } catch (err) {
      console.error(`[BotRunner] Could not read ${this.credentialsFile}:`, err);
    }
    return {};
  }

  private saveCredentials(): void {
    try {
      mkdirSync(dirname(this.credentialsFile), { recursive: true });
      writeFileSync(this.credentialsFile, JSON.stringify(this.credentials, null, 2));
    } catch (err) {
      console.error(`[BotRunner] Could not save ${this.credentialsFile}:`, err);
    }
  }
}
