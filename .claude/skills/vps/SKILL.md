---
description: Opérations VPS Hetzner — SSH, crons, logs scraping, statut gateway OpenClaw
---

# VPS Hetzner — Opérations

**IP** : 178.104.58.122 | **User principal** : `openclaw` | **Root** : `root`

## Connexion

```bash
ssh openclaw@178.104.58.122
ssh root@178.104.58.122
```

## Crons enchères (user openclaw)

```bash
# Voir les crons actifs
ssh openclaw@178.104.58.122 "crontab -l"

# Logs récents enchères
ssh openclaw@178.104.58.122 "tail -100 /home/openclaw/logs/encheres.log"

# Statut dernier run
ssh openclaw@178.104.58.122 "tail -20 /home/openclaw/logs/encheres.log | grep -E 'Phase|ERROR|OK|biens'"
```

## Pipeline enchères — lancement manuel

```bash
# Phase 1 seulement (scraping)
ssh openclaw@178.104.58.122 "cd /home/openclaw/monpetitmdb/scrapper && python scraper_encheres.py"

# Phase 2 (extraction Sonnet — ~$20, vérifier d'abord)
ssh openclaw@178.104.58.122 "cd /home/openclaw/monpetitmdb/scrapper && python batch_extraction_encheres.py"

# Phase 3 (dedup cross-source)
ssh openclaw@178.104.58.122 "cd /home/openclaw/monpetitmdb/scrapper && python batch_dedup_cross.py"
```

## Déployer du code sur le VPS

```bash
# Pull dernière version GitHub
ssh openclaw@178.104.58.122 "cd /home/openclaw/monpetitmdb && git pull"

# Vérifier que les dépendances Python sont à jour
ssh openclaw@178.104.58.122 "cd /home/openclaw/monpetitmdb/scrapper && pip install -r requirements.txt -q"
```

## OpenClaw gateway (si réactivé)

```bash
# Statut gateway
ssh openclaw@178.104.58.122 "openclaw health"

# Voir les process OpenClaw
ssh openclaw@178.104.58.122 "ps aux | grep openclaw"

# Logs gateway
ssh openclaw@178.104.58.122 "tail -50 /home/openclaw/.openclaw/logs/gateway.log"

# Relancer gateway
ssh openclaw@178.104.58.122 "cd /home/openclaw/.openclaw && ./start-gateway.sh"
```

## Vérifications système

```bash
# Espace disque
ssh openclaw@178.104.58.122 "df -h"

# Mémoire
ssh openclaw@178.104.58.122 "free -m"

# Process Python en cours
ssh openclaw@178.104.58.122 "ps aux | grep python"
```

## Si $ARGUMENTS contient une commande → l'exécuter directement sur le VPS
