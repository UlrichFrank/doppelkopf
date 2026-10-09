/// <reference types="vite-plugin-pwa/react" />
import { useRegisterSW } from "virtual:pwa-register/react";

/** Look for a new deploy once an hour while the app stays open. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * "Neue Version verfügbar" — shown when a deploy brought a new service
 * worker. "Jetzt laden" lets it take over and reloads the page; the game
 * state lives on the server, so nothing is lost.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), CHECK_INTERVAL_MS);
    },
  });
  if (!needRefresh) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px 10px 16px",
        borderRadius: 999,
        background: "rgb(20 16 12 / 0.94)",
        color: "#f6efe2",
        boxShadow: "0 6px 24px rgb(0 0 0 / 0.45)",
        font: "600 15px/1.2 system-ui, sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      Neue Version verfügbar
      <button
        onClick={() => void updateServiceWorker(true)}
        style={{ border: 0, borderRadius: 999, padding: "6px 14px", background: "#f6efe2", color: "#14100c", font: "inherit", cursor: "pointer" }}
      >
        Jetzt laden
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="Später"
        style={{ border: 0, background: "none", color: "inherit", font: "inherit", fontSize: 20, lineHeight: 1, cursor: "pointer", opacity: 0.7 }}
      >
        ×
      </button>
    </div>
  );
}
