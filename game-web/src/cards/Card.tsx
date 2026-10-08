import type { Card as CardT, Rank, Suit } from "shared";
import { cardName } from "shared";

const RED: Record<Suit, boolean> = { herz: true, karo: true, kreuz: false, pik: false };

/** Suit shapes in a 100×100 box. */
export function SuitShape({ suit }: { suit: Suit }) {
  switch (suit) {
    case "herz":
      return <path d="M50 92C22 68 3 48 3 29 3 13 15 3 28 3c10 0 18 6 22 15C54 9 62 3 72 3c13 0 25 10 25 26 0 19-19 39-47 63z" />;
    case "karo":
      return <path d="M50 2 90 50 50 98 10 50z" />;
    case "pik":
      return (
        <path d="M50 3c11 19 46 35 46 59 0 15-11 24-24 24-8 0-15-3-19-9 1 10 5 16 13 21H34c8-5 12-11 13-21-4 6-11 9-19 9C15 86 4 77 4 62 4 38 39 22 50 3z" />
      );
    case "kreuz":
      return (
        <g>
          <circle cx="50" cy="27" r="21" />
          <circle cx="25" cy="58" r="21" />
          <circle cx="75" cy="58" r="21" />
          <path d="M45 50c0 22-5 36-14 48h38c-9-12-14-26-14-48z" />
        </g>
      );
  }
}

/** A suit symbol placed at (x, y) with width `size`, centred. */
function Pip({ suit, x, y, size, flip = false }: { suit: Suit; x: number; y: number; size: number; flip?: boolean }) {
  const s = size / 100;
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})${flip ? " rotate(180 50 50)" : ""}`}>
      <SuitShape suit={suit} />
    </g>
  );
}

// Pip layouts in the 60×90 card box (inner area x 14–46, y 14–76)
const PIPS: Partial<Record<Rank, [number, number][]>> = {
  "9": [
    [19, 20], [41, 20], [19, 38], [41, 38], [30, 45], [19, 52], [41, 52], [19, 70], [41, 70],
  ],
  "10": [
    [19, 20], [41, 20], [30, 29], [19, 38], [41, 38], [19, 52], [41, 52], [30, 61], [19, 70], [41, 70],
  ],
};

const RANK_LABEL: Record<Rank, string> = { A: "A", "10": "10", K: "K", D: "D", B: "B", "9": "9" };

function Corner({ card }: { card: CardT }) {
  return (
    <g>
      <text x="7.5" y="13" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="Alegreya Sans, sans-serif" letterSpacing={card.rank === "10" ? -1.2 : 0}>
        {RANK_LABEL[card.rank]}
      </text>
      <Pip suit={card.suit} x={7.5} y={20} size={7} />
    </g>
  );
}

function Court({ card }: { card: CardT }) {
  return (
    <g>
      <rect x="13" y="16" width="34" height="58" rx="3" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
      <rect x="15" y="18" width="30" height="54" rx="2" fill="currentColor" opacity="0.07" />
      <text x="30" y="52" textAnchor="middle" fontSize="30" fontWeight="800" fontFamily="Alegreya Sans, sans-serif">
        {card.rank}
      </text>
      <Pip suit={card.suit} x={30} y={63} size={9} />
      <Pip suit={card.suit} x={30} y={27} size={9} flip />
    </g>
  );
}

function Face({ card }: { card: CardT }) {
  if (card.rank === "A") return <Pip suit={card.suit} x={30} y={45} size={26} />;
  const pips = PIPS[card.rank];
  if (pips) return <>{pips.map(([x, y], i) => <Pip key={i} suit={card.suit} x={x} y={y} size={10} flip={y > 45} />)}</>;
  return <Court card={card} />;
}

interface CardProps {
  card: CardT;
  className?: string;
  dimmed?: boolean;
}

/** A playing card, sized by its container width (aspect 2:3). */
export function CardView({ card, className = "", dimmed = false }: CardProps) {
  const color = RED[card.suit] ? "var(--color-card-red)" : "var(--color-ink)";
  return (
    <svg
      viewBox="0 0 60 90"
      className={`block h-auto w-full select-none ${className}`}
      role="img"
      aria-label={cardName(card)}
      style={{ color, filter: dimmed ? "saturate(0.2) brightness(0.62)" : undefined }}
    >
      <rect x="0.5" y="0.5" width="59" height="89" rx="5" fill="var(--color-paper)" stroke="rgb(0 0 0 / 0.25)" strokeWidth="0.6" />
      <g fill="currentColor">
        <Corner card={card} />
        <g transform="rotate(180 30 45)">
          <Corner card={card} />
        </g>
        <Face card={card} />
      </g>
    </svg>
  );
}

/** Back of a card: oxblood with a fine lattice. */
export function CardBack({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 90" className={`block h-auto w-full ${className}`} aria-hidden>
      <defs>
        <pattern id="lattice" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0h6M0 0v6" stroke="rgb(255 230 200 / 0.28)" strokeWidth="0.7" />
        </pattern>
      </defs>
      <rect x="0.5" y="0.5" width="59" height="89" rx="5" fill="var(--color-paper)" stroke="rgb(0 0 0 / 0.3)" strokeWidth="0.6" />
      <rect x="3.5" y="3.5" width="53" height="83" rx="3" fill="#7a1f24" />
      <rect x="3.5" y="3.5" width="53" height="83" rx="3" fill="url(#lattice)" />
    </svg>
  );
}
