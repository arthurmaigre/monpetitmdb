#!/bin/bash
# Extraction IA Locataire en place — CLI Claude Max (0€)
# Installation : crontab -e → 0 4 * * * /home/openclaw/monpetitmdb/scrapper/cron_locataire.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="python3"
LOG_DIR="/home/openclaw/logs/extractions"
LOG_FILE="$LOG_DIR/locataire_$(date +%Y%m%d_%H%M).log"
LOCK_FILE="/tmp/cron_locataire.lock"

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
echo "$(date) — Démarrage extraction Locataire en place" >> "$LOG_FILE"
echo "=================================================" >> "$LOG_FILE"

$PYTHON batch_extraction_biens.py locataire --limit 20000 --workers 3 --batch-size 15 2>&1 | tee -a "$LOG_FILE"

echo "$(date) — Terminé" >> "$LOG_FILE"

# Purge logs > 30 jours
find "$LOG_DIR" -name "locataire_*.log" -mtime +30 -delete
