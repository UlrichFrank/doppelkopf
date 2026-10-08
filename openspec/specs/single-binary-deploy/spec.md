# single-binary-deploy Specification

## Purpose
Liefert Doppelkopf wie Ausgebremst und Molthar als ein einziges Binary aus, das auf dem vServer hinter Traefik läuft und per make-Befehl ausgerollt und zurückgerollt wird.

## Requirements

### Requirement: Single Binary
Ein Build SHALL ein ausführbares Binary erzeugen, das Spielserver, Lobby-API, Socket.IO, Computergegner und die gebaute Spielseite unter einem Origin ausliefert. Konfiguration SHALL über Umgebungsvariablen erfolgen: `PORT`, `HOST`, `MATCHES_FILE`, `NPC_DATA_DIR`, `EXTRA_ORIGINS`.

#### Scenario: Lokaler Start
- **WHEN** das lokal gebaute Binary mit `PORT=3931` gestartet wird
- **THEN** liefert `http://localhost:3931/` die Spielseite und `/games/doppelkopf` die Lobby-API

### Requirement: Persistenz
Partien SHALL in einer Datei gespeichert werden, atomar geschrieben und beim Beenden (SIGTERM) sofort gesichert, sodass laufende Partien jeden Deploy überstehen. Partien ohne Aktivität seit 7 Tagen SHALL beim Start verworfen werden.

#### Scenario: Deploy während einer Partie
- **WHEN** der Dienst während einer Runde neu gestartet wird
- **THEN** geht kein bestätigter Zug verloren und die Partie läuft weiter

### Requirement: Betrieb auf dem vServer
Der Dienst SHALL als systemd-Unit `doppelkopf` unter eigenem Systembenutzer laufen, nur auf 172.18.0.1:3003 lauschen und über Traefik unter `https://doppelkopf.apps.diefranks.eu` mit dem bestehenden Wildcard-Zertifikat erreichbar sein. `make deploy` SHALL bauen, hochladen, das vorige Binary als Rückfall behalten, neu starten und die Erreichbarkeit prüfen; `make deploy-rollback`, `deploy-status`, `deploy-logs`, `deploy-restart` SHALL wie in den Schwesterprojekten funktionieren.

#### Scenario: Deploy
- **WHEN** `make deploy` ausgeführt wird
- **THEN** antwortet `https://doppelkopf.apps.diefranks.eu/` mit der neuen Version

#### Scenario: Smoke-Test
- **WHEN** `make smoke URL=…` gegen einen laufenden Server ausgeführt wird
- **THEN** legt das Skript eine Partie mit vier Computergegnern an und sie läuft bis zum Partieende durch
