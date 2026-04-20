#!/bin/bash
LOG_DIR="/home/openclaw/logs/extractions"
mkdir -p "$LOG_DIR"
DATE=$(date +%Y-%m-%d)
LOG="$LOG_DIR/nuit_${DATE}.log"
cd /home/openclaw/monpetitmdb/scrapper

echo "=== $(date) — Extraction nuit début ===" | tee -a "$LOG"

echo "--- locataire ---" | tee -a "$LOG"
python3 batch_extraction_biens.py locataire   --source stream_estate --limit 5000   --batch-size 15 --workers 2 2>&1 | tee -a "$LOG"

echo "--- idr ---" | tee -a "$LOG"
python3 batch_extraction_biens.py idr   --source stream_estate --limit 3000   --batch-size 5 --workers 5 2>&1 | tee -a "$LOG"

echo "--- score travaux ---" | tee -a "$LOG"
python3 batch_extraction_biens.py score   --source stream_estate --limit 1000 2>&1 | tee -a "$LOG"

echo "=== $(date) — Extraction nuit terminée ===" | tee -a "$LOG"
