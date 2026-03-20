// ═══════════════════════════════════════════════════════════════
// Mon Petit MDB — Calculs fiscaux et financiers
// ═══════════════════════════════════════════════════════════════

export interface ParamsFinancement {
  apport: number
  tauxCredit: number
  tauxAssurance: number
  dureeAns: number
  fraisNotaire: number
  objectifCashflow: number
}

export type RegimeFiscal =
  | 'nu_micro_foncier'
  | 'nu_reel_foncier'
  | 'lmnp_micro_bic'
  | 'lmnp_reel_bic'
  | 'lmp_reel_bic'
  | 'sci_is'
  | 'marchand_de_biens'
  // Legacy aliases (backward compat)
  | 'micro_foncier'
  | 'reel'
  | 'lmnp'

export interface ParamsChargesUtilisateur {
  assurance_pno?: number        // €/an, default 0
  frais_gestion_pct?: number    // % des loyers, default 0
  honoraires_comptable?: number // €/an, default 0
  cfe?: number                  // €/an, default 0
  frais_oga?: number            // €/an, default 0
}

export interface ParamsFiscal {
  tmi: number
  regime: RegimeFiscal
}

export interface Bien {
  prix_fai: number
  loyer: number
  type_loyer?: string
  charges_rec?: number
  charges_copro: number
  taxe_fonc_ann: number
  surface: number
  budget_travaux?: number     // montant direct en €
  montant_mobilier?: number   // pour LMNP, default 5000
}

export interface ResultatCalcul {
  mensualite: number
  mensualite_assurance: number
  mensualite_totale: number
  cashflow_brut: number
  cashflow_net_ir: number
  cashflow_net_sci_is: number
  cashflow_net_lmnp: number
  impots_annuels: number
  rendement_brut: number
  rendement_net: number
  prix_cible: number
  // Nouveau : detail deficit foncier
  deficit_foncier_imputable?: number    // montant imputable sur revenu global
  deficit_foncier_reportable?: number   // excedent reportable sur revenus fonciers futurs
  economie_impot_deficit?: number       // economie d'impot mensuelle liee au deficit
}

// ═══════════════════════════════════════════════════════════════
// REVENTE — Types et calculs
// ═══════════════════════════════════════════════════════════════

export interface ParamsRevente {
  prixAchat: number
  prixRevente: number
  dureeDetention: number        // en annees (1, 2, 3, 5...)
  regime: RegimeFiscal
  tmi: number
  fraisNotaireAchat: number     // % (7.5 standard, 2.5 MdB)
  budgetTravaux: number         // 0 pour locataire en place
  // Partie locative (locataire en place)
  loyerMensuelNet: number       // 0 pour travaux lourds
  impotAnnuelLocation: number   // 0 pour travaux lourds
  mensualiteTotale: number      // credit + assurance
  montantEmprunte: number
  tauxCredit: number
  dureeCredit: number           // en annees
  apport: number
  surface: number
  // Optionnel
  chargesUtilisateur?: ParamsChargesUtilisateur
  montantMobilier?: number      // pour LMNP, default 5000
  recettesAnnuelles?: number    // pour LMP exoneration PV
}

export interface ResultatRevente {
  // Acquisition
  fraisNotaireMontant: number
  prixAchatTotal: number        // prix + notaire + travaux

  // Plus-value
  plusValueBrute: number

  // Fiscalite PV
  impotPlusValue: number        // IR sur PV
  prelevementsSociaux: number   // PS 17.2%
  tvaMarge: number              // MdB uniquement
  chargesSocialesMdb: number    // MdB uniquement
  impotSociete: number          // SCI IS uniquement
  pfuDividendes: number         // SCI IS uniquement
  totalFiscalitePV: number
  cotisationsSocialesLMP: number // LMP uniquement

  // Plus-value nette
  plusValueNette: number

  // Abattements detention (regimes particuliers)
  abattementIR?: number         // % applique
  abattementPS?: number         // % applique

  // Locatif cumule (locataire en place)
  loyersCumules: number
  impotLocationCumule: number
  cashflowLocationNet: number

  // Credit
  mensualitesCumulees: number
  capitalRestantDu: number

  // Bilan final
  profitNet: number
  rendementTotal: number        // % sur apport investi
  rendementAnnualise: number    // %/an
}

// ═══════════════════════════════════════════════════════════════
// Helpers : normalisation regime (backward compat)
// ═══════════════════════════════════════════════════════════════

