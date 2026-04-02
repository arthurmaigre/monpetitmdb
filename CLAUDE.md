# Mon Petit MDB — CLAUDE.md

## Projet
SaaS de sourcing immobilier pour investisseurs particuliers (methodologie marchand de biens).
Strategies : **Locataire en place** / **Travaux lourds** / **Division** / **Immeuble de rapport** (ex-Decoupe).
Territoire : France entiere, 22 metropoles.
Modele freemium : Free (10 biens watchlist) / Pro 19€ (50 biens, 1 strategie, 2 regimes) / Expert 49€ (illimite, toutes strategies, tous regimes).

## Stack
- **Frontend** : Next.js App Router, TypeScript — Vercel
- **DB** : Supabase Pro (West EU / Ireland) — auth + tables + storage
- **Auth** : Supabase Auth (email/password + OAuth Google) — callback client-side PKCE
- **Paiement** : Stripe Checkout + Customer Portal + Webhooks (mode test)
- **Scraper legacy** : Python + Playwright + Chromium -> Leboncoin — Hetzner VPS
- **Sourcing API** : Moteur Immo (aggregateur 60+ plateformes) — module `moteurimmo_client.py`
- **AI scoring** : Claude API (Haiku) pour `score_travaux` + extraction donnees locatives
- **Estimation** : API DVF (Cerema) + correcteurs qualitatifs
- **Editorial** : Claude Opus (redaction) + Sonnet (fact-check) + Unsplash (photos)
- **Storage bucket** : `mdb-files`
- **Email transactionnel** : Brevo API (ex Sendinblue) — alertes nouveaux biens

