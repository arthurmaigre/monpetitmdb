#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# cron_encheres.sh — Pipeline quotidien enchères judiciaires (VPS Hetzner)
#
# Pipeline :
#   1. Scraping 3 sources (Licitor + Avoventes + Vench) → données fiables + raw_text
#   2. Extraction Opus (CLI Claude Max) → normalise et peuple toutes les colonnes texte
#   3. Dédup cross-source → fusionne les doublons entre sources
#   4. Mise à jour statuts → enchères passées marquées adjugé/surenchère
#
# Installation crontab :
#   crontab -e
#   0 3 * * * /home/mdb/monpetitmdb/scrapper/cron_encheres.sh >> /var/log/encheres_cron.log 2>&1
#
# Pré-requis VPS :
#   - Python 3.10+ avec pip
#   - pip install requests beautifulsoup4 python-dotenv supabase pdfplumber playwright
#   - playwright install chromium (pour Avoventes)
#   - scrapper/.env avec SUPABASE_URL, SUPABASE_KEY
#   - claude CLI connecté via Max (claude login)
# ══════════════════════════════════════════════════════════════════════════════

# Pas de set -e : chaque phase gère ses erreurs, on continue les suivantes

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/home/openclaw/logs/encheres"
LOG_FILE="$LOG_DIR/encheres_$(date +%Y%m%d_%H%M).log"
PYTHON="${PYTHON:-python3}"
LOCK_FILE="/tmp/cron_encheres.lock"

# Verrou : ne pas lancer si un run est déjà en cours
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "$(date) — Run déjà en cours (PID $PID), skip" >> /home/openclaw/logs/encheres/encheres_cron.log
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

# ── Phase 2 : Extraction Opus (via CLI Claude Max) ──────────────────────────
echo "" | tee -a "$LOG_FILE"
echo ">>> PHASE 2 : Extraction Opus (nouveaux biens)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

$PYTHON batch_extraction_encheres.py 2>&1 | tee -a "$LOG_FILE"

# ── Phase 3 : Dédup cross-source ────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo ">>> PHASE 3 : Dédup cross-source" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

$PYTHON batch_dedup_cross.py 2>&1 | tee -a "$LOG_FILE"

# ── Phase 4 : Mise à jour statuts (enchères passées → adjugé/surenchère) ────
echo "" | tee -a "$LOG_FILE"
echo ">>> PHASE 4 : Mise à jour statuts" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

$PYTHON -c "
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path('$SCRIPT_DIR/.env'))
from encheres_supabase import update_statuts_passes
count = update_statuts_passes()
print(f'Statuts mis à jour : {count}')
" 2>&1 | tee -a "$LOG_FILE"

# ── Fin ───────────────────────────────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo "══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "  Pipeline terminé — $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "══════════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"

# Nettoyage vieux logs (garder 30 jours)
find "$LOG_DIR" -name "encheres_*.log" -mtime +30 -delete 2>/dev/null || true

# ── Écriture des résultats dans cron_config Supabase ─────────────────────────
source "$SCRIPT_DIR/.env" 2>/dev/null || true
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
    SUMMARY=$($PYTHON - "$LOG_FILE" <<'PYEOF' 2>/dev/null
import json, re, sys

log_file = sys.argv[1] if len(sys.argv) > 1 else ''
if not log_file:
    sys.exit(1)
try:
    content = open(log_file).read()
except Exception:
    sys.exit(1)

def parse_json(pattern, text):
    m = re.search(pattern, text)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return {}

phase1 = {}
for src in ['licitor', 'avoventes', 'vench']:
    d = parse_json(rf'{src} INFO Résultat: (\{{[^}}]+\}})', content)
    phase1[src] = {'nouveaux': d.get('inserted', 0), 'deja_en_base': d.get('updated', 0)}

phase2 = parse_json(r'Terminé: (\{[^}]+\})', content)
phase3 = parse_json(r'Dédup terminée: (\{[^}]+\})', content)

m4 = re.search(r'Statuts mis à jour : (\d+)', content)
phase4_count = int(m4.group(1)) if m4 else 0

p1_total = sum(v['nouveaux'] for v in phase1.values())
p1_deja = sum(v['deja_en_base'] for v in phase1.values())
result = {
    'phase1': {**phase1, 'total_nouveaux': p1_total, 'total_deja_en_base': p1_deja},
    'phase2': {'extracted': phase2.get('ok', 0), 'errors': phase2.get('echec', 0) + phase2.get('no_data', 0)},
    'phase3': {'fusions': phase3.get('merged', 0), 'supprimes': phase3.get('duplicates_removed', 0)},
    'phase4': {'updated': phase4_count},
    'status': 'success',
}
print(json.dumps(result))
PYEOF
)
    if [ -n "$SUMMARY" ]; then
        NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        PAYLOAD="{\"id\":\"encheres_pipeline\",\"enabled\":true,\"schedule\":\"5 0 * * *\",\"last_run\":\"$NOW\",\"last_result\":$SUMMARY}"
        curl -s -X POST "${SUPABASE_URL}/rest/v1/cron_config" \
            -H "apikey: ${SUPABASE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_KEY}" \
            -H "Content-Type: application/json" \
            -H "Prefer: resolution=merge-duplicates" \
            -d "$PAYLOAD" > /dev/null
        echo "$(date) cron_config encheres_pipeline mis à jour" | tee -a "$LOG_FILE"
    fi
fi
