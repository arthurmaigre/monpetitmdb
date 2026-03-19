# Mon Petit MDB — CLAUDE.md

## Projet
SaaS de sourcing immobilier pour investisseurs particuliers (methodologie marchand de biens).
Strategies : **Locataire en place** / **Travaux lourds** / **Division** / **Decoupe**.
Territoire : France entiere.
Modele freemium : Free / Pro ~19€ / Expert ~49€.

## Stack
- **Frontend** : Next.js App Router, TypeScript, Tailwind — Vercel
- **DB** : Supabase (West EU / Ireland) — auth + tables + storage
- **Scraper legacy** : Python + Playwright + Chromium -> Leboncoin — Hetzner VPS
- **Sourcing API** : Moteur Immo (aggregateur 60+ plateformes) — module `moteurimmo_client.py`
- **AI scoring** : Claude API (Haiku) pour `score_travaux`
- **Estimation** : API DVF (Cerema) + correcteurs qualitatifs
- **Storage bucket** : `mdb-files`

## Structure repo (`C:\Users\GAMER\monpetitmdb`)
```
monpetitmdb/
├── app/
│   ├── api/
│   │   ├── biens/              # GET /api/biens, /api/biens/[id]
│   │   ├── communes/           # Recherche localisation (ville, dept, region, metropole)
│   │   ├── estimation/[id]/    # Estimation DVF par bien
│   │   ├── estimation/batch/   # Estimation DVF batch tous biens
│   │   └── admin/estimation/   # Config estimateur (GET/PUT)
│   ├── admin/estimation/       # Page admin config estimateur
│   ├── biens/[id]/             # Page detail bien + simulateur fiscal + scenario revente
│   ├── biens/                  # Liste biens avec filtres
│   ├── mes-biens/              # Watchlist utilisateur
│   └── mon-profil/             # Parametres fiscaux + financement
├── components/
│   ├── BienCard.tsx            # Carte bien (grille)
│   ├── PlusValueBadge.tsx      # Badge +/- value brute
│   ├── RendementBadge.tsx      # Badge rendement brut
│   ├── MetroBadge.tsx
│   └── Layout.tsx
├── lib/
│   ├── types.ts
│   ├── constants.ts
│   ├── theme.ts
│   ├── calculs.ts              # Calculs fiscaux + scenario revente (frontend only)
│   ├── estimation.ts           # Moteur estimation DVF + correcteurs
│   ├── supabase.ts             # Client Supabase public (anon key)
│   └── supabase-admin.ts       # Client Supabase admin (secret key)
├── scrapper/
│   ├── scraper_supabase_prod.py    # Scraper LBC legacy
│   ├── moteurimmo_client.py        # Module sourcing Moteur Immo
│   ├── supabase_client.py          # Client Supabase Python
│   ├── ai_learning.json            # Exemples extraction IA
│   ├── ai_learning_travaux.json    # Exemples scoring travaux (455 exemples)
│   └── .env                        # Cles API (ne pas committer)
└── public/
```

## Table `biens` — colonnes

**Identite**
- `id` (auto Supabase), `url` (unique), `statut` ("Toujours disponible" | "Annonce expiree")
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
- `loyer` (float, TOUJOURS HC), `type_loyer` ("HC"), `charges_rec`
- `charges_copro`, `taxe_fonc_ann`, `fin_bail` (date ISO)
- `profil_locataire` (TEXT formate "Statut | Compo | Anciennete")
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

**Moteur Immo**
- `moteurimmo_data` (JSONB) — JSON brut complet (description, toutes photos, publisher, priceStats, duplicates, options, historique)

**Dates** : `created_at`, `updated_at`, `derniere_verif_statut`

## Autres tables
- `profiles` — role, plan, TMI, regime fiscal, financement (lie Auth)
- `learning_logs` — exemples extractions IA
- `scoring_exemples` — few-shot examples score_travaux
- `biens_user_edits` — audit des enrichissements communautaires
- `watchlist` — biens sauvegardes par utilisateur
- `ref_communes` — code postal, nom commune, metropole (pour recherche localisation)
- `ref_prix_parking` — prix median parking/box par ville (DVF)
- `estimation_config` — config estimateur (JSONB, id=1)

## Estimation DVF — architecture

3 couches :
1. **Base DVF** : transactions notariales reelles, filtre par type bien + nombre de pieces exact + surface +/- 30-40%
2. **Correcteurs qualitatifs** : DPE, etage/ascenseur, exterieur, vue, parking, etc. (PAS de decote travaux — estimation = prix marche "en bon etat" = prix de revente apres travaux)
3. **Confiance** : A (+-5%) a D (+-30%) selon nb comparables et variables qualitatives

