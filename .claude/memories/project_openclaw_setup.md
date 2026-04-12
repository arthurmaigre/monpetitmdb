---
name: OpenClaw setup sur VPS Hetzner
description: Configuration OpenClaw 9 agents sur VPS Hetzner (CEO Albus, Developer, QA, UI/UX, SEO, Marketing, LinkedIn, Customer Success, Data Analyst)
type: project
originSessionId: 57ec85e8-b83c-4fda-8db7-9cffc44e420f
---
## Infrastructure

- VPS Hetzner CPX42 : 8 vCPU, 16 GB RAM, IP 178.104.58.122
- OpenClaw 2026.4.11 installe sous user `openclaw` (isole de root, pas acces aux secrets scrapper)
- Gateway lance via screen : `screen -dmS openclaw su - openclaw -c 'ANTHROPIC_API_KEY=... openclaw gateway run'`
- Bot Telegram : @AlbusMDB_Bot (token 8719603918:AAH...), chat ID Arthur : 8700946410
- API key Anthropic agents : sk-ant-api03-dVWa... (cle separee du scrapper)
- GitHub PAT : ghp_ZBs3... (pour push branches + PRs)
- Branch protection activee sur main (1 review requise)

## 9 agents

| Agent | ID | Modele | Role |
|---|---|---|---|
| CEO Albus | ceo | claude-opus-4-6 | Coordination, rapports, lean |
| Developer | developer | claude-sonnet-4-6 | Code, PRs, ameliorations |
| QA | qa | claude-haiku-4-5 | Tests parcours, bugs |
| UI/UX | uiux | claude-sonnet-4-6 | Audit design, coherence |
| SEO | seo | claude-haiku-4-5 | Audit technique, mots-cles |
| Marketing | marketing | claude-sonnet-4-6 | Positionnement, contenu (prep) |
| LinkedIn | linkedin | claude-sonnet-4-6 | Veille prospects (prep) |
| Customer Success | customer-success | claude-sonnet-4-6 | Emails, retention (prep) |
| Data Analyst | data-analyst | claude-haiku-4-5 | KPIs, funnel AARRR |

## Architecture multi-agent

- CEO est le seul agent route sur Telegram (binding)
- Les 8 autres sont des sub-agents spawnes par le CEO via `sessions_spawn`
- Config sub-agents : maxSpawnDepth=2, maxChildren=5, maxConcurrent=8, timeout=900s
- CEO a les tools : read, exec, sessions_list, sessions_spawn, sessions_send
- Les 8 autres : tous les tools par defaut (browser, exec, read, write) sauf session tools

## Fichiers de config

- Config principale : /home/openclaw/.openclaw/openclaw.json
- Workspaces : /home/openclaw/.openclaw/workspaces/{agent}/
- Chaque workspace contient : SOUL.md + AGENTS.md + USER.md + CLAUDE.md (pour certains)
- Auth profiles : /home/openclaw/.openclaw/agents/{agent}/agent/auth-profiles.json
- Repo clone : /home/openclaw/.openclaw/workspaces/developer/repo/

## Regles budget

- Max 10 euros/jour total, alerte a 7 euros
- Process echantillon obligatoire : 1 item → 10 items → 100 items → full batch
- S applique a toutes les APIs payantes (Claude, SE, Brevo, DVF)

## Securite

- User openclaw isole (chmod 700 /root/, pas de sudo)
- Secrets scrapper (.env) inaccessibles aux agents
- Bot Telegram en allowlist (Arthur seulement : tg:8700946410)
- Gateway bind loopback uniquement

## Phase actuelle

Phase 1 — Stabilisation/audit. Pas de marketing actif.
