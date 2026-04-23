# Mon Petit MDB

SaaS de sourcing et analyse immobilière pour marchands de biens et investisseurs.
Stratégies : **Locataire en place** / **Travaux lourds** / **Division** / **Immeuble de rapport** / **Enchères**.
22 métropoles françaises. Freemium : Free / Pro 19€ / Expert 49€. Early adopter : code `EARLYBIRD` (-30% à vie).

## Stack

- **Frontend** : Next.js App Router, TypeScript — Vercel (auto-deploy git push → GitHub)
- **DB** : Supabase Pro (West EU) — auth + tables + storage bucket `mdb-files`
- **Auth** : Supabase Auth email/password + OAuth Google/Facebook — `@supabase/ssr`, middleware SSR
- **Paiement** : Stripe Checkout + Customer Portal + Webhooks (live)
- **Sourcing** : Stream Estate polling quotidien via `scrapper/ingest_stream_estate.py` (cron VPS 23h00, Claude CLI) — webhooks PAUSÉ (à réactiver manuellement). Crédits rechargés 2026-04-23 (€79.66 overage). Backfill 21-22/04 effectué (~410 biens). Bug fix : `--from-date`/`--to-date` nécessite format `T00:00:00Z` (corrigé). Saved searches SE : LEP+Division+IDR à jour, **Travaux expressions vides** → corriger dashboard SE avant réactivation webhooks.
- **Enchères** : Python scrapers → Licitor / Avoventes (Playwright) / Vench — VPS Hetzner 178.104.58.122
- **AI** : Anthropic Claude (Haiku regex ingestion SE, Sonnet extraction locataire/IDR/enchères, Opus édito)
- **Email** : Brevo API — alertes nouveaux biens
- **Schémas DB** : utiliser le MCP Supabase pour interroger les tables directement

## Plugins MCP installés (machine locale uniquement)

| Plugin | Usage principal |
|---|---|
| `mcp__supabase` | Requêtes SQL, migrations, logs, schémas DB |
| `mcp__vercel` | Déploiements, logs runtime, projets |
| `mcp__stream-estate` | Recherche annonces, webhooks SE |
| `mcp__brave-search` | Recherche web |
| `mcp__stripe` | Compte, API search |
| `mcp__Claude_in_Chrome` | Navigation browser, scraping |
| `mcp__Claude_Preview` | Preview UI, screenshots |
| `mcp__context7` | Docs libraries/frameworks |
| `mcp__sequential-thinking` | Raisonnement structuré |

> Ces plugins sont configurés dans `~/.claude/settings.json` (global) et `.claude/settings.local.json` (projet). **Non disponibles sur le VPS** — le VPS utilise Claude CLI sans plugins MCP.

## Commandes

```bash
npm run dev          # dev local
npm run build        # build prod (tester avant push)
git add -p && git commit -m "..." && git push   # workflow standard
ssh openclaw@178.104.58.122   # VPS enchères (voir /vps skill)
```

## Plans & Stratégies

| Plan | Prix | Biens | Stratégies |
|---|---|---|---|
| Free | 0€ | 10 watchlist | 1 |
| Pro | 19€/mois | 50 | 2 (hors IDR) |
| Expert | 49€/mois | illimité | toutes |

Stratégie **Division** masquée sur landing et filtres UI.
IDR (Immeuble de rapport) = Expert only.

## Règles critiques

**Données**
- `regex_statut = 'valide'` obligatoire pour affichage biens. + `extraction_statut = 'ok'` pour Locataire en place et IDR
- `enrichissement_statut = 'ok'` obligatoire pour affichage enchères
- Loyer **toujours stocké HC** en base (convertir CC → HC si charges connues)
- `charges_copro` = **mensuel** en base. `taxe_fonc_ann` = annuel
- Déduplication biens par `url` (unique), id assigné par Supabase

**Watchlist**
- Table `watchlist` : `user_id, bien_id, source_table, suivi, score_travaux_perso, snapshot_data JSONB, commentaire TEXT`
- `snapshot_data` : copie figée du bien au moment de l'ajout (POST /api/watchlist) — fallback si l'annonce disparaît
- `commentaire` : note personnelle de l'utilisateur, sauvegardée via PATCH au blur
- Page `/mes-biens` : utilise snapshot_data si le bien n'est plus dans `biens`/`encheres`, badge "Annonce expirée"

