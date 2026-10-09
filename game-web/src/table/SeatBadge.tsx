import type { DoppelkopfState } from "shared";
import { backColorForRound } from "../cards/backColor";
import { OpponentHand } from "./OpponentHand";
import { partyName, RESERVATION_LABEL, seatAnnouncement } from "./labels";

interface Props {
  G: DoppelkopfState;
  seat: number;
  name: string;
  active: boolean;
  connected: boolean;
  /** Opponents: where they sit, for their hand of card backs. */
  hand?: "top" | "left" | "right";
  compact?: boolean;
}

export function SeatBadge({ G, seat, name, active, connected, hand, compact = false }: Props) {
  const r = G.round;
  const party = r.parties[seat];
  const reservation = r.gameType === null ? r.reservations[seat] : null;
  const announcement = seatAnnouncement(G, seat);
  const announced = Math.max(0, ...r.announcementLog.filter((a) => a.seat === seat).map((a) => a.level));
  const tricks = r.tricks.filter((t) => t.winner === seat).length;
  const count = r.handCounts[seat];

  return (
    <div className={`flex flex-col items-center gap-1.5 ${compact ? "max-w-[6.5rem]" : "max-w-[10rem]"}`}>
      <div
        className={`relative z-20 rounded-xl px-2.5 py-1 text-center ring-1 transition-shadow ${
          active ? "bg-re/20 ring-re [animation:pulse-ring_1.6s_ease-in-out_infinite]" : "bg-wood-950/60 ring-wood-500/40"
        } ${connected ? "" : "opacity-55"}`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <span className="max-w-[7.5rem] truncate font-bold leading-tight">{name}</span>
          {r.dealer === seat && (
            <span title="Geber" className="rounded bg-chalk/15 px-1 text-[0.7rem] leading-4 text-chalk/80">
              G
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 text-xs leading-4">
          {party && (
            <span
              title={announced >= 1 ? `${partyName(party)} angesagt` : undefined}
              className={`rounded px-1 font-bold text-wood-950 ${party === "re" ? "bg-re" : "bg-kontra"}`}
            >
              {partyName(party)}
              {announced >= 1 ? "!" : ""}
            </span>
          )}
          {announced >= 2 && <span className="rounded bg-chalk px-1 font-bold text-wood-950">{announcement}</span>}
          {reservation && <span className="text-chalk/80">{RESERVATION_LABEL[reservation]}</span>}
          {r.gameType !== null && <span className="text-chalk/55">{tricks} {tricks === 1 ? "Stich" : "Stiche"}</span>}
          {!connected && <span className="text-chalk/60">offline</span>}
        </div>
      </div>
      {hand && <OpponentHand count={count} side={hand} color={backColorForRound(r.number)} />}
    </div>
  );
}