## Structure repo (`C:\Users\GAMER\monpetitmdb`)
```
monpetitmdb/
├── app/
│   ├── api/
│   │   ├── biens/              # GET/POST /api/biens, GET/PATCH /api/biens/[id]
│   │   ├── blog/               # GET /api/blog (articles publies)
│   │   ├── communes/           # Recherche localisation (ville, dept, region, metropole)
│   │   ├── estimation/[id]/    # Estimation DVF par bien
│   │   ├── estimation/batch/   # Estimation DVF batch tous biens
│   │   ├── editorial/          # CRUD articles + generation IA
│   │   ├── profile/            # GET/PUT profil utilisateur
│   │   ├── watchlist/          # GET/POST/DELETE watchlist
│   │   ├── stripe/             # checkout, portal, webhook (Stripe)
│   │   ├── chat/               # Chat IA (streaming, Haiku)
│   │   ├── moteurimmo/webhook/ # Webhook reception nouvelles annonces
│   │   ├── admin/ingest/       # Ingestion Moteur Immo (micro-batch)
│   │   ├── admin/regex/        # Validation regex faux positifs
│   │   ├── admin/extraction/   # Extraction donnees locatives IA (Haiku)
│   │   ├── admin/score-travaux/# Score travaux IA (Haiku, optionnel photos)
│   │   ├── admin/statut/       # Verification annonces expirees
│   │   ├── admin/stats/        # Stats dashboard (RPC admin_stats)
│   │   ├── admin/cron-config/  # Config cron (GET/PUT)
│   │   ├── admin/estimation/   # Config estimateur (GET/PUT)
│   │   ├── editorial/calendar/ # CRUD calendrier editorial (GET/PATCH)
│   │   └── feedback/           # Feedbacks utilisateurs via Memo (GET/POST/DELETE)
│   ├── auth/callback/          # OAuth callback client-side (PKCE + implicit)
│   ├── page.tsx                # Landing page (hero, strategies, pricing, screenshot)
│   ├── admin/                  # Dashboard admin (index)
│   ├── admin/biens/            # Admin gestion biens
│   ├── admin/users/            # Admin gestion utilisateurs
│   ├── admin/sourcing/         # Sourcing & Batches (ingestion, regex, IA, cron)
│   ├── admin/estimation/       # Admin config estimateur
│   ├── admin/guide-fiscal/     # Reference fiscale 7 regimes (admin only)
│   ├── biens/[id]/             # Fiche bien + PnlColonne 7 regimes + scenario revente
│   ├── biens/                  # Liste biens avec filtres + vue carte (SSR desactive, BiensClient.tsx, MapView.tsx)
│   ├── blog/                   # Listing articles publies
│   ├── blog/[slug]/            # Page article individuelle
│   ├── strategies/             # Page 4 strategies detaillees
│   ├── editorial/              # CMS articles IA (admin) + calendrier editorial
│   ├── biens/MapView.tsx        # Vue carte Leaflet (panneau lateral + markers)
│   ├── admin/feedbacks/        # Admin feedbacks utilisateurs
│   ├── mes-biens/              # Watchlist utilisateur
│   ├── mon-profil/             # Donnees personnelles + facturation + upgrade Stripe
│   ├── parametres/             # Fiscalite, financement, charges recurrentes, budget travaux
│   ├── login/ + register/      # Auth (email + OAuth Google/Facebook)
│   ├── contact/                # Page contact (formulaire)
│   ├── faq/                    # FAQ 8 questions accordion
│   ├── tarifs/                 # Redirect vers /#pricing
│   ├── cgu/ + mentions-legales/ + not-found.tsx
├── components/
│   ├── BienCard.tsx            # Carte bien (grille)
│   ├── PlusValueBadge.tsx      # Badge +/- value brute
│   ├── RendementBadge.tsx      # Badge rendement brut
│   ├── MetroBadge.tsx
│   ├── PricingCta.tsx          # Bouton pricing -> Stripe checkout
│   ├── ChatWidget.tsx          # Chat IA "Memo" flottant (Haiku, streaming, ouvert par defaut)
│   ├── LandingHeader.tsx       # Header landing page (detecte connexion)
│   ├── Layout.tsx              # Header (nav + dropdown user) + Footer
│   ├── TypeBienIllustration.tsx # Illustrations SVG par type de bien (Appartement, Maison, Immeuble, etc.)
│   └── ui/                     # Composants UI partages
│       ├── Button.tsx          # Bouton (primary/secondary/ghost/danger, sm/md/lg)
│       ├── Input.tsx           # Input (default/search/inline, label, hint, error, suffix)
│       ├── AddressAutocomplete.tsx # Autocompletion adresse via API BAN (gouv.fr)
│       ├── Modal.tsx           # Modal (focus trap, Escape, overlay, 3 variants)
│       ├── Card.tsx            # Card (padding, border, hover shadow)
│       ├── Toast.tsx           # Toast notifications (success/error/warning, 3s auto-dismiss)
│       └── index.ts            # Re-exports
├── lib/
│   ├── types.ts
│   ├── constants.ts
│   ├── theme.ts                # Design system (fontSizes, spacing, transitions, breakpoints)
│   ├── calculs.ts              # Calculs fiscaux 7 regimes + scenario revente + abattements PV
│   ├── estimation.ts           # Moteur estimation DVF + correcteurs
│   ├── supabase.ts             # Client Supabase public (anon key)
│   └── supabase-admin.ts       # Client Supabase admin (secret key)
├── scrapper/
│   ├── scraper_supabase_prod.py    # Scraper LBC legacy
│   ├── moteurimmo_client.py        # Module sourcing Moteur Immo
│   ├── supabase_client.py          # Client Supabase Python
│   ├── batch_extraction.py         # Extraction donnees locatives IA (Haiku, 5 workers paralleles)
│   ├── batch_score_travaux.py      # Score travaux IA (Haiku)
│   ├── batch_regex_validation.py   # Validation regex faux positifs
│   ├── batch_nuit.py               # Script nuit (enchaine tous les batches)
│   └── .env                        # Cles API (ne pas committer)
└── public/
```

## Table `biens` — colonnes

**Identite**
- `id` (auto Supabase), `url` (unique), `statut` ("Toujours disponible" | "Annonce expiree" | "Faux positif")
- `strategie_mdb` ("Locataire en place" | "Travaux lourds" | "Division" | "Decoupe")
- `metropole`, `ville`, `quartier`, `adresse`, `code_postal`

**Bien**
- `type_bien`, `nb_pieces` (TEXT ex: "T2"), `etage` (TEXT ex: "RDC")
- `surface` (float), `annee_construction` (int), `dpe` (lettre A-G)
- `ascenseur`, `acces_exterieur`, `type_chauffage`, `mode_chauffage`
- `nb_sdb` (int), `nb_chambres` (int)
- `ges`, `dpe_valeur`, `budget_energie_min`, `budget_energie_max`
- `surface_terrain` (float)

