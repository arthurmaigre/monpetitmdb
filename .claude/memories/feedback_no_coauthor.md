---
name: feedback_no_coauthor
description: Ne pas ajouter Co-Authored-By Claude dans les commits
type: feedback
---

Ne jamais ajouter la ligne "Co-Authored-By: Claude..." dans les messages de commit.

**Why:** L'utilisateur ne veut pas que la collaboration avec Claude soit visible dans l'historique Git.

**How to apply:** Lors de chaque git commit, ne pas inclure la ligne Co-Authored-By.
