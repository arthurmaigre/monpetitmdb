# Mon Petit MDB — CLAUDE.md

## Projet
SaaS de sourcing et analyse immobiliere pour marchands de biens et investisseurs (methodologie marchand de biens).
Strategies : **Locataire en place** / **Travaux lourds** / **Division** / **Immeuble de rapport** (ex-Decoupe) / **Encheres** (ventes aux encheres judiciaires).
Territoire : France entiere, 22 metropoles.
Modele freemium : Free (10 biens watchlist) / Pro 19€ (50 biens, 2 strategies, 2 regimes, 1 alerte email) / Expert 49€ (illimite, toutes strategies dont IDR, tous regimes, 5 alertes email).
Early adopter : -30% a vie pour les 100 premiers abonnes. Code promo `EARLYBIRD` (Stripe promotion code sur coupon `STRIPE_COUPON_EARLY_ADOPTER`). `allow_promotion_codes: true` au checkout.

## Stack
- **Frontend** : Next.js App Router, TypeScript — Vercel
- **DB** : Supabase Pro (West EU / Ireland) — auth + tables + storage
- **Auth** : Supabase Auth (email/password + OAuth Google) — callback client-side PKCE, `@supabase/ssr` installé (middleware SSR)
- **Paiement** : Stripe Checkout + Customer Portal + Webhooks (mode live)
- **Scraper legacy** : supprimé (LBC + Moteur Immo, API coupée 2026-03-25)
- **Sourcing API** : Stream Estate (agregateur, webhooks temps réel + 4 saved searches). Notifications ACTIVÉES (property.ad.create only, strict:true). Table `biens_source_urls` (360k URLs) pour dedup cross-source.
- **Scraping encheres** : Python + requests + BeautifulSoup + Playwright (Avoventes) → 3 sources (Licitor, Avoventes, Vench). Cron VPS Hetzner ACTIF (toutes les 3h, scraping seul). Phases 2-5 DESACTIVEES (extraction Sonnet, dedup, statuts, normalisation) en attente verification manuelle. Pipeline : scraping minimaliste (donnees fiables + raw_text) → extraction Sonnet (1 passe) + vision PDF scans → dedup cross-source → statuts → normalisation programmatique. Table `encheres` Supabase. Auto-learning (`encheres_learning.json`). 409 encheres a enrichir par Sonnet (~$20).
- **Audit dedup encheres (10/04)** : dedup intra-source OK (0 doublon id_source sur les 3 sites). Licitor 420 en base / 384 sur le site (36 expirees). Avoventes 216 / 212 (4 expirees). Vench 434 / 425 (9 expirees). Bug Licitor : 22 collisions id_source (lots meme dossier) → fix : URL complete comme id_source. Avoventes : listing Playwright deterministe (212 URLs stables). 406 biens restent a enrichir par Sonnet (~$20).
- **VPS Hetzner** : 178.104.58.122, SSH key configuree, Python 3.12 + Playwright + Chromium + psql. Cron encheres actif toutes les 3h (0h, 8h, 11h, 14h, 17h, 20h), phase 1 scraping uniquement.
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
│   │   ├── moteurimmo/webhook/ # Webhook Moteur Immo (legacy, API coupee)
│   │   ├── stream-estate/webhook/ # Webhook Stream Estate (nouveau sourcing)
│   │   ├── encheres/            # GET liste encheres + filtres
│   │   ├── encheres/[id]/       # GET/PATCH fiche enchere
│   │   ├── estimation/encheres/[id]/ # Estimation DVF encheres
│   │   ├── admin/ingest/       # Ingestion Moteur Immo (legacy, desactive)
│   │   ├── admin/regex/        # Validation regex faux positifs
│   │   ├── admin/extraction/   # Extraction donnees locatives IA (Haiku)
│   │   ├── admin/score-travaux/# Score travaux IA (Haiku, optionnel photos)
│   │   ├── admin/statut/       # Verification annonces expirees
│   │   ├── admin/stats/        # Stats dashboard (RPC admin_stats)
│   │   ├── admin/cron-config/  # Config cron (GET/PUT)
│   │   ├── admin/estimation/   # Config estimateur (GET/PUT)
│   │   ├── editorial/calendar/ # CRUD calendrier editorial (GET/PATCH)
│   │   └── feedback/           # Feedbacks utilisateurs via Memo (GET/POST/DELETE)
│   ├── auth/callback/          # OAuth callback client-side (PKCE + implicit), redirige /onboarding si nouveau user
│   ├── onboarding/             # Tunnel inscription 3 etapes (profil+fiscal, financement, abonnement+strategie)
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
│   ├── supabase_client.py          # Client Supabase Python
│   ├── encheres_supabase.py        # Module Supabase encheres (upsert intra-source, statuts, normalisation)
│   ├── scraper_licitor.py          # Scraper Licitor (~390 encheres, requests, minimaliste)
│   ├── scraper_avoventes.py        # Scraper Avoventes (~210 encheres, Playwright + requests)
│   ├── scraper_vench.py            # Scraper Vench (~430 encheres, requests + login abo)
│   ├── scraper_encheres.py         # CLI unifie (3 sources)
│   ├── batch_encheres_extraction.py # Extraction Sonnet (1 passe) + vision PDF scans + normalisation
│   ├── dedup_cross_source.py       # Dedup cross-source post-Sonnet (ville + date + prix)
│   ├── encheres_learning.json      # Exemples auto-logues pour ameliorer Sonnet
│   ├── add_learning_example.py     # Script ajout exemples manuels
│   ├── cron_encheres.sh            # Cron VPS (5 phases : scraping → Sonnet → dedup → statuts → normalisation)
│   ├── sql_create_encheres.sql     # Script SQL creation table
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

