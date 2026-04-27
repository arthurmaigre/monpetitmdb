# Scrapper — Contexte Python & VPS

## VPS Hetzner

- **IP** : 178.104.58.122 | **User** : `openclaw` | **Root** : `root`
- Python 3.12 + Playwright + Chromium + psql
- **SSH** : `ssh openclaw@178.104.58.122` (clé SSH configurée)

## Workflow git pour les scripts scrapper

**Toujours modifier les scripts depuis le VPS**, pas en local :

```bash
# 1. Modifier sur le VPS
ssh openclaw@178.104.58.122
vim /home/openclaw/monpetitmdb/scrapper/batch_extraction_biens.py

# 2. Commit + push depuis le VPS
cd /home/openclaw/monpetitmdb
git add scrapper/batch_extraction_biens.py
git commit -m "fix: ..."
git push origin main

# 3. Pull en local
git pull origin main
```

**Ne jamais** modifier en local puis scp vers le VPS → crée des conflits git (local changes non trackées côté VPS).

## Crons actifs (VPS)

| Heure | Script | Log | cron_config id |
|---|---|---|---|
| `1 0` | keepalive auth CLI Max (pre-enchères) | `/home/openclaw/logs/auth-keepalive.log` | — |
| `5 0` | `cron_encheres.sh` — pipeline 4 phases | `/home/openclaw/logs/encheres/encheres_cron.log` | `encheres_pipeline` |
| `0 23` | `ingest_stream_estate.py` — SE polling 24h | `/home/openclaw/logs/se-polling.log` | `poll_se` |
| `50 3` | keepalive auth CLI Max (pre-extraction) | `/home/openclaw/logs/auth-keepalive.log` | — |
| `0 4` | `run_extraction_nuit.sh` — locataire+IDR+score | `/home/openclaw/logs/extractions/nuit_YYYY-MM-DD.log` | `extraction_nuit` |

**Chaque script VPS écrit ses résultats dans `cron_config` (upsert sur `id`) à la fin du run.** Format `last_result` :
- `poll_se` : `{ new, fp, credits, by_strategie: { lep, travaux, division, idr: { inserted, fp, credits } }, status }`
- `extraction_nuit` : `{ lep: { processed, loyers, profils, errors }, idr: { processed, avec_lots, errors }, travaux: { processed, errors }, status }`
- `encheres_pipeline` : `{ phase1: { licitor, avoventes, vench, total_nouveaux, total_deja_en_base }, phase2: { extracted, errors }, phase3: { fusions, supprimes }, phase4: { updated }, status }`

```bash
# Voir les crons
crontab -l
# Voir les logs enchères
tail -50 /home/openclaw/logs/encheres/encheres_cron.log
# Lancer manuellement phase 1
cd /home/openclaw/monpetitmdb/scrapper && python3 scraper_encheres.py
```

## Diagnostic extraction — commandes utiles (VPS)

```bash
# Logs extraction nuit (dernier run)
tail -100 /home/openclaw/logs/extractions/nuit_$(date +%Y-%m-%d).log

# Vérifier si une extraction tourne
ps aux | grep batch_extraction | grep -v grep

# Lancer manuellement une stratégie (sans dry-run = en base)
cd /home/openclaw/monpetitmdb/scrapper
python3 batch_extraction_biens.py locataire --source stream_estate --limit 50
python3 batch_extraction_biens.py idr       --source stream_estate --limit 20 --batch-size 5 --workers 5
python3 batch_extraction_biens.py score     --source stream_estate --limit 10

# Test dry-run (sans écriture en base)
python3 batch_extraction_biens.py locataire --source stream_estate --limit 5 --dry-run

# Vérifier le token OAuth Claude CLI
claude -p "ok" --max-turns 1 --output-format json

# Relancer le run complet nuit (en background)
nohup bash run_extraction_nuit.sh >> /home/openclaw/logs/extractions/manuel_$(date +%Y-%m-%d_%H%M).log 2>&1 &

# Voir les échecs auth keepalive
cat /home/openclaw/logs/auth-keepalive.log
```

**Statuts extraction à surveiller dans les logs :**
- `Page N biens chargés` → requête OK, index utilisé
- `HTTP/2 500` + `57014` → timeout Supabase, vérifier les index
- `AUTH CLI ECHOUEE` → token expiré, relancer `claude` en interactif
- `QUOTA CLI MAX ATTEINT` → quota épuisé, attendre reset à 3h
- `Résultat : N traités, 0 erreurs` → run propre ✅

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

**`last_id = 9_999_999` pour locataire aussi** — corrigé 2026-04-22 (était `None`, index non utilisé à la 1ère page).

## Auth CLI Max — RÉSOLU (2026-04-22)

Le token OAuth Claude CLI (`~/.claude/.credentials.json`) expire ~24h après la dernière authentification interactive.

