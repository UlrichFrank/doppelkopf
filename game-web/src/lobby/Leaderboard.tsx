import { useEffect, useState } from "react";
import { BACKEND_URL } from "../backend";

interface Entry {
  name: string;
  games: number;
  wins: number;
  points: number;
  best: number;
}

export function Leaderboard() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/leaderboard`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((list: Entry[]) => setEntries(list))
      .catch(() => setFailed(true));
  }, []);

  return (
    <section className="rounded-2xl bg-wood-950/55 p-5 ring-1 ring-wood-500/40 sm:p-6">
      <h2 className="text-2xl font-bold">Ewige Rangliste</h2>
      {failed && <p className="mt-3 text-chalk/65">Rangliste nicht erreichbar.</p>}
      {entries && entries.length === 0 && <p className="mt-3 text-chalk/65">Noch keine Spiele gewertet.</p>}
      {entries && entries.length > 0 && (
        <table className="mt-3 w-full text-sm">
          <thead className="text-chalk/60">
            <tr>
              <th className="text-left font-normal">#</th>
              <th className="text-left font-normal">Spieler</th>
              <th className="font-normal">Siege</th>
              <th className="font-normal">Spiele</th>
              <th className="font-normal">Ø Punkte</th>
              <th className="font-normal">Best</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 20).map((e, i) => (
              <tr key={e.name} className="text-center">
                <td className="text-left">{i + 1}</td>
                <td className="text-left">{e.name}</td>
                <td>{e.wins}</td>
                <td>{e.games}</td>
                <td>{(e.points / e.games).toFixed(1)}</td>
                <td>{e.best}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