**Prix**
- `prix_fai` (float), `prix_m2` (float, calcule scraper)

**Locatif** (strategie Locataire en place)
- `loyer` (float, TOUJOURS HC), `type_loyer` ("HC" | "CC"), `charges_rec`
- `charges_copro`, `taxe_fonc_ann`, `fin_bail` (date ISO ou "inconnu")
- `profil_locataire` (TEXT : "Statut | depuis YYYY" ou "NC" si non trouve par IA)
- `rendement_brut` (float) — loyer x 12 / prix

**Travaux** (strategie Travaux lourds)
- `score_travaux` (smallint 1-5) — 1=etat correct, 5=ruine/tres lourds
- `score_commentaire` (TEXT) — justification IA

**NLP / Options**
- `parking_type`, `has_piscine`, `exposition`, `vue`, `etat_interieur`
- `jardin_etat`, `has_cave`, `has_gardien`, `has_double_vitrage`
- `has_cuisine_equipee`, `is_plain_pied`, `standing_immeuble`

**Estimation DVF (cache)**
- `estimation_prix_m2`, `estimation_prix_total`
- `estimation_confiance` (A/B/C/D), `estimation_nb_comparables`, `estimation_rayon_m`
- `estimation_date`, `estimation_details` (JSONB complet)
- `latitude`, `longitude`

**Photos**
- `photo_url` (URL externe plateforme), `photo_storage_path` (chemin bucket)

**Immeuble de rapport**
- `nb_lots` (int, editable), `monopropriete` (boolean), `compteurs_individuels` (boolean)
- `lots_data` (JSONB) — tableau de lots : `{ lots: [{ type, surface, loyer, etat, dpe, etage }] }`

**Moteur Immo**
- `moteurimmo_data` (JSONB) — JSON brut complet

**Pipeline IA (tracabilite)**
- `regex_statut` ("valide" | "faux_positif"), `regex_date` (timestamptz)
- `extraction_statut` ("ok" | "no_data" | "echec" | "erreur"), `extraction_date` (timestamptz)
- `score_analyse_statut` ("ok" | "no_data" | "echec" | "erreur"), `score_analyse_date` (timestamptz)

**Dates** : `created_at`, `updated_at`, `derniere_verif_statut`

## Table `profiles` — colonnes
- `id` (FK auth.users), `role` ("admin" | "user"), `plan` ("free" | "pro" | "expert")
- **Fiscalite** : `tmi` (int), `regime` (text)
- **Financement** : `apport`, `taux_credit`, `taux_assurance`, `duree_ans`, `frais_notaire`, `objectif_cashflow`
- **Charges recurrentes** : `assurance_pno`, `frais_gestion_pct`, `honoraires_comptable`, `cfe`, `frais_oga`
- **Budget travaux** : `budget_travaux_m2` (JSONB : {"1": 200, "2": 500, "3": 800, "4": 1200, "5": 1800})

## Autres tables
- `articles` — contenu, statut (draft/review/approved/published), slug, SEO, `cover_url` (image)
- `cron_config` — id, enabled, schedule, last_run, last_result, params (config Vercel Cron)
- `editorial_calendar` — planning 52 semaines
- `learning_logs` — exemples extractions IA
- `scoring_exemples` — few-shot examples score_travaux
- `biens_user_edits` — audit des enrichissements communautaires
- `watchlist` — biens sauvegardes par utilisateur
- `ref_communes` — code postal, nom commune, metropole (22 metropoles reelles)
- `ref_prix_parking` — prix median parking/box par ville (DVF)
- `estimation_config` — config estimateur (JSONB, id=1)

## Analyse fiscale — 7 regimes

