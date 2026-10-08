# Spec Delta

## Purpose

Macht Doppelkopf auf Smartphone und Desktop als App installierbar, mit eigenem Icon, Vollbild und schnellem Start.

## ADDED Requirements

### Requirement: Installierbar
Die Seite SHALL ein Web-App-Manifest (Name „Doppelkopf“, Start-URL „/“, Anzeige „standalone“, Theme-Farbe, Icons 192 px und 512 px inkl. maskable) und einen Service Worker bereitstellen, sodass Chrome/Edge (Desktop, Android) die Installation anbieten. Für iOS SHALL ein Apple-Touch-Icon und die Meta-Tags für den Vollbildmodus vorhanden sein.

#### Scenario: Installation am Desktop
- **WHEN** die Seite in Chrome geöffnet wird
- **THEN** erfüllt sie die Installierbarkeitskriterien (Manifest, Icons, Service Worker)

### Requirement: App-Hülle aus dem Cache
Der Service Worker SHALL die App-Hülle (HTML, JS, CSS, Icons) zwischenspeichern, sodass die App ohne Netz startet und eine Meldung „keine Verbindung“ zeigt. Lobby-API und Spielverbindung SHALL nie aus dem Cache bedient werden. Nach einem Deploy SHALL beim nächsten Start die neue Version geladen werden.

#### Scenario: Neue Version
- **WHEN** nach einem Deploy die installierte App geöffnet wird
- **THEN** lädt sie spätestens beim nächsten Start die neue Version
