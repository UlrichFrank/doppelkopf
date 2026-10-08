# Deployment: Doppelkopf als Single Binary auf dem vServer

Doppelkopf läuft wie Ausgebremst und Molthar als **ein** ausführbares Binary (Spielserver, Computergegner und Spielseite), betrieben von systemd. Davor steht der gemeinsame Traefik-Reverse-Proxy.

```
Internet ──443──▶ Traefik (Docker-Stack ~/deploy/traefik, Wildcard-Zertifikat *.apps.diefranks.eu)
                     │ File-Provider: ~/deploy/traefik/dynamic/doppelkopf.yml
                     ▼
            172.18.0.1:3003  (Gateway des Docker-Netzes "web" = Host)
                     │
            systemd: doppelkopf.service  →  /opt/doppelkopf/doppelkopf
                                             Partien: /var/lib/doppelkopf/matches.json
                                             NPC-Zugangsdaten: /var/lib/doppelkopf/npc-credentials.json
```

- `https://doppelkopf.apps.diefranks.eu` ist Spielseite (PWA), Lobby-API und Socket.IO unter einem Origin.
- Der Dienst lauscht nur auf 172.18.0.1:3003 (3001 = Ausgebremst, 3002 = Molthar).

| Datei im Repo | Ziel auf dem Server |
|---|---|
| `deploy/doppelkopf/doppelkopf.service` | `/etc/systemd/system/doppelkopf.service` |
| `deploy/doppelkopf/traefik-doppelkopf.yml` | `/root/deploy/traefik/dynamic/doppelkopf.yml` |
| `dist/doppelkopf-linux-x64` (`make binary`) | `/opt/doppelkopf/doppelkopf` |

## Alltag

```bash
make deploy            # Binary bauen (linux-x64), hochladen, Dienst neu starten, Health-Check
make deploy-rollback   # zurück auf das vorherige Binary (doppelkopf.prev)
make deploy-status     # systemd-Status und Prüfsummen
make deploy-logs       # Live-Logs (journalctl)
make deploy-restart    # Dienst neu starten
make smoke URL=https://doppelkopf.apps.diefranks.eu ARGS="--rounds=1"   # Partie gegen Produktion
```

Spielstände werden beim Stoppen (SIGTERM) sofort geschrieben; laufende Partien und die Computergegner überstehen jeden Deploy. Nach einem Deploy holt sich die installierte PWA beim nächsten Start die neue Version (Service Worker: Navigation network-first, versionierter Cache).

Lokal testen:

```bash
make binary-local && PORT=3931 MATCHES_FILE=/tmp/m.json NPC_DATA_DIR=/tmp ./dist/doppelkopf
NPC_THINK_FACTOR=0.05 …   # Computergegner ohne Bedenkzeit (Smoke-Tests)
make smoke URL=http://localhost:3931
```

## Erstinstallation (einmalig)

Voraussetzung: Traefik-Stack mit File-Provider (`/etc/traefik/dynamic`, von Ausgebremst eingerichtet) und Docker-Netz `web` mit Gateway 172.18.0.1.

```bash
make deploy-init   # Systembenutzer doppelkopf, /opt/doppelkopf, prüft Gateway und File-Provider
make deploy
```
