# Design

## Context

Das Repo ist leer bis auf OpenSpec. Vorlagen sind `~/dev/Ausgebremst` (Bun-Workspaces, `FileStorage`, Single Binary, Deploy per Makefile) und `~/dev/portale-von-molthar` (serverseitiger `BotRunner`, NPC-Persönlichkeiten). Auf dem vServer laufen beide als systemd-Dienste auf 172.18.0.1:3001/3002 hinter dem Traefik-Stack mit File-Provider; das Wildcard-DNS und -Zertifikat `*.apps.diefranks.eu` existieren bereits.

## Goals / Non-Goals

**Goals:**
- Regelkern in `shared/` als reine, gut testbare Funktionen ohne boardgame.io-Abhängigkeit.
- Server-autoritativ: Clients führen keine Züge optimistisch aus.
- Gleiche Betriebsform wie die Schwesterprojekte, damit Deploy/Rollback identisch funktionieren.

**Non-Goals:**
- Armut, Schmeißen, Pflichtsolo, Bockrunden, Schweinchen/Superschweinchen, „Zweite Dulle sticht erste außer im letzten Stich“ und weitere Hausregeln.
- Chat, Benutzerkonten, Ranglisten.
- Lokales Hot-Seat-Spiel mehrerer Menschen an einem Gerät.

## Decisions

### Monorepo wie Ausgebremst (Bun statt pnpm/Node)
`shared` (Regeln, Typen, boardgame.io-`Game`), `backend` (Server, BotRunner, Bots, Simulation), `game-web` (React). Bun für Install, Tests (`bun test`) und das Binary. Ausgebremst ist die jüngere und schlankere Vorlage; Molthars pnpm+Node+Vitest-Mischung bringt hier nichts.

### Zustandsmaschine in G statt boardgame.io-Phasen/-Turns
Doppelkopf erlaubt Aktionen außerhalb der Reihe (Ansagen jederzeit, „Weiter“ von allen). Daher: eine einzige boardgame.io-Phase mit `activePlayers: ALL`; `G.stage` (`reservations` | `playing` | `roundEnd`) und `G.toAct` bestimmen, wer was darf; jede Move-Funktion prüft das selbst. `endIf` beendet die Partie nach der letzten Runde. Alternative boardgame.io-Phasen/Stages: ansagen außerhalb der Reihe hätte Stages pro Spieler und ständiges Umschalten erfordert.

Alle Moves werden mit `client: false` registriert: Der Client hat nur die gefilterte Sicht und könnte Züge nicht korrekt vorausberechnen. Mischen über `random.Shuffle` (serverseitig, geseedet).

### Regelkern
`shared/src/game/`:
- `cards.ts`: Karten (`id` eindeutig, z. B. `H10a`), Augen, Deck-Erzeugung.
- `rules.ts`: Spielart → Trumpfreihenfolge/Fehlfarbe je Karte (`effectiveSuit`, `rank`), `legalCards`, `trickWinner`, Sortierung für die Anzeige.
- `announcements.ts`: Ansage-Stufen, Fristen, zulässige nächste Ansage.
- `scoring.ts`: Gewinnermittlung, Spielpunkte, Sonderpunkte, Punkte je Spieler (rein, mit ausführlicher Aufstellung für die Rundenübersicht).
- `round.ts`: Geben, Vorbehalte auflösen, Karte spielen, Hochzeit klären, Rundenende.
- `view.ts`: `playerView` – Hände und unbekannte Parteien entfernen, `knownParties` je Betrachter berechnen.
- `game.ts`: boardgame.io-`Game` (`name: "doppelkopf"`, 4 Spieler).

Spielarten: `normal`, `hochzeit`, `stilleHochzeit` (wie normal, Re allein), `solo-damen`, `solo-buben`, `solo-fleischlos`, `solo-karo|herz|pik|kreuz`. Der Rang einer Karte ist eine Zahl je Spielart; Trumpf hat Rang ≥ 100, Fehlfarbe darunter. Dulle-Sonderfall in `trickWinner`.

### Verdeckte Information
`playerView` ersetzt fremde `hand` durch `handCount`, entfernt `party` aller anderen außer bekannt gewordenen und zeigt fremde Vorbehalte nur als `vorbehalt: true`. „Bekannt“ wird aus öffentlichen Ereignissen abgeleitet (Ansagen, gespielte Kreuz-Damen, Spielart, Klärungsstich) und zusätzlich zwingend gefolgert (zwei gleiche bekannt → Rest gegnerisch). Im Stich gespielte Karten sind öffentlich.

### Computergegner wie Molthar
`backend/src/bot-runner.ts` übernimmt Molthars Muster: Lobby-Polling alle 3 s, `setupData.npcSlots` → Plätze joinen, Credentials in `NPC_DATA_DIR/credentials.json`, ein boardgame.io-Client je NPC, `think()` mit Verzögerung, Watchdog für abgelehnte/hängende Züge. Statt `ctx.currentPlayer` fragt er `pendingAction(G, playerID)` aus `shared` ab (was darf/muss dieser Platz gerade tun).