| Code | Label | Phase locative | Phase revente |
|------|-------|---------------|---------------|
| `nu_micro_foncier` | Nu Micro-foncier | Abattement 30%, TMI + PS 17.2% | IR 19% + PS 17.2% avec abattements duree |
| `nu_reel_foncier` | Nu Reel foncier | Charges deductibles, TMI + PS, deficit foncier 10700€/an | IR 19% + PS 17.2% avec abattements duree |
| `lmnp_micro_bic` | LMNP Micro-BIC | Abattement 50%, TMI + PS 17.2% | IR 19% + PS 17.2% avec abattements duree |
| `lmnp_reel_bic` | LMNP Reel BIC | Amortissement composants, TMI seul | IR 19% + PS 17.2%, reintegration amortissements (LFI 2025) |
| `lmp_reel_bic` | LMP Reel BIC | Comme LMNP reel + cotisations SSI ~45% | PV pro, exo si recettes <90k et >5 ans |
| `sci_is` | SCI a l'IS | IS 15/25%, amortissement | IS sur VNC, pas d'abattement duree |
| `marchand_de_biens` | Marchand de biens (IS) | N/A (achat-revente) | TVA marge 20/120 + IS 15/25%, frais notaire 2.5% |

**Abattements PV** (regimes particuliers) : 0% < 6 ans, 6%/an IR + 1.65%/an PS (6-21 ans), exo IR a 22 ans, exo totale a 30 ans.

## Estimation DVF — architecture

3 couches :
1. **Base DVF** : transactions notariales reelles, filtre par type bien + nombre de pieces exact + surface +/- 30-40%
2. **Correcteurs qualitatifs** : DPE, etage/ascenseur, exterieur, vue, parking, etc. (PAS de decote travaux — estimation = prix marche "en bon etat" = prix de revente apres travaux)
3. **Confiance** : A (+-5%) a D (+-30%) selon nb comparables et variables qualitatives

Rayon adaptatif : 50m -> 110m -> 220m -> 330m -> 550m -> 770m -> 1100m
Periodes : 2022+ et 2018-2020 (meme poids)

## Scenario revente (dans PnlColonne)

Waterfall : Prix DVF - frais agence (5% modifiable) - prix achat - frais notaire - travaux = PV brute
Puis fiscalite PV selon regime (avec abattements duree si applicable)
Bilan net = PV nette + cashflow locatif cumule
Duree detention : 1-5 ans
Comparaison 2 regimes cote a cote

## Navigation (Layout.tsx)

**Header desktop** : Biens Immobiliers | Strategies MDB | Conseils | [Watchlist] | [email dropdown]
**Dropdown user** : Mon Profil | Mes parametres | Ma Watchlist | Administration (si admin) | Deconnexion
**Footer** : Plateforme (Biens, Strategies, Conseils, Tarifs) | Support (Contact, Mentions legales, CGU)

## Pipeline IA post-ingestion

Pilotable depuis `/admin/sourcing` ou via Vercel Cron (automatique, sans PC).

1. **Ingestion Moteur Immo** : API route `/api/admin/ingest` (micro-batch 30j) + webhook `/api/moteurimmo/webhook`. Mappe `category`→`type_bien`, `bedrooms`→`nb_chambres`, `constructionYear`→`annee_construction`, `energyValue`→`dpe_valeur`, `gasGrade`→`ges`.
2. **Validation regex** : `/api/admin/regex` — filtre faux positifs par strategie, timestamp `regex_statut`/`regex_date`
3. **Extraction donnees locatives** (Haiku) : `/api/admin/extraction` — Locataire en place uniquement, extrait loyer, charges, profil locataire, `nb_sdb`, `nb_chambres`. Timestamp `extraction_statut`/`extraction_date`. Cout ~1$/1000 biens.
4. **Score travaux** (Haiku) : `/api/admin/score-travaux` — Travaux lourds uniquement, option analyse photos (3x plus cher). max_tokens 300, commentaire max 500 chars. Cout ~0.70$/1000 biens (texte), ~3$/1000 (photos).
5. **Extraction IDR** (Haiku) : `/api/admin/extraction-idr` — Immeuble de rapport uniquement. Extrait nb_lots, loyer par lot, type, surface, etat locatif, DPE, monopropriete, compteurs. Donnees agregees → colonnes (nb_lots, monopropriete, compteurs_individuels, loyer, taxe_fonc_ann), lots → `lots_data` JSONB.
6. **Verification statut** : `/api/admin/statut` — marque les annonces retirees via API `deletedAds`
6. **Estimation DVF batch** : POST /api/estimation/batch