function normaliserRegime(regime: RegimeFiscal): RegimeFiscal {
  switch (regime) {
    case 'micro_foncier': return 'nu_micro_foncier'
    case 'reel': return 'nu_reel_foncier'
    case 'lmnp': return 'lmnp_reel_bic'
    default: return regime
  }
}

// ═══════════════════════════════════════════════════════════════
// Abattements PV pour duree de detention (regimes particuliers)
// ═══════════════════════════════════════════════════════════════

export function calculerAbattementPV(dureeDetention: number): { abattementIR: number; abattementPS: number } {
  // Annees 1-5 : 0%
  // Annees 6-21 : 6%/an IR, 1.65%/an PS
  // 22e annee : 4% IR, 1.6% PS
  // >22 ans : exoneration IR totale
  // Annees 23-30 : 9%/an PS
  // >30 ans : exoneration totale

  let abattementIR = 0
  let abattementPS = 0

  if (dureeDetention <= 5) {
    abattementIR = 0
    abattementPS = 0
  } else if (dureeDetention <= 21) {
    const anneesAuDela5 = dureeDetention - 5
    abattementIR = anneesAuDela5 * 6
    abattementPS = anneesAuDela5 * 1.65
  } else if (dureeDetention === 22) {
    // 16 annees a 6% + 1 annee a 4% = 100% IR
    abattementIR = 16 * 6 + 4 // = 100
    abattementPS = 16 * 1.65 + 1.6 // = 28
  } else if (dureeDetention <= 30) {
    // IR : exoneration totale
    abattementIR = 100
    abattementPS = 16 * 1.65 + 1.6 + (dureeDetention - 22) * 9
  } else {
    // > 30 ans : exoneration totale
    abattementIR = 100
    abattementPS = 100
  }

  // Plafonner a 100%
  abattementIR = Math.min(100, abattementIR)
  abattementPS = Math.min(100, abattementPS)

  return { abattementIR, abattementPS }
}

// ═══════════════════════════════════════════════════════════════
// IS (bareme commun SCI IS et MdB)
// ═══════════════════════════════════════════════════════════════

function calculerIS(benefice: number): number {
  if (benefice <= 0) return 0
  return benefice <= 42500
    ? benefice * 0.15
    : 42500 * 0.15 + (benefice - 42500) * 0.25
}

// ═══════════════════════════════════════════════════════════════
// Charges utilisateur helpers
// ═══════════════════════════════════════════════════════════════

function chargesUtilisateurDeductibles(
  cu: ParamsChargesUtilisateur | undefined,
  loyerAnnuel: number,
  regime: RegimeFiscal
): number {
  if (!cu) return 0
  const r = normaliserRegime(regime)

  // Non deductibles en micro (incluses dans l'abattement)
  if (r === 'nu_micro_foncier' || r === 'lmnp_micro_bic') return 0
  // Non applicables en MdB
  if (r === 'marchand_de_biens') return 0

  let total = 0
  total += cu.assurance_pno || 0
  total += loyerAnnuel * ((cu.frais_gestion_pct || 0) / 100)
  total += cu.honoraires_comptable || 0

  // CFE et frais OGA : deductibles uniquement en BIC (LMNP/LMP) et SCI IS
  if (r === 'lmnp_reel_bic' || r === 'lmp_reel_bic' || r === 'sci_is') {
    total += cu.cfe || 0
    total += cu.frais_oga || 0
  }

  return total
}

// ═══════════════════════════════════════════════════════════════
// Capital restant du
// ═══════════════════════════════════════════════════════════════

export function calculerCapitalRestantDu(
  montantEmprunte: number,
  tauxAnnuel: number,
  dureeTotaleAns: number,
  anneesEcoulees: number
): number {
  if (tauxAnnuel === 0) {
    const mensualite = montantEmprunte / (dureeTotaleAns * 12)
    return montantEmprunte - mensualite * anneesEcoulees * 12
  }
  const r = tauxAnnuel / 100 / 12
  const N = dureeTotaleAns * 12
  const n = anneesEcoulees * 12
  return montantEmprunte * (Math.pow(1 + r, N) - Math.pow(1 + r, n)) / (Math.pow(1 + r, N) - 1)
}

// ═══════════════════════════════════════════════════════════════
// Mensualite credit
// ═══════════════════════════════════════════════════════════════

