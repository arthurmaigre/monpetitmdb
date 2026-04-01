// Labels d'affichage — branding uniquement
// Les métropoles réelles viennent de /api/metropoles
export const METROPOLE_LABELS: Record<string, string> = {
  'Nantes':    'Métropole Nantaise',
  'Lyon':      'Métropole Lyonnaise',
  'Paris':     'Métropole Parisienne',
  'Bordeaux':  'Métropole Bordelaise',
  'Marseille': 'Métropole Marseillaise',
  'Toulouse':  'Métropole Toulousaine',
  'Rennes':    'Métropole Rennaise',
}

export const TYPES_BIEN = ['Tous', 'Appartement', 'Maison', 'Studio', 'Immeuble', 'Loft', 'Local', 'Autre']

export const TRIS = [
  { label: 'Plus r\u00E9cents', value: 'recent' },
  { label: 'Rendement \u2193',  value: 'rendement_desc' },
  { label: 'Rendement \u2191',  value: 'rendement_asc' },
  { label: 'Prix \u2191',       value: 'prix_asc' },
  { label: 'Prix \u2193',       value: 'prix_desc' },
  { label: 'Prix/m\u00B2 \u2191', value: 'prixm2_asc' },
  { label: 'Prix/m\u00B2 \u2193', value: 'prixm2_desc' },
  { label: 'Plus-value \u2193', value: 'plusvalue_desc' },
  { label: 'Plus-value \u2191', value: 'plusvalue_asc' },
]

export const TRIS_TRAVAUX = [
  { label: 'Plus r\u00E9cents', value: 'recent' },
  { label: 'Prix \u2191',       value: 'prix_asc' },
  { label: 'Prix \u2193',       value: 'prix_desc' },
  { label: 'Prix/m\u00B2 \u2191', value: 'prixm2_asc' },
  { label: 'Prix/m\u00B2 \u2193', value: 'prixm2_desc' },
  { label: 'Score travaux \u2193', value: 'score_desc' },
]

export const STRATEGIE_LABELS: Record<string, string> = {
  'Locataire en place': 'Locataire en place',
  'Travaux lourds':     'Travaux lourds',
  'Viager':             'Viager',
}

// Strategies visibles pour les utilisateurs (masquer Division tant qu'elle n'est pas prete)
export const STRATEGIES_VISIBLES = ['Locataire en place', 'Travaux lourds', 'Immeuble de rapport']

// Toutes les strategies (y compris masquees) pour l'admin
export const STRATEGIES_TOUTES = ['Locataire en place', 'Travaux lourds', 'Division', 'Immeuble de rapport']