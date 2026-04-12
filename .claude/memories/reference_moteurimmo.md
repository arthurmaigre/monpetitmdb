---
name: Moteur Immo API (legacy — API coupee 2026-04-06)
description: API aggregateur annonces immo — COUPE car concurrent direct. 96k biens en base conserves. Remplace par Stream Estate.
type: reference
---

Moteur Immo est un agrégateur d'annonces immobilières (60+ plateformes).
API endpoint principal : POST https://moteurimmo.fr/api/ads
Auth : apiKey dans le body ou URL params.
Période d'essai 10 jours gratuit, puis environnement test (annonces obsolètes).
300 requêtes/min max.

Fonctionnalités clés pour MDB :
- Keywords search (locataire en place, à rénover, etc.)
- Option `hasWorksRequired` pour travaux
- `priceStats` inclus (loyer estimé, rentabilité, prix médian, écart prix)
- Alertes webhook pour recevoir les nouvelles annonces en push
- Dédoublonnage automatique cross-plateformes

Mapping champs vers table biens :
- price → prix_fai, surface → surface, rooms → nb_pieces
- rent → loyer, propertyCharges → charges_copro, propertyTax → taxe_fonc_ann
- energyGrade → dpe, floor → etage, constructionYear → annee_construction
- options → has_cave, ascenseur, parking_type, has_piscine, etc.
- location.city → ville, location.postalCode → code_postal
- pictureUrls[0] → photo_url

**STATUT : API COUPEE le 2026-04-06.** Moteur Immo a refuse l'acces (MonPetitMDB juge trop concurrent). Migration vers Stream Estate en cours. Les 96k+ biens et donnees IA en base sont conserves.
