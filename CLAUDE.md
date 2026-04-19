# Mon Petit MDB

SaaS de sourcing et analyse immobilière pour marchands de biens et investisseurs.
Stratégies : **Locataire en place** / **Travaux lourds** / **Division** / **Immeuble de rapport** / **Enchères**.
22 métropoles françaises. Freemium : Free / Pro 19€ / Expert 49€. Early adopter : code `EARLYBIRD` (-30% à vie).

## Stack

- **Frontend** : Next.js App Router, TypeScript — Vercel (auto-deploy git push → GitHub)
- **DB** : Supabase Pro (West EU) — auth + tables + storage bucket `mdb-files`
- **Auth** : Supabase Auth email/password + OAuth Google/Facebook — `@supabase/ssr`, middleware SSR
- **Paiement** : Stripe Checkout + Customer Portal + Webhooks (live)
- **Sourcing** : Stream Estate polling quotidien via `scrapper/ingest_stream_estate.py` (cron VPS 22h30, Claude CLI) — webhooks PAUSÉ crédits épuisés 2026-04-12. Revalidation Haiku backfill avril TERMINÉE (9 475 biens, ~15% FP — analyse FP à faire)
- **Enchères** : Python scrapers → Licitor / Avoventes (Playwright) / Vench — VPS Hetzner 178.104.58.122
- **AI** : Anthropic Claude (Haiku regex ingestion SE, Sonnet extraction locataire/IDR/enchères, Opus édito)
- **Email** : Brevo API — alertes nouveaux biens
- **Schémas DB** : utiliser le MCP Supabase pour interroger les tables directement

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
- Cron SE polling : crontab VPS (`30 22 * * *`) → `python3 ingest_stream_estate.py` (24h glissantes, Claude CLI)
- Cron extraction VPS : `0 4 * * *` → `run_extraction_nuit.sh` (Sonnet via Max, `--source stream_estate`)
- Routes admin : `CRON_SECRET` pour les crons, token user pour appels UI

## OpenClaw (PAUSÉ)

10 agents IA sur VPS Hetzner — **temporairement désactivé**.
Voir `OPENCLAW.md` pour la configuration complète (à charger avec `@OPENCLAW.md`).

## Contexte supplémentaire (chargé à la demande)

- `scrapper/CLAUDE.md` — pipeline Python enchères, VPS, crons
- `lib/CLAUDE.md` — 7 régimes fiscaux, DVF architecture, règles de calcul
- `app/api/CLAUDE.md` — routes API, pipeline IA post-ingestion
- `.claude/memories/` — état projet, roadmap, enchères progress
