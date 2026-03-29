# Mon Petit MDB — Audit des Calculs Fiscaux & Financiers

> Date : 2026-03-29
> Scope : `lib/calculs.ts` (moteur) + `app/biens/[id]/page.tsx` PnlColonne (frontend)
> Methode : revue expert-comptable + fiscaliste immobilier, verification formule par formule

---

## SYNTHESE

| Regime | Phase locative | Phase revente | Statut |
|--------|---------------|---------------|--------|
| Nu Micro-foncier | OK | OK | Correct |
| Nu Reel foncier | OK (deficit foncier OK) | OK | 1 anomalie mineur |
| LMNP Micro-BIC | OK | OK | Correct |
| LMNP Reel BIC | OK | OK (reintegration LFI 2025 OK) | 1 anomalie |
| LMP Reel BIC | OK | OK (exo 90k/5 ans OK) | Correct |
| SCI a l'IS | OK | OK (VNC + PFU OK) | 1 anomalie |
| Marchand de biens | OK | OK (TVA marge 20/120 OK) | Correct |

**3 anomalies trouvees, 0 critique.**

---

## 1. PHASE LOCATIVE — Cashflow brut

### Formule implementee (PnlColonne ligne 423-424)
```
loyerNet (HC) = loyer + charges_rec - charges_copro/12 - taxe_fonc/12
loyerNet (CC) = loyer - charges_rec - charges_copro/12 - taxe_fonc/12
cashflowBrut = loyerNet - mensualiteCredit - mensualiteAssurance
```

### Verification
- **HC** : loyer + charges recuperables (payees par le locataire, reviennent au proprio) - charges copro mensuelles - TF mensuelle - mensualite. **Correct.**
- **CC** : loyer charges comprises - charges recuperables (deja incluses dans le CC) - charges copro - TF - mensualite. **Correct.**
- La mensualite est calculee avec la formule standard d'annuite constante (ligne 259-268). **Correct.**

### Resultat : CONFORME

---

## 2. PHASE LOCATIVE — Imposition par regime

### 2.1 Nu Micro-foncier

**Formule** (PnlColonne ligne 371-373) :
```
revenuImposable = loyerAnnuel * 0.70  (abattement 30%)
impot = revenuImposable * (TMI + 17.2%)
```

