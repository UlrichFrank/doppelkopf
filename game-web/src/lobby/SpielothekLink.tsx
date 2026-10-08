/**
 * Way back to the Spielothek, the shared lobby of all games on
 * apps.diefranks.eu. Same component in Doppelkopf, Ausgebremst and Molthar
 * (inline styles, so it looks identical regardless of the app's CSS).
 */
const SPIELOTHEK_URL = "https://apps.diefranks.eu";

export function SpielothekLink({ game }: { game?: string }) {
  return (
    <a
      href={game ? `${SPIELOTHEK_URL}/#${game}` : SPIELOTHEK_URL}
      title="Zurück zur Spielothek"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.3rem 0.75rem 0.3rem 0.45rem",
        borderRadius: 999,
        border: "1.5px solid #ff3d9a",
        background: "rgba(20, 12, 36, 0.85)",
        color: "#ffd6ea",
        fontSize: "0.9rem",
        fontWeight: 700,
        lineHeight: 1.2,
        textDecoration: "none",
        boxShadow: "0 0 10px rgba(255, 61, 154, 0.35)",
      }}
    >
      <svg viewBox="0 0 64 64" width="20" height="20" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#140c24" />
        <rect x="7" y="16" width="50" height="32" rx="5" fill="#ff3d9a" />
        <rect x="13" y="22" width="38" height="14" rx="3" fill="#140c24" />
        <circle cx="22" cy="29" r="4.5" fill="#3ef0ff" />
        <circle cx="42" cy="29" r="4.5" fill="#3ef0ff" />
        <path d="M29 25.5v7l6-3.5z" fill="#fff4b8" />
      </svg>
      <span>‹ Spielothek</span>
    </a>
  );
}
