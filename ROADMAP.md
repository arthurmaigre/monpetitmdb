# Mon Petit MDB — Roadmap

## FAIT

### Sourcing
- [x] Scraper Leboncoin (legacy, 7 metropoles)
- [x] Integration Moteur Immo (60+ plateformes, France entiere)
- [x] 4 strategies : Locataire en place, Travaux lourds, Division, Decoupe
- [x] Ingestion par date (pagination 30j) pour gros volumes
- [x] ~80 000+ biens en base
- [x] 22 metropoles avec vrais perimetres communaux (geo.api.gouv.fr)
- [x] Multi-photos depuis moteurimmo_data.pictureUrls
- [x] Description complete stockee pour analyse IA

### Estimation DVF
- [x] Moteur estimation 3 couches (base DVF + correcteurs + confiance)
- [x] Filtre par nombre de pieces exact (T2 vs T2)
- [x] Rayon adaptatif 50m -> 1100m (ville vs campagne)
- [x] Poids egal pre-COVID / post-COVID
- [x] Estimation = prix marche "en bon etat" (pas de decote travaux)
- [x] Batch estimation + bouton recalculer + force cache

### Analyse fiscale & revente
- [x] 5 regimes : micro-foncier, reel, LMNP, SCI IS, MdB (IS)
- [x] Scenario revente waterfall (DVF - agence - achat - notaire - travaux - fiscalite)
- [x] Duree detention 1-5 ans, frais agence modifiable
- [x] Comparaison 2 regimes cote a cote
- [x] Badge +/- Value sur cartes et liste

### Frontend
- [x] Recherche localisation (ville, CP, departement, region, metropole)
- [x] Scroll infini (50/page, IntersectionObserver)
- [x] Filtres cote serveur (strategie, localisation, prix, type bien)
- [x] Carrousel photos (fiches bien + cartes)
- [x] Persistance filtres + scroll (sessionStorage)
- [x] Header compact avec navigation active + user pill
- [x] Watchlist avec onglets par strategie
- [x] Score travaux min en filtre pour travaux lourds
- [x] Code postal sur cartes et liste

### Auth & profil
- [x] Auth Supabase (login, register)
- [x] Profil fiscal (TMI, regime, financement, budget travaux)
- [x] Message contact vendeur auto-genere
- [x] Enrichissement communautaire des donnees

### Admin
- [x] Dashboard admin stats
- [x] Gestion biens + users
- [x] Config estimateur DVF (/admin/estimation)

### Editorial CMS
- [x] Generation articles via Opus + fact-checking Sonnet
- [x] Photos Unsplash avec navigation pour choisir
- [x] Calendrier editorial 52 semaines genere par IA
- [x] Backlog 8 sujets + workflow draft/review/approved/published
- [x] Sources officielles + references Mon Petit MDB
- [x] Auteur + date publication modifiables
- [x] Police Lora pour articles

## EN COURS

- [ ] Ingestion Decoupe + Locataire en place/Travaux lourds 2022-2023
- [ ] Tests score travaux + extraction donnees IA (prompts valides sur 200 biens)

## A FAIRE — Priorite haute

### Batch IA post-ingestion
- [ ] Validation regex batch (4 strategies, prompts valides sur 2500 annonces)
- [ ] Score travaux batch (Haiku, ~52k biens)
- [ ] Extraction donnees batch (Haiku, ~20k biens : loyer HC/CC, charges, TF, bail, profil)
- [ ] Upload photos batch (biens sans photo_storage_path)
- [ ] Estimation DVF batch sur nouveaux biens

### Mise en ligne
- [ ] Deploiement Vercel (env vars + domain monpetitmdb.io)
- [ ] 6-8 articles de lancement (antidates)
- [ ] Page blog publique (articles publies visibles par tous)
- [ ] Landing page / page d'accueil
- [ ] SEO : metadata, sitemap, og:image

### Monetisation
- [ ] Page tarifs (Free / Pro ~19 EUR / Expert ~49 EUR)
- [ ] Stripe integration
- [ ] Gestion acces par plan (strategies, simulateur, export)

## A FAIRE — Priorite moyenne

- [ ] Webhooks Moteur Immo (nouvelles annonces en temps reel)
- [ ] Google Custom Search pour fact-checking articles
- [ ] Verification statut annonces (retirees / expirees)
- [ ] Alertes email (nouveaux biens matchant les criteres utilisateur)
- [ ] Page "Comment ca marche"
- [ ] Afficher description complete sur fiche bien

## A FAIRE — Priorite basse

- [ ] Publication LinkedIn / Instagram automatique
- [ ] Editeur rich text (TipTap) pour articles
- [ ] Export PDF analyses de biens
- [ ] Comparateur de biens cote a cote
- [ ] Carte interactive (Mapbox/Leaflet)
- [ ] Analytics utilisateur