**Calculs**
- Tous les calculs financiers dans `lib/calculs.ts` — jamais en DB sauf `rendement_brut`
- Estimation DVF = prix marché **"en bon état"** = prix de revente après travaux (pas de décote travaux)
- Prix cible PV : `(DVF × (1-fraisAgence%) - travaux) / ((1+fraisNotaire%) × (1+objectifPV%))`
- MdB toujours à l'IS, pas de régime IR, pas d'amortissement (biens = stock)
- Frais notaire MdB = 2.5%, sinon 7.5%

**Code Next.js**
- Toujours `await params` dans les route handlers (bug Next.js 16)
- Pages avec sessionStorage → `dynamic(() => import('./Client'), { ssr: false })`
- Encoding JSX : `{'\u20AC'}` pour €, accents **en clair** dans le JSX (jamais `\u00E9`), `{"'"}` pour apostrophes
- Paywall free : classe `.val-blur` sur les chiffres floutés

**Git**
- Ne jamais committer directement sur `main` — branche + PR
- Jamais de ligne `Co-Authored-By: Claude` dans les commits

## Déploiement & Crons

- Auto-deploy : git push → GitHub → Vercel (pas de `vercel --prod` manuel)
- Domaine : `www.monpetitmdb.fr`
- Crons externes : cron-job.org — uniquement alertes (9h) et regex (3h30, 15h30) — header `Authorization: Bearer <CRON_SECRET>`
- Cron SE polling : crontab VPS (`0 23 * * *`) → `python3 ingest_stream_estate.py` (24h glissantes, Claude CLI)
- Cron enchères : crontab VPS (`5 0 * * *`) → `cron_encheres.sh` (4 phases : scraping + extraction + dédup + statuts)
- Cron extraction VPS : `0 4 * * *` → `run_extraction_nuit.sh` (Sonnet via Max, locataire + IDR + score)
- Keepalive auth CLI Max : `1 0` (pre-enchères) et `50 3` (pre-extraction)
- Routes admin : `CRON_SECRET` pour les crons, token user pour appels UI

## OpenClaw (PAUSÉ)

10 agents IA sur VPS Hetzner — **temporairement désactivé**.
Voir `OPENCLAW.md` pour la configuration complète (à charger avec `@OPENCLAW.md`).

## SEO

**Audit complet :** `AUDIT_SEO_2026-04-21.md` — état de chaque page, mots-clés, concurrents, stratégie contenu.

**État technique (2026-04-21) — score 8.5/10 :**
- Metadata + canonical + OG : complets sur toutes les pages publiques ✅
- JSON-LD : WebSite (+ SearchAction) + Organization + SoftwareApp (/) · CollectionPage (/biens, /encheres) · HowTo (/strategies) · FAQPage 15 Q (/faq) · Article+BreadcrumbList (/blog/[slug]) · RealEstateListing (/encheres/[id]) ✅
- robots.txt + sitemap.xml (statiques + blog) ✅ · GTM async conditionnel ✅ · GSC + Meta Pixel actifs ✅
- Biens et enchères [id] : auth-protected → Google ne crawle pas → **ne pas ajouter au sitemap**

**Règles SEO (ne pas déroger) :**
- Blog `/blog/[slug]` = **seul canal SEO** — pas de route `/guide/` séparée
- Positionnement : **MdB first** — "marchand de biens", "enchères judiciaires", "division immobilière", "TVA sur marge"
- **Ne pas cibler** "simulateur investissement locatif" / "calcul rendement locatif" → Horiz.io domine, mauvais persona
- "investissement locatif" uniquement en bridge discret pour investisseurs particuliers (angle : "analyser comme un MdB")
- Blanc stratégique : agrégation Licitor + Vench + Avoventes + analyse fiscale = 0 concurrent SaaS

**Prochain chantier :** article pilier `/blog/encheres-judiciaires-immobilieres-guide-complet` (priorité P0)

## Contexte supplémentaire (chargé à la demande)

- `scrapper/CLAUDE.md` — pipeline Python enchères, VPS, crons
- `lib/CLAUDE.md` — 7 régimes fiscaux, DVF architecture, règles de calcul
- `app/api/CLAUDE.md` — routes API, pipeline IA post-ingestion
- `.claude/memories/` — état projet, roadmap, enchères progress
