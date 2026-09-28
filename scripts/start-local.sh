#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONDA_DIR="${HOME}/miniforge3"
PGDATA="${HOME}/.email-job-scheduler/pgdata"
STATE_DIR="${HOME}/.email-job-scheduler"

export PATH="${HOME}/.local/node/bin:${CONDA_DIR}/bin:${PATH}"

if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  pg_ctl -D "$PGDATA" -l "$STATE_DIR/postgres.log" -o "-p 5432" start
fi

if [[ "$(redis-cli ping 2>/dev/null || true)" != "PONG" ]]; then
  redis-server --daemonize yes --bind 127.0.0.1 --port 6379 --dir "$STATE_DIR" --logfile "$STATE_DIR/redis.log"
fi

cd "$ROOT_DIR/backend"
npm run prisma:migrate -- --name local >/dev/null
nohup npm run dev > "$STATE_DIR/api.log" 2>&1 &
nohup npm run worker > "$STATE_DIR/worker.log" 2>&1 &

cd "$ROOT_DIR/frontend"
nohup npm run dev -- --host 0.0.0.0 > "$STATE_DIR/frontend.log" 2>&1 &

echo "API:      http://localhost:4000"
echo "Frontend: http://localhost:5173/login"
echo "Logs:     $STATE_DIR"
