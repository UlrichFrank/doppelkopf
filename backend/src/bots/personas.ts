/**
 * Behaviour parameters per NPC personality (names and descriptions for the
 * lobby: shared/src/game/personas.ts).
 *
 *  - Hilde (vorsichtig): announces only when nearly sure, solo only with a
 *    clearly winning hand.
 *  - Knut (Draufgänger): announces early on a fair chance, plays solos as
 *    soon as they look better than a normal game.
 *  - Professor (Stratege): the most samples per decision; moderate risk.
 */
import type { NpcPersona } from "shared";

export interface PersonaParams {
  /** Sampled deals per card decision. */
  samples: number;
  /** Sampled deals per game type when deciding on a solo. */
  reservationSamples: number;
  /** Minimum share of rollouts in which an announcement of level 1–5 holds. Index 0 unused. */
  announce: [number, number, number, number, number, number];
  /** Minimum expected points of the solo for the soloist. */
  soloMin: number;
  /** Minimum advantage of the solo over a normal game (expected points). */
  soloMargin: number;
}

export const PERSONA_PARAMS: Record<NpcPersona, PersonaParams> = {
  hilde: {
    samples: 16,
    reservationSamples: 24,
    announce: [1, 0.88, 0.93, 0.97, 0.99, 1.01],
    soloMin: 6,
    soloMargin: 5,
  },
  knut: {
    samples: 16,
    reservationSamples: 24,
    announce: [1, 0.62, 0.75, 0.85, 0.93, 0.97],
    soloMin: 1,
    soloMargin: 0.5,
  },
  professor: {
    samples: 48,
    reservationSamples: 32,
    announce: [1, 0.75, 0.84, 0.92, 0.97, 0.99],
    soloMin: 3,
    soloMargin: 2,
  },
};
