export interface ParamsFinancement {
  apport: number
  tauxCredit: number
  tauxAssurance: number
  dureeAns: number
  fraisNotaire: number
  objectifCashflow: number
}

export interface ParamsFiscal {
  tmi: number
  regime: 'micro_foncier' | 'reel' | 'lmnp' | 'sci_is'
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