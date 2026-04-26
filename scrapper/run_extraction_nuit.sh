#!/bin/bash
LOG_DIR="/home/openclaw/logs/extractions"
mkdir -p "$LOG_DIR"
DATE=$(date +%Y-%m-%d)
LOG="$LOG_DIR/nuit_${DATE}.log"
cd /home/openclaw/monpetitmdb/scrapper

echo "=== $(date) — Extraction nuit début ===" | tee -a "$LOG"

# Pre-flight : vérifier que le token OAuth Claude CLI est valide
if ! claude -p "ok" --max-turns 1 --output-format json > /dev/null 2>&1; then
    echo "$(date) ERREUR AUTH: Claude CLI non authentifié — batch annulé" | tee -a "$LOG"
    exit 1
fi
echo "$(date) Auth CLI OK" | tee -a "$LOG"

echo "--- locataire ---" | tee -a "$LOG"
python3 batch_extraction_biens.py locataire   --source stream_estate --limit 5000   --batch-size 15 --workers 2 2>&1 | tee -a "$LOG"

echo "--- idr ---" | tee -a "$LOG"
python3 batch_extraction_biens.py idr   --source stream_estate --limit 3000   --batch-size 5 --workers 5 2>&1 | tee -a "$LOG"

echo "--- score travaux ---" | tee -a "$LOG"
python3 batch_extraction_biens.py score   --source stream_estate --limit 1000 2>&1 | tee -a "$LOG"

echo "=== $(date) — Extraction nuit terminée ===" | tee -a "$LOG"

# ── Écriture des résultats dans cron_config Supabase ─────────────────────────
source /home/openclaw/monpetitmdb/scrapper/.env 2>/dev/null || true
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
    SUMMARY=$(python3 - "$LOG" <<'PYEOF' 2>/dev/null
import json, re, sys

log_file = sys.argv[1] if len(sys.argv) > 1 else ''
try:
    content = open(log_file).read()
except Exception:
    sys.exit(1)

def parse_result(pattern, text):
    m = re.search(pattern, text)
    return m.groups() if m else None

# LEP: "Résultat : X traités, Y loyers trouvés, Z profils trouvés, W erreurs"
lep = parse_result(r'Résultat : (\d+) traités, (\d+) loyers trouvés, (\d+) profils trouvés, (\d+) erreurs', content)
# IDR: "Résultat : X traités, Y avec lots, Z erreurs"
idr = parse_result(r'Résultat : (\d+) traités, (\d+) avec lots, (\d+) erreurs', content)
# Travaux: "Résultat : X traités, Y scorés, Z erreurs"
trv = parse_result(r'Résultat : (\d+) traités, (\d+) scorés, (\d+) erreurs', content)

result = {
    'lep': {'processed': int(lep[0]), 'loyers': int(lep[1]), 'profils': int(lep[2]), 'errors': int(lep[3])} if lep else {},
    'idr': {'processed': int(idr[0]), 'avec_lots': int(idr[1]), 'errors': int(idr[2])} if idr else {},
    'travaux': {'processed': int(trv[0]), 'scores': int(trv[1]), 'errors': int(trv[2])} if trv else {},
    'status': 'success',
}
print(json.dumps(result))
PYEOF
)
    if [ -n "$SUMMARY" ]; then
        NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        PAYLOAD="{\"id\":\"extraction_nuit\",\"enabled\":true,\"schedule\":\"0 4 * * *\",\"last_run\":\"$NOW\",\"last_result\":$SUMMARY}"
        curl -s -X POST "${SUPABASE_URL}/rest/v1/cron_config" \
            -H "apikey: ${SUPABASE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_KEY}" \
            -H "Content-Type: application/json" \
            -H "Prefer: resolution=merge-duplicates" \
            -d "$PAYLOAD" > /dev/null
        echo "$(date) cron_config extraction_nuit mis à jour" | tee -a "$LOG"
    fi
fi
