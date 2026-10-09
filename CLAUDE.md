# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
make dev          # Backend (port 3003) + frontend (port 5173) in parallel
make test         # bun test in shared/ and backend/
make type-check   # tsc in all packages
make simulate ARGS="20 --a=professor --b=heuristic"   # Headless bot tournament (rule invariants checked)
make binary-local # Single binary (server + NPCs + embedded PWA) → dist/doppelkopf
make smoke URL=http://localhost:3003   # Play a complete game over WebSocket (seats 1–3 NPCs)
make deploy       # linux-x64 binary → vServer, systemd restart, health check (deploy/README.md)
```

Single test file: `cd shared && bun test src/__tests__/scoring.test.ts`

Package manager and runtime: **Bun** with workspaces (`bun install` at root). `shared` is consumed as TypeScript source (no build step).

## Architecture

Doppelkopf (DDV tournament rules, with or without nines) for 4 seats, 1–4 humans, the rest NPCs. Sister projects: `~/dev/Ausgebremst` (build/deploy pattern) and `~/dev/portale-von-molthar` (BotRunner pattern). Specs live in `openspec/specs/` (German).

| Package | Role |
|---|---|
| `shared/` | Rules engine (pure functions) + boardgame.io `Game` (`game.ts`) |
| `backend/` | boardgame.io server, `BotRunner`, bots, simulation, single-binary entry |
| `game-web/` | React 19 + Vite + Tailwind 4 PWA |

### Rules engine (`shared/src/game/`)

DDV tournament rules by default; house rules live in `RuleVariants` (part of `GameOptions`/`SetupData`, absent = DDV).

- `rules.ts` — trump/Fehl order per game type, `legalCards`, `trickWinner` (equal cards: first wins, also the Dullen — DDV; house rule `secondDulleWins` flips that)
- `round.ts` — dealing, reservations (solo > Hochzeit, silent Hochzeit, house rule Schmeißen = redeal), playing, Hochzeit clarification, round end; `pendingAction(G, seat)` says what a seat has to do
- `announcements.ts` — Re/Kontra/keine 90… deadlines (Erwiderung, Hochzeit shift)
- `scoring.ts` — winner determination, game points, special points, solo ×3
- `view.ts` — `playerView`: own hand only, parties only when publicly known, reservations hidden, silent Hochzeit looks normal

### boardgame.io usage

One phase, `activePlayers: ALL`: whose turn it is lives in `G.stage` / `G.round.reservationTurn` / `G.round.toAct`, every move checks it itself (announcements are allowed out of turn). All moves are `client: false` — the client only has the filtered view. Frontend handlers must call moves with explicit arguments (never pass a React event).

### NPCs (`backend/src/bots/`, `backend/src/bot-runner.ts`)

The BotRunner scans the lobby for `setupData.npcSlots`, joins those seats (credentials in `NPC_DATA_DIR`) and plays each NPC as its own boardgame.io client — bots only see their filtered view. Card choice: Monte-Carlo sampling of unknown hands (`montecarlo.ts`, respects voids and Kreuz-Dame knowledge) with the heuristic (`heuristic.ts`) as rollout policy; solos are decided by simulating the hand. Personas (`personas.ts`): Hilde (cautious), Knut (daring), Professor (most samples).

### Frontend (`game-web/src/`)

`App.tsx` = lobby state machine (start → waiting room → table), session in localStorage, invite link `/?match=<id>`. `table/` = game table (Hand, OpponentHand, TrickArea, SeatBadge, Bierdeckel score, RoundSummary). `cards/Card.tsx` draws the French-suited deck (Altenburg style) as SVG; `rules/` = rules sheet and the list of house rules offered in the lobby. PWA: `public/manifest.webmanifest`, `public/sw.js` (version stamped by `vite.config.ts`), icons rendered by `scripts/render-icons.sh`.

### TypeScript config

Strict mode (`tsconfig.base.json`): no implicit any, no unused vars/params.
