/** Seat and credentials of the match this device plays in (survives reloads). */
export interface Session {
  matchID: string;
  playerID: string;
  credentials: string;
}

const SESSION_KEY = "doppelkopf.session";
const NAME_KEY = "doppelkopf.name";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode: the session simply does not survive a reload */
  }
}

export function loadSession(): Session | null {
  const raw = read(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Session;
    return s.matchID && s.playerID && s.credentials ? s : null;
  } catch {
    return null;
  }
}

export const saveSession = (s: Session | null) => write(SESSION_KEY, s ? JSON.stringify(s) : null);
export const loadName = () => read(NAME_KEY) ?? "";
export const saveName = (name: string) => write(NAME_KEY, name);
