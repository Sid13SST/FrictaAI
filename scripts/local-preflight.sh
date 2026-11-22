#!/usr/bin/env bash
# Preflight for running Fricta locally with docker-compose.prod.yml.
# Checks prerequisites and .env WITHOUT printing any secret value.
# Usage: scripts/local-preflight.sh   (from the repo root)
set -u
cd "$(dirname "$0")/.."
fail=0
ok()   { printf '  \033[32mok\033[0m   %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fail=1; }
warn() { printf '  \033[33mwarn\033[0m %s\n' "$1"; }

echo "Fricta local preflight"

command -v docker >/dev/null 2>&1 && ok "docker CLI found" || bad "docker not installed (Docker Desktop on macOS/Windows, Docker Engine on Linux)"
docker info >/dev/null 2>&1 && ok "docker daemon reachable" || bad "docker daemon not running (start Docker Desktop / dockerd)"
docker compose version >/dev/null 2>&1 && ok "docker compose v2 available" || bad "'docker compose' (v2 plugin) not available"

if [ ! -f .env ]; then
  bad ".env missing: cp .env.example .env and fill it in"
else
  ok ".env present"
  val() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
  need() {
    local v; v="$(val "$1")"
    if [ -z "$v" ] || printf '%s' "$v" | grep -qE '\.\.\.$|^change-me|^your_'; then bad "$1 is empty or still a placeholder"; else ok "$1 set"; fi
  }
  need POSTGRES_PASSWORD
  need TOKEN_ENCRYPTION_KEY
  need CLERK_SECRET_KEY
  need CLERK_PUBLISHABLE_KEY
  need VITE_CLERK_PUBLISHABLE_KEY
  case "$(val CLERK_PUBLISHABLE_KEY)" in pk_test_*|pk_live_*) ;; *) warn "CLERK_PUBLISHABLE_KEY does not look like pk_test_/pk_live_";; esac
  [ "$(val CLERK_PUBLISHABLE_KEY)" = "$(val VITE_CLERK_PUBLISHABLE_KEY)" ] || warn "CLERK_PUBLISHABLE_KEY and VITE_CLERK_PUBLISHABLE_KEY differ (they should be the same Clerk app)"
  if [ -n "$(val AGENT_BASE_URL)" ]; then ok "AGENT_BASE_URL set (OpenAI-compatible endpoint)"; else need OPENROUTER_API_KEY; fi
  for m in AGENT_MODEL AGENT_VISION_MODEL; do
    v="$(val $m)"
    if [ -n "$v" ] && [ "$v" != "openrouter/free" ] && [ "${v%:free}" = "$v" ] && [ "$(val ALLOW_PAID_MODELS)" != "true" ]; then
      bad "$m=$v is not a :free model (the backend will refuse to start)"
    fi
  done
fi

port="$( [ -f .env ] && grep -E '^FRONTEND_PORT=' .env | cut -d= -f2 | tr -d '"' )"; port="${port:-8080}"
for p in "$port" 3001; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then bad "port $p already in use on 127.0.0.1"; else ok "port $p free"; fi
done

echo
if [ "$fail" -eq 0 ]; then
  echo "Ready. Start with:"
  echo "  docker compose -f docker-compose.prod.yml --env-file .env up --build -d"
  echo "Then open http://localhost:$port (first build takes several minutes)."
else
  echo "Fix the FAIL items above, then re-run scripts/local-preflight.sh"
  exit 1
fi