**Sourcing (Moteur Immo legacy + Stream Estate)**
- `moteurimmo_data` (JSONB) — JSON brut complet (memes cles title/description/pictureUrls/origin/duplicates quelle que soit la source)
- `source_provider` ("moteurimmo" | "stream_estate" | "manual") — origine du bien
- `stream_estate_id` (UUID) — identifiant Stream Estate pour matching cross-source
- `publisher_type` ("particulier" | "professionnel") — type d'annonceur (Stream Estate)
- `price_history` (JSONB) — historique baisses de prix (Stream Estate)

**Pipeline IA (tracabilite)**
- `regex_statut` ("valide" | "faux_positif"), `regex_date` (timestamptz)
- `extraction_statut` ("ok" | "no_data" | "echec" | "erreur"), `extraction_date` (timestamptz)
- `score_analyse_statut` ("ok" | "no_data" | "echec" | "erreur"), `score_analyse_date` (timestamptz)

**Dates** : `created_at`, `updated_at`, `derniere_verif_statut`

## Table `profiles` — colonnes
- `id` (FK auth.users), `role` ("admin" | "user"), `plan` ("free" | "pro" | "expert")
- **Identite** : `prenom` (text), `nom` (text), `entreprise` (text, optionnel)
- **Strategie** : `strategie_mdb` (text), `strategie_mdb_2` (text) — Pro : 2 strategies (sans IDR), Expert : toutes. Cooldown 7j via `pro_config_updated_at`.
- **Fiscalite** : `tmi` (int), `regime` (text), `regime2` (text)
- **Financement** : `type_credit` ("amortissable" | "in_fine", default "amortissable"), `apport` (float, montant), `apport_pct` (float, % autofinancement), `taux_credit`, `taux_assurance`, `duree_ans`, `frais_notaire`, `objectif_cashflow`
- **Charges recurrentes** : `assurance_pno`, `frais_gestion_pct`, `honoraires_comptable`, `cfe`, `frais_oga`
- **Budget travaux** : `budget_travaux_m2` (JSONB : {"1": 200, "2": 500, "3": 800, "4": 1200, "5": 1800})
- **Stripe** : `stripe_customer_id` (text)

## Table `encheres` — Ventes aux encheres judiciaires

