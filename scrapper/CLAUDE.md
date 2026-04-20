# Scrapper — Contexte Python & VPS

## VPS Hetzner

- **IP** : 178.104.58.122 | **User** : `openclaw` | **Root** : `root`
- Python 3.12 + Playwright + Chromium + psql
- **SSH** : `ssh openclaw@178.104.58.122` (clé SSH configurée)

## Crons actifs (VPS)

| Heure | Script | Log |
|---|---|---|
| `1 0` | keepalive auth CLI Max (pre-enchères) | `/home/openclaw/logs/auth-keepalive.log` |
| `5 0` | `cron_encheres.sh` — pipeline 4 phases | `/home/openclaw/logs/encheres/encheres_cron.log` |
| `0 23` | `ingest_stream_estate.py` — SE polling 24h | `/home/openclaw/logs/se-polling.log` |
| `50 3` | keepalive auth CLI Max (pre-extraction) | `/home/openclaw/logs/auth-keepalive.log` |
| `0 4` | `run_extraction_nuit.sh` — locataire+IDR+score | `/home/openclaw/logs/extractions/nuit_YYYY-MM-DD.log` |

```bash
# Voir les crons
crontab -l
# Voir les logs enchères
tail -50 /home/openclaw/logs/encheres/encheres_cron.log
# Lancer manuellement phase 1
cd /home/openclaw/monpetitmdb/scrapper && python scraper_encheres.py
```

## Pipeline enchères (4 phases — toutes ACTIVES)

```
Phase 1 : Scraping             → scraper_encheres.py (Licitor + Avoventes + Vench)
Phase 2 : Extraction Sonnet    → batch_extraction_encheres.py (CLI Claude Max)
Phase 3 : Dedup cross-source   → batch_dedup_cross.py (soft delete doublons)
Phase 4 : Statuts              → encheres_supabase.py (adjugé / surenchère)
```

**Relancer l'extraction seule (sans scraping) :**
```bash
ssh openclaw@178.104.58.122 "cd /home/openclaw/monpetitmdb/scrapper && python3 batch_extraction_encheres.py --no-pdfs"
```

**Points critiques :**
- `ANTHROPIC_API_KEY` dans `.env` ne doit PAS être transmise au subprocess CLI Claude → filtré dans `call_claude_cli()` via `env=`
- Doublons cross-source : soft delete (`enrichissement_statut = 'doublon'`) pour éviter ré-insertion par le scraper
- Extraction ne retente que `NULL / echec / echec_quota` — jamais `ok` ni `doublon`
- `departement` est dérivé depuis `code_postal[:2]` dans `_normalize_output` (pas depuis ce que Sonnet extrait) — `code_postal` doit être normalisé en premier
- `tribunal` est stocké au format `"TJ de Ville"` (ex: `"TJ de Paris"`) — le dictionnaire TypeScript `TRIBUNAL_DEPARTEMENT` dans `lib/utils-encheres.ts` utilise ce format exact

## Batch sizes par type d'extraction

| Type | batch-size | workers | PAGE_SIZE | Raison |
|---|---|---|---|---|
| locataire | 15 | 2 | 1000 | Prompt simple, OK |
| idr | **5** | **5** | **200** | Prompt complexe → timeout CLI si batch≥10 ; PAGE_SIZE 1000 = timeout Supabase |
| score | défaut | 1 | **200** | PAGE_SIZE 1000 = timeout Supabase sur grosses tables |

**Ne pas remonter l'IDR au-dessus de batch-size 5** — testé le 2026-04-20, batch-size 10 = 100% timeout CLI.

**PAGE_SIZE IDR/score = 200** — cursor `last_id` initialisé à `9_999_999` pour forcer l'usage de l'index id dès la première page. PAGE_SIZE 1000 = timeout Supabase (`57014`) sur la table `biens` volumineuse.

## Auth CLI Max — problème connu + fix à implémenter

Le token OAuth Claude CLI (`~/.claude/.credentials.json`) expire ~24h après la dernière authentification interactive. En mode non-interactif (`claude -p ...` via cron), le CLI **ne rafraîchit pas automatiquement** le token → erreur `Invalid API key` sur tous les appels.

