---
name: feedback_check_batches
description: Toujours verifier l'etat des batches en cours au debut de chaque session
type: feedback
---

Toujours vérifier l'état des batches (score travaux, extraction IA, estimation DVF, regex) au début de chaque conversation.

**Why:** Les batches tournent en arrière-plan et peuvent s'arrêter si la session est coupée. L'utilisateur s'attend à ce qu'on suive leur avancement proactivement.
**How to apply:** En début de session, lancer un check DB rapide (count score_travaux, profil_locataire, estimation_prix_total) pour voir où on en est et relancer si nécessaire.
