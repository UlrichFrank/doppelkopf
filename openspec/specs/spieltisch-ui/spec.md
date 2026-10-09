# spieltisch-ui Specification

## Purpose
Beschreibt Darstellung und Bedienung des Spieltischs, sodass Doppelkopf am Desktop wie am Smartphone flüssig und fehlerarm spielbar ist.

## Requirements

### Requirement: Tischansicht
Der Tisch SHALL den eigenen Platz unten, die Mitspieler links, oben und rechts in Spielreihenfolge zeigen, mit Name, Kartenanzahl, Geber-Markierung, bekannter Partei, Ansagen und einer Hervorhebung des Spielers am Zug. In der Mitte SHALL der aktuelle Stich liegen, jede Karte vor dem Platz, der sie gespielt hat. Spielart, Runde (n von N) und Gesamtstand SHALL jederzeit sichtbar sein.

#### Scenario: Mitspieler am Zug
- **WHEN** der linke Mitspieler am Zug ist
- **THEN** ist sein Platz hervorgehoben

### Requirement: Kartenbild
Die Karten SHALL im klassischen französischen Bild (Altenburger Stil) erscheinen: Index aus Wert und Farbzeichen in allen vier Ecken, Zahlenkarten mit Farbzeichen in zwei Spalten, Bildkarten (König, Dame, Bube) doppelköpfig in Rot, Blau und Gold. Kartenrückseiten SHALL ein feines Muster in Rot oder Blau mit weißem Rand zeigen. Wie bei zwei gemischten Päckchen am echten Tisch SHALL von jeder Karte eine Kopie eine rote und die andere eine blaue Rückseite haben; jede offen liegende Karte SHALL die Farbe ihrer Rückseite mit einer kleinen Markierung am unteren Rand zeigen.

#### Scenario: Rückseite einer offenen Karte
- **WHEN** eine Karte im Stich liegt
- **THEN** zeigt ihre Markierung, ob sie die rote oder die blaue Kopie ist

### Requirement: Hände der Mitspieler
Die Hand jedes Mitspielers SHALL als Fächer verdeckter Karten mit genau so vielen Karten gezeigt werden, wie er noch hält, jeweils mit der echten Rückseitenfarbe, dazu die Zahl roter und blauer Karten; beim oberen Mitspieler waagerecht, bei den seitlichen senkrecht. Die Zahl roter und blauer Karten jeder Hand SHALL für alle sichtbar sein (verdeckte Information umfasst nur die Kartenwerte).

#### Scenario: Karte gespielt
- **WHEN** ein Mitspieler eine Karte mit blauer Rückseite spielt
- **THEN** zeigt sein Fächer eine blaue Karte weniger

### Requirement: Spielregeln nachlesen
Die Spielregeln SHALL auf der Startseite und am Tisch (Tischmenü) nachgelesen werden können. Am Tisch SHALL die Regelansicht zeigen, welche Hausregeln an diesem Tisch gelten.

#### Scenario: Regeln am Tisch
- **WHEN** ein Spieler im Tischmenü „Spielregeln“ wählt
- **THEN** sieht er die Regeln und die an diesem Tisch gewählten Varianten

### Requirement: Eigene Hand
Die eigenen Karten SHALL sortiert angezeigt werden (Trümpfe in Spielreihenfolge, dann Fehlfarben), passend zur aktuellen Spielart. Ist der Spieler am Zug, SHALL nicht spielbare Karten abgeblendet sein. Eine Karte SHALL per Antippen ausgewählt und per zweitem Antippen gespielt werden; am Desktop SHALL ein Doppelklick oder Klick auf die bereits gewählte Karte spielen.

#### Scenario: Ungültige Karte
- **WHEN** der Spieler eine abgeblendete Karte antippt
- **THEN** wird sie nicht gespielt

### Requirement: Stichabschluss sichtbar
Ein vollständiger Stich SHALL nach dem vierten Ausspiel kurz (ca. 1,5 s) liegen bleiben, mit Hervorhebung des Gewinners, bevor er eingesammelt wird. Der letzte Stich SHALL auf Wunsch erneut angezeigt werden können.

#### Scenario: Vierte Karte gespielt
- **WHEN** die vierte Karte eines Stichs gespielt wird
- **THEN** sehen alle den vollständigen Stich und den Gewinner, bevor der Tisch leer wird

### Requirement: Vorbehalt- und Ansagedialoge
In der Vorbehaltsphase SHALL der Spieler am Zug zwischen „gesund“ und den für ihn erlaubten Vorbehalten wählen können. Während der Stichphase SHALL ein Ansage-Bedienelement die aktuell zulässige nächste Ansage seiner Partei anbieten (z. B. „Re“, „keine 90“) und nur dann aktiv sein, wenn sie zulässig ist.

#### Scenario: Frist abgelaufen
- **WHEN** die Frist für die nächste Ansage abgelaufen ist
- **THEN** wird kein Ansage-Knopf mehr angeboten

### Requirement: Responsives Layout
Der Tisch SHALL ohne horizontales Scrollen auf Smartphones ab 360 px Breite im Hoch- und Querformat sowie auf Desktop-Bildschirmen spielbar sein; die eigene Hand SHALL vollständig sichtbar sein, Karten überlappen bei Platzmangel.

#### Scenario: iPhone im Hochformat
- **WHEN** die App auf einem 390 × 844 Bildschirm läuft
- **THEN** sind alle 12 Handkarten, der Stich und die drei Mitspieler ohne Scrollen sichtbar