**Sources** : Licitor (~385), Avoventes (~210, Playwright), Vench (~440, abo actif)
**631 biens uniques** apres fusion cross-source (48% multi-source).

**Colonnes principales** :
- `id`, `source`, `id_source`, `url`, `sources` (JSONB multi-source avec URLs)
- `statut` : a_venir | adjuge | vendu | surenchere | retire | expire
- `type_bien`, `adresse`, `ville`, `code_postal`, `departement`, `surface`, `nb_pieces` (text "T3"), `nb_lots`
- `tribunal`, `mise_a_prix`, `prix_adjuge`, `date_audience`, `date_visite`, `date_surenchere`, `mise_a_prix_surenchere`, `consignation`
- `avocat_nom`, `avocat_cabinet`, `avocat_tel`
- `occupation` (libre/occupe/loue), `description`, `photo_url`, `documents` (JSONB PDFs)
- `lots_data` (JSONB multi-lots), `score_travaux`, `loyer`, `charges_copro`, `taxe_fonc_ann`
- `estimation_*` (DVF cache), `enrichissement_*` (Sonnet v3)
- `latitude`, `longitude`, `created_at`, `updated_at`

**Pipeline** : scraping 3 sites → fusion cross-source → extraction Sonnet v3 + PDFs (PV+CCV) → upsert Supabase
**Frais enchere** : droits mutation 5.8% + emoluments avocat (bareme progressif) + frais prealables + CSI 0.1% ≈ 12%
**Dedup** : intra-source (source, id_source), cross-source (ville + date_audience + prix ±5%)
**Statut cycle de vie** : a_venir → surenchere (10j post-audience) → adjuge → vendu. Expire si disparait de tous les listings.

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
- `stream_estate_searches` — mapping search IRI → strategie_mdb (4 saved searches)
- `biens_source_urls` — index URLs sources pour dedup cross-source (bien_id, url PK). 360k+ URLs (principales + duplicates MI/SE)

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

## Strategie Encheres — Frontend

Integree dans `/biens` comme les autres strategies (pas de page separee).
- Filtre strategie "Encheres" dans BiensClient.tsx → appel `/api/encheres` au lieu de `/api/biens`
- `EnchereCard.tsx` : card avec countdown J-XX, mise a prix / prix adjuge, pills (occupation, TJ, prix/m2)
- Fiche bien `/biens/[id]?source=encheres` : meme page que les autres strategies, avec blocs specifiques :
  - Infos enchere dans Caracteristiques (tribunal, audience, visite, avocat, prix adjuge, statut)
  - Badge countdown sur la photo/illustration
  - Bloc surenchere orange (date limite, nouvelle mise a prix, consignation)
  - Prix cible enchere max (objectif 20% PV brute)
  - Documents juridiques (PDFs CCV, PV, DDT telechargeables)
  - Boutons sources (Licitor, Avoventes, Vench) dans PlatformLinks
- Filtres specifiques : statut (a venir/surenchere/adjuge), occupation (libre/occupe/loue)
- `calculerFraisEnchere()` dans calculs.ts : emoluments avocat (bareme progressif) + droits mutation 5.8% + CSI 0.1%

## Navigation (Layout.tsx)

**Header desktop** : Biens Immobiliers | Strategies MDB | Conseils | [Watchlist] | [email dropdown]
**Dropdown user** : Mon Profil | Mes parametres | Ma Watchlist | Administration (si admin) | Deconnexion
**Footer** : Plateforme (Biens, Strategies, Conseils, Tarifs) | Support (Contact, Mentions legales, CGU)

## Pipeline IA post-ingestion

Pilotable depuis `/admin/sourcing` ou via Vercel Cron (automatique, sans PC).

1. **Ingestion** : webhook Stream Estate `/api/stream-estate/webhook` (temps réel, 4 saved searches). Legacy Moteur Immo désactivé (API coupée 2026-03-25).
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

## Sourcing — Migration Moteur Immo → Stream Estate

