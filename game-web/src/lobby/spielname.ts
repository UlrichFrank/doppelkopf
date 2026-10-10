/**
 * Player name shared by the Spielothek and all games on apps.diefranks.eu: a
 * cookie on the parent domain, so every game subdomain sees it (localStorage
 * is per subdomain). Same file in Doppelkopf, Ausgebremst and Molthar; the
 * Spielothek has it as public/spielname.js.
 */
const COOKIE = "spielname";
const DOMAIN = "apps.diefranks.eu";
const MAX_AGE = 60 * 60 * 24 * 400; // browsers cap cookies at 400 days

export function loadSpielname(): string {
  const m = document.cookie.match(/(?:^|;\s*)spielname=([^;]*)/);
  if (!m) return "";
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return "";
  }
}

/** Remembers the name for all games; an empty name forgets it. */
export function saveSpielname(name: string): void {
  const value = name.trim();
  const host = window.location.hostname;
  const domain = host === DOMAIN || host.endsWith(`.${DOMAIN}`) ? `; Domain=${DOMAIN}` : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const age = value ? MAX_AGE : 0;
  document.cookie = `${COOKIE}=${encodeURIComponent(value)}; Max-Age=${age}; Path=/; SameSite=Lax${domain}${secure}`;
}
