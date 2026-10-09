# lobby Specification

## Purpose
Bringt 1 bis 4 Menschen und die Computergegner an einen Tisch: Partie anlegen, Plätze konfigurieren, beitreten, warten und nach dem Neuladen zurückkehren.

## Requirements

### Requirement: Partie anlegen
Ein Spieler SHALL nach Eingabe seines Namens eine Partie mit genau vier Plätzen anlegen können. Platz 1 SHALL er selbst belegen; jeden der Plätze 2–4 SHALL er als „Mensch“ oder als Computergegner mit wählbarer Persönlichkeit festlegen. Zusätzlich SHALL er Rundenzahl, „mit/ohne Neunen“ und die Hausregeln „Zweite Dulle sticht die erste“ und „Schmeißen“ wählen (Standard: aus, also DDV-Regeln). Die Liste offener Tische SHALL gewählte Hausregeln nennen. Es SHALL also 1 bis 4 menschliche Spieler geben.

#### Scenario: Allein gegen drei Computer
- **WHEN** ein Spieler eine Partie mit drei Computerplätzen anlegt
- **THEN** beginnt die erste Runde, sobald die Computergegner Platz genommen haben, ohne weiteres Warten

#### Scenario: Vier Menschen
- **WHEN** alle Plätze als „Mensch“ angelegt werden
- **THEN** nimmt kein Computergegner Platz

### Requirement: Beitreten
Offene Partien mit freien Menschenplätzen SHALL in einer Liste mit Anleger, belegten Plätzen und Regeln erscheinen. Ein Spieler SHALL einer Partie über diese Liste oder über einen Einladungslink beitreten können, der die Partie direkt öffnet. Volle oder beendete Partien SHALL nicht beitretbar sein.

#### Scenario: Einladungslink
- **WHEN** ein Spieler einen Einladungslink öffnet und seinen Namen eingibt
- **THEN** belegt er den nächsten freien Menschenplatz dieser Partie

### Requirement: Warteraum
Solange nicht alle Plätze belegt sind, SHALL ein Warteraum die Plätze mit Namen bzw. „frei“ und den Einladungslink zum Kopieren/Teilen zeigen. Sind alle Plätze belegt, SHALL das Spiel ohne weitere Aktion für alle beginnen.

#### Scenario: Letzter Mensch tritt bei
- **WHEN** der letzte freie Menschenplatz belegt wird
- **THEN** wechseln alle Clients vom Warteraum an den Spieltisch

### Requirement: Wiederverbinden
Der Client SHALL Platz und Zugangsdaten der laufenden Partie lokal speichern. Nach Neuladen oder erneutem Öffnen der App SHALL er die Rückkehr in die Partie anbieten bzw. direkt fortsetzen. Partien SHALL einen Neustart des Servers überstehen. Ein Spieler SHALL eine Partie verlassen können; die lokalen Zugangsdaten werden dann gelöscht.

#### Scenario: Seite neu geladen
- **WHEN** ein Spieler während einer Runde die Seite neu lädt
- **THEN** sitzt er nach dem Laden wieder am Tisch und sieht seine Karten
