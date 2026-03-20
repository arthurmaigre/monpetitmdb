export interface Bien {
  id: string
  metropole: string
  ville: string
  quartier: string
  type_bien: string
  nb_pieces: string
  surface: number
  prix_fai: number
  prix_m2: number
  loyer: number
  type_loyer: string
  charges_rec: number
  rendement_brut: number
  statut: string
  strategie_mdb: string
  url: string
  photo_url: string
  photo_storage_path: string
  profil_locataire: string
  fin_bail: string
  charges_copro: number
  taxe_fonc_ann: number
  adresse: string
  surface_terrain: number
  score_travaux: number
  score_commentaire: string
  message_contact: string
  message_statut: 'brouillon' | 'envoye' | 'repondu' | null
  message_date: string
  latitude: number
  longitude: number
  estimation_prix_m2: number
  estimation_prix_total: number
  estimation_confiance: 'A' | 'B' | 'C' | 'D'
  estimation_nb_comparables: number
  estimation_rayon_m: number
  estimation_date: string
  created_at: string
  updated_at: string
}

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
  regime: 'nu_micro_foncier' | 'nu_reel_foncier' | 'lmnp_micro_bic' | 'lmnp_reel_bic' | 'lmp_reel_bic' | 'sci_is' | 'marchand_de_biens'
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