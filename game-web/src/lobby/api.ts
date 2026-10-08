import { GAME_NAME } from "shared";
import type { NpcSlotConfig, SetupData } from "shared";
import { lobbyClient } from "../backend";

export interface MatchPlayer {
  id: number;
  name?: string;
  isConnected?: boolean;
}

export interface MatchInfo {
  matchID: string;
  players: MatchPlayer[];
  setupData?: SetupData;
  gameover?: unknown;
  createdAt: number;
}

export async function listOpenMatches(): Promise<MatchInfo[]> {
  const { matches } = await lobbyClient.listMatches(GAME_NAME, { isGameover: false });
  return (matches as unknown as MatchInfo[])
    .filter((m) => freeHumanSeat(m) !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getMatch(matchID: string): Promise<MatchInfo> {
  return (await lobbyClient.getMatch(GAME_NAME, matchID)) as unknown as MatchInfo;
}

export function npcSeats(match: MatchInfo): NpcSlotConfig[] {
  return match.setupData?.npcSlots ?? [];
}

/** First seat that is neither taken nor reserved for an NPC. */
export function freeHumanSeat(match: MatchInfo): number | null {
  const npc = new Set(npcSeats(match).map((s) => s.seat));
  const free = match.players.find((p) => p.name === undefined && !npc.has(p.id));
  return free ? free.id : null;
}

export async function createMatch(setupData: SetupData): Promise<string> {
  const { matchID } = await lobbyClient.createMatch(GAME_NAME, { numPlayers: 4, setupData });
  return matchID;
}

export async function joinMatch(matchID: string, playerID: string, playerName: string): Promise<string> {
  const { playerCredentials } = await lobbyClient.joinMatch(GAME_NAME, matchID, { playerID, playerName });
  return playerCredentials;
}

export async function leaveMatch(matchID: string, playerID: string, credentials: string): Promise<void> {
  await lobbyClient.leaveMatch(GAME_NAME, matchID, { playerID, credentials });
}

export function inviteLink(matchID: string): string {
  return `${window.location.origin}/?match=${encodeURIComponent(matchID)}`;
}
