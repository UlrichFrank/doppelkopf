# Spec Delta

## Purpose

Regelt Ansagen (Re, Kontra) und Absagen (keine 90, keine 60, keine 30, schwarz): wer sie wann machen darf und wie sie für alle sichtbar werden.

## ADDED Requirements

### Requirement: Ansage der eigenen Partei
Ein Spieler SHALL nur für seine eigene Partei ansagen dürfen: Re-Spieler „Re“, Kontra-Spieler „Kontra“. Ansagen SHALL jederzeit während der Stichphase möglich sein, auch wenn der Spieler nicht am Zug ist. Jede Ansage SHALL pro Partei nur einmal gelten und allen Spielern sofort angezeigt werden, zusammen mit dem Spieler, der sie gemacht hat.

#### Scenario: Re ansagen
- **WHEN** ein Spieler mit Kreuz-Dame im Normalspiel mit noch 12 Karten „Re“ ansagt
- **THEN** sehen alle Spieler „Re“ bei diesem Spieler und er ist als Re-Spieler bekannt

#### Scenario: Falsche Partei
- **WHEN** ein Kontra-Spieler „Re“ ansagen will
- **THEN** lehnt der Server die Ansage ab

### Requirement: Fristen
Re bzw. Kontra SHALL zulässig sein, solange der Ansagende noch mindestens (Kartenzahl pro Spieler − 1) Karten hält, also mit 48 Karten mindestens 11. Jede weitere Stufe (keine 90, keine 60, keine 30, schwarz) SHALL eine Karte weniger als Mindestzahl haben (10, 9, 8, 7 bei 48 Karten). Hat die Gegenpartei bereits angesagt, SHALL die eigene Re-/Kontra-Ansage noch mit einer Karte weniger zulässig sein (Erwiderung). In der Hochzeit SHALL Ansagen erst nach dem Klärungsstich möglich sein und sich die Fristen um die Zahl der bis zur Klärung gespielten Stiche verschieben.

#### Scenario: Zu spät
- **WHEN** ein Re-Spieler mit noch 10 Karten (48er-Blatt) erstmals „Re“ ansagen will und Kontra noch nichts angesagt hat
- **THEN** lehnt der Server ab

#### Scenario: Erwiderung
- **WHEN** Re bereits angesagt ist und ein Kontra-Spieler mit noch 10 Karten „Kontra“ ansagt
- **THEN** ist die Ansage gültig

#### Scenario: Hochzeit verschiebt Fristen
- **WHEN** die Hochzeit im zweiten Stich geklärt wurde
- **THEN** darf Re/Kontra noch mit 9 Karten angesagt werden

### Requirement: Absagen bauen aufeinander auf
Eine Absage SHALL die vorhergehenden Stufen der eigenen Partei einschließen: wer „keine 60“ absagt, ohne dass seine Partei „Re“ bzw. „Kontra“ und „keine 90“ angesagt hat, sagt diese automatisch mit an, sofern deren Fristen eingehalten wären oder die Absage selbst zulässig ist. Eine Stufe, die die eigene Partei bereits angesagt hat, SHALL nicht erneut angesagt werden können.

#### Scenario: Direkte Absage
- **WHEN** ein Kontra-Spieler mit 10 Karten ohne vorherige Ansage „keine 90“ sagt
- **THEN** gelten für Kontra „Kontra“ und „keine 90“ als angesagt
