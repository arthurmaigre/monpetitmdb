---
name: project_roadmap
description: Etat d'avancement du projet au 2026-04-11
type: project
originSessionId: 43d10543-db1c-4e93-9aa0-568b1a5c104e
---
## Biens en base : ~115 800 (11 avril 2026)

| Strategie | Biens |
|---|---|
| Locataire en place | ~20 800 |
| Travaux lourds | ~78 500 |
| Division | ~5 400 |
| Immeuble de rapport | ~10 000+ |
| **Encheres** | ~1 000 (631 uniques, 409 a enrichir) |

## Stream Estate — Ingestion (11 avril 2026)

### Problemes identifies et resolus
- **strict: false** (defaut) = stemming/lemmatisation → "a renover" matche "renove", "renovation"... → 95% faux positifs sur Travaux lourds
- **12 155 biens recus** en 6h apres reactivation, seulement **503 pertinents** (4.1%)
- **Backlog inattendu** malgre `property.ad.create` only : annonces datant d'octobre 2025 recues (6 mois avant creation des searches)
- **Expressions corrigees** : 4 searches passees en `strict: true` le 11 avril 18h12
- **Regex lance** sur les 19k biens pollues → 11 618 marques faux_positif, 503 valides

### Deduplication cross-source (11 avril 2026)
- **Table `biens_source_urls`** creee : 360k+ URLs (principales + duplicates MI/SE)
- **Webhook mis a jour** : niveau 3 dedup via `biens_source_urls` (remplace le .contains() JSONB qui timeout)
- **Insertion auto** : chaque nouveau bien SE ajoute son URL + URLs duplicates dans la table
- 4 niveaux dedup : URL directe → stream_estate_id → biens_source_urls → matching geo

### Config actuelle saved searches
- 4 searches, `strict: true`, `property.ad.create` only, notifications ON
- Pas d'event `ad.update.expired` (coute trop de credits — fire sur tout l'historique)
- **Expirations MI non resolues** : en attente V2 SE (~10 jours) ou endpoint par UUID

### En attente reponse Stan
- Credits fuzzy + backlog rembourses ?
- `/documents/properties` : expressions ignorees, quel format ?
- `strict: true` sensible aux accents/casse ?
- V2 : filtrage expirations par liste property IDs ?

## Encheres — Scraping (11 avril 2026)
- **Cron VPS reactiver** : toutes les 3h (0h, 8h, 11h, 14h, 17h, 20h), phase 1 uniquement (scraping)
- **Phases 2-5 desactivees** (extraction Sonnet, dedup cross-source, statuts, normalisation)
- **Run de 17h** : 0 nouvelle annonce, 1005 mises a jour (384 Licitor + 207 Avoventes + 414 Vench)
- **409 encheres** a enrichir par Sonnet (~$20), en attente verification manuelle
- **Frontend protege** : filtre `enrichissement_statut = 'ok'` sur liste ET fiche individuelle

## Index SQL ajoutes (11 avril 2026)
- `idx_biens_regex_pending` : `ON biens (created_at) WHERE regex_statut IS NULL AND statut = 'Toujours disponible' AND moteurimmo_data IS NOT NULL` — resout le timeout du cron regex sur 19k biens
- Table `biens_source_urls` : PK sur `url` — lookup instantane pour dedup cross-source

## Regex route — limit reduit
- `app/api/admin/regex/route.ts` : limit passe de 1500 a 500 pour eviter timeout avec le nouveau volume

## Prochaines etapes
1. **Observer volume strict: true** demain — suffisant ou trop restrictif ?
2. **Reponse Stan** — credits, expirations, V2 beta
3. **Extraction Sonnet encheres** — lancer apres verification manuelle nouvelles annonces
4. **Backfill trou 25 mars → 10 avril** — en attente solution (expressions sur /documents/properties ou V2)
5. **Expirations biens MI** — en attente V2 ou endpoint par UUID
6. **Brancher biens_source_urls** dans le webhook — FAIT
7. **Division : affiner regex + re-valider biens + reactiver**
8. **IDR : estimation DVF par lot**
9. **Pages villes** : /blog/investir-[ville] pour 22 metropoles
10. **Extension navigateur Chrome** (analyse sur LBC/SeLoger)