Profil locataire : Particulier | Etudiant | Senior | Famille | Colocation | Professionnel | Commercial + "depuis YYYY" ou "X ans". "NC" si non trouve.
Type bail : nu | meuble | commercial | pre-89

### Vercel Cron (vercel.json)
- Ingestion : tous les jours a 3h
- Regex : tous les jours a 3h30
- Extraction IA : toutes les 5 min de 4h a 8h
- Score travaux : toutes les 5 min de 8h a 12h
- Statut : dimanche a 2h
- Chaque cron verifie `cron_config.enabled` avant execution
- Config modifiable depuis `/admin/sourcing` (table `cron_config`)

## Sourcing Moteur Immo

Module : `scrapper/moteurimmo_client.py`
API : POST https://moteurimmo.fr/api/ads (auth par apiKey)
Pagination par date (tranches 30j)
96 000+ biens ingeres, 4 strategies, France entiere
Flag `--until` pour limiter la periode (ex: `--since 2022-01-01 --until 2025-01-01`)

## Editorial CMS (/editorial)

Pipeline : Opus redige → Sonnet fact-checke → Unsplash photos
Blog public : `/blog` (listing) + `/blog/[slug]` (article, police Lora)
Label nav : "Conseils"
Calendrier editorial : onglet "Calendrier" dans `/editorial`, table `editorial_calendar`, statut inline (planned/writing/review/published), bouton "Rediger" pre-remplit le formulaire

## Blog / Conseils (/blog)

Route unique `/blog` : listing tous les articles publies avec filtres par categorie
Route `/blog/[slug]` : article individuel (SSR, revalidate 3600, sidebar TOC sticky depliable, breadcrumb, schema.org Article + BreadcrumbList)
Categories : Strategies, Fiscalite, Travaux, Financement, Marche (5 canoniques)
Sitemap : tous les articles sous `/blog/`
Sommaire : H2 visibles, H3 depliables au clic, auto-deplie si <= 15 entrees, FAQ/Sources/Conclusion masques

## SEO Technique

- `metadataBase` + `alternates.canonical` dans root layout (canonical auto sur toutes les pages)
- Metadata server-side via `layout.tsx` dans chaque dossier page client (biens, strategies, faq, contact, login, register, mes-biens)
- Schema.org : WebSite + Organization + SoftwareApplication (pricing) sur homepage, FAQPage sur /faq, Article + BreadcrumbList sur /blog
- Sitemap dynamique : pages statiques + guide articles + blog articles
- Audit SEO complet : `AUDIT_SEO.md`

## Fiche bien — Layout et UX

- **Sticky nav** : barre pilule centree beige (Donnees | Estimation | Financement | Fiscalite), IntersectionObserver highlight section active
- **Two-cols layout** : colonne gauche (Estimation DVF + Cash Flow Avant Impot) / colonne droite (Estimation Travaux + Simulateur Financement) — `display: flex` independant, pas de gaps entre blocs
- **Modals** : budget travaux, detail lots, loyers par lot, revente par lot, couts copro, contacter vendeur — ouverts en overlay centre au lieu de deplier les blocs
- **CellEditable** : composant unifie pour toutes les cellules editables (Donnees Locatives + Cash Flow)
  - `scale` prop : 1 (direct), 12 (mensuel→annuel), 1/12 (annuel→mensuel)
  - State `dirtyChamps` partage au parent : editer dans une cellule ouvre les 3 cellules liees
  - Donnee source (IA/Moteur Immo) : lecture seule, crayon pour simulation
  - Donnee manquante : input rouge, editable, recalcul live
  - Simulation : fond bleu, bouton ✓ (soumettre) + × (annuler)
  - Jaune : soumis par 1 user, crayon pour re-editer
  - Vert : valide par 2+ users, crayon pour re-editer
- **Wording** : "Cash Flow Avant Impot" (ex cashflow brut), "Cash Flow Net d'Impot" (dans PnlColonne), "Estimation Prix de Revente" (ex Estimation marche DVF)
- **Titres majuscules** : Caracteristiques du Bien, Donnees Locatives, Estimation Prix de Revente, etc.

