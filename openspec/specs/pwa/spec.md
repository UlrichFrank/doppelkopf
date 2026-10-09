# pwa Specification

## Purpose
Macht Doppelkopf auf Smartphone und Desktop als App installierbar, mit eigenem Icon, Vollbild und schnellem Start.

## Requirements

### Requirement: Installierbar
Die Seite SHALL ein Web-App-Manifest (Name „Doppelkopf“, Start-URL „/“, Anzeige „standalone“, Theme-Farbe, Icons 192 px und 512 px inkl. maskable) und einen Service Worker bereitstellen, sodass Chrome/Edge (Desktop, Android) die Installation anbieten. Für iOS SHALL ein Apple-Touch-Icon und die Meta-Tags für den Vollbildmodus vorhanden sein.

#### Scenario: Installation am Desktop
- **WHEN** die Seite in Chrome geöffnet wird
- **THEN** erfüllt sie die Installierbarkeitskriterien (Manifest, Icons, Service Worker)

### Requirement: App-Hülle aus dem Cache
Der Service Worker SHALL die App-Hülle (JS, CSS, Schriften, Icons per Precache; die Seite selbst network-first mit 3 s Timeout) zwischenspeichern, sodass die App ohne Netz startet und eine Meldung „keine Verbindung“ zeigt. Lobby-API und Spielverbindung SHALL nie aus dem Cache bedient werden. Nach einem Deploy SHALL beim nächsten Start die neue Version geladen werden; bei geöffneter App SHALL ein Hinweis „Neue Version verfügbar“ mit „Jetzt laden“ erscheinen.

#### Scenario: Neue Version
- **WHEN** nach einem Deploy die installierte App geöffnet wird
- **THEN** lädt sie spätestens beim nächsten Start die neue Version

#### Scenario: Neue Version bei offener App
- **WHEN** während die App offen ist ein neuer Service Worker bereitsteht
- **THEN** erscheint „Neue Version verfügbar“ und „Jetzt laden“ lädt die neue Version
