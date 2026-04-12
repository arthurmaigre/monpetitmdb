---
name: Estimation DVF calibration rules
description: Regles de calibration de l'estimateur DVF issues des tests terrain (Nantes, Hauts Paves)
type: feedback
---

L'estimation DVF doit donner le prix marche "en bon etat" = prix de revente apres travaux.
Ne PAS appliquer de decote score_travaux ni etat_interieur dans l'estimation.

**Why:** L'utilisateur a teste sur Nantes Place Graslin (6090 EUR/m2 au lieu de 3500) et Hauts Paves (9400 EUR/m2). Les problemes etaient : pas de filtre nb pieces (studios a 5000/m2 melanges avec T3), transactions sans geometrie (NaN dans la mediane), periode post-COVID surgonflee.

**How to apply:**
- Filtre par nombre de pieces EXACT (T2 vs T2, pas T2 vs studio)
- Meme poids pre-COVID (2018-2020) et post-COVID (2022+)
- Rayon adaptatif commencant a 50m (ville) s'elargissant a 1100m (campagne)
- Toujours valider geometry non-null et weight finite avant d'inclure dans la mediane
- Prix DVF = prix FAI (inclut frais agence), deduire 5% frais agence pour le net vendeur dans le scenario revente