## Alertes email (Expert)
- **Table `alertes`** : user_id, nom, filtres (JSONB), frequence (quotidien/hebdomadaire), enabled, last_sent_at
- **API CRUD** : `/api/alertes` (GET/POST/PATCH/DELETE), max 5 alertes par utilisateur
- **Cron** : `/api/admin/alertes` — quotidien 9h, verifie nouveaux biens depuis last_sent_at, envoie email via Brevo API
- **Frequence** : quotidien (chaque jour) ou hebdomadaire (1x/semaine). Premier envoi = 30 derniers jours.
- **Filtres** : strategie_mdb, metropole, ville, code_postal, prix min/max, surface min/max, rendement min, score travaux min
- **Email** : template HTML table-based (compatible Gmail/Outlook), max 10 cards par email
- **Cards email** : photo (moteurimmo_data.pictureUrls), titre, localisation, prix, pills par strategie (loyer, prix/m2, rendement brut colore, DPE, score travaux, profil locataire, nb lots, monopropriete), bouton "Voir l'analyse"
- **Rendement brut** : pill coloree (vert >= 7%, jaune 5-7%, rouge < 5%), meme format que DPE
- **Service** : Brevo API v3 (`https://api.brevo.com/v3/smtp/email`), env var `BREVO_API_KEY` + `BREVO_SENDER_EMAIL`
- **DNS** : domaine authentifie (SPF include:sendinblue.com + DKIM 1&2 + DMARC) sur OVH
- **UI creation** : bouton "Creer une alerte" sur `/biens` (pre-rempli avec filtres en cours) + section "Mes alertes" dans `/parametres`
- **Env vars Vercel** : necessite redeploy apres ajout (pas de hot-reload). Utiliser `process.env['VAR']` bracket notation.

## Feedback Memo

- Memo detecte bugs/suggestions via tag [FEEDBACK:type:cat:summary] dans les reponses
- ChatWidget parse le tag, POST /api/feedback (upsert same summary → increment counter)
- Admin `/admin/feedbacks` : cards avec occurrence, type badges, delete

## Deploiement
- **Auto-deploy** : git push → GitHub → Vercel auto-deploy (env vars dans Vercel Dashboard)
- **Domaine prod** : `www.monpetitmdb.fr` (redirect `monpetitmdb.fr` → `www`)
- **Crons** : cron-job.org (externe, gratuit, 30s timeout) — PAS de crons Vercel (plan Hobby incompatible)
- **Workflow dev** : `npm run dev` → tester en local → un seul commit+push quand OK
- Ne PAS utiliser `vercel --prod` manuellement — les auto-deploys suffisent

## Crons (cron-job.org)
Tous en GET, header `Authorization: Bearer <CRON_SECRET>`, URL `https://www.monpetitmdb.fr/api/admin/...`

### Moteur Immo — Ingestion (4 strategies × 2/jour)
- `?strategie=Locataire+en+place&hours=12` — `0 3 * * *` et `0 15 * * *`
- `?strategie=Travaux+lourds&hours=12` — idem
- `?strategie=Division&hours=12` — idem
- `?strategie=D%C3%A9coupe&hours=12` — idem

### Moteur Immo — Verification statut
- `/api/admin/statut` — `* * * * *` (toutes les minutes, 75 biens/appel)
- Verifie chaque bien via `/api/ad/{uniqueId}`, marque "Annonce expiree" si `deletionDate`
- Cycle 1→2→3→1 stocke dans `cron_config.params.cycle`
- Colonne `verif_cycle_id` + `derniere_verif_statut` sur table `biens`
- Colonne `moteurimmo_unique_id` (indexee) pour matching rapide

### Validation Regex
- `/api/admin/regex` — `30 3 * * *` et `30 15 * * *` (2x/jour apres ingestion)
- Analyse `moteurimmo_data` (title+description) avec regex par strategie
- Parse double-string JSONB (`JSON.parse` du raw)
- ~3 000 biens/appel en 17s, timeout 15s

### IA Haiku — Extraction + Score
- `/api/admin/extraction` — `*/2 4-12 * * *` (15 biens/appel)
- `/api/admin/score-travaux` — `*/2 12-20 * * *` (15 biens/appel)
- `/api/admin/extraction-idr` — `* 20-23 * * *` (3-5 biens/appel, Immeuble de rapport)

### Alertes email
- `/api/admin/alertes` — `0 9 * * *` (quotidien, match nouveaux biens + envoi Brevo)

