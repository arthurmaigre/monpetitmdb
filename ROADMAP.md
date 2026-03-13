# MonPetitMDB — Roadmap

## Stack
- Frontend + Backend : Next.js (App Router, TypeScript, Tailwind)
- Base de données : Supabase (West EU / Ireland)
- Hébergement frontend : Vercel
- Hébergement scraper : Hetzner VPS
- Scraper : Python + Playwright → Leboncoin

## Ce qui est fait ✅
- Scraper Python → Supabase (table `biens`)
- Listing `/biens` avec filtres (stratégie, métropole, ville, type, prix, rendement)
- Composants partagés : Layout, BienCard, MetroBadge, RendementBadge
- Lib partagée : types.ts, constants.ts, theme.ts, calculs.ts
- Auth : login, register, déconnexion (Supabase Auth)
- Table `profiles` (role, plan, TMI, régime, financement)
- Trigger inscription → création profil automatique
- Page `/mon-profil` — édition paramètres fiscaux et financement
- API routes : /api/biens, /api/biens/[id], /api/calculs, /api/metropoles, /api/profile

---

## PHASE 1 — Base de données complète
- [ ] Table `watchlist` dans Supabase
- [ ] Vérifier que tous les champs de `biens` sont bien scrappés (loyer, charges_copro, taxe_fonciere, url)

---

## PHASE 2 — Back-office admin
- [ ] Middleware protection `/admin/*` (role = admin uniquement)
- [ ] `/admin` — dashboard stats (nb biens, nb users, nb watchlist)
- [ ] `/admin/biens` — tableau gestion biens (modifier statut, champs manquants, supprimer)
- [ ] `/admin/users` — tableau utilisateurs (plan, rôle, date inscription)

---

## PHASE 3 — Fiche bien + simulateur
- [ ] `/biens/[id]` — page fiche complète (toutes les infos du bien)
- [ ] Simulateur fiscal interactif (utilise lib/calculs.ts)
- [ ] Profil fiscal pré-rempli si utilisateur connecté
- [ ] Calcul rendement net, cashflow, prix cible affiché sur la fiche

---

## PHASE 4 — Watchlist + enrichissement communautaire
- [ ] Bouton coeur sur BienCard (ajouter/retirer de la watchlist)
- [ ] API `/api/watchlist` (GET, POST, DELETE)
- [ ] Page `/mes-biens` — tableau style Excel
  - Colonnes : photo, titre, ville, prix, loyer, charges, taxe foncière, rendement
  - Champs éditables inline : loyer, charges_copro, taxe_fonciere
  - Sauvegarde automatique onBlur → PATCH /api/biens/[id]
  - Rendement recalculé en temps réel avec les données enrichies
- [ ] Les données enrichies par les utilisateurs alimentent directement la table `biens`

---

## PHASE 5 — Couche d'accès et monétisation
- [ ] Flouter simulateur fiscal si non connecté
- [ ] Bloquer accès aux biens selon `strategies_autorisees` dans le profil
- [ ] Page `/tarifs` (free / starter ~19€ / pro ~49€)
- [ ] Stripe integration (paiement + mise à jour plan dans profiles)

---

## PHASE 6 — Front public
- [ ] Landing page `/` (hero, valeur, comment ça marche, tarifs)
- [ ] Page `/comment-ca-marche`
- [ ] SEO : metadata, sitemap, og:image

---

## PHASE 7 — Déploiement
- [ ] Vercel (frontend) — connexion GitHub auto-deploy
- [ ] Variables d'environnement sur Vercel
- [ ] Domaine custom monpetitmdb.fr
- [ ] Scraper sur Hetzner VPS + cron job nightly
- [ ] Proxy résidentiel rotation pour scraping à grande échelle

---

## Modèle tarifaire
- Gratuit : voir listing + fiches + enrichir les données de sa watchlist
- Starter (~19€/mois) : 1 stratégie + simulateur fiscal + watchlist
- Pro (~49€/mois) : toutes les stratégies + export Excel + alertes

## Villes cibles (scraping progressif)
Nantes, Lyon, Paris, Bordeaux, Marseille, Toulouse, Rennes
→ objectif 20 villes françaises# MonPetitMDB — Roadmap

