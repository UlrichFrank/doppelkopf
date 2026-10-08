import { GAME_TYPE_NAME } from "shared";
import type { DoppelkopfState, RoundResult } from "shared";
import { partyName } from "./labels";

interface Props {
  G: DoppelkopfState;
  result: RoundResult;
  names: string[];
  me: number;
  gameOver: boolean;
  onReady: () => void;
  onLeave: () => void;
}

function headline(r: RoundResult, names: string[]): string {
  if (r.winner === null) return "Keiner gewinnt";
  const winners = r.parties.flatMap((p, s) => (p === r.winner ? [names[s]] : []));
  const list = winners.length > 1 ? `${winners.slice(0, -1).join(", ")} und ${winners[winners.length - 1]}` : winners[0];
  return `${list} ${winners.length > 1 ? "gewinnen" : "gewinnt"}`;
}

export function RoundSummary({ G, result: r, names, me, gameOver, onReady, onLeave }: Props) {
  const iAmReady = G.ready[me];
  const waitingFor = names.filter((_, s) => !G.ready[s]);
  const ranking = [0, 1, 2, 3].sort((a, b) => G.scores[b] - G.scores[a]);
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-auto rounded-2xl bg-wood-900 p-5 shadow-2xl ring-1 ring-wood-500/50">
        <div className="text-chalk/65">
          Runde {r.roundNumber} von {G.options.rounds} – {GAME_TYPE_NAME[r.gameType]}
        </div>
        <h2 className="mt-1 text-3xl font-extrabold leading-tight">{headline(r, names)}</h2>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["re", "kontra"] as const).map((p) => (
            <div key={p} className={`rounded-xl px-3 py-2 ${p === "re" ? "bg-re/15 ring-1 ring-re/50" : "bg-kontra/15 ring-1 ring-kontra/50"}`}>
              <div className="flex items-baseline justify-between">
                <span className="font-bold">{partyName(p)}</span>
                <span className="text-2xl font-extrabold">{r.augen[p]}</span>
              </div>
              <div className="text-sm text-chalk/70">
                {r.parties.flatMap((x, s) => (x === p ? [names[s]] : [])).join(", ")}
              </div>
            </div>
          ))}
        </div>

        <ul className="mt-3 flex flex-col text-chalk/90">
          {r.lines.map((l, i) => (
            <li key={i} className="flex justify-between border-b border-wood-700/70 py-1">
              <span>{l.label}</span>
              <span className="tabular-nums">{signed(Math.abs(l.re))} {l.re >= 0 ? "Re" : "Kontra"}</span>
            </li>
          ))}
          {r.lines.length === 0 && <li className="py-1 text-chalk/60">Keine Punkte in dieser Runde.</li>}
        </ul>

        <table className="mt-4 w-full text-left">
          <thead className="text-sm text-chalk/60">
            <tr>
              <th className="font-normal">Spieler</th>
              <th className="text-right font-normal">Runde</th>
              <th className="text-right font-normal">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((s, i) => (
              <tr key={s} className={s === me ? "font-bold" : ""}>
                <td className="py-0.5">
                  {gameOver ? `${i + 1}. ` : ""}
                  {names[s]}
                </td>
                <td className="text-right tabular-nums">{signed(r.points[s])}</td>
                <td className="text-right tabular-nums">{G.scores[s]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {gameOver ? (
          <div className="mt-5 flex flex-col gap-2">
            <p className="text-center text-lg">
              Partie beendet – {names[ranking[0]]} liegt mit {G.scores[ranking[0]]} Punkten vorn.
            </p>
            <button onClick={onLeave} className="rounded-xl bg-re py-3 text-lg font-extrabold text-wood-950">
              Zurück zur Lobby
            </button>
          </div>
        ) : (
          <button
            onClick={onReady}
            disabled={iAmReady}
            className="mt-5 w-full rounded-xl bg-re py-3 text-lg font-extrabold text-wood-950 disabled:bg-wood-700 disabled:text-chalk/70"
          >
            {iAmReady ? `Warte auf ${waitingFor.join(", ")}` : "Weiter"}
          </button>
        )}
      </div>
    </div>
  );
}
