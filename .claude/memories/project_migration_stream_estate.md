---
name: Migration Moteur Immo → Stream Estate
description: Strategie migration sourcing — dedup cross-source via biens_source_urls, strict:true, etat operationnel avril 2026
type: project
originSessionId: 43d10543-db1c-4e93-9aa0-568b1a5c104e
---
## Contexte

Moteur Immo a coupe l'acces API le 2026-04-06. Stream Estate est l'alternative. 96k+ biens MI en base avec donnees IA conservees.

## Etat operationnel (11 avril 2026)

### Webhook deploye et fonctionnel
- `/api/stream-estate/webhook/route.ts`
- Events : `property.ad.create` uniquement (les autres coutent trop de credits)
- Pas d'auth (SE n'envoie pas de header secret)

### 4 saved searches — `strict: true`
- Locataire en place (3 expressions)
- Travaux lourds (12 expressions)
- Division (10 expressions)
- Immeuble de rapport (8 expressions)
- **IMPORTANT** : `strict: false` (defaut) = stemming → 95% faux positifs. Toujours utiliser `strict: true`.
- Format API pour update : PUT avec `--data-raw` et accents en `\uXXXX`, Content-Type `application/json; charset=utf-8`

### Deduplication 4 niveaux
1. **URL directe** : `biens.url` = URL source
2. **stream_estate_id** : UUID SE deja rattache
3. **biens_source_urls** : table de 360k+ URLs (principales + duplicates MI/SE). Remplace le `.contains()` JSONB qui timeout sur 96k lignes
4. **Matching geo** : code_postal + type_bien + nb_pieces + surface +-1m2 + prix +-2%

### Table biens_source_urls
- `bien_id bigint, url text PRIMARY KEY`
- Remplie via script Python VPS (cursor-based, retry on error)
- Chaque nouveau bien SE insere automatiquement son URL + URLs duplicates
- ~360k URLs couvrant MI + SE

### Colonnes IA protegees (jamais ecrasees par upsert SE)
loyer, type_loyer, charges_rec, fin_bail, profil_locataire, rendement_brut, score_travaux, score_commentaire, nb_lots, monopropriete, compteurs_individuels, lots_data, regex_statut, regex_date, extraction_statut, extraction_date, score_analyse_statut, score_analyse_date, estimation_*, photo_storage_path

### Problemes connus
- **Expirations MI** : pas de solution. `ad.update.expired` fire sur tout l'historique → trop de credits. En attente V2 SE.
- **Backlog a la reactivation** : malgre `property.ad.create` only, SE envoie des annonces datant de 6 mois avant la creation des searches.
- **`/documents/properties`** : le parametre `expressions` est ignore, renvoie toujours 10k resultats non filtres. Impossible de rattraper l'historique par mots-cles.

### Variables d'environnement
```
STREAM_ESTATE_API_KEY=646dbf20852d6524745430b553e70802
STREAM_ESTATE_WEBHOOK_SECRET=1dc5001d-72cf-4ea8-bc9b-5bbfeb7c0b47 (inutilise)
```

### Saved searches IDs
- Locataire en place : `d12ba9a4-4643-468f-b393-8196b2e29e17`
- Travaux lourds : `cfe1717e-e3bc-4359-9bd9-ec0c26b53573`
- Division : `7019ec35-2582-4b31-b85d-991793d5fbb3`
- Immeuble de rapport : `dd4125d9-aa91-4529-a607-61d4b2347431`