## Stack
- Frontend + Backend : Next.js (App Router, TypeScript, Tailwind)
- Base de données : Supabase (West EU / Ireland)
- Hébergement frontend : Vercel
- Hébergement scraper : Hetzner VPS
- Scraper : Python + Playwright → Leboncoin

## Ce qui est fait ✅
- Scraper Python → Supabase (table `biens`)
- Listing `/biens` avec filtres (stratégie, métropole, ville, type, prix, rendement)
- Composants partagés : Layout, BienCard, MetroBadge, RendementBadge
- Lib partagée : types.ts, constants.ts, theme.ts, calculs.ts
- Auth : login, register, déconnexion (Supabase Auth)
- Table `profiles` (role, plan, TMI, régime, financement)
- Trigger inscription → création profil automatique
- Page `/mon-profil` — édition paramètres fiscaux et financement
- API routes : /api/biens, /api/biens/[id], /api/calculs, /api/metropoles, /api/profile

---

## PHASE 1 — Base de données complète
- [ ] Table `watchlist` dans Supabase
- [ ] Vérifier que tous les champs de `biens` sont bien scrappés (loyer, charges_copro, taxe_fonciere, url)

---

## PHASE 2 — Back-office admin
- [ ] Middleware protection `/admin/*` (role = admin uniquement)
- [ ] `/admin` — dashboard stats (nb biens, nb users, nb watchlist)
- [ ] `/admin/biens` — tableau gestion biens (modifier statut, champs manquants, supprimer)
- [ ] `/admin/users` — tableau utilisateurs (plan, rôle, date inscription)

---

## PHASE 3 — Fiche bien + simulateur
- [ ] `/biens/[id]` — page fiche complète (toutes les infos du bien)
- [ ] Simulateur fiscal interactif (utilise lib/calculs.ts)
- [ ] Profil fiscal pré-rempli si utilisateur connecté
- [ ] Calcul rendement net, cashflow, prix cible affiché sur la fiche

---

## PHASE 4 — Watchlist + enrichissement communautaire
- [ ] Bouton coeur sur BienCard (ajouter/retirer de la watchlist)
- [ ] API `/api/watchlist` (GET, POST, DELETE)
- [ ] Page `/mes-biens` — tableau style Excel
  - Colonnes : photo, titre, ville, prix, loyer, charges, taxe foncière, rendement
  - Champs éditables inline : loyer, charges_copro, taxe_fonciere
  - Sauvegarde automatique onBlur → PATCH /api/biens/[id]
  - Rendement recalculé en temps réel avec les données enrichies
- [ ] Les données enrichies par les utilisateurs alimentent directement la table `biens`

---

## PHASE 5 — Couche d'accès et monétisation
- [ ] Flouter simulateur fiscal si non connecté
- [ ] Bloquer accès aux biens selon `strategies_autorisees` dans le profil
- [ ] Page `/tarifs` (free / starter ~19€ / pro ~49€)
- [ ] Stripe integration (paiement + mise à jour plan dans profiles)

---

## PHASE 6 — Front public
- [ ] Landing page `/` (hero, valeur, comment ça marche, tarifs)
- [ ] Page `/comment-ca-marche`
- [ ] SEO : metadata, sitemap, og:image

---

## PHASE 7 — Déploiement
- [ ] Vercel (frontend) — connexion GitHub auto-deploy
- [ ] Variables d'environnement sur Vercel
- [ ] Domaine custom monpetitmdb.fr
- [ ] Scraper sur Hetzner VPS + cron job nightly
- [ ] Proxy résidentiel rotation pour scraping à grande échelle

---

## Modèle tarifaire
- Gratuit : voir listing + fiches + enrichir les données de sa watchlist
- Starter (~19€/mois) : 1 stratégie + simulateur fiscal + watchlist
- Pro (~49€/mois) : toutes les stratégies + export Excel + alertes

## Villes cibles (scraping progressif)
Nantes, Lyon, Paris, Bordeaux, Marseille, Toulouse, Rennes
→ objectif 20 villes françaises
