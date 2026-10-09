import { useEffect, useMemo, useState } from "react";
import { cardsPerPlayer, legalCards, possibleAnnouncements, sortHand } from "shared";
import type { Trick } from "shared";
import { CardView } from "../cards/Card";
import { RulesSheet } from "../rules/RulesSheet";
import { AnnounceButton } from "./AnnounceButton";
import { Bierdeckel, ScoreSheet } from "./Bierdeckel";
import type { GameView, Moves } from "./GameClient";
import { Hand } from "./Hand";
import { gameTitle } from "./labels";
import { ReservationPanel } from "./ReservationPanel";
import { RoundSummary } from "./RoundSummary";
import { SeatBadge } from "./SeatBadge";
import { TrickArea } from "./TrickArea";

interface Props {
  view: GameView;
  me: number;
  moves: Moves;
  onLeave: () => void;
  onPause: () => void;
}

/** How long a completed trick stays on the table before it is collected. */
const TRICK_LINGER_MS = 1600;

export function Table({ view, me, moves, onLeave, onPause }: Props) {
  const { G, names, connected } = view;
  const r = G.round;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  // A just-completed trick stays visible for a moment. Tracked by trick
  // count ("adjust state while rendering"): server updates bring new arrays.
  const [seen, setSeen] = useState({ round: r.number, tricks: r.tricks.length });
  const [lingerIdx, setLingerIdx] = useState<number | null>(null);
  if (seen.round !== r.number || seen.tricks !== r.tricks.length) {
    const grew = seen.round === r.number && r.tricks.length > seen.tricks;
    setSeen({ round: r.number, tricks: r.tricks.length });
    setLingerIdx(grew ? r.tricks.length - 1 : null);
  }
  useEffect(() => {
    if (lingerIdx === null) return undefined;
    const t = setTimeout(() => setLingerIdx(null), TRICK_LINGER_MS);
    return () => clearTimeout(t);
  }, [lingerIdx]);
  const lingering: Trick | null = lingerIdx !== null ? (r.tricks[lingerIdx] ?? null) : null;

  const shownTrick = r.currentTrick.cards.length > 0 || !lingering ? r.currentTrick : lingering;
  const hand = useMemo(() => sortHand(r.hands[me], r.gameType ?? "normal"), [r.hands, r.gameType, me]);
  const myTurn = G.stage === "playing" && r.toAct === me;
  const playable = useMemo(
    () => (myTurn ? new Set(legalCards(r.hands[me], r.currentTrick.cards, r.gameType!).map((c) => c.id)) : null),
    [myTurn, r.hands, r.currentTrick.cards, r.gameType, me],
  );
  const nextAnnouncement =
    G.stage === "playing" && r.parties[me] ? possibleAnnouncements(r, me, cardsPerPlayer(G.options.withNines))[0] : undefined;

  const activeSeat = G.stage === "reservations" ? r.reservationTurn : G.stage === "playing" ? r.toAct : null;
  const seatAt = (rel: number) => (me + rel) % 4;
  const nameOf = (s: number) => (s === me ? "Du" : names[s]);

  let message: string | null = null;
  if (G.stage === "reservations" && r.reservationTurn !== me && r.reservationTurn !== null) {
    message = `${names[r.reservationTurn]} überlegt …`;
  } else if (G.stage === "playing" && r.currentTrick.cards.length === 0 && !lingering) {
    message = myTurn ? "Du spielst aus." : `${names[r.toAct]} spielt aus.`;
  }

  const SIDE = { 1: "left", 2: "top", 3: "right" } as const;
  const seat = (rel: 1 | 2 | 3) => {
    const s = seatAt(rel);
    return (
      <SeatBadge
        G={G}
        seat={s}
        name={names[s]}
        active={activeSeat === s}
        connected={connected[s]}
        hand={SIDE[rel]}
        compact={rel !== 2}
      />
    );
  };

  const result = r.result;
  const lastTrick = r.tricks[r.tricks.length - 1];

  return (
    <div className="grid h-dvh grid-rows-[auto_1fr_auto] overflow-hidden pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {/* Top bar */}
      <header className="flex items-start justify-between gap-2 px-3 pt-2 sm:px-5">
        <div className="flex min-w-0 flex-col items-start">
          <button onClick={() => setMenuOpen(!menuOpen)} className="max-w-full text-left" aria-expanded={menuOpen}>
            <div className="text-sm text-chalk/60">
              Runde {r.number} von {G.options.rounds}
            </div>
            <div className="truncate text-xl font-extrabold leading-tight sm:text-2xl">{gameTitle(G, names)}</div>
          </button>
          {menuOpen && (
            <div className="absolute z-20 mt-2 flex flex-col gap-1 rounded-xl bg-wood-950 p-2 shadow-xl ring-1 ring-wood-500/50">
              <button
                onClick={() => {
                  setRulesOpen(true);
                  setMenuOpen(false);
                }}
                className="rounded-lg px-3 py-2 text-left hover:bg-wood-800"
              >
                Spielregeln
              </button>
              <button onClick={onPause} className="rounded-lg px-3 py-2 text-left hover:bg-wood-800">
                Zur Lobby (Platz behalten)
              </button>
              <a href="https://apps.diefranks.eu/#doppelkopf" className="rounded-lg px-3 py-2 text-left hover:bg-wood-800">
                Zur Spielothek (Platz behalten)
              </a>
              <button
                onClick={() => {
                  if (window.confirm("Tisch wirklich verlassen? Du kannst danach nicht zurück.")) onLeave();
                }}
                className="rounded-lg px-3 py-2 text-left text-chalk/75 hover:bg-wood-800"
              >
                Tisch verlassen
              </button>
            </div>
          )}
          {lastTrick && G.stage === "playing" && (
            <button onClick={() => setLastOpen(true)} className="mt-1 text-sm text-chalk/60 underline-offset-2 hover:underline">
              Letzter Stich
            </button>
          )}
        </div>
        <Bierdeckel G={G} names={names} me={me} onOpen={() => setSheetOpen(true)} />
      </header>

      {!view.isConnected && (
        <div className="absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded-full bg-card-red px-4 py-1 text-sm font-bold text-paper">
          Keine Verbindung – versuche es erneut …
        </div>
      )}

      {/* Table: opponents and trick */}
      <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)_minmax(0,1fr)] grid-rows-[auto_1fr] items-center px-1 sm:px-6">
        <div className="col-start-2 row-start-1 flex justify-center">{seat(2)}</div>
        <div className="col-start-1 row-start-2 flex justify-start">{seat(1)}</div>
        <div className="relative col-start-2 row-start-2 flex h-full min-h-0 items-center justify-center [container-type:size]">
          {G.stage === "reservations" && r.thrown && (
            <div className="absolute left-1/2 top-0 z-10 flex w-max max-w-full -translate-x-1/2 flex-col items-center gap-1 rounded-xl bg-wood-950/85 px-3 py-2 text-center ring-1 ring-wood-500/50">
              <span className="text-sm text-chalk/85">
                {nameOf(r.thrown.seat)} {r.thrown.seat === me ? "hast" : "hat"} geschmissen – neu gegeben.
              </span>
              <div className="flex">
                {sortHand(r.thrown.hand, "normal").map((c, i) => (
                  <div key={c.id} className="w-6 sm:w-7" style={{ marginLeft: i === 0 ? 0 : "-0.6rem" }}>
                    <CardView card={c} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {G.stage === "reservations" && r.reservationTurn === me ? (
            <ReservationPanel hand={r.hands[me]} variants={G.options} onDeclare={moves.declareReservation} />
          ) : (
            <TrickArea
              cards={shownTrick.cards}
              me={me}
              winner={shownTrick === lingering ? (lingering?.winner ?? null) : null}
              message={message}
            />
          )}
        </div>
        <div className="col-start-3 row-start-2 flex justify-end">{seat(3)}</div>
      </section>

      {/* Own seat and hand */}
      <footer className="flex flex-col items-center gap-1 px-2 pb-2 sm:px-6">
        <div className="flex items-center gap-3">
          <SeatBadge G={G} seat={me} name={nameOf(me)} active={activeSeat === me} connected />
          {nextAnnouncement !== undefined && r.parties[me] && (
            <AnnounceButton key={nextAnnouncement} party={r.parties[me]!} level={nextAnnouncement} onAnnounce={moves.announce} />
          )}
        </div>
        <Hand cards={hand} playable={playable} onPlay={(c) => moves.playCard(c.id)} />
      </footer>

      {lastOpen && lastTrick && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4" onClick={() => setLastOpen(false)}>
          <div className="rounded-2xl bg-wood-900 p-4 ring-1 ring-wood-500/50">
            <div className="mb-2 text-center text-chalk/75">Letzter Stich – {nameOf(lastTrick.winner!)} gewinnt</div>
            <div className="flex gap-2">
              {lastTrick.cards.map(({ seat: s, card }) => (
                <div key={card.id} className="w-16 sm:w-20">
                  <CardView card={card} />
                  <div className="mt-1 truncate text-center text-xs text-chalk/70">{nameOf(s)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {rulesOpen && <RulesSheet rules={G.options} onClose={() => setRulesOpen(false)} />}

      {sheetOpen && <ScoreSheet G={G} names={names} onClose={() => setSheetOpen(false)} />}

      {result && !lingering && (G.stage === "roundEnd" || G.stage === "gameEnd") && (
        <RoundSummary
          G={G}
          result={result}
          names={names}
          me={me}
          gameOver={G.stage === "gameEnd"}
          onReady={() => moves.ready()}
          onLeave={onLeave}
        />
      )}
    </div>
  );
}
