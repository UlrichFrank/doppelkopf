import { useState } from "react";
import { personaName } from "shared";
import { inviteLink, npcSeats, type MatchInfo } from "./api";

interface Props {
  match: MatchInfo | null;
  playerID: string;
  onLeave: () => void;
}

export function WaitingRoom({ match, playerID, onLeave }: Props) {
  const [copied, setCopied] = useState(false);
  if (!match) return <p className="p-8 text-center text-chalk/70">Tisch wird geladen …</p>;
  const link = inviteLink(match.matchID);
  const npc = npcSeats(match);

  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "Doppelkopf", text: "Spiel mit mir Doppelkopf!", url: link });
        return;
      } catch {
        /* cancelled — fall back to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Einladungslink", link);
    }
  };

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col gap-6 px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <h1 className="text-4xl font-extrabold">Warten auf Mitspieler</h1>
      <p className="text-chalk/70">Das Spiel beginnt, sobald alle Plätze besetzt sind.</p>
      <ol className="flex flex-col gap-2">
        {match.players.map((p) => {
          const bot = npc.find((s) => s.seat === p.id);
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-xl bg-wood-950/50 px-4 py-3 ring-1 ring-wood-500/30">
              <span className="w-16 text-chalk/60">Platz {p.id + 1}</span>
              <span className={`grow font-bold ${p.name ? "" : "text-chalk/45"}`}>
                {p.name ?? (bot ? personaName(bot.persona) : "frei")}
                {String(p.id) === playerID && <span className="font-normal text-chalk/60"> (du)</span>}
              </span>
              <span className="text-sm text-chalk/55">{bot ? "Computer" : p.name ? "da" : "wartet"}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-wood-500 p-4">
        <span className="text-chalk/75">Schick diesen Link an deine Mitspieler:</span>
        <code className="break-all text-sm text-re">{link}</code>
        <button onClick={share} className="mt-1 self-start rounded-lg bg-re px-4 py-2 font-bold text-wood-950">
          {copied ? "Link kopiert" : "Einladung teilen"}
        </button>
      </div>
      <button onClick={onLeave} className="self-start text-chalk/65 underline-offset-2 hover:underline">
        Tisch verlassen
      </button>
    </main>
  );
}
