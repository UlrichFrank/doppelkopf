import type { ReactNode } from "react";
import { sortHand } from "shared";
import type { Card, Rank, Suit } from "shared";
import { CardView } from "../cards/Card";
import { VARIANTS, type TableRules } from "./variants";

const card = (suit: Suit, rank: Rank): Card => ({ id: `${suit}-${rank}-rules`, suit, rank });

function trumpOrder(withNines: boolean): Card[] {
  const all: Card[] = [card("herz", "10")];
  for (const rank of ["D", "B"] as Rank[]) for (const suit of ["kreuz", "pik", "herz", "karo"] as Suit[]) all.push(card(suit, rank));
  for (const rank of ["A", "10", "K", ...(withNines ? ["9"] : [])] as Rank[]) all.push(card("karo", rank));
  return sortHand(all, "normal");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xl font-bold text-re">{title}</h3>
      <div className="flex flex-col gap-2 leading-relaxed text-chalk/85">{children}</div>
    </section>
  );
}

interface Props {
  /** The rules of a running table; null in the lobby (shows all variants as options). */
  rules: TableRules | null;
  onClose: () => void;
}

export function RulesSheet({ rules, onClose }: Props) {
  const withNines = rules?.withNines ?? true;
  const n = withNines ? 12 : 10;
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/60 p-2 sm:p-6" onClick={onClose}>
      <article
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-wood-900 ring-1 ring-wood-500/50"
        onClick={(e) => e.stopPropagation()}
        aria-label="Spielregeln"
      >
        <header className="flex items-center justify-between gap-3 border-b border-wood-500/40 px-5 py-3">
          <h2 className="text-2xl font-extrabold">Spielregeln</h2>
          <button onClick={onClose} className="rounded-lg bg-chalk px-4 py-1.5 font-bold text-wood-950">
            Schließen
          </button>
        </header>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">
          <p className="text-chalk/75">
            Gespielt wird nach den Turnierspielregeln des Deutschen Doppelkopf-Verbands (DDV). Hausregeln lassen sich beim
            Anlegen eines Tisches zuschalten.
          </p>

          {rules && (
            <Section title="An diesem Tisch">
              <ul className="list-disc pl-5">
                <li>{withNines ? "Mit Neunen: 48 Karten, 12 je Spieler" : "Ohne Neunen: 40 Karten, 10 je Spieler"}</li>
                {VARIANTS.map((v) => (
                  <li key={v.key}>
                    {v.label}: <b>{rules[v.key] ? "ja (Hausregel)" : "nein (DDV)"}</b>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Karten und Augen">
            <p>
              Zwei Kartensätze zu je 24 Karten (Ass, Zehn, König, Dame, Bube, Neun in Kreuz, Pik, Herz, Karo) – jede Karte gibt es
              zweimal. Ohne Neunen sind es 40 Karten. Jeder bekommt {n} Karten.
            </p>
            <p>Ass 11 · Zehn 10 · König 4 · Dame 3 · Bube 2 · Neun 0 – zusammen 240 Augen. Mit 121 Augen gewinnt Re, Kontra reichen 120.</p>
          </Section>

          <Section title="Rote und blaue Rückseiten">
            <p>
              Wie am echten Tisch wird mit zwei gemischten Päckchen gespielt: von jeder Karte hat eine Kopie eine rote, die andere eine
              blaue Rückseite. Bei den Mitspielern siehst du, wie viele rote und blaue Karten sie noch halten; auf jeder offenen Karte zeigt
              ein kleiner Balken am unteren Rand die Farbe ihrer Rückseite.
            </p>
            <p>
              Daraus lassen sich Schlüsse ziehen: Hältst du die Kreuz-Dame mit roter Rückseite, hat die andere eine blaue – wer keine blaue
              Karte mehr hat, kann sie nicht haben. Die Computergegner nutzen dieselbe Information.
            </p>
          </Section>

          <Section title="Trumpf im Normalspiel">
            <p>Von hoch nach niedrig:</p>
            <div className="flex flex-wrap gap-1">
              {trumpOrder(withNines).map((c) => (
                <div key={c.id} className="w-9 sm:w-11">
                  <CardView card={c} />
                </div>
              ))}
            </div>
            <p>
              Herz-Zehn (Dulle), die Damen, die Buben (jeweils Kreuz, Pik, Herz, Karo), dann Karo-Ass, -Zehn, -König
              {withNines ? ", -Neun" : ""}. Fehlfarben sind Kreuz, Pik (Ass, Zehn, König{withNines ? ", Neun" : ""}) und Herz (Ass, König
              {withNines ? ", Neun" : ""}).
            </p>
          </Section>

          <Section title="Stiche">
            <p>
              Wer links vom Geber sitzt, spielt aus. Die angespielte Farbe muss bedient werden; Trumpf gilt als eigene Farbe. Wer nicht
              bedienen kann, darf jede Karte spielen.
            </p>
            <p>
              Den Stich gewinnt der höchste Trumpf, sonst die höchste Karte der angespielten Farbe. Bei zwei gleichen Karten gewinnt
              die zuerst gespielte – auch bei den beiden Dullen
              {rules?.secondDulleWins ? " (an diesem Tisch gilt die Hausregel: die zweite Dulle sticht die erste)" : ""}. Der Gewinner
              spielt zum nächsten Stich aus.
            </p>
          </Section>

          <Section title="Parteien">
            <p>
              Die beiden Spieler mit den Kreuz-Damen („die Alten“) spielen Re, die anderen beiden Kontra. Wer zu wem gehört, zeigt sich
              erst beim Ausspielen der Kreuz-Damen oder durch Ansagen.
            </p>
            <p>
              Hat ein Spieler beide Kreuz-Damen und sagt nichts, spielt er eine stille Hochzeit: allein gegen drei, abgerechnet wie ein
              Solo.
            </p>
          </Section>

          <Section title="Vorbehalte">
            <p>Vor dem ersten Stich sagt jeder reihum „gesund“ oder meldet einen Vorbehalt an:</p>
            <ul className="list-disc pl-5">
              <li>
                <b>Hochzeit</b> (nur mit beiden Kreuz-Damen): Partner wird, wer den ersten der ersten drei Stiche gewinnt, den der
                Hochzeiter nicht selbst macht. Gewinnt er alle drei, spielt er allein.
              </li>
              <li>
                <b>Solo</b> – der Solist spielt allein gegen drei und kommt heraus:
                <ul className="list-[circle] pl-5">
                  <li>Damensolo / Bubensolo: nur Damen bzw. Buben sind Trumpf.</li>
                  <li>Fleischloser: kein Trumpf.</li>
                  <li>Farbsolo Kreuz, Pik, Herz: Trumpf wie im Normalspiel, aber die Solofarbe statt Karo. Karo-Solo entspricht dem Normalspiel.</li>
                </ul>
              </li>
            </ul>
            <p>Ein Solo geht vor einer Hochzeit; unter mehreren Solos gilt das des zuerst gefragten Spielers.</p>
            <p>
              <b>Muss man mit einem schwachen Blatt spielen?</b> Ja – nach DDV-Regeln gibt es keine Augengrenze und kein Neugeben,
              jedes Blatt wird gespielt.{" "}
              {rules?.schmeissen
                ? "An diesem Tisch gilt aber die Hausregel „Schmeißen“: mit fünf oder mehr Neunen oder Königen darf man die Karten hinwerfen."
                : "Nur mit der Hausregel „Schmeißen“ dürfen fünf oder mehr Neunen oder Könige hingeworfen werden."}
            </p>
          </Section>

          <Section title="Ansagen">
            <p>
              Wer seine Partei kennt, kann „Re“ bzw. „Kontra“ ansagen, solange er noch mindestens {n - 1} Karten hat (also vor dem Ausspielen
              seiner zweiten Karte). Danach folgen die Absagen „keine 90“, „keine 60“, „keine 30“ und „schwarz“ – jede eine Karte später
              ({n - 2}, {n - 3}, {n - 4}, {n - 5} Karten). Auf eine Ansage der Gegenseite darf man noch eine Karte später antworten. In
              der Hochzeit verschieben sich die Fristen um die Stiche bis zur Klärung.
            </p>
            <p>
              Eine Absage verpflichtet: wer „keine 90“ absagt, muss den Gegner unter 90 Augen halten. Sagt nur Kontra an, braucht Re 120
              und Kontra 121.
            </p>
          </Section>

          <Section title="Abrechnung">
            <ul className="list-disc pl-5">
              <li>1 Punkt für das gewonnene Spiel</li>
              <li>je 1 Punkt, wenn der Verlierer unter 90, unter 60, unter 30 Augen bleibt bzw. keinen Stich macht</li>
              <li>je 2 Punkte für jede Re- oder Kontra-Ansage, je 1 Punkt für jede Absage-Stufe</li>
              <li>je 1 Punkt für 120 gegen „keine 90“, 90 gegen „keine 60“ usw.</li>
              <li>1 Punkt „gegen die Alten“, wenn Kontra gewinnt</li>
            </ul>
            <p>
              Sonderpunkte (nur zwei gegen zwei): Fuchs gefangen (Karo-Ass des Gegners im eigenen Stich), Doppelkopf (Stich mit mindestens
              40 Augen), Karlchen (Kreuz-Bube gewinnt den letzten Stich) – je 1 Punkt.
            </p>
            <p>Spielt einer allein gegen drei, bekommt er den dreifachen Wert; jeder Gegner den einfachen.</p>
          </Section>

          <Section title="Hausregeln">
            {VARIANTS.map((v) => (
              <p key={v.key}>
                <b>{v.label}.</b> {v.text}
              </p>
            ))}
          </Section>
        </div>
      </article>
    </div>
  );
}
