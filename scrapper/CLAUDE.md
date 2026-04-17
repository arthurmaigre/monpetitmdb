# Scrapper — Contexte Python & VPS

## VPS Hetzner

- **IP** : 178.104.58.122 | **User** : `openclaw` | **Root** : `root`
- Python 3.12 + Playwright + Chromium + psql
- **SSH** : `ssh openclaw@178.104.58.122` (clé SSH configurée)

## Crons actifs (VPS)

Toutes les 3h (0h, 8h, 11h, 14h, 17h, 20h) — **Phase 1 uniquement** (scraping seul).
Phases 2-5 DÉSACTIVÉES en attente vérification manuelle des 409 enchères à enrichir.

```bash
# Voir les crons
ssh openclaw@178.104.58.122 "crontab -l"
# Voir les logs
ssh openclaw@178.104.58.122 "tail -50 /home/openclaw/logs/encheres.log"
# Lancer manuellement phase 1
ssh openclaw@178.104.58.122 "cd /home/openclaw/monpetitmdb/scrapper && python scraper_encheres.py"
```

## Pipeline enchères (5 phases)

```
Phase 1 : Scraping (ACTIF)     → scraper_encheres.py (Licitor + Avoventes + Vench)
Phase 2 : Extraction Sonnet    → batch_extraction_encheres.py (DÉSACTIVÉ ~$20)
Phase 3 : Dedup cross-source   → batch_dedup_cross.py (DÉSACTIVÉ)
Phase 4 : Statuts              → encheres_supabase.py (DÉSACTIVÉ)
Phase 5 : Normalisation        → encheres_supabase.py (DÉSACTIVÉ)
```

## Sources enchères

| Source | Biens | Tech | Notes |
|---|---|---|---|
| Licitor | ~385 | requests | id_source = URL complète (évite collisions lots) |
| Avoventes | ~210 | Playwright + requests | listing déterministe 212 URLs |
| Vench | ~440 | requests + login | Abo actif : vestamdb@gmail.com / Fcn@vench44 |

**Dédup intra-source** : `(source, id_source)` unique — 0 doublon confirmé.
**Dédup cross-source** : ville + date_audience + prix ±5%.

## Fichiers clés

```
scraper_{source}.py           → scraper_licitor.py, scraper_avoventes.py, scraper_vench.py
scraper_encheres.py           → CLI unifié (lance les 3 sources)
batch_extraction_encheres.py  → Extraction Sonnet v3 + vision PDF
batch_dedup_cross.py         → Fusion cross-source post-Sonnet
encheres_supabase.py          → Upsert intra-source, statuts, normalisation
cron_encheres.sh              → Script cron VPS 5 phases
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
