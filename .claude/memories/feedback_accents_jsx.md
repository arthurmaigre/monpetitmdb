---
name: Accents lisibles dans le JSX
description: Toujours écrire les accents français en clair dans le JSX, jamais en séquences unicode escapées (\u00E9, \u00E0, etc.)
type: feedback
---

Écrire les caractères accentués directement dans le code JSX (é, è, à, ê, ô, etc.) au lieu des séquences unicode escapées (`\u00E9`, `\u00E0`, `\u2019`, etc.).

Pour les apostrophes typographiques dans le JSX, utiliser `{"'"}` plutôt que `\u2019`.
Pour les espaces insécables, utiliser `&nbsp;` plutôt que `\u00A0`.

**Why:** Les séquences unicode rendent le code illisible et il est impossible de vérifier les accents d'un coup d'œil. Le user veut pouvoir relire le texte français directement dans le source.

**How to apply:** À chaque fois que j'écris du texte français dans du JSX, toujours vérifier que les accents sont en clair et lisibles, pas en séquences échappées.
