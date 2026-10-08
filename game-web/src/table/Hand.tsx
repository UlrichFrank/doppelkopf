import { useLayoutEffect, useRef, useState } from "react";
import type { Card } from "shared";
import { CardView } from "../cards/Card";

interface Props {
  cards: Card[];
  /** Ids of cards that may be played now; null when it is not our turn. */
  playable: Set<string> | null;
  onPlay: (card: Card) => void;
}

const MAX_CARD = 104;
const MIN_CARD = 54;

/**
 * The own hand as a fan of overlapping cards. Tap selects (the card rises),
 * a second tap — or a double click — plays it.
 */
export function Hand({ cards, playable, onPlay }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const [chosen, setChosen] = useState<string | null>(null);
  // Selection is only meaningful while the card is playable
  const selected = chosen !== null && playable?.has(chosen) ? chosen : null;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const n = Math.max(cards.length, 1);
  // Card width: as large as fits with a readable overlap, bounded by the viewport height
  const byHeight = Math.min(MAX_CARD, (window.innerHeight * 0.2) / 1.5);
  const cardW = Math.max(MIN_CARD, Math.min(byHeight, width / Math.max(4.2, n * 0.45)));
  const fullWidth = n * (cardW + 4);
  const step = fullWidth <= width ? cardW + 4 : (width - cardW) / Math.max(1, n - 1);

  const tap = (card: Card) => {
    if (!playable?.has(card.id)) return;
    if (selected === card.id) {
      setChosen(null);
      onPlay(card);
    } else {
      setChosen(card.id);
    }
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height: cardW * 1.5 + 16 }}>
      <div className="absolute inset-x-0 bottom-0 mx-auto" style={{ width: step * (n - 1) + cardW, height: cardW * 1.5 + 16 }}>
        {cards.map((card, i) => {
          const canPlay = playable?.has(card.id) ?? false;
          const isSelected = selected === card.id;
          return (
            <button
              key={card.id}
              onClick={() => tap(card)}
              onDoubleClick={() => canPlay && onPlay(card)}
              disabled={!canPlay}
              aria-pressed={isSelected}
              className="absolute bottom-0 rounded-[8%] transition-transform duration-150 ease-out focus-visible:outline-offset-[-2px] disabled:cursor-default"
              style={{
                left: i * step,
                width: cardW,
                transform: isSelected ? "translateY(-18px)" : canPlay ? "translateY(-4px)" : undefined,
                filter: "drop-shadow(-2px 2px 3px rgb(0 0 0 / 0.35))",
              }}
            >
              <CardView card={card} dimmed={playable !== null && !canPlay} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
