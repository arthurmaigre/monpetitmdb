---
description: Pipeline enchères judiciaires — scraping et enrichissement Sonnet sur VPS Hetzner
---

# Pipeline Enchères Judiciaires

3 sources : Licitor (~385) + Avoventes (~210, Playwright) + Vench (~440, abo vestamdb@gmail.com)

## Phases disponibles

| Phase | Script | Coût | Statut |
|---|---|---|---|
| 1 — Scraping | `scraper_encheres.py` | ~0€ | ACTIF (cron 3h) |
| 2 — Extraction Sonnet | `batch_extraction_encheres.py` | ~$20 pour 409 biens | DÉSACTIVÉ |
| 3 — Dedup cross-source | `batch_dedup_cross.py` | ~0€ | DÉSACTIVÉ |
| 4 — Statuts | `encheres_supabase.py statuts` | ~0€ | DÉSACTIVÉ |
| 5 — Normalisation | `encheres_supabase.py normalize` | ~0€ | DÉSACTIVÉ |

## Lancer une phase

```bash
# Sur le VPS
ssh openclaw@178.104.58.122 "cd /home/openclaw/monpetitmdb/scrapper && python scraper_encheres.py"

# Phase 2 (demander confirmation avant — coûte ~$20)
ssh openclaw@178.104.58.122 "cd /home/openclaw/monpetitmdb/scrapper && python batch_extraction_encheres.py"
```

## Vérifier résultat en base (Supabase MCP)

```sql
-- Comptage par source
SELECT source, COUNT(*), COUNT(*) FILTER (WHERE enrichissement_statut = 'ok') as enrichis
FROM encheres GROUP BY source;

-- Enchères à enrichir
SELECT COUNT(*) FROM encheres WHERE enrichissement_statut IS NULL OR enrichissement_statut != 'ok';

-- Dernières enchères scrappées
SELECT source, titre, ville, date_audience, created_at FROM encheres ORDER BY created_at DESC LIMIT 20;
```

## Avant de lancer la Phase 2 (Extraction Sonnet)

1. Vérifier nb enchères à enrichir (voir requête ci-dessus)
2. Estimer coût : nb_biens × $0.05 ≈ $ (Sonnet)
3. Confirmer avec l'utilisateur
4. Lancer et surveiller les logs

## Logs et debug

```bash
# Logs en temps réel
ssh openclaw@178.104.58.122 "tail -f /home/openclaw/logs/encheres.log"

# Dernières erreurs
ssh openclaw@178.104.58.122 "grep ERROR /home/openclaw/logs/encheres.log | tail -20"
```

## Si $ARGUMENTS spécifie une phase → lancer uniquement cette phase
