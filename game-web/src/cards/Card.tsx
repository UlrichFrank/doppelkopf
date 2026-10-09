import { useId } from "react";
import type { Card as CardT, Rank, Suit } from "shared";
import { backColor, cardName } from "shared";
import type { BackColor } from "shared";

/*
 * Classic French-suited deck in the style of the traditional Altenburg
 * Doppelkopf cards: indices in all four corners, pips in two columns,
 * double-headed court cards in red, blue and gold, and a finely patterned
 * back in red or blue.
 */

/** useId() contains characters that are awkward inside url(#…); keep it plain. */
const useSvgId = () => `c${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

const RED: Record<Suit, boolean> = { herz: true, karo: true, kreuz: false, pik: false };

const INK = "#16130f";
const PIP_RED = "#d10a1e";
const GOLD = "#e9b52f";
const BLUE = "#1f4fa3";
const COURT_RED = "#cf1f2a";
const SKIN = "#f7dcbc";

/** Suit shapes in a 100×100 box. */
export function SuitShape({ suit }: { suit: Suit }) {
  switch (suit) {
    case "herz":
      return <path d="M50 92C22 68 3 48 3 29 3 13 15 3 28 3c10 0 18 6 22 15C54 9 62 3 72 3c13 0 25 10 25 26 0 19-19 39-47 63z" />;
    case "karo":
      return <path d="M50 2C61 20 74 36 90 50 74 64 61 80 50 98 39 80 26 64 10 50 26 36 39 20 50 2z" />;
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

// Pip layouts in the 60×90 card box: two columns, a middle column for 9/10
const ROWS = [19, 36.3, 53.7, 71];
const COLUMNS = (ys: number[]) => ys.flatMap((y) => [[20, y] as [number, number], [40, y] as [number, number]]);
const PIPS: Partial<Record<Rank, [number, number][]>> = {
  "9": [...COLUMNS(ROWS), [30, 45]],
  "10": [...COLUMNS(ROWS), [30, 27.7], [30, 62.3]],
};

const RANK_LABEL: Record<Rank, string> = { A: "A", "10": "10", K: "K", D: "D", B: "B", "9": "9" };

/** Rank and small pip, top left; the card shows it in all four corners. */
function Index({ card }: { card: CardT }) {
  const ten = card.rank === "10";
  return (
    <g>
      <text
        x="6.6"
        y="11.6"
        textAnchor="middle"
        fontSize={ten ? 9.2 : 10.4}
        fontWeight="700"
        fontFamily="'Alegreya Sans', 'Arial Narrow', sans-serif"
        letterSpacing={ten ? -1 : 0}
      >
        {RANK_LABEL[card.rank]}
      </text>
      <Pip suit={card.suit} x={6.6} y={17.6} size={6.4} />
    </g>
  );
}

/** Top left, top right, and both bottom corners turned by 180°. */
const CORNERS = ["", "translate(46.8 0)", "rotate(180 30 45)", "rotate(180 30 45) translate(46.8 0)"];

// ── Court cards ─────────────────────────────────────────────────────────────

/** Robe colours per suit (main, panel), so the four Damen are easy to tell apart. */
const ROBES: Record<Suit, [string, string]> = {
  kreuz: [BLUE, GOLD],
  pik: [COURT_RED, BLUE],
  herz: [COURT_RED, GOLD],
  karo: [BLUE, COURT_RED],
};

const line = { stroke: INK, strokeWidth: 0.45, strokeLinejoin: "round" as const };

function Face({ beard, hair }: { beard: boolean; hair: string }) {
  return (
    <g>
      <rect x="28.6" y="27.5" width="4.8" height="5" fill={SKIN} {...line} />
      <ellipse cx="31" cy="24" rx="4.4" ry="5.2" fill={SKIN} {...line} />
      <circle cx="29.4" cy="23.4" r="0.45" fill={INK} />
      <circle cx="32.6" cy="23.4" r="0.45" fill={INK} />
      <path d="M28.6 22.2q.8-.6 1.6 0M31.8 22.2q.8-.6 1.6 0" fill="none" stroke={INK} strokeWidth="0.3" />
      <path d="M31 23.6l-.5 2h.9" fill="none" stroke={INK} strokeWidth="0.3" />
      {beard ? (
        <path d="M26.7 24.2q0 7.3 4.3 7.8 4.3-.5 4.3-7.8-1.3 3.4-2.4 3.4-.9-.8-1.9-.8t-1.9.8q-1.1 0-2.4-3.4z" fill={hair} {...line} />
      ) : (
        <path d="M30 27.3q1 .6 2 0" fill="none" stroke={COURT_RED} strokeWidth="0.45" />
      )}
    </g>
  );
}

/** Upper half of a court card (bust); drawn twice, the second time turned by 180°. */
function CourtHalf({ suit, rank }: { suit: Suit; rank: "K" | "D" | "B" }) {
  const [robe, panel] = ROBES[suit];
  return (
    <g>
      {/* Attribute behind the figure: sceptre, flower, halberd */}
      {rank === "K" && (
        <g>
          <path d="M42.5 47V22" stroke={INK} strokeWidth="1.5" />
          <path d="M42.5 47V22" stroke={GOLD} strokeWidth="0.9" />
          <circle cx="42.5" cy="20.6" r="1.7" fill={GOLD} {...line} />
          <path d="M42.5 17.6v1.4M41.8 18.3h1.4" stroke={INK} strokeWidth="0.4" />
        </g>
      )}
      {rank === "B" && (
        <g>
          <path d="M18.5 47V16" stroke={INK} strokeWidth="1.3" />
          <path d="M18.5 47V16" stroke="#8a5a2b" strokeWidth="0.7" />
          <path d="M18.5 11.5l1.3 4.5h-2.6z" fill="#cfd3d8" {...line} />
          <path d="M18.5 16.5c-3 0-4.4 1.6-4.4 4 1.5-1 2.8-1.3 4.4-1.3z" fill="#cfd3d8" {...line} />
        </g>
      )}

      {/* Hair behind the head */}
      {rank === "D" && <path d="M25.6 25q-.6-8.6 5.4-8.8 6 .2 5.4 8.8l1.2 7.5h-13.2z" fill="#d9a441" {...line} />}
      {rank === "K" && <path d="M26.3 25q-.2-7 4.7-7.2 4.9.2 4.7 7.2l.6 3.6h-10.6z" fill="#7a4a1f" {...line} />}
      {rank === "B" && <path d="M26.4 24.5q0-6 4.6-6.2 4.6.2 4.6 6.2l.3 2.3h-9.8z" fill="#5b3a1a" {...line} />}

      {/* Robe */}
      <path d="M14.5 50L16.6 38.3Q21 32.4 31 32.4T45.4 38.3L47.5 50z" fill={robe} {...line} />
      <path d="M26 33.2h10L38.2 50H23.8z" fill={panel} {...line} />
      <path d="M31 34v16" stroke={INK} strokeWidth="0.35" />
      <path d="M17.5 41.5q3.5-1.5 6.5-.5M44.5 41.5q-3.5-1.5-6.5-.5" fill="none" stroke={INK} strokeWidth="0.35" />
      {rank === "K" ? (
        // Ermine collar
        <g>
          <path d="M21.5 33.6Q31 40.5 40.5 33.6l.3 2.6Q31 43.2 21.2 36.2z" fill="#fffdf6" {...line} />
          {[24, 27.5, 31, 34.5, 38].map((x, i) => (
            <path key={x} d={`M${x} ${36.4 + (i === 2 ? 1.2 : i % 2 ? 0.8 : 0)}v1.2`} stroke={INK} strokeWidth="0.6" />
          ))}
        </g>
      ) : rank === "D" ? (
        <g>
          <path d="M23.5 33.4Q31 39.6 38.5 33.4" fill="none" stroke={GOLD} strokeWidth="1.4" />
          <circle cx="31" cy="37.2" r="1" fill={COURT_RED} {...line} />
        </g>
      ) : (
        <path d="M24.5 33.2L31 37.4 37.5 33.2l-.5 2.2L31 39.6 25 35.4z" fill="#fffdf6" {...line} />
      )}

      <Face beard={rank === "K"} hair="#7a4a1f" />

      {/* Headwear */}
      {rank === "K" && (
        <g>
          <path d="M25.6 19.6L25 13l2.5 2.6L29.3 12l1.7 3.4 1.7-3.4 1.8 3.6L37 13l-.6 6.6z" fill={GOLD} {...line} />
          <circle cx="31" cy="17.8" r="0.8" fill={COURT_RED} />
          <path d="M25.7 18.4h10.6" stroke={INK} strokeWidth="0.35" />
        </g>
      )}
      {rank === "D" && (
        <g>
          <path d="M26.6 19.3l.3-3.6 1.6 1.6 1.2-2.5 1.3 2.2 1.3-2.2 1.2 2.5 1.6-1.6.3 3.6z" fill={GOLD} {...line} />
          <circle cx="31" cy="17.6" r="0.6" fill={BLUE} />
        </g>
      )}
      {rank === "B" && (
        <g>
          <path d="M24.4 21.2Q24.8 14.6 31 14.6T37.8 20.4Q31 18.2 24.4 21.2z" fill={panel === GOLD ? COURT_RED : panel} {...line} />
          <path d="M35.6 16.2q4.5-4.2 7-2.4-3 .3-6 3.6z" fill="#fffdf6" {...line} />
        </g>
      )}

      {/* Hand holding the attribute */}
      {rank === "K" && <ellipse cx="42.5" cy="40.5" rx="1.9" ry="1.5" fill={SKIN} {...line} />}
      {rank === "B" && <ellipse cx="18.5" cy="40.5" rx="1.9" ry="1.5" fill={SKIN} {...line} />}
      {rank === "D" && (
        <g>
          <path d="M40 41.5q1-4 2.6-7.5" fill="none" stroke="#2f7a3a" strokeWidth="0.6" />
          <circle cx="42.8" cy="33" r="1.5" fill={COURT_RED} {...line} />
          <circle cx="42.8" cy="33" r="0.5" fill={GOLD} />
          <ellipse cx="40" cy="42" rx="1.9" ry="1.5" fill={SKIN} {...line} />
        </g>
      )}
    </g>
  );
}

const FRAME = { x: 11.5, y: 12.5, w: 37, h: 65 };
// Divider from left to right, slightly tilted like the printed cards
const DIVIDE: [number, number, number, number] = [FRAME.x, 47.6, FRAME.x + FRAME.w, 42.4];

function Court({ card }: { card: CardT }) {
  const clip = useSvgId();
  const rank = card.rank as "K" | "D" | "B";
  const [x1, y1, x2, y2] = DIVIDE;
  const half = (
    <g clipPath={`url(#${clip})`}>
      <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="#fffdf6" />
      <CourtHalf suit={card.suit} rank={rank} />
      <Pip suit={card.suit} x={FRAME.x + 4.6} y={FRAME.y + 5} size={5.6} />
    </g>
  );
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={`M${FRAME.x} ${FRAME.y}H${FRAME.x + FRAME.w}V${y2}L${x1} ${y1}z`} />
        </clipPath>
      </defs>
      {half}
      <g transform="rotate(180 30 45)">{half}</g>
      <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke={INK} strokeWidth="0.5" />
      <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} rx="1" fill="none" stroke={INK} strokeWidth="0.6" />
    </g>
  );
}