Bots (`backend/src/bots/`) arbeiten nur auf der gefilterten Sicht:
- `handStrength.ts`: Bewertung für Vorbehalt (Solo-Kandidaten je Spielart) und Ansagen.
- `heuristic.ts`: regelbasiertes Kartenspiel (Partner-/Gegnerstich, Schmieren, billigstes Gewinnen, Fuchs schützen, Fehl-Asse zuerst, als Re Trumpf ziehen).
- `montecarlo.ts`: Determinisierung – unbekannte Karten werden zufällig auf die Gegner verteilt, verträglich mit bekannten Fehlfarben-Lücken (Spieler hat nicht bedient) und Parteiwissen (Kreuz-Dame); jede Kandidatenkarte wird über N Stichproben mit heuristischen Rollouts bis Rundenende bewertet (erwartete Augendifferenz der eigenen Partei).
- `personas.ts`: Parameter je Persönlichkeit (Schwellen für Solo/Ansage, Stichprobenzahl, Zufallsanteil). Hilde: Heuristik + 12 Stichproben, hohe Schwellen; Knut: 12 Stichproben, niedrige Schwellen; Professor: 60 Stichproben, mittlere Schwellen.

Alternative: Bots direkt im Server-Prozess per `Master`-API ohne Socket-Clients. Verworfen, um nah an Molthar zu bleiben und den Bots zwingend nur die gefilterte Sicht zu geben.

### Simulation
`backend/src/simulation/` spielt komplette Runden headless direkt gegen den Regelkern (ohne Server), für Bot-Vergleich und als Regel-Invariantentest (240 Augen, Nullsumme, keine illegalen Züge).

### Frontend
React 19 + Vite + Tailwind 4. Karten als eigene SVG-Komponente (keine Bilddateien, scharf auf allen Auflösungen). Lobby-Zustandsmaschine wie Ausgebremst (`StartScreen` → `CreateForm`/`JoinList` → `WaitingRoom` → `GameClient`). Session in `localStorage` (`doppelkopf.session`). Einladungslink `/?match=<id>`. Layout mit CSS-Grid und `dvh`-Einheiten; Hand als überlappender Fächer, Überlappung aus Kartenzahl und Breite berechnet. Stichabschluss: Client zeigt `G.lastTrick` 1,5 s lang, solange `G.currentTrick` leer ist.

### PWA ohne Plugin
Handgeschriebenes `public/manifest.webmanifest` und `public/sw.js`: Navigation network-first mit Cache-Fallback, gehashte `/assets/*` cache-first, `/games/*` und `/socket.io/*` nie gecacht. Cache-Name enthält die Build-Version (Vite-Plugin ersetzt Platzhalter in `sw.js`), alte Caches werden bei `activate` gelöscht. Icons werden einmalig per Skript als PNG erzeugt und eingecheckt. `staticFiles.ts` liefert `sw.js` und `manifest.webmanifest` mit `no-cache` und korrektem Content-Type. Alternative `vite-plugin-pwa`: zusätzliche Abhängigkeit (Workbox) für wenig Mehrwert.

### Betrieb
Wie Ausgebremst: `FileStorage` (eine JSON-Datei, atomar, Flush bei SIGTERM, 7-Tage-Ablauf), `wsTextFrames`-Patch für Bun, `serveStatic` aus eingebetteten Assets, Unit `deploy/doppelkopf/doppelkopf.service` (HOST=172.18.0.1, PORT=3003, Härtung), Traefik-Datei `deploy/doppelkopf/traefik-doppelkopf.yml`, Makefile-Ziele `binary`, `deploy*`, `smoke`.

## Risks / Trade-offs

- [Regelfeinheiten der Gewinnermittlung mit beidseitigen Absagen] → Unit-Tests je Szenario aus der Spec; Aufstellung in der Rundenübersicht macht die Rechnung nachvollziehbar.
- [Monte-Carlo-Rechenzeit im Server-Prozess blockiert die Event-Loop] → Stichprobenzahl begrenzt, Rollouts sind billig (≤12 Stiche); gemessen in der Simulation (< 50 ms pro Entscheidung angestrebt).
- [Service Worker liefert nach Deploy alte Seite] → network-first für Navigation, versionierter Cache, `skipWaiting`/`clients.claim`.
- [Bun-WebSocket-Inkompatibilität von engine.io] → bewährter `wsTextFrames`-Patch aus den Schwesterprojekten.

## Migration Plan

Erstinstallation auf dem vServer: Systembenutzer `doppelkopf` und `/opt/doppelkopf` anlegen, dann `make deploy` (lädt Unit + Traefik-Datei, aktiviert den Dienst, prüft lokal und über Traefik). Rollback: `make deploy-rollback`. Der Traefik-File-Provider existiert bereits (von Ausgebremst eingerichtet).
