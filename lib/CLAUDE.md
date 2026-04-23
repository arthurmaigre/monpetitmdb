# Lib — Calculs Fiscaux & Estimation DVF

## Règle fondamentale

**Tous les calculs financiers dans `calculs.ts`** — jamais en DB sauf `rendement_brut`.

## 7 Régimes fiscaux

| Code | Label | Phase locative | Phase revente |
|---|---|---|---|
| `nu_micro_foncier` | Nu Micro-foncier | Abattement 30%, TMI + PS 17.2% | IR 19% + PS 17.2% + abattements durée |
| `nu_reel_foncier` | Nu Réel foncier | Charges déductibles, TMI + PS, déficit foncier 10 700€/an | IR 19% + PS 17.2% + abattements durée |
| `lmnp_micro_bic` | LMNP Micro-BIC | Abattement 50%, TMI + PS 17.2% | IR 19% + PS 17.2% + abattements durée |
| `lmnp_reel_bic` | LMNP Réel BIC | Amortissement composants, TMI seul | IR 19% + PS 17.2%, réintégration amortissements (LFI 2025) |
| `lmp_reel_bic` | LMP Réel BIC | Comme LMNP réel + cotisations SSI ~45% | PV pro, exo si recettes <90k et >5 ans |
| `sci_is` | SCI à l'IS | IS 15/25%, amortissement | IS sur VNC, pas d'abattement durée |
| `marchand_de_biens` | Marchand de biens (IS) | N/A (achat-revente) | TVA marge 20/120 + IS 15/25%, frais notaire 2.5% |

**Abattements PV** (régimes particuliers) : 0% <6 ans, 6%/an IR + 1.65%/an PS (6-21 ans), exo IR à 22 ans, exo totale à 30 ans.

**IDR** : pas de micro-foncier ni LMNP micro pour immeubles multi-lots → utiliser `REGIMES_IDR`.

## Règles de calcul critiques

- Loyer **toujours HC** en base. Convertir CC → HC si charges connues
- `charges_copro` = **mensuel** en base. Multiplier ×12 pour annuel dans calculs fiscaux
- `taxe_fonc_ann` = annuel (ne pas diviser)
- `rendement_brut` = `loyer × 12 / prix_fai` (seul calcul stocké en DB)
- Frais notaire MdB = 2.5%, sinon 7.5%
- Pret in fine : interets seuls, capital remboursé à la revente, durée 1-5 ans

## TVA sur marge MdB (optionnelle)

Optionnelle pour bien ancien acheté à un particulier (art. 260-5° bis CGI).
Toggle Oui/Non dans PnlColonne.
- Si Oui : marge × 20/120 (TVA "en dedans") + TVA récupérable sur travaux (budget HT = TTC/1.2)
- Si Non : exonéré, pas de TVA collectée ni récupérable sur travaux

## Scenario revente — Waterfall

```
Prix DVF net vendeur
- Frais agence revente (5% par défaut, modifiable)
- Prix achat (prix_fai)
- Frais notaire acquisition (2.5% MdB, 7.5% sinon)
- Travaux
= PV brute

Puis : fiscalité PV selon régime (abattements durée si applicable)
Bilan net = PV nette + cashflow locatif cumulé - CRD
```

**IDR waterfall revente** inclut en plus : création copropriété (géomètre + règlement + compteurs × nb lots), frais notaire revente (2.5% MdB).

## Prix cible (calcul)

```
prixCible = (estimPrix × (1 - fraisAgence%) - travaux) / ((1 + fraisNotaire%) × (1 + objectifPV%))
```

Inclut frais agence revente dans le calcul.

## Architecture DVF (estimation.ts)

3 couches :
1. **Base DVF** : transactions notariales réelles, filtre type bien + nb pièces exact + surface ±30-40%
2. **Correcteurs qualitatifs** : DPE, étage/ascenseur, extérieur, vue, parking, etc. (**PAS** de décote travaux)
3. **Confiance** : A (±5%) → D (±30%) selon nb comparables et variables qualitatives

**Rayon adaptatif** : 50m → 110m → 220m → 330m → 550m → 770m → 1 100m
**Périodes** : 2022+ et 2018-2020 (même poids — évite surgonflement post-COVID)
**Estimation DVF** = prix marché "en bon état" = prix de revente après travaux

## Estimation DVF = net vendeur

Prix dans l'acte notarié, HORS frais agence. Frais agence revente = 0% par défaut (charge acquéreur).