**Fixes déployés :**

1. **Keepalive crons** dans le crontab VPS (`1 0` et `50 3`) — refresh du token avant chaque pipeline ✅

2. **Pre-flight bloquant** dans `run_extraction_nuit.sh` — `exit 1` si token expiré ✅

3. **`AUTH_FAIL_KEYWORDS`** dans `batch_extraction_biens.py` — détection séparée de `QUOTA_KEYWORDS` :
   ```python
   AUTH_FAIL_KEYWORDS = ["invalid api key", "authentication", "unauthorized", "401"]
   ```
   → arrêt immédiat, biens **non** marqués `echec_quota` (restent `NULL`, repris au prochain run) ✅

## Index Supabase — pipeline extraction (2026-04-22)

Indexes partiels sur `biens (id DESC)` — condition OR exacte pour correspondre à la requête Python :

```sql
CREATE INDEX idx_biens_locataire ON biens (id DESC)
WHERE strategie_mdb = 'Locataire en place' AND statut = 'Toujours disponible'
  AND regex_statut = 'valide' AND source_provider = 'stream_estate'
  AND (extraction_statut IS NULL OR extraction_statut IN ('echec', 'echec_quota'));

CREATE INDEX idx_biens_idr ON biens (id DESC)
WHERE strategie_mdb = 'Immeuble de rapport' AND statut = 'Toujours disponible'
  AND regex_statut = 'valide' AND source_provider = 'stream_estate'
  AND (extraction_statut IS NULL OR extraction_statut IN ('echec', 'echec_quota'));

CREATE INDEX idx_biens_travaux ON biens (id DESC)
WHERE strategie_mdb = 'Travaux lourds' AND statut = 'Toujours disponible'
  AND regex_statut = 'valide' AND source_provider = 'stream_estate'
  AND score_travaux IS NULL;
```

**Important :** la condition de l'index doit correspondre exactement à la requête Python — `IS DISTINCT FROM 'ok'` ne fonctionne pas car Postgres ne reconnaît pas l'équivalence avec `or_(is.null, eq.echec, eq.echec_quota)` → timeout 57014.

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

**Détection multi-lots (`split_into_lots`) :**
- Compte les occurrences de "Mise à prix" dans `div#legalad` uniquement (pas la page entière)
- `div#legalad` → 1 match = page simple, N matches = N lots
- NE PAS utiliser `soup.get_text()` complet : le `<h1>` header répète "Mise à prix" → faux positif
- Bug corrigé 2026-04-21 : toutes les pages généraient `_lot1/_lot2` → 865 faux doublons purgés

**Extraction Sonnet multi-lots :**
- Chaque lot reçoit la même `description` (texte complet de la page)
- `build_prompt_text()` injecte `mise_a_prix` + numéro de lot comme hints structurés
- Sonnet utilise la mise à prix comme ancre pour extraire les infos du bon lot
- Données communes (adresse, tribunal, avocat) : copiées sur tous les lots via `dict(item)` dans `split_into_lots`

**Cas couverts par la dédup :**
- `enrichissement_statut` = `ok` ET `no_data` (les deux sont chargés)
- Licitor "Vente sur saisie immobilière" → date extraite par pattern jour-de-semaine (pas conditionnel sur le header)
- Arrondissements : "Marseille 7ème" = "Marseille", "Paris 17ème" = "Paris"

## Article Server (`article-server.js`)

Serveur HTTP Node.js sur le VPS (port 3099, pm2 `article-server`) qui génère les articles éditoriaux en background pour contourner le timeout Vercel Hobby (60s max).

**Pipeline de génération (séquentiel) :**
1. Haiku — extrait 3 queries factuelles (timeout 10s)
2. Google Custom Search — 3 requêtes web (timeout 3s chacune)
3. **Opus** — génère l'article HTML complet **(timeout 260s)**
4. Sonnet — relit et corrige (timeout 75s)

**Total pire cas : ~350-400s (~6 min) pour un article pilier 3000 mots.**

**Timeouts à ne PAS réduire sous ces seuils :**
- Opus : **260s minimum** — le CLI a ~20-30s d'overhead OAuth au démarrage, 3000 mots Opus = 60-120s. 160s timeout → échec systématique sur les piliers.
- Ne pas mettre un timeout aberrant (ex. 2h) : si ça dépasse 260s, c'est un incident (token expiré, réseau) à détecter vite, pas à attendre.

**Redémarrer après modif :**
```bash
su - openclaw -c "pm2 restart article-server"
```

**Mode async :** le VPS répond `{ queued: true }` en < 1s, génère en background, puis POST vers `/api/editorial/articles/complete` (callback Vercel) avec le HTML final.

**Frontend polling :** 150 × 4s = **10 min max** (paramètre dans `app/editorial/page.tsx` ligne ~151).

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
