export interface ParamsFinancement {
  apport: number
  tauxCredit: number
  tauxAssurance: number
  dureeAns: number
  fraisNotaire: number
  objectifCashflow: number
}

export type RegimeFiscal = 'micro_foncier' | 'reel' | 'lmnp' | 'sci_is' | 'marchand_de_biens'

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
}

// ═══════════════════════════════════════════════════════════════
// REVENTE — Types et calculs
// ═══════════════════════════════════════════════════════════════

export interface ParamsRevente {
  prixAchat: number
  prixRevente: number
  dureeDetention: number        // 1, 2 ou 5 ans
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

  // Plus-value nette
  plusValueNette: number

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

export function calculerRevente(params: ParamsRevente): ResultatRevente {
  const {
    prixAchat, prixRevente, dureeDetention, regime, tmi,
    fraisNotaireAchat, budgetTravaux,
    loyerMensuelNet, impotAnnuelLocation, mensualiteTotale,
    montantEmprunte, tauxCredit, dureeCredit, apport, surface
  } = params

  // --- Acquisition ---
  const fraisNotaireMontant = prixAchat * fraisNotaireAchat / 100
  const prixAchatTotal = prixAchat + fraisNotaireMontant + budgetTravaux

  // --- Plus-value brute ---
  // Base = prix revente - prix achat - frais notaire achat - travaux
  const plusValueBrute = Math.max(0, prixRevente - prixAchat - fraisNotaireMontant - budgetTravaux)

  // --- Fiscalite selon regime ---
  let impotPlusValue = 0
  let prelevementsSociaux = 0
  let tvaMarge = 0
  let chargesSocialesMdb = 0
  let impotSociete = 0
  let pfuDividendes = 0

  if (regime === 'micro_foncier' || regime === 'reel') {
    // Regime des particuliers : 19% IR + 17.2% PS
    // 0% abattement pour detention <= 5 ans
    impotPlusValue = plusValueBrute * 0.19
    prelevementsSociaux = plusValueBrute * 0.172

  } else if (regime === 'lmnp') {
    // LMNP : meme base que particulier mais reintegration des amortissements deduits
    const amortAnnuel = (prixAchat * 0.85 / 30) + (prixAchat * 0.10 / 10)
    const amortsCumules = amortAnnuel * dureeDetention
    const pvAvecReintegration = Math.max(0, plusValueBrute + amortsCumules)
    impotPlusValue = pvAvecReintegration * 0.19
    prelevementsSociaux = pvAvecReintegration * 0.172

  } else if (regime === 'sci_is') {
    // SCI IS : PV sur valeur nette comptable (apres amortissement)
    const amortCumule = (prixAchat * 0.85 / 30) * dureeDetention
    const valeurNetteCptable = prixAchat - amortCumule
    const pvSCI = Math.max(0, prixRevente - valeurNetteCptable - budgetTravaux)
    // IS : 15% jusqu'a 42500, 25% au-dela (PV reste dans la SCI, pas de flat tax)
    impotSociete = pvSCI <= 42500 ? pvSCI * 0.15 : 42500 * 0.15 + (pvSCI - 42500) * 0.25

  } else if (regime === 'marchand_de_biens') {
    // MdB toujours a l'IS : TVA sur marge + IS sur benefice
    const marge = Math.max(0, prixRevente - prixAchat)
    tvaMarge = marge * 0.20
    const benefice = Math.max(0, prixRevente - prixAchat - budgetTravaux - fraisNotaireMontant - tvaMarge)
    impotSociete = benefice <= 42500 ? benefice * 0.15 : 42500 * 0.15 + (benefice - 42500) * 0.25
  }

  const totalFiscalitePV = impotPlusValue + prelevementsSociaux + tvaMarge + impotSociete
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
  // Profit = PV nette + cashflow locatif net - (capital rembourse au credit via les mensualites est deja dans le CRD)
  // A la revente : on recoit prixRevente, on rembourse CRD, on a paye les mensualites, on a percu les loyers nets
  const capitalInvesti = apport + budgetTravaux + fraisNotaireMontant
  const produitRevente = prixRevente - capitalRestantDu - totalFiscalitePV
  const profitNet = produitRevente - capitalInvesti + cashflowLocationNet - mensualitesCumulees

  const rendementTotal = capitalInvesti > 0 ? (profitNet / capitalInvesti) * 100 : 0
  const rendementAnnualise = dureeDetention > 0 ? (Math.pow(1 + profitNet / capitalInvesti, 1 / dureeDetention) - 1) * 100 : 0

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
    plusValueNette: Math.round(plusValueNette),
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

export function calculerCashflow(
  bien: Bien,
  financement: ParamsFinancement,
  fiscal: ParamsFiscal
): ResultatCalcul {
  const { prix_fai, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann } = bien
  const { apport, tauxCredit, tauxAssurance, dureeAns, fraisNotaire, objectifCashflow } = financement
  const { tmi, regime } = fiscal

  // Financement
  const fraisNotaireMontant = prix_fai * fraisNotaire / 100
  const montantEmprunte = prix_fai + fraisNotaireMontant - apport
  const mensualite = calculerMensualite(montantEmprunte, tauxCredit, dureeAns)
  const mensualite_assurance = montantEmprunte * (tauxAssurance / 100) / 12
  const mensualite_totale = mensualite + mensualite_assurance

  // Loyer net mensuel selon type HC/CC (formule Excel)
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

  // Regime IR
  let impots_ir = 0
  if (regime === 'micro_foncier') {
    const revenuImposable = loyerAnnuel * 0.7
    impots_ir = revenuImposable * (tmi / 100 + 0.172)
  } else if (regime === 'reel') {
    const chargesDeductibles = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels
    const revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impots_ir = revenuImposable * (tmi / 100 + 0.172)
  } else if (regime === 'lmnp') {
    const amortImmo = prix_fai * 0.85 / 30
    const amortMobilier = prix_fai * 0.10 / 10
    const chargesDeductibles = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + amortImmo + amortMobilier
    const revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impots_ir = revenuImposable * (tmi / 100)
  }

  const cashflow_net_ir = cashflow_brut - impots_ir / 12

  // SCI IS
  const amortSCI = prix_fai * 0.85 / 30
  const chargesSCI = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + amortSCI
  const beneficeSCI = Math.max(0, loyerAnnuel - chargesSCI)
  const is = beneficeSCI <= 42500 ? beneficeSCI * 0.15 : 42500 * 0.15 + (beneficeSCI - 42500) * 0.25
  const cashflow_net_sci_is = cashflow_brut - is / 12

  // LMNP
  const amortLMNP = prix_fai * 0.85 / 30 + prix_fai * 0.10 / 10
  const chargesLMNP = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + amortLMNP
  const beneficeLMNP = Math.max(0, loyerAnnuel - chargesLMNP)
  const impots_lmnp = beneficeLMNP * (tmi / 100)
  const cashflow_net_lmnp = cashflow_brut - impots_lmnp / 12

  // Rendements
  const rendement_brut = loyerAnnuel / prix_fai
  const chargesAnnuellesTotal = (charges_copro || 0) + (taxe_fonc_ann || 0)
  const rendement_net = (loyerAnnuel - chargesAnnuellesTotal) / prix_fai

  // Prix cible (formule Excel)
  // loyer_net / ((1 + frais_notaire) * taux_mensuel_total)  * (1 - objectif_CF)
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
  }
}