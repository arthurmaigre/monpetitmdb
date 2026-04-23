# OpenClaw — Configuration complète (PAUSÉ)

> **Statut** : Temporairement désactivé. Réactiver via le cycle VPS openclaw.
> **Règle runtime** : Toujours `runtime: "embedded"`, JAMAIS `runtime: "acp"` (cache miss ×3, process morts, blocages policy).

## Infrastructure

- **VPS** : Hetzner 178.104.58.122, CPX42 (8vCPU 16GB RAM)
- **User** : `openclaw` (isolé de root, pas d'accès aux secrets scrapper)
- **Gateway** : OpenClaw 2026.4.11, watchdog cron toutes les 2min (`gateway-watchdog.sh`)
- **Bot Telegram** : @AlbusMDB_Bot
- **Config** : `/home/openclaw/.openclaw/openclaw.json`
- **Workspaces** : `/home/openclaw/.openclaw/workspaces/{agent}/`
- **Repo dev** : `/home/openclaw/monpetitmdb/` (clone GitHub)
- **Vérifier** : `openclaw health`

## Agents (10 total)

| Prénom | ID | Poste | Modèle | Clé API |
|---|---|---|---|---|
| Albus | ceo | CEO — Coordination, pilotage 9 agents, rapports Telegram | Sonnet 4.6 | Albus-ceo |
| Harry | developer | Lead Software Engineer | Opus 4.6 | Harry-developer |
| Severus | qa | Quality Assurance Expert | Sonnet 4.6 | Severus-qa |
| Luna | uiux | Product Designer | Haiku 4.5 | Luna-uiux |
| Hermione | seo | SEO Expert | Haiku 4.5 | Hermione-seo |
| Minerva | marketing | Head of Marketing | Sonnet 4.6 | Minerva-marketing |
| Sirius | linkedin | Business Development Manager | Sonnet 4.6 | Sirius-linkedin |
| Ron | customer-success | Customer Success Manager | Haiku 4.5 | Ron-customer-success |
| Neville | data-analyst | Data Analyst | Haiku 4.5 | Neville-data-analyst |
| Filius | tax-expert | Expert-Comptable Immobilier | Sonnet 4.6 | Filius-tax-expert |

**Modèles** : `anthropic/claude-opus-4-6` (Harry), `anthropic/claude-sonnet-4-6` (Albus/Severus/Minerva/Sirius/Filius), `anthropic/claude-haiku-4-5` (Hermione/Ron/Neville/Luna).

## Architecture

- Tous les agents en `runtime: {"type": "embedded"}` via API Anthropic directe (plugin `anthropic` activé, 1 clé API par agent)
- Auth par `auth-profiles.json` par agent
- CEO lié à Telegram via binding route standard (pas ACP)
- CEO délègue aux 9 autres via `sessions_spawn(runtime="embedded")`
- maxConcurrentSessions=4, maxChildrenPerAgent=3, timeout=900s
- Hook `pre-push` git bloque tout push direct sur main. Branches + PRs obligatoires

## Autonomie & Escalade

**CEO autonome** (sans demander) : lancer agents, assigner tâches, créer branches, ouvrir PRs, audits, relances.

**Escalade Arthur UNIQUEMENT pour** :
- Toute dépense (seuil 0€)
- Suppression de code ou features
- Communications publiques
- Changement stratégie produit
- Merge de PRs
- Accès outil externe (Canva, LinkedIn, Semrush...)

## Budget

3€/jour (~$3.25) via API Anthropic directe. Géré par Albus (max 10 turns/agent).
Régimes : VERT / JAUNE / ORANGE / ROUGE. Hard stop automatique à 95%.
Suivi : `budget-realtime.json` (cron 30min) + `budget-tracker.md`.
Rapport quotidien à 23h55 (`daily-report.sh`).

## Cycles de travail (6 cycles/jour)

| Cycle | Heure | Rôle |
|---|---|---|
| cycle-02h | 2h | Maintenance nuit — dette technique, refresh data |
| cycle-06h | 6h | Veille marché + premiers audits |
| cycle-10h | 10h | Production — FORMAT BILAN MATIN |
| cycle-14h | 14h | Croissance + enchaînement — FORMAT BILAN APRÈS-MIDI |
| cycle-18h | 18h | Technique + vérification PRs — FORMAT BILAN SOIR |
| cycle-22h | 22h | Deep work nuit — silencieux sauf P0 |

## Formats Telegram (4 formats canoniques)

- `FORMAT HEARTBEAT` : désactivé (remplacé par cycles cron)
- `FORMAT BILAN` : 10h/14h/18h — LIVRÉ / EN COURS / PROCHAIN CYCLE / ARTHUR / SYSTÈME
- `FORMAT ALERTE P0` : immédiat bug critique — SITUATION / IMPACT / FAIT / ETA FIX / ARTHUR
- `FORMAT DEMANDE` : immédiat dépense/accès — DE / BESOIN / POURQUOI / COÛT / ARTHUR

## Communication inter-agents

- Les agents ne se parlent pas directement. Tout passe par le CEO.
- Rapports d'audit : `/home/openclaw/.openclaw/shared/audits/YYYY-MM-DD-{agent}-{sujet}.md`
- Flux inter-agents : `insights-marketing.md`, `insights-cs.md`, `seo-updates.md`, etc.
- Cross-learnings : `shared/memory/cross-learnings.md`

## Mémoire partagée

- Dossier : `/home/openclaw/.openclaw/shared/memory/`
- `MEMORY.md` = index + faits durables
- Convention nommage audits : `YYYY-MM-DD-{agent}-{sujet}.md`
- Archives >7j : `YYYY-MM/`

## Webhook GitHub → QA automatique

GitHub envoie webhook à `http://178.104.58.122:18789/hooks/github` au merge PR.
Le gateway réveille Albus → git pull → identifie changements → lance QA flows impactés.
Gateway bind=lan, protégé par token webhook.

## Crons VPS

- `*/2 * * * *` — gateway-watchdog.sh (relance si down)
- `*/30 * * * *` — budget-monitor.sh (hard stop à 95%)
- `55 23 * * *` — daily-report.sh
- `synthese-hebdomadaire` — vendredi 20h (cross-learnings)
- `meta-veille-systeme-ia` — dimanche 20h
- `retrospective-mensuelle` — 1er du mois 10h

## Amélioration continue

- **SKILLS.md** : bibliothèque de compétences par agent (score confiance 1-10)
- **REFLEXION.md** : journal post-tâche obligatoire
- **VEILLE.md** : sources de veille par domaine
- Pre-validation Plan-Review-Execute pour les tâches code/audit

## Maintenance CLAUDE.md

- Changement code → Developer met à jour CLAUDE.md dans le même commit
- Changement hors code → CEO ouvre branche `docs/` + PR
- Règle : si c'est dans le produit, c'est dans CLAUDE.md
