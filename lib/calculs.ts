export interface ParamsFinancement {
  apport: number        // € ex: 50000
  tauxCredit: number    // % ex: 3.5
  dureeAns: number      // ex: 20
  fraisNotaire: number  // % ex: 8
}

export interface ParamsFiscal {
  tmi: number           // % ex: 30
  regime: 'micro_foncier' | 'reel' | 'lmnp' | 'sci_is'
}

export interface Bien {
  prix_fai: number
  loyer: number
  charges_copro: number
  taxe_fonc_ann: number
  surface: number
}

export interface ResultatCalcul {
  mensualite: number
  cashflow_brut: number
  cashflow_net_ir: number
  cashflow_net_sci_is: number
  cashflow_net_lmnp: number
  impots_annuels: number
  rendement_brut: number
  rendement_net: number
  prix_cible: number
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
  const { prix_fai, loyer, charges_copro, taxe_fonc_ann } = bien
  const { apport, tauxCredit, dureeAns, fraisNotaire } = financement
  const { tmi, regime } = fiscal

  // Financement
  const fraisNotaireMontant = prix_fai * fraisNotaire / 100
  const montantEmprunte = prix_fai + fraisNotaireMontant - apport
  const mensualite = calculerMensualite(montantEmprunte, tauxCredit, dureeAns)

  // Charges mensuelles
  const chargesMensuelles = (charges_copro || 0) / 12 + (taxe_fonc_ann || 0) / 12

  // Cashflow brut
  const cashflow_brut = loyer - mensualite - chargesMensuelles

  // Revenus annuels
  const loyerAnnuel = loyer * 12
  const interetsAnnuels = montantEmprunte * tauxCredit / 100 // approximation année 1

  // ── Régime IR réel ──
  let impots_ir = 0
  if (regime === 'micro_foncier') {
    const revenuImposable = loyerAnnuel * 0.7  // abattement 30%
    impots_ir = revenuImposable * (tmi / 100 + 0.172) // IR + PS 17.2%
  } else if (regime === 'reel') {
    const chargesDeductibles = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels
    const revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impots_ir = revenuImposable * (tmi / 100 + 0.172)
  } else if (regime === 'lmnp') {
    // Amortissement immo : prix / 30 ans, mobilier : 10% prix / 10 ans
    const amortImmo = prix_fai * 0.85 / 30
    const amortMobilier = prix_fai * 0.10 / 10
    const chargesDeductibles = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + amortImmo + amortMobilier
    const revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impots_ir = revenuImposable * (tmi / 100)  // pas de PS en LMNP
  }

  const cashflow_net_ir = cashflow_brut - impots_ir / 12

  // ── SCI IS ──
  const amortSCI = prix_fai * 0.85 / 30
  const chargesSCI = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + amortSCI
  const beneficeSCI = Math.max(0, loyerAnnuel - chargesSCI)
  const is = beneficeSCI <= 42500 ? beneficeSCI * 0.15 : 42500 * 0.15 + (beneficeSCI - 42500) * 0.25
  const cashflow_net_sci_is = cashflow_brut - is / 12

  // ── LMNP ──
  const amortLMNP = prix_fai * 0.85 / 30 + prix_fai * 0.10 / 10
  const chargesLMNP = (charges_copro || 0) + (taxe_fonc_ann || 0) + interetsAnnuels + amortLMNP
  const beneficeLMNP = Math.max(0, loyerAnnuel - chargesLMNP)
  const impots_lmnp = beneficeLMNP * (tmi / 100)
  const cashflow_net_lmnp = cashflow_brut - impots_lmnp / 12

  // Rendements
  const rendement_brut = loyerAnnuel / prix_fai
  const chargesAnnuellesTotal = (charges_copro || 0) + (taxe_fonc_ann || 0)
  const rendement_net = (loyerAnnuel - chargesAnnuellesTotal) / prix_fai

  // Prix cible (cashflow brut = 0)
  const loyerAnnuelNet = loyerAnnuel - (charges_copro || 0) - (taxe_fonc_ann || 0)
  const prix_cible = apport > 0
    ? (loyerAnnuelNet / 12 / (tauxCredit / 100 / 12)) * (1 - Math.pow(1 + tauxCredit / 100 / 12, -dureeAns * 12))
    : prix_fai

  return {
    mensualite: Math.round(mensualite),
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