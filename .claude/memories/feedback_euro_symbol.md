---
name: feedback_euro_symbol
description: Utiliser le symbole € (unicode \u20AC) et jamais le mot "euros" dans l'UI
type: feedback
---

Toujours afficher le symbole € et jamais le mot "euros" dans l'interface.
En JSX : `{'\u20AC'}`. Dans les template literals JS : `\u20AC`.

**Why:** L'utilisateur préfère le symbole € qui est plus concis et professionnel.
**How to apply:** Dans tout le frontend (composants, pages, labels), remplacer "euros" par le symbole €.
