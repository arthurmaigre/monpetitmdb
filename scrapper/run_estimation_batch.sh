#!/bin/bash
LOG_DIR="/home/openclaw/logs/estimation"
mkdir -p "$LOG_DIR"
DATE=$(date +%Y-%m-%d)
LOG="$LOG_DIR/estimation_${DATE}.log"
LOCK="/tmp/estimation_batch.lock"
TSX="/home/openclaw/.npm-global/bin/tsx"

# Lock file — évite les runs concurrents
if [ -f "$LOCK" ]; then
  PID=$(cat "$LOCK")
  if kill -0 "$PID" 2>/dev/null; then
    echo "$(date) — déjà en cours (PID $PID), skip" | tee -a "$LOG"
    exit 0
  fi
fi
echo $$ > "$LOCK"
trap "rm -f $LOCK" EXIT

cd /home/openclaw/monpetitmdb/scrapper

echo "=== $(date) — Estimation batch début ===" | tee -a "$LOG"
"$TSX" estimation_batch.ts --limit=150 2>&1 | tee -a "$LOG"
echo "=== $(date) — Estimation batch terminée ===" | tee -a "$LOG"

# Cleanup logs >30 jours
find "$LOG_DIR" -name "estimation_*.log" -mtime +30 -delete
