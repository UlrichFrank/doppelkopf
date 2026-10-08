# Spec Delta

## Purpose

Bestimmt nach jeder Runde Gewinner und Punkte nach dem DDV-Schema und führt den Partiestand über die vereinbarte Rundenzahl.

## ADDED Requirements

### Requirement: Gewinnermittlung
Nach dem letzten Stich SHALL der Server die Augen beider Parteien zählen. Das Ziel einer Partei SHALL sein:
- mit eigener Absage: die höchste eigene Absage erfüllen (keine 90 → Gegner unter 90, keine 60 → unter 60, keine 30 → unter 30, schwarz → Gegner ohne Stich);
- sonst, wenn der Gegner abgesagt hat: mindestens 90 / 60 / 30 Augen bzw. einen Stich gegen dessen höchste Absage keine 90 / keine 60 / keine 30 / schwarz;
- sonst: Re 121 Augen, Kontra 120 Augen; hat nur Kontra (Re/Kontra) angesagt, braucht Re 120 und Kontra 121.
Eine Partei SHALL gewinnen, wenn sie ihr Ziel erreicht und die andere nicht. Erreicht keine Partei ihr Ziel, SHALL es keinen Gewinner geben und nur Sonderpunkte zählen.

#### Scenario: Normalspiel ohne Ansagen
- **WHEN** Re 121 Augen hat und niemand angesagt hat
- **THEN** gewinnt Re

#### Scenario: Gleichstand
- **WHEN** beide Parteien 120 Augen haben und niemand angesagt hat
- **THEN** gewinnt Kontra

#### Scenario: Absage verfehlt
- **WHEN** Re „keine 90“ abgesagt hat und Kontra 95 Augen hat
- **THEN** gewinnt Kontra

### Requirement: Spielpunkte
Die Gewinnerpartei SHALL erhalten: 1 Punkt für „gewonnen“; je 1 Punkt, wenn der Verlierer unter 90, unter 60, unter 30 Augen bzw. keinen Stich hat; je 2 Punkte für jede Re- und jede Kontra-Ansage; je 1 Punkt für jede Absage-Stufe beider Parteien; je 1 Punkt, wenn sie 120 gegen „keine 90“, 90 gegen „keine 60“, 60 gegen „keine 30“ bzw. 30 gegen „schwarz“ erreicht hat; im Spiel zwei gegen zwei 1 Punkt „gegen die Alten“, wenn Kontra gewinnt.

#### Scenario: Re angesagt und gewonnen
- **WHEN** Re „Re“ angesagt hat und mit 150 Augen gewinnt
- **THEN** erhält Re 1 + 2 = 3 Spielpunkte

#### Scenario: Gegen die Alten
- **WHEN** Kontra im Normalspiel ohne Ansagen mit 130 Augen gewinnt
- **THEN** erhält Kontra 2 Spielpunkte

### Requirement: Sonderpunkte
Nur im Spiel zwei gegen zwei (Normalspiel, Hochzeit mit Partner; nicht im Solo, in der stillen Hochzeit oder der Hochzeit ohne Partner) SHALL jede Partei Sonderpunkte erhalten: je 1 für einen gefangenen Fuchs (Karo-Ass der Gegenpartei im eigenen Stich), je 1 für einen Doppelkopf (Stich mit mindestens 40 Augen), 1 für den Karlchen (Kreuz-Bube gewinnt den letzten Stich). Sonderpunkte SHALL unabhängig vom Spielausgang mit den Spielpunkten verrechnet werden.

#### Scenario: Fuchs gefangen
- **WHEN** ein Kontra-Spieler den Stich gewinnt, in dem ein Re-Spieler sein Karo-Ass gespielt hat
- **THEN** erhält Kontra einen Sonderpunkt

### Requirement: Punkte je Spieler
Der Rundenwert SHALL (Spielpunkte des Gewinners, mit Vorzeichen aus Sicht Re) plus Sonderpunkte Re minus Sonderpunkte Kontra sein. Im Spiel zwei gegen zwei SHALL jeder Re-Spieler den Rundenwert und jeder Kontra-Spieler den negativen Rundenwert erhalten. Spielt einer allein gegen drei (Solo, stille Hochzeit, Hochzeit ohne Partner), SHALL er den dreifachen Rundenwert und jeder Gegner den negativen einfachen erhalten. Die Summe aller Spielerpunkte einer Runde SHALL 0 sein.

#### Scenario: Solo gewonnen
- **WHEN** ein Solist mit Rundenwert 2 gewinnt
- **THEN** erhält er +6 und jeder Gegner −2

### Requirement: Partiestand und Partieende
Beim Anlegen SHALL die Rundenzahl gewählt werden (4, 8, 12, 16, 20 oder 24). Nach jeder Runde SHALL eine Rundenübersicht mit Augen, Ansagen, Punkteaufstellung und neuem Gesamtstand gezeigt werden; die nächste Runde SHALL beginnen, wenn alle Spieler „Weiter“ gewählt haben. Nach der letzten Runde SHALL die Partie enden und eine Endtabelle nach Gesamtpunkten angezeigt werden.

#### Scenario: Partie mit 4 Runden
- **WHEN** die vierte Runde einer 4-Runden-Partie abgerechnet ist
- **THEN** endet die Partie und die Endtabelle zeigt alle vier Spieler nach Punkten sortiert
