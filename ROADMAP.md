# Mon Petit MDB — Roadmap

## FAIT

### Sourcing biens classiques
- [x] Scraper Leboncoin (legacy, supprimé)
- [x] Integration Moteur Immo (legacy, API coupée 2026-03-25)
- [x] Migration Stream Estate (webhooks + 4 saved searches configurées)
- [x] 4 strategies : Locataire en place, Travaux lourds, Division, Immeuble de rapport
- [x] ~96 000+ biens en base (MI), ~1000 biens SE ingérés
- [x] Webhook SE opérationnel (fix timeout dedup JSONB)
- [x] Filtrage frontend : regex_statut='valide' + extraction_statut='ok' (Locataire + IDR)

### Sourcing enchères judiciaires
- [x] 3 scrapers : Licitor (~384), Avoventes (~212, Playwright), Vench (~425)
- [x] Pipeline : scraping minimaliste → Sonnet extraction (1 passe) + vision PDF scans → dedup cross-source → statuts → normalisation
- [x] VPS Hetzner (178.104.58.122), SSH key, Python 3.12, Playwright, Chromium
- [x] Extraction : tribunal, ville, adresse, surface, occupation, avocat (nom/cabinet/tel/email), frais préalables, date visite, heure audience
- [x] Normalisation programmatique : TJ de X, ville, avocat, tel (gratuit)
- [x] Auto-learning : encheres_learning.json
- [x] Priorité PDF > texte page (document officiel tribunal)
- [x] Audit dedup complet (10/04) : 0 doublon id_source sur les 3 sites

### Frontend enchères
- [x] EnchereCard avec countdown, mise à prix, statut, occupation, watchlist
- [x] Vue liste : Tribunal, Date visite, Date audience, Date surenchère, Statut, Mise à prix, Prix adjugé, Occupation, Avocat, Sources
- [x] Vue carte avec EnchereCard
- [x] Fiche enchère : Prix Adjugé + Enchère Max alignés, surenchère, sources sous photo
- [x] Modal contact avocat (nom, cabinet, tel cliquable, email, tribunal)
- [x] Filtre sources multisélection (LIC/AVO/VEN)
- [x] Tri par date audience / prix / récent
- [x] Statut auto-corrigé (a_venir → adjuge/surenchere si date passée)
- [x] Enrichissement_statut='ok' obligatoire pour affichage

### Watchlist enchères
- [x] source_table dans watchlist (biens vs encheres)
- [x] Onglet Enchères dans mes-biens avec EnchereCard
- [x] Coeur watchlist sur EnchereCard + liste
- [x] Fix bug limite watchlist expert (null ?? 10)

### Infra
- [x] VPS Hetzner configuré (SSH, Python, Playwright)
- [x] Scrapper legacy supprimé
- [x] Webhook SE fix timeout (dedup JSONB contains désactivé)

## EN COURS — Bloquant

### Stream Estate — en attente retours Stan (email 10/04)
- [ ] Notifications SE désactivées (queue 400K, biens historiques envoyés)
- [ ] Comprendre : pourquoi biens d'octobre 2025 envoyés à l'activation ?
- [ ] Comprendre : 400K webhooks pour 4 searches — ad.update sur tous les biens matchés ?
- [ ] Demande : mises à jour ciblées sur biens spécifiques (pas tous les matches)
- [ ] Demande : endpoint recherche par date (backfill 25/03 → 10/04)
- [ ] Demande : filtre pays (rayon 600km couvre pays voisins)
- [ ] Demande : identifiant cross-plateforme pour rattacher biens MI → SE
- [ ] Réactiver notifications uniquement après réponses

### Enchères — 406 biens à enrichir par Sonnet (~$20)
- [ ] Lancer extraction Sonnet sur les 406 biens restants (enrichissement_statut NULL)
- [ ] Après extraction : cross-dedup → normalisation → vérifier 0 NULL restant
- [ ] Remettre cron VPS 1x/jour (0 3 * * *)
- [ ] Fix Licitor : URL complète comme id_source (22 collisions lots même dossier)

## A FAIRE — Priorité haute

- [ ] Estimation DVF enchères : debug biens sans estimation malgré adresse
- [ ] Pipeline post-ingestion SE : vérifier regex + extraction Haiku + score travaux sur biens SE
- [ ] Backfill biens MI 25/03 → 10/04 (trou d'ingestion, dépend réponse Stan)
- [ ] Rattachement biens MI existants → SE (stream_estate_id)

## A FAIRE — Priorité moyenne

- [ ] Alertes email pour les enchères (nouvelle audience à venir)
- [ ] Historique prix adjugés par tribunal/zone
- [ ] Réduire périmètre saved searches SE (départements français uniquement)
- [ ] Index Supabase sur table biens pour éviter timeouts (96k lignes)

## A FAIRE — Priorité basse

- [ ] Export PDF analyses enchères
- [ ] Publication LinkedIn / Instagram automatique
- [ ] Analytics utilisateur avancé

## Problèmes connus

- **Supabase timeout** : requêtes complexes sur table biens (96k lignes) timeout. Affecte : regex cron, extraction count, webhook SE dedup étape 3 (désactivée). Solution : index SQL ou refactor requêtes.
- **Stream Estate 400K queue** : les ad.update.price + ad.update.expired sur tous les matches génèrent un volume énorme. Solution : souscrire uniquement property.ad.create (fait), attendre purge queue.
- **Licitor id_source** : 22 collisions sur 384 (lots d'un même dossier partagent le même numéro). Solution : utiliser URL complète.
- **Coût Sonnet** : le reprocess complet 738 biens + pass 2/3 a coûté ~$40 inutilement. Pass 2+3 désactivés. Budget quotidien normal : ~$0.30/jour.
