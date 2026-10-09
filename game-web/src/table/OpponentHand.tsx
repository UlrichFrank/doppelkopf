import { BACK_COLORS } from "shared";
import type { BackColor, Backs } from "shared";
import { CardBack } from "../cards/Card";

interface Props {
  count: number;
  /** Red and blue backs in this hand; null for matches stored before backs were tracked. */
  backs: Backs | null;
  /** Where the opponent sits: top cards lie horizontally, left/right ones vertically. */
  side: "top" | "left" | "right";
}

/** Overlap between neighbouring cards, as a share of the card width. */
const STEP = 0.26;
/** Card width; everything else is a multiple of it. */
const WIDTH = "clamp(2.2rem, min(5.2vw, 7.5vh), 4.25rem)";

/**
 * An opponent's hand as a fan of card backs — exactly as many as the player
 * still holds, red ones and blue ones as at the table, with the count below.
 */
export function OpponentHand({ count, backs, side }: Props) {
  if (count <= 0) return null;
  const colors: BackColor[] = backs ? BACK_COLORS.flatMap((c) => Array<BackColor>(backs[c]).fill(c)) : Array(count).fill("blau");
  const w = (k: number) => `calc(var(--w) * ${k})`;
  const span = 1 + STEP * (count - 1);
  const vertical = side !== "top";
  // Card turned by 90° keeps its layout box; shift it so the visual box lines up
  const turn = side === "left" ? 90 : side === "right" ? -90 : 180;

  const label = `${count} ${count === 1 ? "Karte" : "Karten"}${backs ? `: ${backs.rot} rot, ${backs.blau} blau` : ""}`;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        role="img"
        aria-label={label}
        className="relative shrink-0"
        style={{
          ["--w" as string]: WIDTH,
          width: vertical ? w(1.5) : w(span),
          height: vertical ? w(span) : w(1.5),
        }}
      >
        {Array.from({ length: count }, (_, i) => {
          const mid = (count - 1) / 2;
          const tilt = (i - mid) * 2.2;
          // Gentle arc: outer cards sit slightly lower
          const sag = ((i - mid) / Math.max(mid, 1)) ** 2 * 0.06;
          const pos = vertical
            ? { left: w(0.25 + (side === "left" ? -sag : sag)), top: w(STEP * i - 0.25) }
            : { left: w(STEP * i), top: w(sag) };
          return (
            <div
              key={i}
              className="absolute"
              style={{
                ...pos,
                width: w(1),
                transform: `rotate(${turn + (side === "right" ? -tilt : tilt)}deg)`,
                filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 0.45))",
              }}
            >
              <CardBack color={colors[i]} />
            </div>
          );
        })}
      </div>
      {backs && (
        <div className="text-[0.7rem] leading-3 text-chalk/70" aria-hidden>
          <span className="font-bold text-[#e25b6a]">{backs.rot} rot</span> ·{" "}
          <span className="font-bold text-[#7ea2e6]">{backs.blau} blau</span>
        </div>
      )}
    </div>
  );
}
