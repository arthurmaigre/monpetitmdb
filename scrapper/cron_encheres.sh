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

# ── Phase 4 : Mise à jour statuts (a_venir → adjuge si date passée) ──────────
echo "" | tee -a "$LOG_FILE"
echo ">>> PHASE 4 : Mise à jour statuts" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

$PYTHON -c "from dotenv import load_dotenv; load_dotenv('.env'); from encheres_supabase import update_statuts_passes; update_statuts_passes()" 2>&1 | tee -a "$LOG_FILE"

# ── Phase 5 : Normalisation programmatique (TJ, ville, avocat — gratuit) ─────
echo "" | tee -a "$LOG_FILE"
echo ">>> PHASE 5 : Normalisation programmatique" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

$PYTHON -c "
import re, json
from dotenv import load_dotenv; load_dotenv('.env')
from supabase_client import get_client
c = get_client()
offset = 0; fixed = 0
while True:
    r = c.table('encheres').select('id, tribunal, ville, avocat_nom, avocat_cabinet, avocat_tel').range(offset, offset + 99).execute()
    rows = r.data or []
    if not rows: break
    for row in rows:
        update = {}
        tj = row.get('tribunal')
        if tj:
            clean = re.sub(r'^(?:TJ\s+de\s+)+', '', tj, flags=re.I)
            clean = re.sub(r'^(?:TJ|TGI|Tribunal\s+Judiciaire|Tribunal\s+de\s+Grande\s+Instance)\s+(?:de\s+|d.)?', '', clean, flags=re.I).strip().rstrip(',.')
            new_tj = 'TJ de ' + clean.title() if clean else None
            if new_tj and new_tj != tj: update['tribunal'] = new_tj
        ville = row.get('ville')
        if ville and (ville.isupper() or ville.islower()):
            update['ville'] = ville.title()
        nom = row.get('avocat_nom')
        if nom:
            new_nom = re.sub(r'^(?:Ma.tre|Me|Mtre|ME\.?)\s+', '', nom.strip())
            parts = new_nom.split()
            norm = [p.capitalize() if p.isupper() and len(p) > 2 else p for p in parts]
            new_nom = ' '.join(norm)
            if new_nom != nom: update['avocat_nom'] = new_nom
        tel = row.get('avocat_tel')
        if tel:
            digits = re.sub(r'\D', '', tel)
            if len(digits) == 10:
                new_tel = ' '.join([digits[i:i+2] for i in range(0, 10, 2)])
                if new_tel != tel: update['avocat_tel'] = new_tel
        if update:
            c.table('encheres').update(update).eq('id', row['id']).execute()
            fixed += 1
    offset += len(rows)
    if len(rows) < 100: break
print(f'{fixed} biens normalisés')
" 2>&1 | tee -a "$LOG_FILE"

# ── Fin ───────────────────────────────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo "══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "  Pipeline terminé — $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"

# Nettoyage vieux logs (garder 30 jours)
find "$LOG_DIR" -name "encheres_*.log" -mtime +30 -delete 2>/dev/null || true
