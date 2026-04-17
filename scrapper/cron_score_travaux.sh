#!/bin/bash
# Score Travaux lourds — CLI Claude Max (0€)
# Installation : crontab -e → décommenter la ligne ci-dessous après calibration
# 0 4 * * * /home/openclaw/monpetitmdb/scrapper/cron_score_travaux.sh
# DÉSACTIVÉ — activer après calibration du script score (demain)

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="python3"
LOG_DIR="/home/openclaw/logs/extractions"
LOG_FILE="$LOG_DIR/score_travaux_$(date +%Y%m%d_%H%M).log"
LOCK_FILE="/tmp/cron_score_travaux.lock"

mkdir -p "$LOG_DIR"

# Verrou — empêche exécutions concurrentes
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "$(date) — Déjà en cours (PID $PID), arrêt." >> "$LOG_FILE"
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

cd "$SCRIPT_DIR"

echo "=================================================" >> "$LOG_FILE"
echo "$(date) — Démarrage score travaux lourds" >> "$LOG_FILE"
echo "=================================================" >> "$LOG_FILE"

$PYTHON batch_extraction_biens.py score --limit 100 2>&1 | tee -a "$LOG_FILE"

echo "$(date) — Terminé" >> "$LOG_FILE"

# Purge logs > 30 jours
find "$LOG_DIR" -name "score_travaux_*.log" -mtime +30 -delete
