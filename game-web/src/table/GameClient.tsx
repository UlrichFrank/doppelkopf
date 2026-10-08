import { useEffect, useMemo, useState } from "react";
import { Client } from "boardgame.io/client";
import { SocketIO } from "boardgame.io/multiplayer";
import { Doppelkopf } from "shared";
import type { AnnouncementLevel, DoppelkopfState, Reservation } from "shared";
import { BACKEND_URL } from "../backend";
import type { Session } from "../lobby/session";
import { Table } from "./Table";

export interface Moves {
  declareReservation(r: Reservation): void;
  playCard(cardId: string): void;
  announce(level: AnnouncementLevel): void;
  ready(): void;
}

export interface GameView {
  G: DoppelkopfState;
  gameover: boolean;
  names: string[];
  connected: boolean[];
  isConnected: boolean;
}

interface Props {
  session: Session;
  /** Leave for good (forget the seat). */
  onLeave: () => void;
  /** Back to the start screen, keeping the seat. */
  onPause: () => void;
}

export function GameClient({ session, onLeave, onPause }: Props) {
  const client = useMemo(
    () =>
      Client({
        game: Doppelkopf,
        multiplayer: SocketIO({ server: BACKEND_URL }),
        matchID: session.matchID,
        playerID: session.playerID,
        credentials: session.credentials,
        debug: false,
      }),
    [session],
  );
  const [view, setView] = useState<GameView | null>(null);

  useEffect(() => {
    client.start();
    const unsubscribe = client.subscribe((state) => {
      if (!state) return;
      const players = client.matchData ?? [];
      setView({
        G: state.G as DoppelkopfState,
        gameover: state.ctx.gameover !== undefined,
        names: [0, 1, 2, 3].map((i) => players.find((p) => p.id === i)?.name ?? `Platz ${i + 1}`),
        connected: [0, 1, 2, 3].map((i) => players.find((p) => p.id === i)?.isConnected !== false),
        isConnected: state.isConnected,
      });
    });
    return () => {
      unsubscribe();
      client.stop();
    };
  }, [client]);

  if (!view) {
    return <p className="p-8 text-center text-chalk/70">Verbinde mit dem Tisch …</p>;
  }
  return (
    <Table
      view={view}
      me={Number(session.playerID)}
      moves={client.moves as unknown as Moves}
      onLeave={onLeave}
      onPause={onPause}
    />
  );
}