function Center({ card }: { card: CardT }) {
  if (card.rank === "A") {
    return (
      <g>
        <Pip suit={card.suit} x={30} y={45} size={27} />
      </g>
    );
  }
  const pips = PIPS[card.rank];
  if (pips) return <>{pips.map(([x, y], i) => <Pip key={i} suit={card.suit} x={x} y={y} size={11} flip={y > 45} />)}</>;
  return <Court card={card} />;
}

interface CardProps {
  card: CardT;
  className?: string;
  dimmed?: boolean;
}

/**
 * A playing card, sized by its container width (aspect 2:3). A small bar at
 * the bottom edge shows the colour of its back (every card exists once with
 * a red and once with a blue back).
 */
export function CardView({ card, className = "", dimmed = false }: CardProps) {
  const color = RED[card.suit] ? PIP_RED : INK;
  const back = backColor(card);
  return (
    <svg
      viewBox="0 0 60 90"
      className={`block h-auto w-full select-none ${className}`}
      role="img"
      aria-label={back ? `${cardName(card)}, ${back}e Rückseite` : cardName(card)}
      style={{ color, filter: dimmed ? "saturate(0.2) brightness(0.62)" : undefined }}
    >
      <rect x="0.4" y="0.4" width="59.2" height="89.2" rx="4.2" fill="#fffefa" stroke="rgb(0 0 0 / 0.3)" strokeWidth="0.6" />
      <g fill="currentColor">
        <Center card={card} />
        {CORNERS.map((t) => (
          <g key={t} transform={t || undefined}>
            <Index card={card} />
          </g>
        ))}
      </g>
      {back && <rect x="23" y="83" width="14" height="3.2" rx="1.6" fill={BACK_FILL[back]} />}
    </svg>
  );
}

