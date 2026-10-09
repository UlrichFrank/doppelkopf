import { useCallback, useEffect, useState } from "react";
import type { NpcSlotConfig } from "shared";
import { createMatch, freeHumanSeat, getMatch, joinMatch, leaveMatch, type MatchInfo } from "./lobby/api";
import { loadName, loadSession, saveName, saveSession, type Session } from "./lobby/session";
import { StartScreen, type CreateOptions } from "./lobby/StartScreen";
import { WaitingRoom } from "./lobby/WaitingRoom";
import { GameClient } from "./table/GameClient";

const inviteFromUrl = () => new URLSearchParams(window.location.search).get("match");

function clearInviteFromUrl() {
  if (window.location.search) window.history.replaceState(null, "", "/");
}

export default function App() {
  const [name, setName] = useState(loadName);
  const [session, setSession] = useState<Session | null>(loadSession);
  /** Show the table for the saved session (false: start screen with "Zurück an den Tisch"). */
  const [atTable, setAtTable] = useState(() => loadSession() !== null);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [invite, setInvite] = useState<MatchInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeName = (n: string) => {
    setName(n);
    saveName(n);
  };

  const enter = useCallback((s: Session) => {
    saveSession(s);
    setSession(s);
    setAtTable(true);
    clearInviteFromUrl();
  }, []);

  const forget = useCallback(() => {
    saveSession(null);
    setSession(null);
    setAtTable(false);
    setMatch(null);
  }, []);

  // Invitation link: ?match=<id>
  useEffect(() => {
    const id = inviteFromUrl();
    if (!id) return;
    if (loadSession()?.matchID === id) {
      clearInviteFromUrl();
      return;
    }
    getMatch(id)
      .then((m) => {
        if (freeHumanSeat(m) === null) {
          setError("An diesem Tisch ist kein Platz mehr frei.");
          clearInviteFromUrl();
        } else {
          setInvite(m);
        }
      })
      .catch(() => {
        setError("Diesen Tisch gibt es nicht mehr.");
        clearInviteFromUrl();
      });
  }, []);

  // Poll the match while at the table until all seats are taken
  const tableFull = match !== null && match.players.every((p) => p.name !== undefined);
  useEffect(() => {
    if (!session || !atTable || tableFull) return;
    let stopped = false;
    const poll = async () => {
      try {
        const m = await getMatch(session.matchID);
        if (!stopped) setMatch(m);
      } catch {
        if (!stopped) {
          setError("Der Tisch existiert nicht mehr.");
          forget();
        }
      }
    };
    poll();
    const t = setInterval(poll, 1500);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [session, atTable, tableFull, forget]);

  const create = async (opts: CreateOptions) => {
    setBusy(true);
    setError(null);
    try {
      const npcSlots: NpcSlotConfig[] = opts.seats.flatMap((choice, i) =>
        choice === "mensch" ? [] : [{ seat: i + 1, persona: choice }],
      );
      const matchID = await createMatch({
        rounds: opts.rounds,
        withNines: opts.withNines,
        secondDulleWins: opts.secondDulleWins,
        schmeissen: opts.schmeissen,
        npcSlots,
      });
      const credentials = await joinMatch(matchID, "0", name.trim());
      setMatch(null);
      enter({ matchID, playerID: "0", credentials });
    } catch {
      setError("Der Tisch konnte nicht angelegt werden. Ist der Server erreichbar?");
    } finally {
      setBusy(false);
    }
  };

  const join = async (matchID: string) => {
    setBusy(true);
    setError(null);
    try {
      const m = await getMatch(matchID);
      const seat = freeHumanSeat(m);
      if (seat === null) throw new Error("full");
      const credentials = await joinMatch(matchID, String(seat), name.trim());
      setInvite(null);
      setMatch(null);
      enter({ matchID, playerID: String(seat), credentials });
    } catch {
      setError("Beitreten hat nicht geklappt – vielleicht ist der Platz inzwischen vergeben.");
    } finally {
      setBusy(false);
    }
  };

  const leaveWaiting = async () => {
    if (session) await leaveMatch(session.matchID, session.playerID, session.credentials).catch(() => {});
    forget();
  };

  if (session && atTable) {
    if (!tableFull) return <WaitingRoom match={match} playerID={session.playerID} onLeave={leaveWaiting} />;
    return <GameClient session={session} onLeave={forget} onPause={() => setAtTable(false)} />;
  }

  return (
    <>
      {invite && (
        <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center gap-3 px-4 sm:px-8">
          <div className="flex grow flex-wrap items-center gap-3 rounded-xl bg-re px-4 py-3 text-wood-950">
            <span className="grow font-bold">Du bist an den Tisch von {invite.players[0]?.name ?? "?"} eingeladen.</span>
            <button
              disabled={busy || name.trim() === ""}
              onClick={() => join(invite.matchID)}
              className="rounded-lg bg-wood-950 px-4 py-2 font-bold text-chalk disabled:opacity-50"
            >
              {name.trim() === "" ? "Erst Namen eingeben" : "Platz nehmen"}
            </button>
          </div>
        </div>
      )}
      <StartScreen
        name={name}
        onNameChange={changeName}
        onCreate={create}
        onJoin={join}
        resumeMatchID={session?.matchID ?? null}
        onResume={() => setAtTable(true)}
        onForget={forget}
        busy={busy}
        error={error}
      />
    </>
  );
}
