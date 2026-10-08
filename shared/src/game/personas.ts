import type { NpcPersona } from "./types";

/** NPC personalities offered in the lobby (behaviour: backend/src/bots/personas.ts). */
export const PERSONAS: { id: NpcPersona; name: string; description: string }[] = [
  { id: "hilde", name: "Hilde", description: "vorsichtig – sagt selten an, spielt kaum Solo" },
  { id: "knut", name: "Knut", description: "Draufgänger – sagt früh an, spielt gern Solo" },
  { id: "professor", name: "Professor", description: "Stratege – rechnet am gründlichsten" },
];

export function personaName(id: NpcPersona): string {
  return PERSONAS.find((p) => p.id === id)?.name ?? "Computer";
}