export function calculerMensualite(
  montantEmprunte: number,
  tauxAnnuel: number,
  dureeAns: number
): number {
  if (tauxAnnuel === 0) return montantEmprunte / (dureeAns * 12)
  const tauxMensuel = tauxAnnuel / 100 / 12
  const n = dureeAns * 12
  return montantEmprunte * (tauxMensuel * Math.pow(1 + tauxMensuel, n)) / (Math.pow(1 + tauxMensuel, n) - 1)
}

// ═══════════════════════════════════════════════════════════════
// REVENTE — Calcul complet
// ═══════════════════════════════════════════════════════════════

export function calculerRevente(params: ParamsRevente): ResultatRevente {
  const {
    prixAchat, prixRevente, dureeDetention, tmi,
    fraisNotaireAchat, budgetTravaux,
    loyerMensuelNet, impotAnnuelLocation, mensualiteTotale,
    montantEmprunte, tauxCredit, dureeCredit, apport, surface,
    chargesUtilisateur, montantMobilier, recettesAnnuelles
  } = params

  const regime = normaliserRegime(params.regime)
  const mobilier = montantMobilier ?? 5000

  // --- Acquisition ---
  const fraisNotaireMontant = prixAchat * fraisNotaireAchat / 100
  const prixAchatTotal = prixAchat + fraisNotaireMontant + budgetTravaux

  // --- Plus-value brute ---
  const plusValueBrute = Math.max(0, prixRevente - prixAchat - fraisNotaireMontant - budgetTravaux)

  // --- Abattements pour duree de detention (regimes particuliers) ---
  const regimesParticuliers: RegimeFiscal[] = ['nu_micro_foncier', 'nu_reel_foncier', 'lmnp_micro_bic', 'lmnp_reel_bic']
  const isRegimeParticulier = regimesParticuliers.includes(regime)
  const abattements = isRegimeParticulier ? calculerAbattementPV(dureeDetention) : { abattementIR: 0, abattementPS: 0 }

  // --- Fiscalite selon regime ---
  let impotPlusValue = 0
  let prelevementsSociaux = 0
  let tvaMarge = 0
  let chargesSocialesMdb = 0
  let impotSociete = 0
  let pfuDividendes = 0
  let cotisationsSocialesLMP = 0

  if (regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier') {
    // Regime des particuliers : 19% IR + 17.2% PS, avec abattements detention
    const pvImposableIR = plusValueBrute * (1 - abattements.abattementIR / 100)
    const pvImposablePS = plusValueBrute * (1 - abattements.abattementPS / 100)
    impotPlusValue = pvImposableIR * 0.19
    prelevementsSociaux = pvImposablePS * 0.172

  } else if (regime === 'lmnp_micro_bic') {
    // LMNP Micro-BIC : PV regime des particuliers (19% + 17.2%), avec abattements detention
    const pvImposableIR = plusValueBrute * (1 - abattements.abattementIR / 100)
    const pvImposablePS = plusValueBrute * (1 - abattements.abattementPS / 100)
    impotPlusValue = pvImposableIR * 0.19
    prelevementsSociaux = pvImposablePS * 0.172

  } else if (regime === 'lmnp_reel_bic') {
    // LMNP Reel BIC : reintegration des amortissements deduits + abattements detention
    const amortImmo = (prixAchat * 0.85 / 30)
    const amortMobilier = mobilier / 10
    const amortAnnuel = amortImmo + amortMobilier
    const amortsCumules = amortAnnuel * dureeDetention
    const pvAvecReintegration = Math.max(0, plusValueBrute + amortsCumules)
    const pvImposableIR = pvAvecReintegration * (1 - abattements.abattementIR / 100)
    const pvImposablePS = pvAvecReintegration * (1 - abattements.abattementPS / 100)
    impotPlusValue = pvImposableIR * 0.19
    prelevementsSociaux = pvImposablePS * 0.172

  } else if (regime === 'lmp_reel_bic') {
    // LMP : PV professionnelle
    // Exoneration si recettes < 90k€ ET activite > 5 ans
    const recettes = recettesAnnuelles ?? 0
    if (recettes < 90000 && dureeDetention > 5) {
      // Exoneration totale
      impotPlusValue = 0
      prelevementsSociaux = 0
      cotisationsSocialesLMP = 0
    } else {
      // PV professionnelle imposable : court terme (amortissements) + long terme
      const amortImmo = (prixAchat * 0.85 / 30)
      const amortMobilier = mobilier / 10
      const amortAnnuel = amortImmo + amortMobilier
      const amortsCumules = amortAnnuel * dureeDetention
      // Court terme = min(PV brute, amortissements cumules) -> TMI + cotisations sociales
      const pvCourtTerme = Math.min(plusValueBrute, amortsCumules)
      // Long terme = PV brute - court terme -> 12.8% IR + 17.2% PS
      const pvLongTerme = Math.max(0, plusValueBrute - pvCourtTerme)
      impotPlusValue = pvCourtTerme * (tmi / 100) + pvLongTerme * 0.128
      prelevementsSociaux = pvLongTerme * 0.172
      // Cotisations sociales SSI sur PV court terme
      cotisationsSocialesLMP = pvCourtTerme * 0.45
    }

  } else if (regime === 'sci_is') {
    // SCI IS : PV sur valeur nette comptable (apres amortissement)
    // BUG FIX: VNC inclut frais notaire et travaux dans le cout d'acquisition
    const coutAcquisition = prixAchat + fraisNotaireMontant + budgetTravaux
    const amortCumule = (prixAchat * 0.85 / 30) * dureeDetention
    const valeurNetteCptable = coutAcquisition - amortCumule
    const pvSCI = Math.max(0, prixRevente - valeurNetteCptable)
    // IS : 15% jusqu'a 42500, 25% au-dela
    impotSociete = calculerIS(pvSCI)

  } else if (regime === 'marchand_de_biens') {
    // MdB toujours a l'IS : TVA sur marge + IS sur benefice
    const marge = Math.max(0, prixRevente - prixAchat)
    // BUG FIX: TVA "en dedans" — la marge est TTC
    tvaMarge = marge * 20 / 120
    const benefice = Math.max(0, prixRevente - prixAchat - budgetTravaux - fraisNotaireMontant - tvaMarge)
    impotSociete = calculerIS(benefice)
  }

  const totalFiscalitePV = impotPlusValue + prelevementsSociaux + tvaMarge + chargesSocialesMdb + impotSociete + cotisationsSocialesLMP
  const plusValueNette = plusValueBrute - totalFiscalitePV

  // --- Partie locative cumulee ---
  const moisDetention = dureeDetention * 12
  const loyersCumules = loyerMensuelNet * moisDetention
  const impotLocationCumule = impotAnnuelLocation * dureeDetention
  const cashflowLocationNet = loyersCumules - impotLocationCumule

  // --- Credit ---
  const mensualitesCumulees = mensualiteTotale * moisDetention
  const capitalRestantDu = calculerCapitalRestantDu(montantEmprunte, tauxCredit, dureeCredit, dureeDetention)

  // --- Bilan final ---
  const capitalInvesti = apport + budgetTravaux + fraisNotaireMontant
  const produitRevente = prixRevente - capitalRestantDu - totalFiscalitePV
  const profitNet = produitRevente - capitalInvesti + cashflowLocationNet - mensualitesCumulees

  const rendementTotal = capitalInvesti > 0 ? (profitNet / capitalInvesti) * 100 : 0
  const rendementAnnualise = dureeDetention > 0 && capitalInvesti > 0
    ? (Math.pow(1 + profitNet / capitalInvesti, 1 / dureeDetention) - 1) * 100
    : 0

  return {
    fraisNotaireMontant: Math.round(fraisNotaireMontant),
    prixAchatTotal: Math.round(prixAchatTotal),
    plusValueBrute: Math.round(plusValueBrute),
    impotPlusValue: Math.round(impotPlusValue),
    prelevementsSociaux: Math.round(prelevementsSociaux),
    tvaMarge: Math.round(tvaMarge),
    chargesSocialesMdb: Math.round(chargesSocialesMdb),
    impotSociete: Math.round(impotSociete),
    pfuDividendes: Math.round(pfuDividendes),
    totalFiscalitePV: Math.round(totalFiscalitePV),
    cotisationsSocialesLMP: Math.round(cotisationsSocialesLMP),
    plusValueNette: Math.round(plusValueNette),
    abattementIR: isRegimeParticulier ? abattements.abattementIR : undefined,
    abattementPS: isRegimeParticulier ? abattements.abattementPS : undefined,
    loyersCumules: Math.round(loyersCumules),
    impotLocationCumule: Math.round(impotLocationCumule),
    cashflowLocationNet: Math.round(cashflowLocationNet),
    mensualitesCumulees: Math.round(mensualitesCumulees),
    capitalRestantDu: Math.round(capitalRestantDu),
    profitNet: Math.round(profitNet),
    rendementTotal: Math.round(rendementTotal * 10) / 10,
    rendementAnnualise: Math.round(rendementAnnualise * 10) / 10,
  }
}

