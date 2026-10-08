import { LobbyClient } from "boardgame.io/client";

/**
 * Server for the lobby API and Socket.IO. By default the origin the page was
 * loaded from (production: the server binary serves page and API together).
 * VITE_BACKEND_URL overrides it — set in .env.development, where Vite serves
 * the page on 5173 and the backend runs on 3003.
 */
export const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL ?? window.location.origin;

export const lobbyClient = new LobbyClient({ server: BACKEND_URL });
