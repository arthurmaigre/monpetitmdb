---
description: Charge le contexte complet des calculs fiscaux et de l'estimation DVF pour travailler sur calculs.ts ou estimation.ts
---

# Contexte Calculs Fiscaux & DVF

Ce skill charge le contexte complet pour travailler sur `lib/calculs.ts` et `lib/estimation.ts`.

## Règles fondamentales

- Tous les calculs dans `lib/calculs.ts` — jamais en DB sauf `rendement_brut`
- Estimation DVF = prix marché "en bon état" = prix de revente après travaux
- MdB toujours à l'IS — pas de régime IR, pas d'amortissement (biens = stock)
- Loyer toujours HC en base

## Chargement contexte complet

Lire maintenant :
1. `lib/calculs.ts` — calculs existants
2. `lib/estimation.ts` — moteur DVF
3. `lib/CLAUDE.md` — règles détaillées 7 régimes + architecture DVF

## 7 Régimes disponibles dans calculs.ts

```typescript
type RegimeFiscal = 
  | 'nu_micro_foncier'
  | 'nu_reel_foncier'
  | 'lmnp_micro_bic'
  | 'lmnp_reel_bic'
  | 'lmp_reel_bic'
  | 'sci_is'
  | 'marchand_de_biens'
```

## Fonctions clés à connaître

```typescript
calculerFiscalite(regime, params)     // calcul par régime
calculerScenarioRevente(params)       // waterfall revente
calculerPrixCible(dvf, travaux, ...)  // prix d'achat max pour atteindre objectif
calculerFraisEnchere(miseAPrix)       // frais totaux ≈12%
calculerRendementBrut(loyer, prix)    // = loyer*12/prix
```

## Si $ARGUMENTS contient un calcul spécifique → charger les fichiers et analyser directement