// ═══════════════════════════════════════════════════════════════
// CASHFLOW — Calcul complet
// ═══════════════════════════════════════════════════════════════

export function calculerCashflow(
  bien: Bien,
  financement: ParamsFinancement,
  fiscal: ParamsFiscal,
  chargesUtilisateur?: ParamsChargesUtilisateur
): ResultatCalcul {
  const { prix_fai, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann, montant_mobilier } = bien
  const { apport, tauxCredit, tauxAssurance, dureeAns, fraisNotaire, objectifCashflow } = financement
  const { tmi } = fiscal
  const regime = normaliserRegime(fiscal.regime)
  const mobilier = montant_mobilier ?? 5000

  // Financement
  const fraisNotaireMontant = prix_fai * fraisNotaire / 100
  const montantEmprunte = prix_fai + fraisNotaireMontant - apport
  const mensualite = calculerMensualite(montantEmprunte, tauxCredit, dureeAns)
  const mensualite_assurance = montantEmprunte * (tauxAssurance / 100) / 12
  const mensualite_totale = mensualite + mensualite_assurance
  const assuranceAnnuelle = montantEmprunte * (tauxAssurance / 100)

  // Loyer net mensuel selon type HC/CC
  const chargesRec = charges_rec || 0
  const chargesCoproMensuel = (charges_copro || 0) / 12
  const taxeFoncMensuel = (taxe_fonc_ann || 0) / 12

  const loyerNetMensuel = type_loyer === 'CC'
    ? loyer - chargesRec - chargesCoproMensuel - taxeFoncMensuel
    : loyer + chargesRec - chargesCoproMensuel - taxeFoncMensuel

  // Cashflow brut
  const cashflow_brut = loyerNetMensuel - mensualite_totale

  // Revenus annuels
  const loyerAnnuel = loyer * 12
  const interetsAnnuels = montantEmprunte * tauxCredit / 100

  // Charges utilisateur deductibles
  const cuDeductibles = chargesUtilisateurDeductibles(chargesUtilisateur, loyerAnnuel, regime)

  // --- Variables deficit foncier ---
  let deficit_foncier_imputable: number | undefined = undefined
  let deficit_foncier_reportable: number | undefined = undefined
  let economie_impot_deficit: number | undefined = undefined

  // --- Calcul impots selon regime ---
  let impots_ir = 0

  if (regime === 'nu_micro_foncier') {
    // Micro-foncier : abattement 30% sur recettes, TMI + PS 17.2%
    const revenuImposable = loyerAnnuel * 0.7
    impots_ir = revenuImposable * (tmi / 100 + 0.172)

  } else if (regime === 'nu_reel_foncier') {
    // Reel foncier : charges deductibles + deficit foncier
    const chargesDeductibles = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + assuranceAnnuelle + cuDeductibles
    const resultatFoncier = loyerAnnuel - chargesDeductibles

    if (resultatFoncier >= 0) {
      // Benefice foncier : impose TMI + PS
      impots_ir = resultatFoncier * (tmi / 100 + 0.172)
    } else {
      // Deficit foncier
      const deficitTotal = Math.abs(resultatFoncier)
      // Imputable sur revenu global : plafond 10 700 €/an (hors interets d'emprunt)
      const deficitHorsInterets = Math.max(0, chargesDeductibles - interetsAnnuels - loyerAnnuel)
      const imputableRevenuGlobal = Math.min(deficitHorsInterets, 10700)
      const exedentReportable = deficitTotal - imputableRevenuGlobal

      deficit_foncier_imputable = Math.round(imputableRevenuGlobal)
      deficit_foncier_reportable = Math.round(Math.max(0, exedentReportable))

      // Economie d'impot : le deficit imputable reduit le revenu global -> economie = deficit * TMI
      const economieAnnuelle = imputableRevenuGlobal * (tmi / 100)
      economie_impot_deficit = Math.round(economieAnnuelle)
      // L'impot est negatif (c'est une economie)
      impots_ir = -economieAnnuelle
    }

  } else if (regime === 'lmnp_micro_bic') {
    // LMNP Micro-BIC : abattement 50% sur recettes, TMI + PS 17.2%
    const revenuImposable = loyerAnnuel * 0.5
    impots_ir = revenuImposable * (tmi / 100 + 0.172)

  } else if (regime === 'lmnp_reel_bic') {
    // LMNP Reel BIC : amortissement composants, charges deductibles, TMI seul (pas de PS)
    const amortImmo = prix_fai * 0.85 / 30
    const amortMobilier = mobilier / 10
    const chargesDeductibles = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + assuranceAnnuelle + amortImmo + amortMobilier + cuDeductibles
    const revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impots_ir = revenuImposable * (tmi / 100)

  } else if (regime === 'lmp_reel_bic') {
    // LMP Reel BIC : memes charges que LMNP mais cotisations sociales SSI ~45%
    const amortImmo = prix_fai * 0.85 / 30
    const amortMobilier = mobilier / 10
    const chargesDeductibles = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + assuranceAnnuelle + amortImmo + amortMobilier + cuDeductibles
    const beneficeBIC = loyerAnnuel - chargesDeductibles

    if (beneficeBIC > 0) {
      // Cotisations sociales SSI ~45% du benefice BIC
      const cotisationsSSI = beneficeBIC * 0.45
      impots_ir = beneficeBIC * (tmi / 100) + cotisationsSSI
    } else {
      // Deficit imputable sur revenu global (avantage LMP vs LMNP)
      const economieAnnuelle = Math.abs(beneficeBIC) * (tmi / 100)
      impots_ir = -economieAnnuelle
      deficit_foncier_imputable = Math.round(Math.abs(beneficeBIC))
      economie_impot_deficit = Math.round(economieAnnuelle)
    }
  }

  const cashflow_net_ir = cashflow_brut - impots_ir / 12

  // SCI IS
  const amortSCI = prix_fai * 0.85 / 30
  // BUG FIX: Amortissement frais notaire sur 5 ans
  const amortNotaireSCI = fraisNotaireMontant / 5
  const cuSCI = chargesUtilisateurDeductibles(chargesUtilisateur, loyerAnnuel, 'sci_is')
  const chargesSCI = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + assuranceAnnuelle + amortSCI + amortNotaireSCI + cuSCI
  const beneficeSCI = Math.max(0, loyerAnnuel - chargesSCI)
  const is = calculerIS(beneficeSCI)
  const cashflow_net_sci_is = cashflow_brut - is / 12

  // LMNP (reel BIC pour backward compat)
  const amortLMNP = prix_fai * 0.85 / 30 + mobilier / 10
  const cuLMNP = chargesUtilisateurDeductibles(chargesUtilisateur, loyerAnnuel, 'lmnp_reel_bic')
  const chargesLMNP = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + assuranceAnnuelle + amortLMNP + cuLMNP
  const beneficeLMNP = Math.max(0, loyerAnnuel - chargesLMNP)
  const impots_lmnp = beneficeLMNP * (tmi / 100)
  const cashflow_net_lmnp = cashflow_brut - impots_lmnp / 12

  // Rendements
  const rendement_brut = loyerAnnuel / prix_fai
  const chargesAnnuellesTotal = (charges_copro || 0) + (taxe_fonc_ann || 0)
  const rendement_net = (loyerAnnuel - chargesAnnuellesTotal) / prix_fai

  // Prix cible (formule Excel)
  const tauxMensuel = tauxCredit / 100 / 12
  const n = dureeAns * 12
  const tauxMensuelCredit = tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -n))
  const tauxMensuelTotal = tauxMensuelCredit + (tauxAssurance / 100) / 12
  const objectifDecimal = objectifCashflow / 100
  const prix_cible = loyerNetMensuel * (1 - objectifDecimal) / ((1 + fraisNotaire / 100) * tauxMensuelTotal)

  return {
    mensualite: Math.round(mensualite),
    mensualite_assurance: Math.round(mensualite_assurance),
    mensualite_totale: Math.round(mensualite_totale),
    cashflow_brut: Math.round(cashflow_brut),
    cashflow_net_ir: Math.round(cashflow_net_ir),
    cashflow_net_sci_is: Math.round(cashflow_net_sci_is),
    cashflow_net_lmnp: Math.round(cashflow_net_lmnp),
    impots_annuels: Math.round(impots_ir),
    rendement_brut: Math.round(rendement_brut * 10000) / 100,
    rendement_net: Math.round(rendement_net * 10000) / 100,
    prix_cible: Math.round(prix_cible),
    deficit_foncier_imputable,
    deficit_foncier_reportable,
    economie_impot_deficit,
  }
}