**Symptômes observés :**
- `locataire_20260419_0400.log` : 1 000 biens chargés, 1 000 erreurs `echec parsing (quota)`, 0 extraits, 88s — le script continuait malgré l'échec auth car `"invalid api key"` n'est pas dans `QUOTA_KEYWORDS`

**Fix à implémenter (3 changements) :**

1. **Keepalive crons** dans le crontab VPS — forcent un refresh du token avant les batches :
   ```bash
   25 23 * * * claude -p "ok" --max-turns 1 --output-format json > /dev/null 2>&1 || echo "$(date) AUTH FAIL pre-encheres" >> /home/openclaw/logs/auth-keepalive.log
   50  3 * * * claude -p "ok" --max-turns 1 --output-format json > /dev/null 2>&1 || echo "$(date) AUTH FAIL pre-extraction" >> /home/openclaw/logs/auth-keepalive.log
   ```

2. **Pre-flight bloquant** dans `run_extraction_nuit.sh` (après le fix `python3`) :
   ```bash
   if ! claude -p "ok" --max-turns 1 --output-format json > /dev/null 2>&1; then
       echo "ERREUR AUTH: Claude CLI non authentifié — batch annulé" | tee -a "$LOG"
       exit 1
   fi
   ```

3. **Détection auth failure** dans `batch_extraction_biens.py` — ajouter `"invalid api key"` dans une liste séparée `AUTH_FAIL_KEYWORDS` qui stop immédiatement sans marquer les biens en `echec_quota`.

## Sources enchères

| Source | Biens | Tech | Notes |
|---|---|---|---|
| Licitor | ~385 | requests | id_source = URL complète (évite collisions lots) |
| Avoventes | ~210 | Playwright + requests | listing déterministe 212 URLs |
| Vench | ~440 | requests + login | Abo actif : vestamdb@gmail.com / Fcn@vench44 |

**Dédup intra-source** : `(source, id_source)` unique — 0 doublon confirmé.
**Dédup cross-source** : ville normalisée (arrondissements strippés) + date_audience + prix ±5%.

**Conventions id_source licitor :**
- Page simple : `{id}` (ex: `107826`)
- Page multi-lots (N lots sur une même page) : `{id}_lot{n}` (ex: `107826_lot2`)
- Les anciens records sans suffixe coexistent — suppression manuelle prévue

**Cas couverts par la dédup :**
- `enrichissement_statut` = `ok` ET `no_data` (les deux sont chargés)
- Licitor "Vente sur saisie immobilière" → date extraite par pattern jour-de-semaine (pas conditionnel sur le header)
- Arrondissements : "Marseille 7ème" = "Marseille", "Paris 17ème" = "Paris"

## Fichiers clés

```
scraper_{source}.py           → scraper_licitor.py, scraper_avoventes.py, scraper_vench.py
scraper_encheres.py           → CLI unifié (lance les 3 sources)
batch_extraction_encheres.py  → Extraction Sonnet v3 + vision PDF
batch_dedup_cross.py         → Fusion cross-source post-Sonnet
encheres_supabase.py          → Upsert intra-source, statuts, normalisation
cron_encheres.sh              → Script cron VPS 4 phases
encheres_learning.json        → Exemples auto-logués pour améliorer Sonnet
```

## Variables d'environnement (scrapper/.env)

```
SUPABASE_URL=...
SUPABASE_KEY=sb_secret_...    # service_role (jamais anon key)
ANTHROPIC_API_KEY=...
```

## Frais enchères judiciaires

Frais totaux ≈ 12% :
- Droits de mutation : 5.8%
- Émoluments avocat : barème progressif
- CSI : 0.1%
- Frais préalables : variable

Calculés dans `lib/calculs.ts` via `calculerFraisEnchere()`.

## Conventions nommage Python

```
scraper_{source}.py              → un fichier par source
batch_{operation}_{cible}.py     → batch_extraction_encheres.py
{entité}_supabase.py             → encheres_supabase.py
{service}_client.py              → supabase_client.py
prompt_{domaine}_v{N}.txt        → prompt_extraction_enchere_v3.txt
```
