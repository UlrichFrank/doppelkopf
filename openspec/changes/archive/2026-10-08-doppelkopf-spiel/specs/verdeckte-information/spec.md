# Spec Delta

## Purpose

Stellt sicher, dass kein Client mehr über den Spielzustand erfährt als ein Spieler am echten Tisch: keine fremden Karten, keine noch unbekannten Parteien.

## ADDED Requirements

### Requirement: Fremde Karten sind verdeckt
Der Server SHALL jedem Client nur die eigenen Handkarten übermitteln; von den Mitspielern SHALL nur die Kartenanzahl sichtbar sein. Zuschauer ohne Platz SHALL keine Handkarten sehen. Gespielte Karten (aktueller und vergangene Stiche) SHALL für alle sichtbar sein.

#### Scenario: Zustand für Platz 2
- **WHEN** Platz 2 den Spielzustand erhält
- **THEN** enthält er die Karten von Platz 2 und für die Plätze 0, 1, 3 nur die Anzahl

### Requirement: Parteien nur soweit bekannt
Die Parteizugehörigkeit eines Mitspielers SHALL einem Client erst übermittelt werden, wenn sie im Spiel offenbar ist: durch eine Ansage, durch Ausspielen einer Kreuz-Dame im Normalspiel, durch die Spielart (Solo, geklärte Hochzeit) oder dadurch, dass sie sich aus den bekannten Parteien zwingend ergibt (zwei Spieler einer Partei bekannt). Die eigene Partei SHALL jeder Spieler immer sehen. Nach Rundenende SHALL alles offen sein.

#### Scenario: Kreuz-Dame gespielt
- **WHEN** Platz 1 im Normalspiel eine Kreuz-Dame spielt
- **THEN** sehen alle Platz 1 als Re

#### Scenario: Unbekannter Partner
- **WHEN** im Normalspiel noch keine Kreuz-Dame gespielt und nichts angesagt wurde
- **THEN** enthält der Zustand für einen Kontra-Spieler keine Parteiangabe zu den Mitspielern

### Requirement: Vorbehalte verdeckt
Bis zur Auflösung der Vorbehalte SHALL ein Client von den anderen Spielern nur sehen, ob sie „gesund“ oder „Vorbehalt“ erklärt haben, nicht welchen.

#### Scenario: Vorbehalt eines Mitspielers
- **WHEN** Platz 0 ein Damensolo anmeldet und Platz 2 noch erklären muss
- **THEN** sieht Platz 2 bei Platz 0 nur „Vorbehalt“
