---
name: Moteur Immo coupe l'accès API
description: Moteur Immo refuse l'accès API car MonPetitMDB est jugé trop concurrent — besoin source de données alternative
type: project
---

Moteur Immo a coupé l'accès à l'API le 2026-04-06, motif : trop concurrent avec leur offre (ciblage MdB = leur coeur de cible aussi).

**Why:** La landing page de MonPetitMDB affiche des fonctionnalités similaires à MoteurImmo. Ils considèrent le produit comme un concurrent direct.

**How to apply:** Ne plus compter sur l'API Moteur Immo pour le sourcing. Chercher des alternatives : scraping direct des plateformes (LBC, SeLoger, etc.), autres agrégateurs, API DVF pour les transactions, ou partenariats alternatifs. Le scraper legacy LBC (Playwright) existe toujours dans scrapper/scraper_supabase_prod.py. Les 96k+ biens déjà ingérés restent en base.
