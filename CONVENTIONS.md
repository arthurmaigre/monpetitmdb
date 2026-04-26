# Conventions de nommage — Mon Petit MDB

Ce fichier est la référence unique pour nommer tout fichier, branche, composant ou migration dans le projet.
**Objectif** : dans 6 mois, Claude et toi savez immédiatement où mettre un nouveau fichier.

---

## Python — Scrapers (`scrapper/`)

```
scraper_{source}.py              → scraper_licitor.py, scraper_avoventes.py, scraper_vench.py
scraper_encheres.py              → CLI unifié (lance tous les scrapers)
batch_{operation}_{cible}.py     → batch_extraction_encheres.py, batch_dedup_cross.py
{entité}_supabase.py             → encheres_supabase.py, biens_supabase.py
{service}_client.py              → supabase_client.py, stream_estate_client.py
prompt_{domaine}_v{N}.txt        → prompt_extraction_enchere_v3.txt
```

**Règle** : un fichier = une responsabilité. Pas de `utils.py` fourre-tout.

---

## SQL — Migrations Supabase

```
YYYYMMDD_{N}_{description}.sql

Exemples :
  20260416_001_add_estimation_cache_encheres.sql
  20260420_002_add_biens_source_urls_index.sql
```

**Règle** : toujours `IF NOT EXISTS`. Toujours préfixer avec la date et un numéro séquentiel.

---

## TypeScript — Next.js

### Composants

```
PascalCase.tsx                   → BienCard.tsx, EnchereCard.tsx, PnlColonne.tsx
{Nom}Client.tsx                  → BiensClient.tsx, BienFicheClient.tsx
use{Nom}.ts                      → useWatchlist.ts, useEstimation.ts
```

### Pages & Routes

```
app/{route}/page.tsx             → toujours page.tsx pour les pages
app/{route}/layout.tsx           → toujours layout.tsx pour les layouts
app/api/{route}/route.ts         → toujours route.ts pour les API routes
app/{route}/{Page}Client.tsx     → Client component (si sessionStorage/client-only)
```

### Bibliothèques (`lib/`)

```
{domaine}.ts                     → calculs.ts, estimation.ts, supabase.ts
{domaine}-admin.ts               → supabase-admin.ts
types.ts                         → types TypeScript partagés
constants.ts                     → constantes (plans, stratégies, etc.)
```

---

## Fichiers Claude Code

### Mémoire (`.claude/memories/`)

```
{type}_{sujet}.md

Types :
  project_   → état projet, avancement, specs
  feedback_  → règles comportementales apprises
  reference_ → documentation de référence externe

Exemples :
  project_roadmap.md
  project_encheres_progress.md
  feedback_comportement.md
  feedback_estimation.md
```

### Skills (`.claude/skills/`)

```
.claude/skills/{verbe-ou-nom}/SKILL.md

Exemples :
  .claude/skills/vps/SKILL.md
  .claude/skills/commit/SKILL.md
  .claude/skills/encheres/SKILL.md
  .claude/skills/new-api-route/SKILL.md
```

### Hooks (`.claude/hooks/`)

```
.claude/hooks/{event}-{role}.sh

Exemples :
  .claude/hooks/stop-log.sh
  .claude/hooks/consolidate.sh
```

---

## Documentation & Audits

```
# À la racine du projet
CLAUDE.md                        → règles essentielles pour Claude (court)
OPENCLAW.md                      → config OpenClaw complète (chargé à la demande)
CONVENTIONS.md                   → ce fichier

# Audits (racine ou docs/)
AUDIT_{DOMAINE}.md               → AUDIT_SEO.md, AUDIT_CALCULS.md, AUDIT_UI_UX.md
AUDIT_{DOMAINE}_{YYYYMMDD}.md    → version archivée avec date

# Roadmap
ROADMAP.md                       → roadmap visible + archivée
```

---

## Branches Git

```
feat/{sujet-court}       → feat/encheres-frais-simulateur
fix/{sujet-court}        → fix/dvf-filtre-nb-pieces
refactor/{sujet-court}   → refactor/calculs-waterfall
docs/{sujet-court}       → docs/update-openclaw-setup
style/{sujet-court}      → style/bien-card-responsive
perf/{sujet-court}       → perf/biens-pagination
chore/{sujet-court}      → chore/update-dependencies
```

**Règles Git** :
- Jamais de commit direct sur `main`
- Toujours branche + PR (même pour les petits fixes)
- Message de commit : `{type}({scope}): {description en français}`
- Jamais de `Co-Authored-By: Claude` dans les commits

---

## Variables d'environnement

```
# Format : MAJUSCULES_AVEC_UNDERSCORES

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # format sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY         # format sb_secret_...

# Stripe
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET

# APIs externes
ANTHROPIC_API_KEY
BREVO_API_KEY
CRON_SECRET
STREAM_ESTATE_API_KEY

# Accessoires
GITHUB_PERSONAL_ACCESS_TOKEN
BRAVE_API_KEY
SUPABASE_ACCESS_TOKEN             # PAT pour MCP Supabase
```

---

## Résumé rapide

| Quoi | Convention |
|---|---|
| Scraper Python | `scraper_{source}.py` |
| Batch Python | `batch_{opération}_{cible}.py` |
| Migration SQL | `YYYYMMDD_{N}_{description}.sql` |
| Composant React | `PascalCase.tsx` |
| Page client SSR | `{Nom}Client.tsx` |
| Route API | `route.ts` (toujours) |
| Mémoire Claude | `{type}_{sujet}.md` |
| Skill Claude | `.claude/skills/{nom}/SKILL.md` |
| Hook Claude | `.claude/hooks/{event}-{role}.sh` |
| Branche Git | `feat/fix/refactor/docs/{sujet}` |
| Variable env | `MAJUSCULES_UNDERSCORES` |
