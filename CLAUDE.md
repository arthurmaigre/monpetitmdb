# Mon Petit MDB — CLAUDE.md

## Projet
SaaS de sourcing immobilier pour investisseurs particuliers (méthodologie marchand de biens).
Stratégies : **Locataire en place** / **Travaux lourds**. Territoire : France entière.
Modèle freemium : Free / Pro ~19€ / Expert ~49€.

## Stack
- **Frontend** : Next.js App Router, TypeScript, Tailwind — Vercel
- **DB** : Supabase (West EU / Ireland) — auth + tables + storage
- **Scraper** : Python + Playwright + Chromium → Leboncoin — Hetzner VPS
- **AI scoring** : Claude API (Haiku) pour `score_travaux`
- **Storage bucket** : `mdb-files`

## Structure repo (`C:\Users\GAMER\monpetitmdb`)
```
monpetitmdb/
├── app/
│   ├── api/
│   │   ├── biens/          # GET /api/biens, /api/biens/[id]
│   │   └── ...
│   ├── biens/[id]/         # Page détail bien + simulateur fiscal
│   ├── mes-biens/          # Watchlist utilisateur
│   └── mon-profil/         # Paramètres fiscaux + financement
├── components/             # BienCard, MetroBadge, RendementBadge, Layout...
├── lib/
│   ├── types.ts
│   ├── constants.ts
│   ├── theme.ts
│   └── calculs.ts          # TOUTE la logique calculs fiscaux (frontend only)
└── public/
```

## Table `biens` — colonnes réelles (source : supabase_client.py)

**Identité**
- `id` (auto Supabase), `url`, `statut` ("Toujours disponible" | "Annonce expirée")
- `strategie_mdb` ("Locataire en place" | "Travaux lourds")
- `metropole`, `ville`, `quartier`, `adresse`

**Bien**
- `type_bien`, `nb_pieces` (TEXT ex: "T2"), `etage` (TEXT ex: "RDC")
- `surface` (float), `annee_construction` (int), `dpe` (lettre A-G)
- `ascenseur`, `acces_exterieur`, `type_chauffage`, `mode_chauffage`
- `nb_sdb` (int), `nb_chambres` (int)
- `ges`, `dpe_valeur`, `budget_energie_min`, `budget_energie_max`

**Prix**
- `prix_fai` (float), `prix_m2` (float, calculé scraper)

**Locatif** (stratégie Locataire en place)
- `loyer` (float, TOUJOURS HC), `type_loyer` ("HC"), `charges_rec`
- `charges_copro`, `taxe_fonc_ann`, `fin_bail` (date ISO)
- `profil_locataire` (TEXT formaté "Statut | Compo | Ancienneté")
- `rendement_brut` (float) — SEUL calcul stocké en base (loyer×12/prix)

**Travaux** (stratégie Travaux lourds)
- `score_travaux` (smallint 1-5) — 1=état correct, 5=ruine/très lourds
- `score_commentaire` (TEXT) — justification IA

**Photos**
- `photo_url` (URL Leboncoin), `photo_storage_path` (chemin bucket)
- Format Storage : `photos/{md5_12}_cover.jpg`

**Dates** : `created_at`, `updated_at`, `derniere_verif_statut`

## Autres tables
- `profiles` — role, plan, TMI, régime fiscal, financement (lié Auth)
- `learning_logs` — exemples extractions IA
- `scoring_exemples` — few-shot examples score_travaux
- `biens_user_edits` — audit des enrichissements communautaires
- `watchlist` — biens sauvegardés par utilisateur

## API supabase_client.py — fonctions clés
```python
upsert_biens_batch(props)             # Insert/update, clé = url
get_existing_urls() -> set            # Déduplication
get_active_urls() -> list             # Biens "Toujours disponible"
update_statut(bien_id, statut)
update_score_travaux(id, score, commentaire)
upload_photo(bien_id, photo_url, index=0)  # → Storage mdb-files
sync_files_on_startup(base_dir)       # Télécharge ai_learning*.json
sync_files_after_save(base_dir)       # Upload ai_learning*.json
```

## Scraper — architecture
3 phases : collecte URLs → analyse annonces → vérification statuts

Modes : `--init` (complet) / HEBDO défaut (7 derniers jours)

Métropoles : Nantes, Paris, Lyon, Marseille, Bordeaux, Toulouse, Rennes

Keywords actifs :
- Locataire en place : "locataire en place", "vendu loué", "bail en cours"
- Travaux lourds : "à rénover", "gros travaux", "rénovation complète", "succession", "DPE G"...

Fichiers locaux scraper : `ai_learning.json`, `ai_learning_travaux.json`, `progress.json`

## Commandes
```bash
# Frontend
npm run dev
npm run build
npm run lint

# Scraper
python scraper_supabase_prod.py
python scraper_supabase_prod.py --init
python scraper_supabase_prod.py --metropoles Nantes Lyon
```

## Variables d'environnement
```
SUPABASE_URL / SUPABASE_KEY (service_role)
ANTHROPIC_API_KEY
IPROYAL_USER / IPROYAL_PASS  # proxy optionnel VPS
```

## Règles absolues
- **Tous les calculs financiers dans `calculs.ts`** — jamais en DB sauf `rendement_brut`
- **Loyer toujours stocké HC** (converti depuis CC si charges connues)
- **Déduplication par `url`** — id assigné par Supabase
- **Encoding JSX** : pas de `€` → écrire `euros` ; `{'♥'}` pour les icônes
- **Next.js App Router** : toujours `await params` dans les route handlers (bug Next.js 16)
- Clean avant scale : corriger les bugs avant d'étendre le périmètre
