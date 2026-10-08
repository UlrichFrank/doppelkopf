# Proposal

## Why

Neben Ausgebremst und den Portalen von Molthar soll auch Doppelkopf als Online-Spiel verfügbar sein: für Runden, in denen nicht vier Leute am Tisch sitzen, und zum Üben allein gegen Computergegner. Das Repo ist bisher leer; die Architektur der beiden Schwesterprojekte (boardgame.io, Single Binary hinter Traefik) ist erprobt und wird übernommen.

## What Changes

- Neues Bun-Monorepo `shared` / `backend` / `game-web` nach dem Vorbild von Ausgebremst.
- Vollständige Doppelkopf-Spiellogik nach den Turnierspielregeln des DDV (mit oder ohne Neunen): Geben, Vorbehalte (Hochzeit, Solos), Stichregeln inkl. Dulle, Ansagen/Absagen, Abrechnung mit Sonderpunkten, Partie über eine wählbare Anzahl Runden.
- Verdeckte Informationen: jeder Client sieht nur die eigenen Karten und nur die Parteizugehörigkeit, die im Spiel bereits bekannt geworden ist.
- Lobby: Partie anlegen mit 4 Plätzen, jeder Platz Mensch oder Computer (1–4 Menschen), Partie beitreten per Liste oder Einladungslink, Warteraum, Wiederverbinden nach Neuladen.
- Computergegner wie bei Molthar: serverseitiger BotRunner, der NPC-Plätze belegt und als eigene Clients spielt; drei Persönlichkeiten mit unterschiedlichem Risiko- und Ansageverhalten, Kartenspiel per Heuristik plus Monte-Carlo-Simulation.
- Spieltisch-Oberfläche für Desktop und Smartphone (Hoch- und Querformat), installierbar als PWA (Manifest, Service Worker, Icons).
- Produktion: Single Binary (`bun build --compile`) als systemd-Dienst `doppelkopf` hinter Traefik unter `https://doppelkopf.apps.diefranks.eu`, `make deploy` / `deploy-rollback` wie in den Schwesterprojekten.

## Capabilities

### New Capabilities
- `spielregeln`: Karten, Trumpfreihenfolgen je Spielart, Bedienpflicht, Stichvergabe, Vorbehalte (Hochzeit, Solos, stille Hochzeit), Parteien.
- `ansagen`: Re/Kontra und Absagen (keine 90/60/30, schwarz) mit Fristen.
- `abrechnung`: Gewinnermittlung, Spielpunkte, Sonderpunkte, Solo-Faktor, Partiestand über mehrere Runden.
- `verdeckte-information`: Was welcher Spieler vom Spielzustand sehen darf.
- `lobby`: Partien anlegen, Platzbelegung Mensch/Computer, beitreten, Einladungslink, Warteraum, Wiederverbinden.
- `computergegner`: NPC-Plätze, Persönlichkeiten, Entscheidungen in allen Spielphasen, Robustheit des BotRunners.
- `spieltisch-ui`: Darstellung und Bedienung des Spieltischs auf Desktop und Mobil.
- `pwa`: Installierbarkeit und Offline-Verhalten der App-Hülle.
- `single-binary-deploy`: Binary, Persistenz der Partien, Betrieb auf dem vServer.

### Modified Capabilities
(keine — neues Projekt)

## Impact

- Neuer Code in `shared/`, `backend/`, `game-web/`, `deploy/`, `Makefile`.
- Abhängigkeiten: boardgame.io 0.50, React 19, Vite, Tailwind 4 (wie Ausgebremst).
- vServer: neuer Systembenutzer `doppelkopf`, `/opt/doppelkopf`, `/var/lib/doppelkopf`, Port 3003 auf 172.18.0.1, Traefik-Datei `dynamic/doppelkopf.yml`. Ausgebremst (3001) und Molthar (3002) bleiben unberührt.
