# computergegner Specification

## Purpose
Computergegner füllen freie Plätze und spielen regelkonform und plausibel, mit unterscheidbaren Persönlichkeiten, ohne mehr zu wissen als ein menschlicher Spieler auf ihrem Platz.

## Requirements

### Requirement: NPC-Plätze werden serverseitig belegt
Der Server SHALL für jeden als Computer angelegten Platz selbstständig beitreten und den Platz mit dem Namen der Persönlichkeit belegen. Nach einem Server-Neustart SHALL er laufende Partien wieder aufnehmen und die NPCs weiterspielen lassen. Bei Partieende SHALL er die NPCs abmelden.

#### Scenario: Neustart während einer Runde
- **WHEN** der Server neu startet, während ein NPC am Zug ist
- **THEN** spielt der NPC nach dem Neustart weiter, ohne dass ein Mensch eingreift

### Requirement: Persönlichkeiten
Es SHALL drei Persönlichkeiten geben, die sich im Verhalten unterscheiden:
- „Hilde“ (vorsichtig): sagt nur mit sehr starkem Blatt an, spielt selten Solo.
- „Knut“ (Draufgänger): sagt früh und oft an, spielt Solo schon mit gutem Blatt.
- „Professor“ (Stratege): spielt Karten mit der gründlichsten Vorausberechnung und sagt nach Blattstärke an.

#### Scenario: Persönlichkeit wählen
- **WHEN** beim Anlegen „Knut“ für Platz 3 gewählt wird
- **THEN** sitzt an Platz 3 ein NPC namens Knut mit Draufgänger-Verhalten

### Requirement: NPC-Entscheidungen in allen Phasen
Ein NPC SHALL in jeder Phase handeln, in der er gefragt ist: Vorbehalt erklären, Karten spielen, ansagen (optional, nur innerhalb der Fristen), nach Rundenende „Weiter“ wählen. Er SHALL nur regelkonforme Aktionen wählen und dabei nur den Zustand verwenden, den sein Platz sehen darf. Vor jeder Aktion SHALL er eine kurze, menschlich wirkende Bedenkzeit einlegen.

#### Scenario: NPC am Zug
- **WHEN** ein NPC am Zug ist
- **THEN** spielt er nach 0,6–1,8 Sekunden eine gültige Karte

### Requirement: Spielstärke
Das Kartenspiel der NPCs SHALL Partnerkenntnis, Bedienpflicht, Augenwerte, bereits gespielte Karten und die sichtbaren roten und blauen Rückseiten der Mitspielerhände berücksichtigen: Stiche des eigenen Partners schmieren, fremde Stiche möglichst billig übernehmen oder billig abwerfen, Füchse schützen. In simulierten Partien SHALL eine Partei aus zwei „Professor“-NPCs gegen zwei Zufallsspieler deutlich mehr Punkte erzielen.

#### Scenario: Simulierter Vergleich
- **WHEN** 200 Runden Professor+Professor gegen zwei Zufallsspieler bei rotierenden Plätzen simuliert werden
- **THEN** liegen die Professoren im Gesamtpunktestand deutlich vorn

### Requirement: Robustheit
Wird ein NPC-Zug vom Server abgelehnt oder bleibt ein NPC hängen, SHALL der BotRunner den NPC erneut handeln lassen und im Zweifel auf eine einfache gültige Aktion zurückfallen, sodass ein Spiel nie auf einen NPC wartet.

#### Scenario: Abgelehnter Zug
- **WHEN** der Server einen NPC-Zug ablehnt
- **THEN** spielt der NPC innerhalb weniger Sekunden eine andere gültige Karte
