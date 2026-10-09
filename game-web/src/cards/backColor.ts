export type BackColor = "rot" | "blau";

/** Two decks alternate from deal to deal, as at a real table: odd rounds blue, even rounds red. */
export const backColorForRound = (round: number): BackColor => (round % 2 === 0 ? "rot" : "blau");
