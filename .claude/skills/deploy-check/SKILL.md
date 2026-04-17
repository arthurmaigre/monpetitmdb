---
description: Vérifications avant de pousser sur GitHub — build TypeScript, lint, résumé des changements
---

# Deploy Check

Lance les vérifications essentielles avant un push/déploiement Vercel.

## Étapes

```bash
# 1. Vérifier la branche courante (ne jamais être sur main)
git branch --show-current

# 2. Voir ce qui va être poussé
git log origin/main..HEAD --oneline

# 3. Build TypeScript complet
npm run build

# 4. Voir les erreurs TypeScript seules (plus rapide)
npx tsc --noEmit
```

## Checklist

- [ ] Branche ≠ `main`
- [ ] `npm run build` sans erreur
- [ ] Pas de `console.log` de debug laissés
- [ ] Pas de clés API hardcodées
- [ ] Variables d'env Vercel à jour si nouvelles env vars
- [ ] Migrations SQL Supabase appliquées en prod si schema modifié

## Après push

Auto-deploy Vercel déclenché. Suivre sur :
- https://vercel.com/dashboard (build en cours)
- https://www.monpetitmdb.fr (vérifier en live)
