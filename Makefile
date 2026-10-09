.PHONY: help install dev build test type-check stop clean simulate binary binary-local binary-frontend smoke \
        deploy deploy-upload deploy-check deploy-rollback deploy-logs deploy-status deploy-restart deploy-init

# ── vServer deployment (single binary behind Traefik, see deploy/README.md) ──
DEPLOY_HOST  ?= vServer
DEPLOY_DIR   ?= /opt/doppelkopf
TRAEFIK_DIR  ?= /etc/traefik
# The binary listens on loopback, only Traefik on the same host reaches it.
# Must match doppelkopf.service and traefik-doppelkopf.yml.
# Port 3001 is Ausgebremst, 3002 Molthar.
BIND_IP      ?= 127.0.0.1
SERVICE_PORT ?= 3003
APP_URL      ?= https://doppelkopf.apps.diefranks.eu

BLUE  := \033[0;34m
GREEN := \033[0;32m
NC    := \033[0m

help:
	@echo "$(BLUE)Doppelkopf — Development Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make install         Install all dependencies (bun)"
	@echo "  make dev             Backend (3003) and frontend (5173) in parallel"
	@echo "  make test            All tests (shared + backend)"
	@echo "  make type-check      TypeScript in all packages"
	@echo "  make simulate        Bot tournament (ARGS=\"20 --a=professor --b=heuristic\")"
	@echo ""
	@echo "$(GREEN)Single binary:$(NC)"
	@echo "  make binary-local    dist/doppelkopf for this machine"
	@echo "  make binary          dist/doppelkopf-linux-x64 for the vServer"
	@echo "  make smoke URL=…     Play a complete game against a running server"
	@echo ""
	@echo "$(GREEN)Deployment (vServer):$(NC)"
	@echo "  make deploy-init     One-time: system user and directories on the vServer"
	@echo "  make deploy          Build binary, upload, restart service, health check"
	@echo "  make deploy-rollback Switch back to the previous binary"
	@echo "  make deploy-status | deploy-logs | deploy-restart"

install:
	bun install

dev:
	@echo "$(BLUE)Starting backend (3003) and frontend (5173)...$(NC)"
	@echo "Press Ctrl+C to stop"
	@(cd backend && bun dev) & \
	BACKEND_PID=$$!; \
	(cd game-web && bun dev) & \
	FRONTEND_PID=$$!; \
	trap "kill $$BACKEND_PID $$FRONTEND_PID 2>/dev/null; echo '$(GREEN)✓ Stopped$(NC)'; exit 0" INT; \
	wait

build:
	cd game-web && bun run build

test:
	cd shared && bun test
	cd backend && bun test
	@echo "$(GREEN)✓ Tests complete$(NC)"

type-check:
	cd shared && bun run type-check
	cd backend && bun run type-check
	cd game-web && bun run type-check

simulate:
	cd backend && bun src/simulation/run.ts $(ARGS)

stop:
	@lsof -ti :3003 -sTCP:LISTEN | xargs kill 2>/dev/null || true
	@lsof -ti :5173 -sTCP:LISTEN | xargs kill 2>/dev/null || true
	@echo "$(GREEN)✓ Services stopped$(NC)"

clean:
	rm -rf game-web/dist dist backend/src/embedded/assets.gen.ts
	@echo "$(GREEN)✓ Build artifacts removed$(NC)"

# ── Single binary (server + NPCs + embedded game page) ───────────────────────
# The frontend is built without VITE_BACKEND_URL: the page talks to the origin
# it was loaded from, i.e. the binary itself.
# node-persist is only required by boardgame.io's FlatFile storage, which is
# not used (FileStorage) — it is never loaded at run time.
BINARY_FLAGS := --compile --external node-persist
binary-frontend:
	cd game-web && bun run build --mode production
	cd backend && bun scripts/gen-assets.ts

binary-local: binary-frontend
	cd backend && bun build src/server.ts $(BINARY_FLAGS) --outfile ../dist/doppelkopf
	@echo "$(GREEN)✓ dist/doppelkopf$(NC)"

binary: binary-frontend
	cd backend && bun build src/server.ts $(BINARY_FLAGS) --target=bun-linux-x64 --outfile ../dist/doppelkopf-linux-x64
	@echo "$(GREEN)✓ dist/doppelkopf-linux-x64$(NC)"

smoke:
	@test -n "$(URL)" || { echo "Usage: make smoke URL=http://localhost:3003"; exit 1; }
	cd backend && bun scripts/smoke-game.ts $(URL) $(ARGS)

# ── Deployment (vServer) ──────────────────────────────────────────────────────
deploy-init:
	ssh $(DEPLOY_HOST) 'set -e; id doppelkopf >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin doppelkopf; \
		mkdir -p $(DEPLOY_DIR); \
		systemctl is-active --quiet traefik; test -d $(TRAEFIK_DIR)/dynamic'
	@echo "$(GREEN)✓ vServer ready for make deploy$(NC)"

deploy: binary deploy-upload

deploy-upload:
	@ssh $(DEPLOY_HOST) 'systemctl is-active --quiet traefik' \
		|| { echo "Traefik is not running on $(DEPLOY_HOST) — make server-setup in the spielothek repo"; exit 1; }
	@echo "$(BLUE)Uploading binary, unit and routing...$(NC)"
	scp -q dist/doppelkopf-linux-x64 $(DEPLOY_HOST):$(DEPLOY_DIR)/doppelkopf.new
	scp -q deploy/doppelkopf/doppelkopf.service $(DEPLOY_HOST):/etc/systemd/system/doppelkopf.service
	scp -q deploy/doppelkopf/traefik-doppelkopf.yml $(DEPLOY_HOST):$(TRAEFIK_DIR)/dynamic/doppelkopf.yml
	@# Keep the running binary as .prev for deploy-rollback
	ssh $(DEPLOY_HOST) 'set -e; cd $(DEPLOY_DIR); chmod 755 doppelkopf.new; \
		if [ -f doppelkopf ]; then mv -f doppelkopf doppelkopf.prev; fi; mv doppelkopf.new doppelkopf; \
		systemctl daemon-reload; systemctl enable --quiet doppelkopf; systemctl restart doppelkopf'
	@$(MAKE) --no-print-directory deploy-check
	@echo "$(GREEN)✓ Deployed: $(APP_URL)$(NC)"

deploy-check:
	@ssh $(DEPLOY_HOST) 'for i in $$(seq 1 30); do curl -sf -o /dev/null http://$(BIND_IP):$(SERVICE_PORT)/games && exit 0; sleep 0.5; done; exit 1' \
		|| { echo "Service does not answer — see make deploy-logs"; exit 1; }
	@for i in $$(seq 1 20); do curl -sf -o /dev/null $(APP_URL)/ && break; sleep 1; done; \
		curl -sf -o /dev/null $(APP_URL)/ || { echo "$(APP_URL) does not answer via Traefik"; exit 1; }
	@echo "$(GREEN)✓ Service answers (local and via Traefik)$(NC)"

deploy-rollback:
	ssh $(DEPLOY_HOST) 'set -e; cd $(DEPLOY_DIR); test -f doppelkopf.prev || { echo "no previous binary"; exit 1; }; \
		mv doppelkopf doppelkopf.tmp; mv doppelkopf.prev doppelkopf; mv doppelkopf.tmp doppelkopf.prev; \
		systemctl restart doppelkopf'
	@$(MAKE) --no-print-directory deploy-check

deploy-status:
	ssh $(DEPLOY_HOST) 'systemctl status doppelkopf --no-pager | head -12; sha256sum $(DEPLOY_DIR)/doppelkopf*'

deploy-logs:
	ssh -t $(DEPLOY_HOST) 'journalctl -u doppelkopf -f -n 100'

deploy-restart:
	ssh $(DEPLOY_HOST) 'systemctl restart doppelkopf'
	@$(MAKE) --no-print-directory deploy-check
