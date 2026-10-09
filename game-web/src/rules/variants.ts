/** Rule settings of a table; absent variants = DDV. */
export interface TableRules {
  withNines: boolean;
  secondDulleWins?: boolean;
  schmeissen?: boolean;
}

/** House rules the lobby offers, with their explanation. */
export const VARIANTS: { key: "secondDulleWins" | "schmeissen"; label: string; text: string }[] = [
  {
    key: "secondDulleWins",
    label: "Zweite Dulle sticht die erste",
    text: "Liegen beide Herz-Zehnen in einem Stich, gewinnt die später gespielte. Nach DDV-Regeln gewinnt – wie bei allen gleichen Karten – die zuerst gespielte.",
  },
  {
    key: "schmeissen",
    label: "Schmeißen",
    text: "Wer fünf oder mehr Neunen oder fünf oder mehr Könige auf der Hand hat, darf bei der Vorbehaltsabfrage die Karten hinwerfen. Die Hand wird allen gezeigt, derselbe Geber gibt neu, die Runde zählt nicht. Nach DDV-Regeln gibt es das nicht: jedes Blatt wird gespielt.",
  },
];