### Moteur Immo (legacy — API coupee 2026-04-06)
Module : `scrapper/moteurimmo_client.py`
API : POST https://moteurimmo.fr/api/ads (auth par apiKey) — **COUPE** (concurrent direct)
96 000+ biens ingeres, 4 strategies, France entiere. Donnees IA conservees en base.
URLs en base = URLs Moteur Immo (`moteurimmo.fr/ad/xxx`) — a verifier.

### Stream Estate (sourcing — PAUSE credits epuises 2026-04-12)
API REST + MCP tools + webhooks. Agregateur annonces immo.
Webhook : `/api/stream-estate/webhook/route.ts` — pas d'auth (SE n'envoie pas de header secret).
4 saved searches (1 par strategie). **Notifications DESACTIVEES** (credits epuises 2026-04-12).
Events : `property.ad.create`, `ad.update.expired`, `ad.update.price`, `property.ad.update`.

**Bilan 4 jours (8-12 avril)** : ~22 000 biens recus, ~2 000 valides (9%), ~20 000 faux positifs (91%).
Cause : expressions trop larges ("a renover", "vendu en l'etat", "mise aux normes", "plusieurs appartements").
FP par strategie : Travaux lourds 90%, IDR 54%, Division 26%, Locataire en place 25%.

**Nettoyage expressions (2026-04-12)** :
- Travaux lourds 12→11 : supprime "a renover" / "vendu en l'etat" / "mise aux normes", ajoute "a restaurer" / "travaux de renovation"
- IDR 8→7 : supprime "plusieurs appartements"
- Division et Locataire en place : inchanges (deja cibles)

**Regex strategies factorisees** : `lib/regex-strategies.ts` (module partage entre webhook et cron regex).

**Dedup 4 niveaux** a l'ingestion :
1. URL source directe (`biens.url`)
2. `stream_estate_id` (bien deja rattache)
3. Table `biens_source_urls` (360k URLs indexees — remplace .contains() JSONB qui timeout)
4. Matching geo fallback (code_postal + type_bien + nb_pieces + surface +-1m2 + prix +-2%)

**IMPORTANT** : `strict: false` (defaut SE) = stemming/lemmatisation → 95% faux positifs. Toujours utiliser `strict: true` sur les expressions.
**IMPORTANT** : Le MCP tool `update-search` ne peut PAS modifier les expressions (bug format). Utiliser l'API REST directe : `PUT https://api.stream.estate/searches/{id}` avec header `x-api-key`.

`moteurimmo_data` reutilise avec memes cles (title, description, pictureUrls, origin, duplicates) + champ `source: 'stream_estate'`.
Colonnes IA (loyer, score_travaux, estimation) **jamais ecrasees** par l'upsert SE.
`charges_copro` SE = annuel → divise par 12 a l'insertion (base = mensuel).

**Strategie** : lookup table `stream_estate_searches` (search IRI → strategie_mdb, cache 5min). Fallback detection regex contenu.

**Saved searches** (notifications OFF, strict:true) :
- `/searches/d12ba9a4-4643-468f-b393-8196b2e29e17` → Locataire en place (3 expressions)
- `/searches/cfe1717e-e3bc-4359-9bd9-ec0c26b53573` → Travaux lourds (11 expressions)
- `/searches/7019ec35-2582-4b31-b85d-991793d5fbb3` → Division (10 expressions)
- `/searches/dd4125d9-aa91-4529-a607-61d4b2347431` → Immeuble de rapport (7 expressions)

Env vars : `STREAM_ESTATE_API_KEY`, `STREAM_ESTATE_WEBHOOK_SECRET` (inutilise mais present).
Doc migration complet : `.claude/projects/.../memory/project_migration_stream_estate.md`

## Landing page (`app/page.tsx`)

### Stratégies affichées
4 stratégies visibles sur la landing (section `#strats`) :
1. **Locataire en place** — tag "Cashflow immédiat"
2. **Travaux lourds** — tag "Plus-value travaux"
3. **Immeuble de rapport** — tag "Méthode MDB"
4. **Enchères** — tag "Décote garantie"