Rayon adaptatif : 50m -> 110m -> 220m -> 330m -> 550m -> 770m -> 1100m
Periodes : 2022+ et 2018-2020 (meme poids, marche post-COVID surgonfle)

## Analyse fiscale — regimes

5 regimes supportes :
- **Micro-foncier** : abattement 30%, TMI + 17.2% PS
- **Reel** : charges deductibles, TMI + 17.2% PS
- **LMNP** : amortissement immo + mobilier, TMI seul (pas de PS)
- **SCI IS** : IS 15/25%, amortissement immo, PV reste dans la SCI
- **Marchand de biens** : IS 15/25% + TVA sur marge 20%, frais notaire reduits 2.5%, pas d'amortissement (biens = stock), pas de charges sociales

## Scenario revente (dans PnlColonne)

Waterfall : Prix DVF - frais agence (5% modifiable) - prix achat - frais notaire - travaux = PV brute
Puis fiscalite PV selon regime, puis bilan net (PV nette + cashflow locatif cumule)
Duree detention : 1-5 ans
Comparaison 2 regimes cote a cote

## Sourcing Moteur Immo

Module : `scrapper/moteurimmo_client.py`
API : POST https://moteurimmo.fr/api/ads (auth par apiKey)
Pagination par date (tranches 30j) pour eviter timeouts sur pages profondes

4 strategies :
- **Locataire en place** : keywords "locataire en place", "vendu loue", "bail en cours"
- **Travaux lourds** : option `hasWorksRequired` + keywords "a renover", "renovation complete", etc.
- **Division** : keywords "divisible", "possibilite de division", "creer des lots", etc.
- **Decoupe** : keywords "immeuble de rapport", "monopropriete", "copropriete a creer", etc. (categories block, house)

```bash
# Ingestion par date (recommande pour gros volumes)
python moteurimmo_client.py --by-date --since 2022-01-01
python moteurimmo_client.py --by-date --since 2022-01-01 --strategie "Travaux lourds"

# Ingestion par page (petits volumes)
python moteurimmo_client.py --strategie "Locataire en place" --max-pages 10

# Dry run
python moteurimmo_client.py --dry-run --strategie "Division"
```

## Commandes
```bash
# Frontend
npm run dev
npm run build
npm run lint

# Scraper LBC legacy
python scraper_supabase_prod.py
python scraper_supabase_prod.py --init

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
#IPROYAL_USER / IPROYAL_PASS  # proxy optionnel VPS
```

### .env.local (frontend)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY (sb_publishable_...)
SUPABASE_SECRET_KEY (sb_secret_...)
ANTHROPIC_API_KEY
UNSPLASH_ACCESS_KEY
```

## Editorial CMS (/editorial)

Pipeline generation article :
1. **Opus** redige l'article (systeme prompt avec ligne editoriale MDB, sources, references)
2. **Sonnet** relit et fact-checke (taux, seuils, lois a jour mars 2026)
3. **Unsplash** insere 1-2 photos avec navigation pour choisir

Tables : `articles` (contenu, statut, auteur, date publication, SEO score) + `editorial_calendar` (52 semaines)
Workflow : draft -> review -> approved -> published
Auteur par defaut : "La redaction Mon Petit MDB"
Police articles : Lora (serif) pour le corps, Fraunces pour les titres
Sources : BOFiP, Service-Public, Legifrance, experts-comptables.fr, compta-online.com, etc.

## Batch IA post-ingestion

1. **Validation regex** : filtre faux positifs par strategie (titre + description)
2. **Score travaux** (Haiku) : prompt avec signaux determinants (DPE, structure, photos)
3. **Extraction donnees** (Haiku) : loyer HC/CC, charges, taxe fonciere, fin bail, type bail, profil locataire
4. **Estimation DVF batch** : POST /api/estimation/batch

Profil locataire standardise : Particulier | Etudiant | Senior | Famille | Colocation | Professionnel | Commercial + "depuis YYYY" ou "X ans"
Type bail : nu | meuble | commercial | pre-89

## Regles absolues
- **Tous les calculs financiers dans `calculs.ts`** — jamais en DB sauf `rendement_brut`
- **Loyer toujours stocke HC** (converti depuis CC si charges connues)
- **Deduplication par `url`** — id assigne par Supabase
- **Encoding JSX** : pas de `€` direct dans le JSX -> utiliser `{'\u20AC'}` ; `{'♥'}` pour les icones
- **Next.js App Router** : toujours `await params` dans les route handlers (bug Next.js 16)
- **Estimation DVF = prix marche "en bon etat"** : pas de decote travaux, c'est le prix de revente apres travaux
- **MdB toujours a l'IS** : pas de regime IR pour marchand de biens
- Clean avant scale : corriger les bugs avant d'etendre le perimetre