## Chat IA — Memo
- Nom : **Memo** — assistant IA immobilier
- Limites : Free 5 msg/jour, Pro 50 msg/jour, Expert illimite
- Streaming Haiku, historique sessionStorage

## Watchlist — Suivi pipeline MDB
14 statuts : a_analyser → info_demandee → analyse_complete → offre_envoyee → en_negociation → visite → sous_compromis → acte_signe + 5 KO + archive
Colonne `suivi` (TEXT) sur table `watchlist`, persistee en base
- **Archivage (soft delete)** : DELETE watchlist passe le suivi a `archive` (pas de suppression reelle). Toggle "Archives" dans `/mes-biens` pour voir/restaurer. Les archives ne comptent pas dans la limite du plan.
- **Ajout manuel** : POST /api/biens cree un bien + auto-ajout watchlist. URL `manual://user_id/timestamp`. Strategie inferee (loyer → Locataire en place, immeuble → IDR, sinon → Travaux lourds). Badge "MON BIEN" sur les cards/liste.
- **Tunnel ajout 3 etapes** : 1) Caracteristiques + adresse (autocompletion BAN) 2) Donnees locatives (toggle oui/non) 3) Travaux (score 1-5)
- **Illustrations SVG** : composant `TypeBienIllustration` affiche une icone par type de bien quand pas de photo (Appartement, Maison, Immeuble, Local commercial, Terrain, Parking)

## Tracking & Analytics
- **Google Tag Manager** : GTM-P2NK7FXK — installe dans layout.tsx
- **Google Analytics 4** : configure via GTM
- **Meta Pixel** : 804203415584341 — configure via GTM (tag HTML personnalise)
- **Google Search Console** : domaine verifie, sitemap soumis
- **Banniere cookie RGPD** : consentement avant chargement GTM/Pixel (localStorage `mdb_cookie_consent`)
- Scripts GTM/Pixel charges uniquement si consent != 'refused'

## SEO
- `public/robots.txt` : autorise tout sauf /admin, /api, /editorial, /parametres, /mon-profil, /mes-biens, /auth, /tarifs
- `app/sitemap.ts` : sitemap dynamique (pages statiques + tous articles publies sous `/blog/`). Colonne `status` (anglais) pas `statut`.
- Google Search Console configuree sur `www.monpetitmdb.fr`

## Auth
- **Google OAuth** : actif
- **Facebook OAuth** : actif (Meta app Live, domaine verifie)
- **Email/password** : actif avec confirmation email
- Page `/privacy` : politique de confidentialite RGPD + suppression donnees
- Callback client-side PKCE (`app/auth/callback/page.tsx`)

## Commandes
```bash
# Frontend
npm run dev
npm run build

# Batches IA
PYTHONUNBUFFERED=1 python batch_extraction.py    # 5 workers paralleles
python batch_score_travaux.py
python batch_regex_validation.py

# Sourcing Moteur Immo
python moteurimmo_client.py --by-date --since 2022-01-01

# Estimation batch
curl -X POST http://localhost:3000/api/estimation/batch
```

## Variables d'environnement

### scrapper/.env
```
SUPABASE_URL / SUPABASE_KEY (sb_secret_...)
ANTHROPIC_API_KEY
MOTEURIMMO_API_KEY
```

