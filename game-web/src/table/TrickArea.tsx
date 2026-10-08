import type { PlayedCard } from "shared";
import { CardView } from "../cards/Card";

/** Position of a card relative to the viewer: 0 bottom (me), 1 left, 2 top, 3 right. */
const SLOT: Record<number, { style: React.CSSProperties; from: [string, string] }> = {
  0: { style: { left: "50%", bottom: "0%", transform: "translateX(-50%) rotate(2deg)" }, from: ["0", "60px"] },
  1: { style: { left: "4%", top: "50%", transform: "translateY(-50%) rotate(-8deg)" }, from: ["-60px", "0"] },
  2: { style: { left: "50%", top: "0%", transform: "translateX(-50%) rotate(-3deg)" }, from: ["0", "-60px"] },
  3: { style: { right: "4%", top: "50%", transform: "translateY(-50%) rotate(7deg)" }, from: ["60px", "0"] },
};

interface Props {
  cards: PlayedCard[];
  me: number;
  /** Seat that won (completed trick) — its card is highlighted. */
  winner: number | null;
  message: string | null;
}

export function TrickArea({ cards, me, winner, message }: Props) {
  return (
    <div className="relative aspect-[1.15] w-full max-w-[22rem]">
      {cards.map(({ seat, card }) => {
        const rel = (seat - me + 4) % 4;
        const slot = SLOT[rel];
        return (
          <div
            key={card.id}
            className="absolute w-[29%]"
            style={{ ...slot.style, zIndex: cards.findIndex((c) => c.card.id === card.id) + 1 }}
          >
            <div
              className={`rounded-[9%] transition-shadow ${winner === seat ? "shadow-[0_0_0_3px_var(--color-re),0_8px_18px_rgb(0_0_0/0.5)]" : "shadow-[0_6px_14px_rgb(0_0_0/0.45)]"}`}
              style={{
                animation: "card-in 220ms ease-out",
                ["--from-x" as string]: slot.from[0],
                ["--from-y" as string]: slot.from[1],
              }}
            >
              <CardView card={card} />
            </div>
          </div>
        );
      })}
      {cards.length === 0 && message && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-lg text-chalk/75">{message}</div>
      )}
    </div>
  );
}
