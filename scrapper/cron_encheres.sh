#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# cron_encheres.sh — Pipeline quotidien enchères judiciaires (VPS Hetzner)
#
# Pipeline :
#   1. Scraping 3 sources (Licitor + Avoventes + Vench) → données fiables + raw_text
#   2. Extraction Sonnet → normalise et peuple toutes les colonnes texte
#   3. Dédup cross-source → fusionne les doublons entre sources
#
# Installation crontab :
#   crontab -e
#   0 3 * * * /home/mdb/monpetitmdb/scrapper/cron_encheres.sh >> /var/log/encheres_cron.log 2>&1
#
# Pré-requis VPS :
#   - Python 3.10+ avec pip
#   - pip install requests beautifulsoup4 python-dotenv supabase anthropic pdfplumber playwright
#   - playwright install chromium (pour Avoventes)
#   - scrapper/.env avec SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY
# ══════════════════════════════════════════════════════════════════════════════

set -e

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/var/log/encheres"
LOG_FILE="$LOG_DIR/encheres_$(date +%Y%m%d_%H%M).log"
PYTHON="${PYTHON:-python3}"
LOCK_FILE="/tmp/cron_encheres.lock"

# Verrou : ne pas lancer si un run est déjà en cours
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "$(date) — Run déjà en cours (PID $PID), skip" >> /var/log/encheres_cron.log
        exit 0
    fi
    rm -f "$LOCK_FILE"
fi
echo $$ > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# Créer le répertoire de logs si nécessaire
mkdir -p "$LOG_DIR"

cd "$SCRIPT_DIR"

echo "══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "  Pipeline enchères — $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"

# ── Phase 1 : Scraping ───────────────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo ">>> PHASE 1 : Scraping 3 sources" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

$PYTHON scraper_encheres.py 2>&1 | tee -a "$LOG_FILE"
SCRAPING_EXIT=$?

if [ $SCRAPING_EXIT -ne 0 ]; then
    echo "ERREUR scraping (exit $SCRAPING_EXIT) — on continue avec l'extraction" | tee -a "$LOG_FILE"
fi

# ── Phase 2 : Extraction Sonnet ──────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo ">>> PHASE 2 : Extraction Sonnet (texte + PDFs)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

$PYTHON batch_encheres_extraction.py 2>&1 | tee -a "$LOG_FILE"
EXTRACTION_EXIT=$?

if [ $EXTRACTION_EXIT -ne 0 ]; then
    echo "ERREUR extraction (exit $EXTRACTION_EXIT) — on continue avec la dédup" | tee -a "$LOG_FILE"
fi

# ── Phase 3 : Dédup cross-source ─────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo ">>> PHASE 3 : Dédup cross-source" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

$PYTHON dedup_cross_source.py 2>&1 | tee -a "$LOG_FILE"

# ── Fin ───────────────────────────────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo "══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "  Pipeline terminé — $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"

# Nettoyage vieux logs (garder 30 jours)
find "$LOG_DIR" -name "encheres_*.log" -mtime +30 -delete 2>/dev/null || true
