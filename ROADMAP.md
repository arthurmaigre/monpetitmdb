# Mon Petit MDB — Roadmap

## FAIT

### Sourcing biens classiques
- [x] Scraper Leboncoin (legacy, supprimé)
- [x] Integration Moteur Immo (legacy, API coupée 2026-04-06)
- [x] Migration Stream Estate (webhooks + saved searches, opérationnel)
- [x] 4 strategies : Locataire en place, Travaux lourds, Division, Immeuble de rapport
- [x] ~96 000+ biens en base, 22 metropoles

### Sourcing enchères judiciaires
- [x] 3 scrapers : Licitor (~390), Avoventes (~210, Playwright), Vench (~430)
- [x] Pipeline : scraping minimaliste (données fiables + raw_text) → Sonnet extraction → dedup cross-source
- [x] Cron VPS Hetzner (7x/jour : 0h, 10h, 12h, 14h, 16h, 18h, 20h)
- [x] Verrou anti-chevauchement entre crons
- [x] Extraction Sonnet : normalisation TJ, ville, type_bien, adresse, occupation + PDFs
- [x] Normalisation programmatique post-Sonnet (gratuit, pas d'API)
- [x] Auto-learning : exemples corrigés logués dans encheres_learning.json
- [x] ~1000+ enchères en base, 700 avec tribunal, 900 avec ville

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
- [x] Vue liste enchères : Tribunal, Date audience, Statut, Mise à prix, Prix adjugé, Occupation
- [x] Vue carte avec EnchereCard dans le panneau latéral
- [x] Fiche enchère : Prix Adjugé + Enchère Max alignés, surenchère, sources sous photo
- [x] Watchlist enchères (source_table = 'encheres') + onglet Enchères dans mes-biens

### Frontend général
- [x] Recherche localisation (ville, CP, departement, region, metropole)
- [x] Scroll infini, filtres SSR, carrousel photos
- [x] Watchlist avec onglets par strategie + onglet Enchères
- [x] Carte interactive Leaflet
- [x] Chat IA Memo (Haiku, streaming)
- [x] Blog / CMS éditorial (Opus + Sonnet + Unsplash)

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

## EN COURS

- [ ] Qualité données enchères (frais préalables, adresses manquantes)
- [ ] Nettoyage fichiers legacy LBC (fait côté scrapper, reste références CLAUDE.md)

## A FAIRE — Priorité haute

- [ ] Filtre rendement brut retiré pour enchères (fait)
- [ ] Estimation DVF enchères : debug biens sans estimation malgré adresse
- [ ] Dedup cross-source post-Sonnet : intégrer dans le cron
- [ ] Alertes email pour les enchères (nouvelle audience à venir)

## A FAIRE — Priorité moyenne

- [ ] Export PDF analyses enchères
- [ ] Comparateur enchères côte à côte
- [ ] Historique prix adjugés par tribunal/zone
- [ ] Score travaux IA pour enchères (Sonnet via etat_interieur)

## A FAIRE — Priorité basse

- [ ] Publication LinkedIn / Instagram automatique
- [ ] Editeur rich text (TipTap) pour articles
- [ ] Analytics utilisateur avancé
