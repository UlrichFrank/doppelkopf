# Tasks

## 1. Monorepo-Gerüst

- [x] 1.1 Root `package.json` (Bun-Workspaces shared/backend/game-web), `tsconfig.base.json`, `.gitignore`, `.nvmrc`; `bun install` läuft fehlerfrei
- [x] 1.2 `shared`, `backend`, `game-web` mit package.json/tsconfig anlegen; `bun run type-check` in jedem Paket läuft

## 2. Regelkern (shared)

- [x] 2.1 `cards.ts`: Deck 48/40, Augen; Tests: Kartenzahl, 240 Augen
- [x] 2.2 `rules.ts`: Trumpf-/Fehlreihenfolgen aller Spielarten, `legalCards`, `trickWinner` inkl. Dulle, Handsortierung; Tests aus Spec `spielregeln`
- [x] 2.3 `round.ts`: Geben, Vorbehalte inkl. Priorität und stiller Hochzeit, Karte spielen, Hochzeit-Klärung, Rundenende; Tests für Vorbehalte und Hochzeit
- [x] 2.4 `announcements.ts`: Stufen, Fristen inkl. Erwiderung und Hochzeitsverschiebung, implizite Vorstufen; Tests aus Spec `ansagen`
- [x] 2.5 `scoring.ts`: Gewinnermittlung, Spielpunkte, Sonderpunkte, Solo-Faktor, Aufstellung; Tests aus Spec `abrechnung`
- [x] 2.6 `view.ts`: playerView mit bekannten Parteien und verdeckten Vorbehalten; Tests aus Spec `verdeckte-information`
- [x] 2.7 `game.ts`: boardgame.io-Game (Moves `declareReservation`, `playCard`, `announce`, `ready`), Rundenfolge, Partieende; Test spielt eine Partie über die boardgame.io-Client-API lokal durch

## 3. Computergegner und Simulation (backend)

- [x] 3.1 `pendingAction` (shared) und Bot-Grundgerüst mit Personas; Test: Bot liefert in jeder Lage eine gültige Aktion
- [x] 3.2 Heuristisches Kartenspiel, Vorbehalt- und Ansageentscheidungen
- [x] 3.3 Monte-Carlo-Kartenwahl mit Determinisierung aus der gefilterten Sicht; Laufzeit pro Entscheidung gemessen
- [x] 3.4 Simulation (`bun run simulate`): Invarianten über viele Runden, Persona-Vergleich gegen Zufallsspieler; Test prüft Invarianten und Überlegenheit

## 4. Server (backend)

- [x] 4.1 `server.ts`, `fileStorage.ts`, `wsTextFrames.ts`, `staticFiles.ts`, `embedded/` nach Ausgebremst-Vorbild; Tests für Storage und Static
- [x] 4.2 `bot-runner.ts` nach Molthar-Vorbild auf Basis `pendingAction`; Smoke-Skript `scripts/smoke-game.ts` spielt Partie mit 4 NPCs gegen laufenden Server bis zum Ende

## 5. Frontend (game-web)

- [x] 5.1 Vite/React/Tailwind-Setup, Karten-SVG-Komponente
- [x] 5.2 Lobby: Startseite, Partie anlegen (Plätze Mensch/Persona, Runden, Neunen), Liste, Einladungslink, Warteraum, Session/Wiederverbinden
- [x] 5.3 Spieltisch: Plätze, Stich, Hand mit Auswahl/Spielen, Vorbehaltsdialog, Ansageknopf, Stichabschluss, letzter Stich, Rundenübersicht, Endtabelle
- [x] 5.4 Responsives Layout für 360 px Hochformat, Querformat und Desktop; im Browser geprüft
- [x] 5.5 PWA: Manifest, Icons, Service Worker, iOS-Meta-Tags; Installierbarkeit im Browser geprüft

## 6. Build und Deploy

- [x] 6.1 Makefile (dev, build, test, binary, binary-local, smoke, deploy*), `gen-assets.ts`; `make binary-local` und Start des Binarys liefern Seite + API
- [x] 6.2 `deploy/doppelkopf/doppelkopf.service`, `traefik-doppelkopf.yml`, `deploy/README.md`, `CLAUDE.md`, `README.md`
- [x] 6.3 Erstinstallation auf dem vServer (Benutzer, Verzeichnis) und `make deploy`; `https://doppelkopf.apps.diefranks.eu` antwortet, Smoke-Test gegen Produktion läuft durch

## 7. Integration

- [x] 7.1 Ende-zu-Ende im Browser: ein Mensch gegen drei NPCs eine Runde spielen (Desktop und mobile Viewport), zwei Menschen über Einladungslink