### .env.local (frontend)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY (sb_publishable_...)
SUPABASE_SECRET_KEY (sb_secret_...)
ANTHROPIC_API_KEY
UNSPLASH_ACCESS_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_PRO / STRIPE_PRICE_EXPERT
CRON_SECRET (pour auth Vercel Cron)
MOTEURIMMO_API_KEY (pour ingestion depuis API routes)
BREVO_API_KEY (email transactionnel alertes)
BREVO_SENDER_EMAIL (alertes@monpetitmdb.fr)
```

## Paywall Free

Les utilisateurs free voient la structure complete des blocs mais les chiffres sont floutes (classe CSS `.val-blur`).
Blocs concernes : **Estimation DVF**, **Analyse fiscale (PnlColonne)**, **Score/budget travaux**, **Prix cible**.
Bandeau CTA "Passez Pro" affiche en haut de chaque bloc concerne (dans le bloc, sous le titre).
2 analyses completes offertes aux free (compteur localStorage `mdb_free_analyses`).

## Regles absolues
- **Tous les calculs financiers dans `calculs.ts`** — jamais en DB sauf `rendement_brut`
- **Loyer toujours stocke HC** (converti depuis CC si charges connues)
- **Deduplication par `url`** — id assigne par Supabase
- **Encoding JSX** : `{'\u20AC'}` pour € ; `{'♥'}` pour les icones. Accents dans placeholders : `placeholder={"texte accentué"}`
- **Next.js App Router** : toujours `await params` dans les route handlers (bug Next.js 16)
- **Estimation DVF = prix marche "en bon etat"** : pas de decote travaux, c'est le prix de revente apres travaux
- **Prix cible PV** : `prixCible = (estimPrix * (1 - fraisAgence%) - travaux) / ((1 + fraisNotaire%) * (1 + objectifPV%))` — inclut frais agence revente dans le calcul
- **charges_copro est MENSUEL en base** (comme loyer). Multiplier par 12 pour annuel dans les calculs fiscaux. taxe_fonc_ann est ANNUEL.
- **Estimation DVF = net vendeur** (prix dans l'acte notarie, HORS frais agence). Frais agence revente = 0% par defaut (charge acquereur). Parametre "frais agence vendeur" disponible pour le cas rare charge vendeur.
- **TVA sur marge MdB** : marge = DVF net vendeur - prix_fai. Le prix_fai inclut les frais agence achat, ce qui sous-estime legerement la marge (favorable au MdB). **Axe d'amelioration** : ajouter un parametre "frais agence achat" pour retrouver le prix net vendeur a l'achat et calculer la marge TVA exacte.
- **Cashflow brut dans simulateur financement** : affiche toutes les lignes (loyer, charges recup, charges copro, TF, credit, assurance). Donnees manquantes = input editable rouge, jaune si renseigne 1 user, vert si valide
- **MdB toujours a l'IS** : pas de regime IR pour marchand de biens, pas d'amortissement (biens = stock)
- **Frais notaire MdB** : simulateur = 2.5% si regime profil MdB, 7.5% sinon. Chaque PnlColonne recalcule son propre financement (colMontantEmprunte) selon son regime (2.5% MdB, fraisNotaireBase sinon). Note sous le titre si different du simulateur.
- **Pret in fine** : toggle dans simulateur (amortissable/in fine). In fine = interets seuls, capital rembourse a la revente, duree 1-5 ans. Passe dans `financement.typeCredit`. PnlColonne adapte mensualite + CRD.
- **Bilan revente** : cashflow locatif cumule + cashflow achat-revente net (emprunt + PV nette - CRD). Infobulles avec detail du calcul.
- **Infobulles** : format uniforme (definition + calcul chiffre + subtilite). Acronymes explicites. Mentions "Modifiable dans Mes parametres → section". `text-transform: none` sur tooltip pour eviter heritage uppercase.
- **TVA sur marge MdB** : marge × 20/120 (TVA "en dedans", pas × 20%)
- **profil_locataire = "NC"** : traite comme vide dans l'UI (Non communique en grise)
- **Admin conditionne** : lien Administration visible uniquement si `profiles.role = 'admin'`
- **Pages avec sessionStorage** : utiliser `dynamic(() => import('./Client'), { ssr: false })` pour eviter hydration mismatch (ex: `/biens`)
- **Index SQL** : `idx_biens_score_travaux` sur `score_travaux WHERE NOT NULL` — necessaire pour le filtre par defaut Travaux lourds
- **IDR fiche bien** : lots dans blocs existants (caracteristiques, locatif, travaux, DVF). Pas de gros blocs separes. Pattern "bouton depliable" comme "Affiner le budget travaux".
- **IDR regimes fiscaux** : pas de micro-foncier ni LMNP micro pour immeubles multi-lots. Utiliser `REGIMES_IDR`.
- **IDR waterfall revente** : inclut frais notaire achat (7.5%), creation copro (geometre + reglement + compteurs × nb lots), frais agence revente, frais notaire revente (2.5% MdB), TVA marge (20/120), IS (15%/25%).
- Clean avant scale : corriger les bugs avant d'etendre le perimetre