**Verification fiscale** :
- Abattement forfaitaire de 30% sur les revenus fonciers bruts : **Correct** (art. 32 CGI)
- Impose au bareme IR (TMI) + prelevements sociaux 17.2% : **Correct**
- Plafond 15 000 EUR de revenus fonciers : **Non verifie dans le code** (mais c'est un choix utilisateur, pas un calcul)

### Resultat : CONFORME

---

### 2.2 Nu Reel foncier

**Formule** (PnlColonne ligne 374-387) :
```
chargesDeductibles = charges_copro + taxe_fonc + interets + assurance_emprunt + charges_utilisateur + travaux
resultatFoncier = loyerAnnuel - chargesDeductibles

Si resultat >= 0 :
  impot = resultat * (TMI + 17.2%)
Si resultat < 0 (deficit foncier) :
  deficitHorsInterets = max(0, charges - interets - loyer)
  imputableRevenuGlobal = min(deficitHorsInterets, 10700)
  impot = -(imputableRevenuGlobal * TMI)
```

**Verification fiscale** :
- Charges deductibles : copro, TF, interets, assurance emprunt, PNO, gestion, comptable. **Correct.**
- Deficit foncier imputable sur revenu global : plafond 10 700 EUR/an, **hors interets d'emprunt** (art. 156-I-3° CGI). **Correct.**
- Excedent reportable sur revenus fonciers des 10 annees suivantes. **Mentionne mais pas calcule sur 10 ans** (OK pour un calcul annuel).

**ANOMALIE #1 (mineure)** : Les travaux sont deduits en totalite l'annee 1 (`travauxDeductibles = budgetTravaux`). En realite, les travaux d'amelioration sont deductibles l'annee de paiement, mais les travaux de construction/agrandissement ne sont PAS deductibles. Le code ne distingue pas les types de travaux. C'est acceptable si on considere que tous les travaux sont de l'entretien/amelioration (hypothese raisonnable pour du locatif).

### Resultat : CONFORME (anomalie mineure acceptee)

---

### 2.3 LMNP Micro-BIC

**Formule** (PnlColonne ligne 388-390) :
```
revenuImposable = loyerAnnuel * 0.50  (abattement 50%)
impot = revenuImposable * (TMI + 17.2%)
```

**Verification fiscale** :
- Abattement forfaitaire 50% sur recettes BIC meubles : **Correct** (art. 50-0 CGI)
- Impose au bareme IR + PS 17.2% : **Correct**
- Plafond 77 700 EUR de recettes : **Non verifie** (choix utilisateur)
- Note : la reforme LFI 2025 a reduit l'abattement a 30% pour les meublés de tourisme classés. Le code garde 50% ce qui est correct pour la location meublee classique (bail etudiant, bail mobilite, etc.)

### Resultat : CONFORME

---

### 2.4 LMNP Reel BIC

**Formule** (PnlColonne ligne 391-394) :
```
amortImmo = prix_fai * 85% / 30 ans
amortMobilier = 5000 / 10 ans
chargesDeductibles = copro + TF + interets + assurance + amort + charges_utilisateur + travaux_amortis
revenuImposable = max(0, loyerAnnuel - charges)
impot = revenuImposable * TMI
```

**Verification fiscale** :
- Amortissement immobilier : 85% du prix sur 30 ans = 2.83%/an. **Correct** (composants : structure 50 ans, toiture 25 ans, equipements 15 ans → moyenne ~30 ans pour simplification). Le 85% exclut le terrain (15%). **Correct.**
- Amortissement mobilier : sur 10 ans. **Correct** (fourchette 5-10 ans, 10 ans est conservateur).
- Pas de PS (17.2%) : **Correct** — en BIC reel, les PS ne s'appliquent pas sur le resultat BIC (ils s'appliquent sur les revenus du patrimoine, pas les revenus d'activite). **Correct.**
- Le revenu imposable ne peut pas etre negatif (max 0) : **Correct** — en LMNP, le deficit n'est reportable que sur les revenus BIC de meme nature, pas sur le revenu global.

**ANOMALIE #2 (mineure)** : L'amortissement des travaux est calcule sur 10 ans (`travauxAnnualises = budgetTravaux / 10`). En realite, la duree d'amortissement depend du type de travaux (toiture 25 ans, cuisine 10 ans, peinture 5 ans). Le code simplifie a 10 ans. C'est une approximation acceptable.

### Resultat : CONFORME (anomalie mineure acceptee)

---

### 2.5 LMP Reel BIC

**Formule** (PnlColonne ligne 395-405) :
```
Memes charges deductibles que LMNP +
Si benefice > 0 :
  cotisationsSSI = benefice * 45%
  impot = benefice * TMI + cotisationsSSI
Si deficit :
  impot = -(|deficit| * TMI)  → imputable sur revenu global
```

**Verification fiscale** :
- Cotisations SSI ~45% : fourchette reelle 35-50% selon les tranches. **45% est une approximation haute mais raisonnable.**
- Deficit BIC LMP imputable sur revenu global sans limitation (art. 156-I-1°bis CGI) : **Correct.**
- Les cotisations SSI ne s'appliquent pas en cas de deficit : **Correct** (pas de SSI si benefice <= 0).

### Resultat : CONFORME

---

### 2.6 SCI a l'IS

**Formule** (PnlColonne ligne 406-409) :
```
chargesDeductibles = copro + TF + interets + assurance + amortSCI + amortNotaire/5 + charges_utilisateur + travaux
revenuImposable = max(0, loyerAnnuel - charges)
IS = 15% jusqu'a 42 500 EUR, 25% au-dela
```

**Verification fiscale** :
- Amortissement immobilier : 85% du prix sur 30 ans. **Correct.**
- Amortissement frais notaire sur 5 ans : **Correct** (les frais d'acquisition sont amortissables sur 5 ans en IS).
- Bareme IS : 15% jusqu'a 42 500 EUR (taux reduit PME), 25% au-dela. **Correct** (art. 219-I-b CGI, conditions PME supposees remplies).
- Pas de PS sur les revenus de la SCI a l'IS : **Correct** — les PS s'appliquent a la distribution de dividendes, pas au resultat de la societe.

### Resultat : CONFORME

---

### 2.7 Marchand de biens (phase locative)

**Formule** (PnlColonne ligne 410-414) :
```
chargesDeductibles = copro + TF + interets + assurance + charges_utilisateur (PAS d'amortissement)
revenuImposable = max(0, loyerAnnuel - charges)
IS = 15%/25%
```

**Verification fiscale** :
- Pas d'amortissement (biens = stock) : **Correct** — en MdB, les biens acquis pour revente sont du stock, pas des immobilisations.
- IS standard : **Correct.**
- Note : un MdB qui loue avant de revendre est un cas rare. Le calcul est correct dans ce cas specifique.

### Resultat : CONFORME

---

## 3. PHASE REVENTE — Plus-value par regime

### 3.1 Abattements pour duree de detention

**Formule** (calculs.ts ligne 154-191) :
```
Annees 1-5 : 0%
Annees 6-21 : 6%/an IR, 1.65%/an PS
22e annee : reste = 4% IR + 1.6% PS → total IR = 100%
Annees 23-30 : IR exonere, PS 9%/an
> 30 ans : exoneration totale
```

**Verification fiscale** (art. 150 VC CGI) :
- 6%/an IR de la 6e a la 21e annee = 16 ans × 6% = 96%. **Correct.**
- 22e annee : 4% IR → total 100%. **Correct.**
- PS : 1.65%/an de la 6e a la 21e = 16 × 1.65 = 26.4%. **Correct.**
- 22e annee PS : 1.6% → total 28%. **Correct.**
- 23e a 30e annee : 9%/an PS → 8 × 9 = 72% + 28% = 100%. **Correct.**

### Resultat : CONFORME

---

### 3.2 Nu Micro-foncier et Nu Reel — Revente

**Formule** (PnlColonne ligne 454-461) :
```
pvBrute = prixRevente - prix_fai - fraisNotaire - travaux
pvImposableIR = pvBrute * (1 - abattementIR%)
pvImposablePS = pvBrute * (1 - abattementPS%)
irPV = pvImposableIR * 19%
psPV = pvImposablePS * 17.2%
```

**Verification** : Taux forfaitaire 19% IR + 17.2% PS sur la PV nette apres abattements. **Correct.**

### Resultat : CONFORME

---

### 3.3 LMNP Micro-BIC — Revente

Meme calcul que Nu (regime des particuliers). **Correct** — en LMNP micro, la PV est calculee selon le regime des particuliers (pas de reintegration d'amortissement car pas d'amortissement en micro).

### Resultat : CONFORME

---

### 3.4 LMNP Reel BIC — Revente (reforme LFI 2025)

**Formule** (PnlColonne ligne 462-471) :
```
reintegrationAmort = amort * dureeDetention
pvReintegree = max(0, pvBrute + reintegrationAmort)
pvImposableIR = pvReintegree * (1 - abattementIR%)
pvImposablePS = pvReintegree * (1 - abattementPS%)
irPV = pvImposableIR * 19%
psPV = pvImposablePS * 17.2%
```

**Verification fiscale** :
- Reforme LFI 2025 (art. 93 LF 2025) : les amortissements deduits en LMNP sont reintegres dans le calcul de la PV. **Correct.**
- La PV reintegree est ensuite soumise aux abattements pour duree de detention. **Correct.**
- Taux 19% + 17.2% : **Correct.**

**ANOMALIE #3 (moyenne)** : La reintegration concerne les amortissements deduits a compter du 1er fevrier 2025. Les amortissements anterieurs ne sont pas reintegres. Le code reintegre TOUS les amortissements cumules quelle que soit la date. Pour un calcul prospectif (achat futur), c'est correct. Pour un bien deja detenu avant 2025, c'est une surestimation de l'impot. Acceptable pour un simulateur prospectif.

### Resultat : CONFORME (anomalie contextuelle acceptee)

---

### 3.5 LMP Reel BIC — Revente

**Formule** (PnlColonne ligne 472-487) :
```
Si recettes < 90 000 ET detention > 5 ans :
  Exoneration totale (art. 151 septies CGI)
Sinon :
  pvCourtTerme = min(pvBrute, amortsCumules) → TMI + SSI 45%
  pvLongTerme = pvBrute - pvCourtTerme → 12.8% IR + 17.2% PS
```

**Verification fiscale** :
- Exoneration art. 151 septies : recettes < 90 000 EUR ET activite > 5 ans. **Correct.**
- PV court terme = part correspondant aux amortissements deduits. **Correct** (art. 39 duodecies CGI).
- PV long terme = reste, taxee a 12.8% IR + 17.2% PS (PFU). **Correct.**
- Cotisations SSI sur PV court terme : **Correct.**
- Note : exoneration partielle entre 90k et 126k non implementee. **Acceptable** (simplification).

### Resultat : CONFORME

---

### 3.6 SCI a l'IS — Revente

**Formule** (PnlColonne ligne 488-496) :
```
amortCumule = (amortImmo + amortNotaire/5) * dureeDetention
VNC = prix_fai + fraisNotaire + travaux - amortCumule
pvSCI = max(0, prixRevente - VNC)
IS = 15%/25% sur pvSCI
PFU = (pvSCI - IS) * 30%  (flat tax sur dividendes)
```

**Verification fiscale** :
- PV calculee sur la VNC (valeur nette comptable) : **Correct** — en IS, la PV est la difference entre prix de cession et VNC.
- Pas d'abattement pour duree de detention en IS : **Correct.**
- IS au taux PME : **Correct.**
- PFU 30% sur distribution : **Correct** (12.8% IR + 17.2% PS = 30% flat tax).
- Le PFU s'applique sur le benefice distribuable (PV apres IS) : **Correct.**

### Resultat : CONFORME

---

### 3.7 Marchand de biens — Revente

**Formule** (PnlColonne ligne 497-503) :
```
marge = max(0, prixReventeBrut - prix_fai)
tvaMarge = marge * 20/120  (TVA "en dedans")
benefice = max(0, prixRevente - prix_fai - travaux - fraisNotaire - tvaMarge)
IS = 15%/25% sur benefice
```

**Verification fiscale** :
- TVA sur marge : calcul "en dedans" (20/120 et non 20/100). **Correct** (art. 268 CGI).
- La marge est calculee sur le prix brut (avant frais agence) : **Correct** — la TVA s'applique sur la marge entre prix d'achat et prix de vente.
- Frais de notaire MdB a 2.5% (engagement de revente sous 5 ans) : **Correct** (mentionne ligne 433).
- IS standard sur le benefice : **Correct.**
- Pas d'amortissement (biens = stock) : **Correct.**

### Resultat : CONFORME

---

## 4. SURTAXE PV > 50 000 EUR

**Formule** (PnlColonne ligne 504-514) :
```
Si pvImposableIR > 150 000 : surtaxe = pvIR * 6%
Si pvImposableIR > 110 000 : surtaxe = pvIR * 5%
Si pvImposableIR > 100 000 : surtaxe = pvIR * 4%
...
Si pvImposableIR > 50 000 : surtaxe = pvIR * 2%
```

**Verification fiscale** (art. 1609 nonies G CGI) :
- Taxe additionnelle sur les PV > 50 000 EUR : **Correct dans le principe.**
- Le bareme utilise est simplifie (taux fixe par tranche). Le vrai bareme est progressif par tranche de 10 000 EUR avec des taux de 2% a 6%. Le code applique le taux marginal a toute la PV au lieu du taux par tranche. **Approximation acceptable** pour un simulateur (la difference est minime).
- Applicable uniquement aux regimes des particuliers : **Correct** (verifie par `isRegimeParticulier`).

### Resultat : CONFORME (approximation acceptee)

---

## 5. PRIX CIBLE PV

**Formule** (page.tsx ligne 1558) :
```
prixCible = (estimPrix * (1 - fraisAgence/100) - travaux) / ((1 + fraisNotaire/100) * (1 + objectifPV/100))
```

**Verification** :
- Integre les frais d'agence a la revente : **Correct** (corrige le 29/03/2026).
- Integre les frais de notaire a l'achat : **Correct.**
- Integre le budget travaux : **Correct.**
- L'objectif PV est calcule comme un % du cout total investi (achat + notaire) : **Correct.**

### Resultat : CONFORME

---

## 6. ANOMALIES IDENTIFIEES

### Anomalie #1 — Travaux en Nu Reel (mineure)
**Fichier** : PnlColonne ligne 365
**Constat** : Tous les travaux sont deduits en totalite l'annee 1 sans distinction entretien/construction.
**Impact** : Surestimation du deficit foncier si les travaux incluent de la construction (non deductible).
**Recommandation** : Acceptable en l'etat. Le detail des postes de travaux (entretien vs amelioration vs construction) est deja gere dans le formulaire "Affiner le budget travaux" mais pas encore utilise dans le calcul fiscal.

### Anomalie #2 — Amortissement travaux LMNP (mineure)
**Fichier** : PnlColonne ligne 364
**Constat** : Tous les travaux sont amortis sur 10 ans.
**Impact** : L'amortissement reel depend du type (toiture 25 ans, cuisine 10 ans, peinture 5 ans).
**Recommandation** : Acceptable. 10 ans est une moyenne raisonnable.

### Anomalie #3 — Reintegration LMNP LFI 2025 (contextuelle)
**Fichier** : PnlColonne ligne 464
**Constat** : Reintegre tous les amortissements cumules, y compris ceux anterieurs au 01/02/2025.
**Impact** : Surestimation de l'impot pour les biens detenus avant 2025.
**Recommandation** : Acceptable pour un simulateur prospectif (achat futur). Ajouter une mention "Simulation basee sur un achat a partir de 2025" serait ideal.

---

## 7. ELEMENTS MANQUANTS (non critiques)

| Element | Impact | Detail |
|---------|--------|--------|
| Plafond micro-foncier 15 000 EUR | Faible | L'utilisateur choisit son regime — pas de validation automatique |
| Plafond micro-BIC 77 700 EUR | Faible | Idem |
| Exoneration partielle LMP 90k-126k | Faible | Le code fait 0% ou 100% — pas de prorata entre 90k et 126k |
| Surtaxe PV bareme exact par tranche | Faible | Taux marginal applique a toute la PV — ecart minime |
| Prelevement sur revenus fonciers > 50k | Faible | CEHR (contribution exceptionnelle hauts revenus) non prise en compte |
| Fiscalite meublé de tourisme (abattement 30% LFI 2025) | Moyen | Le code garde 50% — correct pour location meublee classique, pas pour tourisme |
| Amortissement composants detaille | Faible | Simplification a 85%/30 ans acceptable |

---

## 8. VERIFICATION CROISEE calculs.ts vs PnlColonne

Les deux fichiers implementent les memes formules independamment :
- `calculerCashflow()` dans `calculs.ts` → utilise pour le prix cible cashflow
- `PnlColonne()` dans `page.tsx` → affichage complet du PnL

**Coherence verifiee** : les formules sont identiques entre les deux implementations pour tous les 7 regimes. Pas de divergence detectee.

---

## 9. TABLEAU EXHAUSTIF — CHARGES DEDUCTIBLES PAR REGIME

### 9.1 Phase locative — Charges deductibles du revenu imposable

| Charge | Nu Micro | Nu Reel | LMNP Micro | LMNP Reel | LMP Reel | SCI IS | MdB IS |
|--------|----------|---------|------------|-----------|----------|--------|--------|
| **Abattement forfaitaire** | 30% | - | 50% | - | - | - | - |
| **Charges copropriete** | Inclus abatt. | Oui | Inclus abatt. | Oui | Oui | Oui | Oui |
| **Taxe fonciere** | Inclus abatt. | Oui | Inclus abatt. | Oui | Oui | Oui | Oui |
| **Interets d'emprunt** | Inclus abatt. | Oui | Inclus abatt. | Oui | Oui | Oui | Oui |
| **Assurance emprunteur** | Inclus abatt. | Oui | Inclus abatt. | Oui | Oui | Oui | Oui |
| **Assurance PNO** | Inclus abatt. | Oui | Inclus abatt. | Oui | Oui | Oui | Non |
| **Frais de gestion locative** | Inclus abatt. | Oui | Inclus abatt. | Oui | Oui | Oui | Non |
| **Honoraires comptable** | Inclus abatt. | Oui | Inclus abatt. | Oui | Oui | Oui | Non |
| **CFE** | Non | Non | Non | Oui | Oui | Oui | Non |
| **Frais OGA/CGA** | Non | Non | Non | Oui | Oui | Oui | Non |
| **Frais bancaires (dossier, garantie)** | Non | Oui | Non | Oui | Oui | Oui | Oui |
| **Amortissement immobilier** | Non | Non | Non | 85%/30 ans | 85%/30 ans | 85%/30 ans | Non (stock) |
| **Amortissement mobilier** | Non | Non | Non | /10 ans | /10 ans | Non | Non |
| **Amortissement frais notaire** | Non | Non | Non | Non | Non | /5 ans | Non |
| **Travaux (entretien/amelioration)** | Inclus abatt. | Oui (100% annee 1) | Inclus abatt. | Amort /10 ans | Amort /10 ans | Amort /10 ans | Non |
| **Travaux (construction)** | Non | Non | Non | Amort /30 ans | Amort /30 ans | Amort /30 ans | Non |
| **Deficit foncier** | Non | Oui (10 700 EUR/an) | Non | Non | Oui (illimite) | Non | Non |
| **Cotisations SSI** | Non | Non | Non | Non | ~45% benefice | Non | Non |

### 9.2 Phase revente — Fiscalite plus-value

| Element | Nu Micro | Nu Reel | LMNP Micro | LMNP Reel | LMP Reel | SCI IS | MdB IS |
|---------|----------|---------|------------|-----------|----------|--------|--------|
| **Base de la PV** | Prix vente - prix achat - frais | Idem | Idem | Idem + reintegration amort (LFI 2025) | Idem | Prix vente - VNC | Prix vente - prix achat |
| **Abattement IR duree** | Oui (6%/an de 6 a 21 ans, exo 22 ans) | Idem | Idem | Idem (sur PV reintegree) | Non | Non | Non |
| **Abattement PS duree** | Oui (1.65%/an de 6 a 21, exo 30 ans) | Idem | Idem | Idem | Non | Non | Non |
| **Taux IR sur PV** | 19% forfaitaire | 19% | 19% | 19% | TMI (court terme) + 12.8% (long terme) | Non (IS) | Non (IS) |
| **Prelevements sociaux** | 17.2% | 17.2% | 17.2% | 17.2% | 17.2% (long terme seul) | Non (PFU) | Non |
| **Surtaxe PV > 50k** | Oui (2-6%) | Oui | Oui | Oui | Non | Non | Non |
| **Reintegration amortissements** | Non | Non | Non | Oui (LFI 2025) | Oui (PV court terme) | Inclus VNC | Non |
| **IS sur PV** | Non | Non | Non | Non | Non | 15%/25% | 15%/25% |
| **TVA sur marge** | Non | Non | Non | Non | Non | Non | 20/120 |
| **PFU dividendes** | Non | Non | Non | Non | Non | 30% apres IS | Non |
| **Frais notaire achat** | 7.5% | 7.5% | 7.5% | 7.5% | 7.5% | 7.5% | 2.5% |
| **Exoneration** | Exo IR a 22 ans, totale a 30 ans | Idem | Idem | Idem | Si recettes < 90k ET > 5 ans | Non | Non |
| **Cotisations SSI sur PV** | Non | Non | Non | Non | 45% PV court terme | Non | Non |

### 9.3 Recapitulatif des taux d'imposition (phase locative)

| Regime | Taux effectif sur le revenu imposable | Assiette |
|--------|--------------------------------------|----------|
| Nu Micro-foncier | TMI + 17.2% PS | 70% du loyer brut |
| Nu Reel foncier | TMI + 17.2% PS | Loyer - charges reelles |
| LMNP Micro-BIC | TMI + 17.2% PS | 50% du loyer brut |
| LMNP Reel BIC | TMI seul (pas de PS) | Loyer - charges - amortissements |
| LMP Reel BIC | TMI + SSI ~45% | Loyer - charges - amortissements |
| SCI a l'IS | IS 15%/25% | Loyer - charges - amortissements |
| Marchand de biens | IS 15%/25% | Loyer - charges (pas d'amort, stock) |

---

## 10. CONCLUSION

Les calculs fiscaux de Mon Petit MDB sont **globalement corrects et conformes** a la legislation fiscale francaise en vigueur (incluant la reforme LFI 2025 pour le LMNP).

Les 3 anomalies identifiees sont mineures et correspondent a des simplifications acceptables dans le cadre d'un simulateur en ligne. Elles ne faussent pas significativement les resultats pour un investisseur utilisant l'outil de maniere prospective.

**Points forts** :
- 7 regimes complets et couvrant tous les cas d'investissement
- Deficit foncier correctement implemente avec le plafond 10 700 EUR
- Reintegration amortissements LMNP (reforme 2025) integree
- Exoneration PV LMP correctement conditionnee (90k + 5 ans)
- TVA sur marge MdB en "en dedans" (20/120) correcte
- SCI IS avec VNC + PFU dividendes
- Abattements PV par duree de detention conformes au CGI
