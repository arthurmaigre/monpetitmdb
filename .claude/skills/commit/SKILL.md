---
description: Commit propre avec convention feat/fix/refactor/docs — jamais sur main, sans Co-Authored-By
---

# Commit Conventionnel

## Étapes

1. `git status` pour voir les fichiers modifiés
2. `git diff` pour comprendre les changements
3. `git log --oneline -5` pour voir le style des commits récents
4. Proposer un message de commit selon la convention ci-dessous
5. Vérifier qu'on n'est PAS sur la branche `main`
6. `git add` les fichiers pertinents (pas `-A` global)
7. `git commit -m "..."` — SANS ligne Co-Authored-By

## Convention de nommage

```
{type}({scope}): {description courte en français}

Types :
  feat     → nouvelle fonctionnalité
  fix      → correction de bug
  refactor → refactoring sans changement de comportement
  docs     → documentation, CLAUDE.md
  style    → CSS, UI sans logique métier
  perf     → optimisation performance
  test     → tests
  chore    → tooling, config, dépendances

Scope (optionnel) : encheres, biens, dvf, fiscal, auth, stripe, admin, vps

Exemples :
  feat(encheres): ajouter frais dans simulateur financement
  fix(dvf): corriger filtre nb_pièces T2 vs studio
  refactor(calculs): extraire waterfall revente en fonction séparée
  docs: mettre à jour app/api/CLAUDE.md routes enchères
```

## Vérifications avant commit

- [ ] On n'est PAS sur `main` (`git branch --show-current`)
- [ ] `npm run build` passe sans erreur TypeScript
- [ ] Pas de fichier `.env` ou secrets dans les fichiers stagés
- [ ] Message sans "Co-Authored-By"

## Si $ARGUMENTS contient un message → l'utiliser directement
