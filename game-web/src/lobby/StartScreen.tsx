import { useCallback, useEffect, useState } from "react";
import { PERSONAS, ROUND_CHOICES, personaName } from "shared";
import type { NpcPersona } from "shared";
import { SuitShape } from "../cards/Card";
import { listOpenMatches, npcSeats, type MatchInfo } from "./api";

export type SeatChoice = "mensch" | NpcPersona;

export interface CreateOptions {
  seats: SeatChoice[]; // seats 2–4
  rounds: number;
  withNines: boolean;
}

interface Props {
  name: string;
  onNameChange: (name: string) => void;
  onCreate: (options: CreateOptions) => Promise<void>;
  onJoin: (matchID: string) => Promise<void>;
  /** A saved seat in a running match on this device. */
  resumeMatchID: string | null;
  onResume: () => void;
  onForget: () => void;
  busy: boolean;
  error: string | null;
}

const CHOICES: { id: SeatChoice; label: string }[] = [
  { id: "mensch", label: "Mensch" },
  ...PERSONAS.map((p) => ({ id: p.id, label: p.name })),
];

export function StartScreen(props: Props) {
  const { name, onNameChange, busy, error } = props;
  const [seats, setSeats] = useState<SeatChoice[]>(["hilde", "knut", "professor"]);
  const [rounds, setRounds] = useState(8);
  const [withNines, setWithNines] = useState(true);
  const [matches, setMatches] = useState<MatchInfo[] | null>(null);
  const [listError, setListError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setMatches(await listOpenMatches());
      setListError(false);
    } catch {
      setListError(true);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const t = setInterval(refresh, 4000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [refresh]);

  const humans = 1 + seats.filter((s) => s === "mensch").length;
  const nameMissing = name.trim() === "";

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-8 px-4 pb-10 pt-[max(2rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-extrabold leading-none tracking-tight text-chalk sm:text-7xl">Doppelkopf</h1>
          <p className="mt-2 text-lg text-chalk/70">Zu viert am Tisch – mit Freunden oder gegen den Computer.</p>
        </div>
        <div className="hidden gap-1 sm:flex" aria-hidden>
          {(["kreuz", "pik", "herz", "karo"] as const).map((s) => (
            <svg key={s} viewBox="0 0 100 100" className="h-8 w-8" fill={s === "herz" || s === "karo" ? "#d9475b" : "#f3ead9"}>
              <SuitShape suit={s} />
            </svg>
          ))}
        </div>
      </header>

      <label className="flex max-w-md flex-col gap-1">
        <span className="text-chalk/80">Dein Name</span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value.slice(0, 20))}
          placeholder="z. B. Anna"
          autoComplete="nickname"
          className="rounded-lg border border-wood-500/60 bg-wood-950/60 px-3 py-2 text-lg text-chalk placeholder:text-chalk/35 focus:border-re focus:outline-none"
        />
      </label>

      {props.resumeMatchID && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-re/50 bg-re/10 px-4 py-3">
          <span className="grow">Du sitzt noch an einem Tisch.</span>
          <button onClick={props.onResume} className="rounded-lg bg-re px-4 py-2 font-bold text-wood-950">
            Zurück an den Tisch
          </button>
          <button onClick={props.onForget} className="rounded-lg px-3 py-2 text-chalk/70 underline-offset-2 hover:underline">
            Tisch vergessen
          </button>
        </div>
      )}

      {error && <p className="rounded-lg bg-card-red/20 px-4 py-2 text-chalk">{error}</p>}

      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl bg-wood-950/55 p-5 ring-1 ring-wood-500/40 sm:p-6">
          <h2 className="text-2xl font-bold">Neuer Tisch</h2>
          <p className="mt-1 text-chalk/65">Du sitzt auf Platz 1. Wer soll mitspielen?</p>

          <div className="mt-4 flex flex-col gap-3">
            {seats.map((choice, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-16 text-chalk/70">Platz {i + 2}</span>
                <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`Platz ${i + 2}`}>
                  {CHOICES.map((c) => (
                    <button
                      key={c.id}
                      role="radio"
                      aria-checked={choice === c.id}
                      onClick={() => setSeats(seats.map((s, j) => (j === i ? c.id : s)))}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        choice === c.id ? "bg-chalk font-bold text-wood-950" : "bg-wood-800 text-chalk/80 hover:bg-wood-700"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-chalk/55">
            {PERSONAS.map((p) => `${p.name}: ${p.description}`).join(". ")}.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="w-16 text-chalk/70">Runden</span>
            {ROUND_CHOICES.map((r) => (
              <button
                key={r}
                onClick={() => setRounds(r)}
                aria-pressed={rounds === r}
                className={`min-w-10 rounded-full px-3 py-1 text-sm ${rounds === r ? "bg-chalk font-bold text-wood-950" : "bg-wood-800 text-chalk/80 hover:bg-wood-700"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2 text-chalk/85">
            <input type="checkbox" checked={withNines} onChange={(e) => setWithNines(e.target.checked)} className="h-4 w-4 accent-re" />
            Mit Neunen (48 Karten)
          </label>

          <button
            disabled={busy || nameMissing}
            onClick={() => props.onCreate({ seats, rounds, withNines })}
            className="mt-6 w-full rounded-xl bg-re py-3 text-lg font-extrabold text-wood-950 shadow-[0_3px_0_#9b7522] transition active:translate-y-0.5 active:shadow-none disabled:opacity-40"
          >
            {humans === 1 ? "Spiel starten" : `Tisch für ${humans} Menschen öffnen`}
          </button>
          {nameMissing && <p className="mt-2 text-sm text-chalk/60">Gib zuerst deinen Namen ein.</p>}
        </section>

        <section className="flex flex-col">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-bold">Offene Tische</h2>
            <button onClick={refresh} className="text-sm text-chalk/60 hover:text-chalk">
              Aktualisieren
            </button>
          </div>
          {listError && <p className="mt-3 text-chalk/65">Der Server ist gerade nicht erreichbar.</p>}
          {matches && matches.length === 0 && !listError && (
            <p className="mt-3 text-chalk/65">Gerade wartet niemand. Öffne einen Tisch und schick den Einladungslink.</p>
          )}
          <ul className="mt-3 flex flex-col gap-2">
            {matches?.map((m) => (
              <li key={m.matchID} className="flex items-center gap-3 rounded-xl bg-wood-950/45 px-4 py-3 ring-1 ring-wood-500/30">
                <div className="grow">
                  <div className="font-bold">Tisch von {m.players[0]?.name ?? "?"}</div>
                  <div className="text-sm text-chalk/60">
                    {m.players
                      .map((p) => p.name ?? (npcSeats(m).find((s) => s.seat === p.id) ? personaName(npcSeats(m).find((s) => s.seat === p.id)!.persona) : "frei"))
                      .join(", ")}
                    {" – "}
                    {m.setupData?.rounds ?? 8} Runden{m.setupData?.withNines === false ? ", ohne Neunen" : ""}
                  </div>
                </div>
                <button
                  disabled={busy || nameMissing}
                  onClick={() => props.onJoin(m.matchID)}
                  className="rounded-lg bg-chalk px-4 py-2 font-bold text-wood-950 disabled:opacity-40"
                >
                  Mitspielen
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
