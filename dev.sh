#!/bin/bash
# Casino Chat SaaS — Dev Environment Manager
# Usage:
#   ./dev.sh start    — Start everything (Docker + Backend + Admin + Widget)
#   ./dev.sh stop     — Stop everything
#   ./dev.sh restart  — Restart everything
#   ./dev.sh status   — Show what's running
#   ./dev.sh logs     — Tail all logs
#   ./dev.sh backend  — Start/restart backend only
#   ./dev.sh admin    — Start/restart admin only
#   ./dev.sh widget   — Start/restart widget only
#   ./dev.sh db       — Start/restart Docker (PostgreSQL + Redis) only
#   ./dev.sh seed     — Re-seed the database

set -e
cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

LOG_DIR=".dev-logs"
mkdir -p "$LOG_DIR"

# --- Helpers ---

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}🎰 Casino Chat SaaS — Dev Manager${NC}"
  echo -e "${CYAN}────────────────────────────────────${NC}"
}

log_ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
log_err()  { echo -e "  ${RED}✗${NC} $1"; }
log_info() { echo -e "  ${BLUE}→${NC} $1"; }

is_port_used() {
  lsof -i :"$1" -sTCP:LISTEN >/dev/null 2>&1
}

kill_port() {
  local pids
  pids=$(lsof -ti :"$1" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

wait_for_port() {
  local port=$1 name=$2 timeout=${3:-30}
  local elapsed=0
  while ! is_port_used "$port"; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [ $elapsed -ge $timeout ]; then
      log_err "$name failed to start on port $port (timeout ${timeout}s)"
      return 1
    fi
  done
  log_ok "$name running on port $port"
}

# --- Docker (PostgreSQL + Redis) ---

start_db() {
  echo -e "\n${BOLD}Database & Cache${NC}"
  if docker ps --format '{{.Names}}' | grep -q casino-chat-postgres; then
    log_ok "PostgreSQL already running (port 5434)"
  else
    log_info "Starting PostgreSQL + Redis..."
    docker compose up -d postgres redis >/dev/null 2>&1
    wait_for_port 5434 "PostgreSQL" 30
  fi
  if docker ps --format '{{.Names}}' | grep -q casino-chat-redis; then
    log_ok "Redis already running (port 6381)"
  else
    wait_for_port 6381 "Redis" 15
  fi
}

stop_db() {
  echo -e "\n${BOLD}Database & Cache${NC}"
  docker compose down >/dev/null 2>&1 && log_ok "Docker containers stopped" || log_warn "Docker not running"
}

# --- Backend (NestJS) ---

start_backend() {
  echo -e "\n${BOLD}Backend (NestJS)${NC}"
  if is_port_used 3000; then
    log_ok "Backend already running (port 3000)"
    return
  fi
  log_info "Starting backend..."
  cd packages/backend
  pnpm run start:dev > "../../$LOG_DIR/backend.log" 2>&1 &
  echo $! > "../../$LOG_DIR/backend.pid"
  cd ../..
  wait_for_port 3000 "Backend" 30
}

stop_backend() {
  echo -e "\n${BOLD}Backend (NestJS)${NC}"
  if [ -f "$LOG_DIR/backend.pid" ]; then
    kill -9 "$(cat "$LOG_DIR/backend.pid")" 2>/dev/null || true
    rm -f "$LOG_DIR/backend.pid"
  fi
  kill_port 3000
  log_ok "Backend stopped"
}

# --- Admin (React + Vite) ---

start_admin() {
  echo -e "\n${BOLD}Admin Panel (React)${NC}"
  if is_port_used 3001; then
    log_ok "Admin already running (port 3001)"
    return
  fi
  log_info "Starting admin panel..."
  cd packages/admin
  pnpm exec vite --port 3001 > "../../$LOG_DIR/admin.log" 2>&1 &
  echo $! > "../../$LOG_DIR/admin.pid"
  cd ../..
  wait_for_port 3001 "Admin panel" 15
}

stop_admin() {
  echo -e "\n${BOLD}Admin Panel (React)${NC}"
  if [ -f "$LOG_DIR/admin.pid" ]; then
    kill -9 "$(cat "$LOG_DIR/admin.pid")" 2>/dev/null || true
    rm -f "$LOG_DIR/admin.pid"
  fi
  kill_port 3001
  log_ok "Admin stopped"
}

# --- Widget (Preact + Vite) ---

start_widget() {
  echo -e "\n${BOLD}Widget (Preact)${NC}"
  if is_port_used 3002; then
    log_ok "Widget already running (port 3002)"
    return
  fi
  log_info "Starting widget dev server..."
  cd packages/widget
  pnpm exec vite --port 3002 > "../../$LOG_DIR/widget.log" 2>&1 &
  echo $! > "../../$LOG_DIR/widget.pid"
  cd ../..
  wait_for_port 3002 "Widget dev" 15
}

stop_widget() {
  echo -e "\n${BOLD}Widget (Preact)${NC}"
  if [ -f "$LOG_DIR/widget.pid" ]; then
    kill -9 "$(cat "$LOG_DIR/widget.pid")" 2>/dev/null || true
    rm -f "$LOG_DIR/widget.pid"
  fi
  kill_port 3002
  log_ok "Widget stopped"
}

# --- Commands ---

cmd_start() {
  print_header
  echo -e "${GREEN}Starting all services...${NC}"
  start_db
  start_backend
  start_admin
  start_widget
  echo ""
  echo -e "${GREEN}${BOLD}All services running!${NC}"
  echo ""
  echo -e "  Backend:    ${CYAN}http://localhost:3000${NC}     (API + WebSocket)"
  echo -e "  Admin:      ${CYAN}http://localhost:3001${NC}     (Admin Panel)"
  echo -e "  Widget:     ${CYAN}http://localhost:3002${NC}     (Widget Dev)"
  echo -e "  Swagger:    ${CYAN}http://localhost:3000/api/docs${NC}"
  echo -e "  PostgreSQL: ${CYAN}localhost:5434${NC}"
  echo -e "  Redis:      ${CYAN}localhost:6381${NC}"
  echo ""
  echo -e "  Stop: ${YELLOW}./dev.sh stop${NC}"
  echo ""
  echo -e "${BOLD}Tailing logs (Ctrl+C to detach — services keep running):${NC}\n"
  tail -f "$LOG_DIR"/*.log 2>/dev/null || echo "No logs yet."
}

cmd_stop() {
  print_header
  echo -e "${RED}Stopping all services...${NC}"
  stop_widget
  stop_admin
  stop_backend
  stop_db
  echo ""
  echo -e "${RED}${BOLD}All services stopped.${NC}"
  echo ""
}

cmd_restart() {
  cmd_stop
  sleep 2
  cmd_start
}

cmd_status() {
  print_header
  echo -e "\n${BOLD}Service Status${NC}"

  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q casino-chat-postgres; then
    log_ok "PostgreSQL     — port 5434"
  else
    log_err "PostgreSQL     — not running"
  fi

  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q casino-chat-redis; then
    log_ok "Redis          — port 6381"
  else
    log_err "Redis          — not running"
  fi

  if is_port_used 3000; then
    log_ok "Backend        — port 3000"
  else
    log_err "Backend        — not running"
  fi

  if is_port_used 3001; then
    log_ok "Admin Panel    — port 3001"
  else
    log_err "Admin Panel    — not running"
  fi

  if is_port_used 3002; then
    log_ok "Widget Dev     — port 3002"
  else
    log_err "Widget Dev     — not running"
  fi
  echo ""
}

cmd_logs() {
  print_header
  echo -e "${BOLD}Tailing all logs (Ctrl+C to stop)${NC}\n"
  tail -f "$LOG_DIR"/*.log 2>/dev/null || echo "No logs found. Start services first."
}

cmd_seed() {
  print_header
  echo -e "${BOLD}Re-seeding database...${NC}\n"
  cd packages/backend
  pnpm exec prisma db seed 2>&1
  cd ../..
  log_ok "Database seeded"
  echo ""
}

# --- Main ---

case "${1:-}" in
  start)    cmd_start ;;
  stop)     cmd_stop ;;
  restart)  cmd_restart ;;
  status)   cmd_status ;;
  logs)     cmd_logs ;;
  seed)     cmd_seed ;;
  backend)  stop_backend; start_backend ;;
  admin)    stop_admin; start_admin ;;
  widget)   stop_widget; start_widget ;;
  db)       stop_db; start_db ;;
  *)
    print_header
    echo ""
    echo -e "  ${BOLD}Usage:${NC} ./dev.sh ${CYAN}<command>${NC}"
    echo ""
    echo -e "  ${CYAN}start${NC}     Start everything (Docker + Backend + Admin + Widget)"
    echo -e "  ${CYAN}stop${NC}      Stop everything"
    echo -e "  ${CYAN}restart${NC}   Restart everything"
    echo -e "  ${CYAN}status${NC}    Show what's running"
    echo -e "  ${CYAN}logs${NC}      Tail all logs"
    echo -e "  ${CYAN}seed${NC}      Re-seed the database"
    echo ""
    echo -e "  ${CYAN}backend${NC}   Start/restart backend only"
    echo -e "  ${CYAN}admin${NC}     Start/restart admin only"
    echo -e "  ${CYAN}widget${NC}    Start/restart widget only"
    echo -e "  ${CYAN}db${NC}        Start/restart Docker (PostgreSQL + Redis) only"
    echo ""
    ;;
esac