La stratégie **Division** existe en base (`strategie_mdb`) mais est **masquée** sur la landing et dans les filtres UI (non affichée dans la section strats, non proposée au checkout).

### Badge EARLYBIRD (`components/EarlyAdopterBadge.tsx`)
Badge statique (pas d'appel API) affiché dans la section pricing sur la landing et dans l'étape 4 de l'onboarding.
Affiche : `-30 % à vie — Code EARLYBIRD` + instructions pour saisir le code au moment du paiement.
Le vrai compteur (places restantes) n'est exposé que côté admin via `GET /api/stripe/early-adopter`.

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
- **Intro strategie** : bloc pedagogique en haut de fiche (explication methode + lien "En savoir plus" vers `/strategies#sX`)

## Alertes email (Pro : 1, Expert : 5)
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

## Sécurité

### Headers HTTP (`next.config.ts`)
Appliques sur toutes les routes (`/(.*)`), via `async headers()` :
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` : default-src 'self', script-src autorise GTM/Stripe/GA, style-src Google Fonts, connect-src Supabase + Stripe + GA, frame-src Stripe JS, object-src 'none'

### Protection API
- `GET /api/biens` : exige token Bearer (401 si absent ou invalide) — utilisateur authentifie requis
- `POST /api/biens` : idem (creation bien + ajout watchlist auto)
- `GET /api/stripe/early-adopter` : exige token Bearer + role `admin` en base (401 sinon)
- Routes `/api/admin/*` : header `Authorization: Bearer <CRON_SECRET>` pour les crons, token user pour les appels UI

## Deploiement
- **Auto-deploy** : git push → GitHub → Vercel auto-deploy (env vars dans Vercel Dashboard)
- **Domaine prod** : `www.monpetitmdb.fr` (redirect `monpetitmdb.fr` → `www`)
- **Crons** : cron-job.org (externe, gratuit, 30s timeout) — PAS de crons Vercel (plan Hobby incompatible)
- **Workflow dev** : `npm run dev` → tester en local → un seul commit+push quand OK
- Ne PAS utiliser `vercel --prod` manuellement — les auto-deploys suffisent

## Crons (cron-job.org)
Tous en GET, header `Authorization: Bearer <CRON_SECRET>`, URL `https://www.monpetitmdb.fr/api/admin/...`

### Moteur Immo — Ingestion (DESACTIVE — API coupee)
- ~~`?strategie=Locataire+en+place&hours=12` — `0 3 * * *` et `0 15 * * *`~~
- Remplace par webhooks Stream Estate (saved searches)

### Verification statut annonces (REECRIT 2026-04-08)
- `/api/admin/statut` — reecrit pour checker URLs source par HEAD HTTP (remplace API MI coupee)
- **Probleme** : LBC renvoie 403 sur toutes les requetes HEAD/GET automatiques
- **Biens SE** : geres automatiquement par event `ad.update.expired` du webhook SE
- **Biens MI sans stream_estate_id** : a repenser (backfill SE ou auto-expire 90j)
- **Cron desactive** en attendant une solution fiable

### Validation Regex
- `/api/admin/regex` — `30 3 * * *` et `30 15 * * *` (2x/jour apres ingestion)
- Analyse `moteurimmo_data` (title+description) avec regex par strategie
- Parse double-string JSONB (`JSON.parse` du raw)
- ~3 000 biens/appel en 17s, timeout 15s

### IA Haiku — Extraction + Score
- `/api/admin/extraction` — `*/2 4-12 * * *` (15 biens/appel)
- `/api/admin/score-travaux` — `*/2 12-20 * * *` (15 biens/appel)
- `/api/admin/extraction-idr` — `* 20-23 * * *` (3-5 biens/appel, Immeuble de rapport)

### Estimation DVF batch
- `/api/admin/estimation-batch?limit=7` — `* * * * *` (toutes les minutes, biens en parallele via Promise.all)
- Timeout 10s par appel API, page_size 500, max 2 pages DVF
- Biens skip/erreur marques `estimation_date=now()` pour eviter boucle infinie (retente 30j)

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

### Middleware (`middleware.ts`)
- Protege les routes : `/admin/*`, `/mes-biens/*`, `/mon-profil/*`, `/parametres/*`, `/onboarding/*`
- Utilise `@supabase/ssr` (`createServerClient`) pour verifier la session via cookies
- Si pas de session → redirect `/login?redirect=[pathname]`
- Matcher Next.js configure sur les memes 5 prefixes (pas de regex globale)

### Providers & config
- **Google OAuth** : actif
- **Facebook OAuth** : actif (Meta app Live, domaine verifie)
- **Email/password** : actif avec confirmation email
- Page `/privacy` : politique de confidentialite RGPD + suppression donnees
- Callback client-side PKCE (`app/auth/callback/page.tsx`)
- **Onboarding** : detection nouveau user (pas de `strategie_mdb`) → redirect `/onboarding`

## Tunnel d'onboarding (`/onboarding`)
3 etapes apres la creation de compte :
1. **Profil investisseur** : prenom, nom (pre-rempli Google OAuth), toggle "Je suis professionnel" → entreprise + TMI + regime fiscal
2. **Financement** : type credit (amortissable/in fine), apport (montant € ou % autofinancement), taux credit, taux assurance, duree (skippable)
3. **Abonnement** : Free/Pro/Expert (meme format que landing), badge EarlyAdopterBadge avec code `EARLYBIRD`, checkout Stripe + choix strategies adaptees au plan (Free=1, Pro=2 hors IDR, Expert=toutes)

## Admin — Gestion utilisateurs (`/admin/users`)
- **Colonnes** : utilisateur (prenom/nom/email), plan (editable), role (editable), strategie, Stripe (badge statut + dernier paiement + renouvellement), derniere connexion (last_sign_in_at + "il y a Xj"), inscription
- **Suppression compte** : modale confirmation, annule abo Stripe, supprime watchlist + alertes + profil + auth user
- **Stripe data** : fetch subscriptions + invoices en temps reel via API Stripe pour les users avec stripe_customer_id

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
STRIPE_COUPON_EARLY_ADOPTER (coupon Stripe -30% a vie, 100 premiers abonnes)
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

## OpenClaw — Agents IA (VPS Hetzner)

9 agents IA autonomes sur VPS Hetzner (178.104.58.122, CPX42 8vCPU 16GB RAM).
User dedie `openclaw` (isole de root, pas d'acces aux secrets scrapper).
Gateway OpenClaw 2026.4.11, bot Telegram @AlbusMDB_Bot.
Branch protection activee sur main (1 review requise pour merge).

**Agents (9 total — TOUS en ACP / Claude Code Max = Opus 4.6 = 0€) :**
| Agent | ID | Role |
|---|---|---|
| CEO Albus | ceo | Coordination, pilotage 8 agents, rapports Telegram |
| Developer | developer | Code, PRs, corrections techniques |
| QA Testeur | qa | Tests parcours utilisateur, bugs |
| UI/UX | uiux | Audit design, coherence visuelle |
| SEO | seo | Audit technique, mots-cles, JSON-LD |
| Marketing | marketing | Positionnement, contenu (preparation) |
| LinkedIn | linkedin | Veille prospects MDB (preparation) |
| Customer Success | customer-success | Emails, retention, onboarding (preparation) |
| Data Analyst | data-analyst | KPIs, funnel AARRR, analytics |

**Architecture :**
- Tous les agents en `runtime.type: "acp"` (Claude Code Max, Opus 4.6, 0€). Aucun agent n'utilise l'API Anthropic payante.
- CEO lie a Telegram via binding ACP persistent (session Claude Code qui reste ouverte entre les messages).
- CEO delegue aux 8 autres via `sessions_spawn(runtime="acp")`.
- maxConcurrent=8, maxChildren=8, timeout=1800s.
- Hook `pre-push` git bloque tout push direct sur main. Branches + PRs obligatoires.
- Compaction safeguard + memory flush active (contexte persiste entre les sessions).
- Memory search active (rappel automatique des conversations passees).
- Heartbeat CEO toutes les 30 min (7h-23h Paris) : check SPRINT.md, git log, agents actifs, lance les taches en attente.

**Communication inter-agents :**
- Les agents ne se parlent pas directement. Tout passe par le CEO.
- Rapports d'audit ecrits dans `/home/openclaw/.openclaw/shared/audits/YYYY-MM-DD-[agent]-[sujet].md`
- Format standardise : severite, fichier source, fix recommande (code exact).
- Le CEO lit les rapports, extrait les taches, et lance Developer avec des prompts PRECIS (fichier + ligne + code).

**Maintenance CLAUDE.md :**
- Changement code → Developer met a jour CLAUDE.md dans le meme commit.
- Changement hors code (config, infra, services, decisions produit) → CEO ouvre une branche docs/ et fait une PR.
- Regle : si c'est dans le produit, ca doit etre dans CLAUDE.md.

**Escalade Arthur (TOUTE depense + tout acces outil externe) :**
- Arthur valide chaque euro depense (pas de seuil minimum).
- Tout besoin d'acces a un outil externe (Canva, LinkedIn, Semrush, etc.) = demande Arthur AVANT.

**Budget agents :** 0€ (ACP/Claude Code Max). Seuls les appels API dans le backend Next.js (Haiku extraction/scoring, Memo chat) coutent.
**Config :** `/home/openclaw/.openclaw/openclaw.json`, workspaces dans `/home/openclaw/.openclaw/workspaces/{agent}/`.
**Repo dev :** `/home/openclaw/monpetitmdb/` (clone GitHub). Branches + PRs, jamais push main.
**Gateway :** `nohup openclaw gateway run > ~/gateway.log 2>&1 &`. Verifier : `openclaw health`.
**Phase actuelle :** Phase 1 — Stabilisation/audit avant lancement beta. Pas de marketing actif.

## Regles absolues
- **Affichage frontend biens** : `regex_statut = 'valide'` obligatoire. Locataire en place + IDR : `extraction_statut = 'ok'` en plus. Les biens non validés/enrichis ne s'affichent pas.
- **Affichage frontend encheres** : `enrichissement_statut = 'ok'` obligatoire. Les encheres non enrichies par Sonnet ne s'affichent pas.
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
- **TVA sur marge MdB** : optionnelle pour bien ancien achete a un particulier (art. 260-5° bis CGI). Toggle Oui/Non dans PnlColonne. Si Oui : marge × 20/120 (TVA "en dedans") + TVA recuperable sur travaux (budget HT = TTC/1.2). Si Non : exonere, pas de TVA collectee ni recuperable sur travaux.
- **profil_locataire = "NC"** : traite comme vide dans l'UI (Non communique en grise)
- **Admin conditionne** : lien Administration visible uniquement si `profiles.role = 'admin'`
- **Pages avec sessionStorage** : utiliser `dynamic(() => import('./Client'), { ssr: false })` pour eviter hydration mismatch (ex: `/biens`)
- **Index SQL** : `idx_biens_score_travaux` sur `score_travaux WHERE NOT NULL` — necessaire pour le filtre par defaut Travaux lourds
- **IDR fiche bien** : lots dans blocs existants (caracteristiques, locatif, travaux, DVF). Pas de gros blocs separes. Pattern "bouton depliable" comme "Affiner le budget travaux".
- **IDR regimes fiscaux** : pas de micro-foncier ni LMNP micro pour immeubles multi-lots. Utiliser `REGIMES_IDR`.
- **IDR waterfall revente** : inclut frais notaire achat (7.5%), creation copro (geometre + reglement + compteurs × nb lots), frais agence revente, frais notaire revente (2.5% MdB), TVA marge (20/120), IS (15%/25%).
- Clean avant scale : corriger les bugs avant d'etendre le perimetre
