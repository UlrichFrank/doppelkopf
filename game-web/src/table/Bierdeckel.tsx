import type { DoppelkopfState } from "shared";

interface Props {
  G: DoppelkopfState;
  names: string[];
  me: number;
  onOpen: () => void;
}

/** The score, pencilled on a beer mat. Tap to see the round-by-round list. */
export function Bierdeckel({ G, names, me, onOpen }: Props) {
  return (
    <button
      onClick={onOpen}
      aria-label="Spielstand anzeigen"
      className="relative aspect-square w-[6.6rem] shrink-0 -rotate-6 rounded-full bg-coaster p-[0.42rem] text-pencil shadow-[0_6px_14px_rgb(0_0_0/0.45)] transition-transform hover:rotate-0 sm:w-32"
    >
      <span className="flex h-full w-full flex-col items-center justify-center rounded-full border-[3px] border-coaster-ring/80 font-hand leading-[1.05]">
        {names.map((n, i) => (
          <span key={i} className={`flex w-[70%] justify-between gap-1 text-[0.72rem] sm:text-sm ${i === me ? "font-bold" : ""}`}>
            <span className="truncate">{n}</span>
            <span>{G.scores[i]}</span>
          </span>
        ))}
      </span>
    </button>
  );
}

interface SheetProps {
  G: DoppelkopfState;
  names: string[];
  onClose: () => void;
}

/** All rounds, written down like on the back of the beer mat. */
export function ScoreSheet({ G, names, onClose }: SheetProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-auto rounded-2xl bg-coaster p-5 font-hand text-pencil shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">Spielstand</h2>
          <span>
            Runde {Math.min(G.round.number, G.options.rounds)} von {G.options.rounds}
          </span>
        </div>
        <table className="w-full text-center">
          <thead>
            <tr className="border-b-2 border-pencil/60">
              <th className="w-8" />
              {names.map((n, i) => (
                <th key={i} className="truncate px-1 font-bold">
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {G.history.map((r) => (
              <tr key={r.roundNumber} className="border-b border-pencil/20">
                <td className="text-left text-pencil/60">{r.roundNumber}</td>
                {r.points.map((p, i) => (
                  <td key={i} className={p > 0 ? "" : "text-pencil/55"}>
                    {p > 0 ? `+${p}` : p}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-pencil/70 text-lg font-bold">
              <td />
              {G.scores.map((s, i) => (
                <td key={i}>{s}</td>
              ))}
            </tr>
          </tbody>
        </table>
        {G.history.length === 0 && <p className="mt-3 text-center text-pencil/60">Noch keine Runde gespielt.</p>}
        <button onClick={onClose} className="mt-4 w-full rounded-lg bg-pencil py-2 font-sans font-bold text-coaster">
          Schließen
        </button>
      </div>
    </div>
  );
}
