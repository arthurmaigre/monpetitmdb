---
description: Charge le contexte complet OpenClaw pour travailler sur la configuration des agents (PAUSÉ)
---

# OpenClaw — Contexte complet

**Statut** : PAUSÉ — réactiver depuis le VPS quand prêt.

Ce skill charge le contexte OpenClaw complet pour :
- Débugger un agent
- Modifier la configuration
- Réactiver le gateway
- Mettre à jour un cycle ou un format de communication

## Chargement contexte

Lire maintenant :
1. `OPENCLAW.md` — configuration complète (agents, cycles, budget, communication)
2. `.claude/memories/project_openclaw_setup.md` — état détaillé

## Commandes de diagnostic

```bash
# Santé du gateway
ssh openclaw@178.104.58.122 "openclaw health"

# Config actuelle
ssh root@178.104.58.122 "su - openclaw -c 'cat /home/openclaw/.openclaw/openclaw.json'"

# Logs gateway récents
ssh openclaw@178.104.58.122 "tail -50 /home/openclaw/.openclaw/logs/gateway.log"

# Budget aujourd'hui
ssh openclaw@178.104.58.122 "cat /home/openclaw/.openclaw/shared/budget-realtime.json"
```

## Règle critique

Toujours `runtime: {"type": "embedded"}` — JAMAIS `runtime: "acp"`.
(ACP = cache miss ×3 + process morts + blocages policy)

## Si $ARGUMENTS = "reactivate" → guider la réactivation étape par étape
