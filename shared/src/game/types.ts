/** Card suits, highest first in the usual German ordering (Kreuz, Pik, Herz, Karo). */
export type Suit = "kreuz" | "pik" | "herz" | "karo";
export type Rank = "9" | "10" | "B" | "D" | "K" | "A";

export interface Card {
  /** Unique within a deck, e.g. "herz-10-1" (every card exists twice). */
  id: string;
  suit: Suit;
  rank: Rank;
}

/** Seat index 0–3. Seats are boardgame.io player IDs as numbers. */
export type Seat = number;

export type SoloType = "damen" | "buben" | "fleischlos" | "karo" | "herz" | "pik" | "kreuz";

/** What a player declares before the first trick. */
export type Reservation = "gesund" | "hochzeit" | SoloType;

/**
 * The game type of a round. `stilleHochzeit`: a player with both Kreuz-Damen
 * said "gesund" and plays alone — publicly it looks like a normal game.
 */
export type GameType = "normal" | "hochzeit" | "stilleHochzeit" | SoloType;

export type Party = "re" | "kontra";

/**
 * Announcement level of a party: 0 nothing, 1 Re/Kontra, 2 keine 90,
 * 3 keine 60, 4 keine 30, 5 schwarz.
 */
export type AnnouncementLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type Stage = "reservations" | "playing" | "roundEnd" | "gameEnd";

export interface PlayedCard {
  seat: Seat;
  card: Card;
}

export interface Trick {
  leader: Seat;
  cards: PlayedCard[];
  /** Set once the trick is complete. */
  winner?: Seat;
}

export interface AnnouncementEntry {
  seat: Seat;
  party: Party;
  level: AnnouncementLevel;
  /** Number of completed tricks when the announcement was made. */
  afterTricks: number;
}

/** One line of the score breakdown, from the point of view of the winning party. */
export interface ScoreLine {
  label: string;
  /** Points for Re (negative = for Kontra). */
  re: number;
}

export interface RoundResult {
  roundNumber: number;
  gameType: GameType;
  /** Player playing alone (solo, stille Hochzeit, Hochzeit ohne Partner) or the Hochzeit player. */
  soloist: Seat | null;
  alone: boolean;
  parties: Party[];
  augen: Record<Party, number>;
  tricksWon: Record<Party, number>;
  announcements: Record<Party, AnnouncementLevel>;
  winner: Party | null;
  lines: ScoreLine[];
  /** Round value from Re's point of view (game points ± special points). */
  reValue: number;
  /** Points per seat; sums to 0. */
  points: number[];
}

export interface RoundState {
  number: number;
  dealer: Seat;
  /** Hands per seat. In a player's view, other hands are empty — see handCounts. */
  hands: Card[][];
  handCounts: number[];
  /**
   * Reservations per seat; null = not declared yet. In a player's view,
   * others' reservations other than "gesund" show as "vorbehalt" unless they
   * decided the game type.
   */
  reservations: (Reservation | "vorbehalt" | null)[];
  /** Seat that has to declare its reservation next (stage "reservations"). */
  reservationTurn: Seat | null;
  /** Null while reservations are open. */
  gameType: GameType | null;
  soloist: Seat | null;
  /** Party per seat; null = unknown to the viewer (or undecided in a Hochzeit). */
  parties: (Party | null)[];
  /** True when one player plays alone against three. */
  alone: boolean;
  /** Seats whose party is public knowledge. */
  revealed: boolean[];
  currentTrick: Trick;
  tricks: Trick[];
  /** Seat that has to play a card (stage "playing"). */
  toAct: Seat;
  announcements: Record<Party, AnnouncementLevel>;
  announcementLog: AnnouncementEntry[];
  /** Hochzeit: number of tricks played when the partner was determined; null before. */
  clarifiedAfterTricks: number | null;
  result: RoundResult | null;
}

export interface GameOptions {
  rounds: number;
  withNines: boolean;
}

export type NpcPersona = "hilde" | "knut" | "professor";

export interface NpcSlotConfig {
  seat: Seat;
  persona: NpcPersona;
}

export interface SetupData {
  rounds?: number;
  withNines?: boolean;
  npcSlots?: NpcSlotConfig[];
  /** Seats reserved for humans (for the lobby list). */
  humanSeats?: number;
}

export interface DoppelkopfState {
  options: GameOptions;
  stage: Stage;
  round: RoundState;
  /** Total points per seat. */
  scores: number[];
  history: RoundResult[];
  /** Stage "roundEnd": who pressed "Weiter". */
  ready: boolean[];
  npcSlots: NpcSlotConfig[];
}
