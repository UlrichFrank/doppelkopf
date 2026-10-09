import { useEffect, useState } from "react";
import { levelName } from "shared";
import type { AnnouncementLevel, Party } from "shared";

interface Props {
  party: Party;
  level: AnnouncementLevel;
  onAnnounce: (level: AnnouncementLevel) => void;
}

/**
 * The next possible announcement. Two taps: a wrong announcement is expensive.
 * Keyed by level in the parent, so a new level starts unarmed.
 */
export function AnnounceButton({ party, level, onAnnounce }: Props) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const label = levelName(party, level);
  return (
    <button
      onClick={() => {
        if (armed) {
          setArmed(false);
          onAnnounce(level);
        } else {
          setArmed(true);
        }
      }}
      className={`relative z-20 rounded-full px-4 py-1.5 font-extrabold shadow-md transition-colors ${
        armed ? "bg-card-red text-paper" : party === "re" ? "bg-re text-wood-950" : "bg-kontra text-wood-950"
      }`}
    >
      {armed ? `${label} – sicher?` : label}
    </button>
  );
}
