---
name: Enchères — État d'avancement
description: Progression du développement de la stratégie Enchères judiciaires (scraping, backend, frontend)
type: project
---

## Enchères judiciaires — État au 2026-04-10

### Backend (FAIT)
- **Table Supabase `encheres`** : ~700 biens, colonnes complètes (surenchère, lots_data, score_travaux, loyer...)
- **3 scrapers** : Licitor (385), Avoventes (210, Playwright), Vench (440, abo actif)
- **Fusion cross-source** : 48% multi-source, champs Sonnet protégés au re-scrape
- **Extraction Sonnet v3** : 1034 annonces, prompt optimisé (lots_data, occupation, ville, tribunal)
- **Analyse PDFs** : PV + CCV Avoventes (intégré par défaut dans le pipeline)
- **Prix adjugé** : regex corrigé (43 récupérés), surenchère (72 dates + mises à prix)
- **Photos** : logos cabinet supprimés, illustration SVG par défaut

### API Routes (FAIT)
- `GET /api/encheres` — liste avec filtres (type, ville, prix, surface, occupation, tribunal, statut, date)
- `GET/PATCH /api/encheres/[id]` — fiche + édition
- `GET /api/estimation/encheres/[id]` — estimation DVF

### Frontend (FAIT — intégré dans /biens)
- Stratégie "Enchères" dans le filtre de `/biens` → charge depuis `/api/encheres`
- `EnchereCard.tsx` : countdown J-XX, mise à prix / prix adjugé, pills
- Fiche bien `?source=encheres` : même page, blocs enchère ajoutés
- Infos enchère dans Caractéristiques (TJ, audience, visite, avocat)
- Badge countdown sur photo/illustration
- Bloc surenchère orange (date, nouvelle mise à prix, consignation)
- Prix cible enchère max (objectif 20% PV brute)
- Documents PDFs téléchargeables
- Sources (Licitor/Avoventes/Vench) dans PlatformLinks
- Filtres statut + occupation
- `calculerFraisEnchere()` dans calculs.ts

### Reste à faire
- Intégrer `calculerFraisEnchere()` dans le simulateur financement + PnlColonne
- Score travaux sélecteur interactif
- CellEditable sur les champs enchère
- Estimation DVF batch sur toutes les enchères
- Déployer scrapers sur Hetzner (cron 1-2x/jour)
- Re-scraper les 92 Avoventes sans prix adjugé (regex corrigé)

### Credentials
- Vench : vestamdb@gmail.com / Fcn@vench44 (abo actif)
