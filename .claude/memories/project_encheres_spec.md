---
name: Strategie Ventes aux Encheres
description: Spec technique complete — scraping 3 sites (Licitor, Avoventes, Vench), table encheres, pipeline Sonnet, cycle de vie, dedup cross-sources
type: project
---

## Nouvelle fonctionnalite : Ventes aux Encheres Judiciaires

**Why:** Segment inexploite par aucun agregateur (MoteurImmo, Melo, Casafari, Yanport). Differenciation forte. Valeur cle = decote vs marche (mise a prix vs DVF).

**How to apply:** Spec complete fournie par l'utilisateur le 2026-04-08. A implementer en phases. Document source complet dans la conversation du 8 avril.

---

## Resume executif

- **3 sources** : Licitor (~400-500 annonces), Avoventes (209, prix adjuges exclusifs), Vench (525, abo 40€/an)
- **~600-800 biens uniques** apres dedup cross-sources
- **Table Supabase `encheres`** : schema complet defini (bien, surfaces, caracteristiques, lots, occupation, enchere, documents PDF, statut)
- **Pipeline** : scraping HTML (requests+BS4) → regex → enrichissement Sonnet (description + PDFs CCV/PV) → merge → upsert Supabase → MAJ statuts
- **Infra** : VPS Hetzner existant, cron quotidien 7h, Python
- **Cout Sonnet** : ~470€/an (descriptions + PDFs)
- **Cycle de vie** : a_venir → vendu → cloture (11j apres audience) | retire | perime
- **Dedup** : intra-source par (source, id_source), cross-source par tribunal + date_audience + adresse

## Points cles a retenir

1. **Audit PDF obligatoire** avant de coder le prompt PDF (section 6.4) — 20+ PDFs par site minimum
2. **Sonnet pour tout** (pas Haiku) — volume faible, texte juridique dense, cout negligeable
3. **Occupation = champ critique MDB** : libre / occupe / loue (strategie locataire en place)
4. **Avoventes = seule source avec prix adjuges** (historique pour AVM)
5. **Vench = abo requis** (40€/an) + accord B2B a negocier avant scraping
6. **GPS uniquement Licitor** (Google Maps embed)
7. **Priorite donnees** : PV descriptif > CCV > description HTML Sonnet > regex HTML

## Actions prealables (avant de coder)

1. Prendre abo Vench (40€/an)
2. Contacter Vench pour accord B2B
3. Verifier CGU Vench (redistribution)
4. Lancer audit PDF (30 annonces × 3 sites × PDFs) — ~5€ Sonnet
5. Creer table `encheres` dans Supabase