const BACK_FILL: Record<BackColor, string> = { rot: "#b3192b", blau: "#1d3f8f" };

/** Back of a card: white border, fine rosette lattice in red or blue. */
export function CardBack({ color = "blau", className = "" }: { color?: BackColor; className?: string }) {
  const id = useSvgId();
  const fill = BACK_FILL[color];
  return (
    <svg viewBox="0 0 60 90" className={`block h-auto w-full ${className}`} aria-hidden>
      <defs>
        <pattern id={`${id}p`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45 30 45)">
          <rect width="5" height="5" fill={fill} />
          <path d="M0 0h5M0 0v5" stroke="#fff" strokeWidth="0.45" opacity="0.85" />
          <circle cx="2.5" cy="2.5" r="0.9" fill="none" stroke="#fff" strokeWidth="0.35" opacity="0.9" />
          <circle cx="2.5" cy="2.5" r="0.3" fill="#fff" />
        </pattern>
      </defs>
      <rect x="0.4" y="0.4" width="59.2" height="89.2" rx="4.2" fill="#fffefa" stroke="rgb(0 0 0 / 0.3)" strokeWidth="0.6" />
      <rect x="4" y="4" width="52" height="82" rx="2.2" fill={`url(#${id}p)`} />
      <rect x="5.4" y="5.4" width="49.2" height="79.2" rx="1.6" fill="none" stroke="#fff" strokeWidth="0.6" />
      {/* Medallion */}
      <ellipse cx="30" cy="45" rx="11" ry="15" fill={fill} stroke="#fff" strokeWidth="0.8" />
      <ellipse cx="30" cy="45" rx="8.6" ry="12.4" fill="none" stroke="#fff" strokeWidth="0.4" />
      <g fill="#fff" opacity="0.95">
        <path d="M30 35.5c1.8 3.6 4.6 6.6 7 9.5-2.4 2.9-5.2 5.9-7 9.5-1.8-3.6-4.6-6.6-7-9.5 2.4-2.9 5.2-5.9 7-9.5z" opacity="0.25" />
        <path d="M30 38.5c1.1 2.3 2.9 4.4 4.4 6.5-1.5 2.1-3.3 4.2-4.4 6.5-1.1-2.3-2.9-4.4-4.4-6.5 1.5-2.1 3.3-4.2 4.4-6.5z" />
      </g>
    </svg>
  );
}
