# Mon Petit MDB — Roadmap

## FAIT

### Sourcing biens classiques
- [x] Scraper Leboncoin (legacy, supprimé)
- [x] Integration Moteur Immo (legacy, API coupée 2026-03-25)
- [x] Migration Stream Estate (webhooks + saved searches, opérationnel)
- [x] 4 strategies : Locataire en place, Travaux lourds, Division, Immeuble de rapport
- [x] ~96 000+ biens en base, 22 metropoles

### Sourcing enchères judiciaires
- [x] 3 scrapers : Licitor (~390), Avoventes (~210, Playwright), Vench (~430)
- [x] Pipeline : scraping minimaliste → Sonnet extraction (1 passe) → normalisation programmatique
- [x] Vision PDF scans (fallback pypdfium2 → images JPEG → Sonnet vision)
- [x] Cron VPS Hetzner 7x/jour (0h, 10h, 12h, 14h, 16h, 18h, 20h)
- [x] 5 phases cron : scraping → Sonnet → dedup cross-source → statuts → normalisation
- [x] Verrou anti-chevauchement entre crons
- [x] Extraction : tribunal, ville, adresse, surface, occupation, avocat (nom/cabinet/tel/email), frais préalables, date visite, heure audience, DPE, équipements
- [x] Normalisation programmatique : TJ de X, ville, avocat, tel (gratuit)
- [x] Auto-learning : exemples corrigés logués dans encheres_learning.json
- [x] Priorité PDF > texte page en cas de conflit (document officiel du tribunal)
- [x] ~1000+ enchères en base

### Estimation DVF
- [x] Moteur estimation 3 couches (base DVF + correcteurs + confiance)
- [x] Rayon adaptatif 50m -> 1100m
- [x] Estimation = prix marche "en bon etat" (pas de decote travaux)
- [x] Estimation enchères (API séparée)

### Analyse fiscale & revente
- [x] 7 regimes : micro-foncier, reel, LMNP micro, LMNP reel, LMP, SCI IS, MdB
- [x] Scenario revente waterfall + duree detention 1-5 ans
- [x] Enchère max (objectif 20% PV) pour les enchères
- [x] Frais enchère : émoluments avocat barème + droits mutation 5.8% + CSI

### Frontend enchères
- [x] EnchereCard avec countdown, mise à prix, statut, occupation, watchlist
- [x] Vue liste : Tribunal, Date visite, Date audience, Date surenchère, Statut, Mise à prix, Prix adjugé, Occupation, Avocat, Sources
- [x] Vue carte avec EnchereCard dans le panneau latéral
- [x] Fiche enchère : Prix Adjugé + Enchère Max alignés, surenchère, sources sous photo, adresse dans caractéristiques
- [x] Modal contact avocat (nom, cabinet, tel cliquable, email, tribunal)
- [x] Filtre sources multisélection (LIC/AVO/VEN)
- [x] Filtre statut + occupation
- [x] Tri par date audience / prix / récent
- [x] Statut auto-corrigé frontend (a_venir + date passée → adjuge/surenchere)
- [x] Colonne logos sources cliquables vers les plateformes

### Watchlist enchères
- [x] Colonne source_table dans watchlist (biens vs encheres)
- [x] API watchlist adaptée (POST/DELETE/PATCH avec source_table)
- [x] Onglet Enchères dans mes-biens avec EnchereCard
- [x] Coeur watchlist sur EnchereCard (position absolute sur photo)
- [x] Fix bug limite watchlist expert (null ?? 10)

### Frontend général
- [x] Recherche localisation (ville, CP, departement, region, metropole)
- [x] Scroll infini, filtres SSR, carrousel photos
- [x] Watchlist avec onglets par strategie + onglet Enchères
- [x] Carte interactive Leaflet
- [x] Chat IA Memo (Haiku, streaming)
- [x] Blog / CMS éditorial (Opus + Sonnet + Unsplash)
- [x] Placeholders nettoyés (retrait "Ex:")

### Auth & paiement
- [x] Supabase Auth (email + Google + Facebook)
- [x] Onboarding 5 étapes
- [x] Stripe Checkout + Portal + Webhooks (Free / Pro 19€ / Expert 49€)
- [x] Early adopter -30% (code EARLYBIRD)
- [x] Alertes email (Brevo, 1 Pro / 5 Expert)

### Admin
- [x] Dashboard stats + gestion biens/users
- [x] Pipeline IA configurable (cron_config)
- [x] Feedbacks Memo

### Infra
- [x] VPS Hetzner (178.104.58.122) — cron enchères, Python 3.12, Playwright
- [x] SSH key configurée
- [x] Scrapper legacy supprimé (LBC, Moteur Immo, batch_nuit, etc.)

## EN COURS

- [ ] Stream Estate : ingestion batch depuis le 25/03 (API coupée MI) + activation webhooks
- [ ] 183 biens PDF scan en re-traitement vision (cron 18h)

## A FAIRE — Priorité haute

- [ ] Stream Estate : trouver bon endpoint API + ingestion batch
- [ ] Stream Estate : activer notifications webhook pour temps réel
- [ ] Estimation DVF enchères : debug biens sans estimation malgré adresse
- [ ] Dedup cross-source post-Sonnet : valider sur données propres

## A FAIRE — Priorité moyenne

- [ ] Alertes email pour les enchères (nouvelle audience à venir)
- [ ] Export PDF analyses enchères
- [ ] Historique prix adjugés par tribunal/zone
- [ ] Backfill Stream Estate sur biens Moteur Immo existants

## A FAIRE — Priorité basse

- [ ] Publication LinkedIn / Instagram automatique
- [ ] Editeur rich text (TipTap) pour articles
- [ ] Analytics utilisateur avancé
