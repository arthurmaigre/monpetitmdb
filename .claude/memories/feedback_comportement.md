---
name: feedback_comportement
description: Règles de comportement en session — batches, commits, conventions
type: feedback
---

## Ne jamais ajouter Co-Authored-By dans les commits

Ne jamais inclure "Co-Authored-By: Claude..." dans les messages de commit.

**Why:** L'utilisateur ne veut pas que la collaboration avec Claude soit visible dans l'historique Git.
**How to apply:** Lors de chaque git commit, ne pas inclure la ligne Co-Authored-By.

---

## Vérifier l'état des batches en début de session

En début de session, vérifier si des batches tournent ou ont été interrompus (score_travaux, extraction IA, estimation DVF, regex).

**Why:** Les batches tournent en arrière-plan et peuvent s'arrêter si la session est coupée. L'utilisateur s'attend à ce qu'on suive leur avancement proactivement.
**How to apply:** Lancer un check DB rapide (count score_travaux IS NULL, profil_locataire IS NULL, estimation_prix_total IS NULL) pour voir où on en est et proposer de relancer si nécessaire.
