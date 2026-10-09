import { useState } from "react";
import { allowedReservations } from "shared";
import type { Card, Reservation, RuleVariants } from "shared";
import { RESERVATION_LABEL } from "./labels";

const SOLOS: Reservation[] = ["damen", "buben", "fleischlos", "kreuz", "pik", "herz", "karo"];

interface Props {
  hand: Card[];
  variants: RuleVariants;
  onDeclare: (r: Reservation) => void;
}

export function ReservationPanel({ hand, variants, onDeclare }: Props) {
  const [solo, setSolo] = useState(false);
  const allowed = allowedReservations(hand, variants);
  return (
    <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl bg-wood-950/80 p-3 ring-1 ring-re/60">
      <span className="text-chalk/85">{solo ? "Welches Solo?" : "Bist du gesund?"}</span>
      {!solo ? (
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => onDeclare("gesund")} className="rounded-lg bg-re px-4 py-2 font-bold text-wood-950">
            Gesund
          </button>
          {allowed.includes("hochzeit") && (
            <button onClick={() => onDeclare("hochzeit")} className="rounded-lg bg-chalk px-4 py-2 font-bold text-wood-950">
              Hochzeit
            </button>
          )}
          {allowed.includes("schmeissen") && (
            <button
              onClick={() => onDeclare("schmeissen")}
              title="Fünf Neunen oder Könige: Karten hinwerfen, es wird neu gegeben"
              className="rounded-lg bg-chalk px-4 py-2 font-bold text-wood-950"
            >
              Schmeißen
            </button>
          )}
          <button onClick={() => setSolo(true)} className="rounded-lg bg-wood-700 px-4 py-2 font-bold text-chalk">
            Solo …
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-1.5">
          {SOLOS.map((s) => (
            <button key={s} onClick={() => onDeclare(s)} className="rounded-lg bg-chalk px-3 py-1.5 font-bold text-wood-950">
              {RESERVATION_LABEL[s]}
            </button>
          ))}
          <button onClick={() => setSolo(false)} className="rounded-lg px-3 py-1.5 text-chalk/75">
            Zurück
          </button>
        </div>
      )}
    </div>
  );
}
