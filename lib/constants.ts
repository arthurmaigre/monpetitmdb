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

export const TYPES_BIEN = ['Tous', 'Appartement', 'Maison', 'Studio']

export const TRIS = [
  { label: 'Plus récents', value: 'recent' },
  { label: 'Rendement ↓',  value: 'rendement_desc' },
  { label: 'Rendement ↑',  value: 'rendement_asc' },
  { label: 'Prix ↑',       value: 'prix_asc' },
  { label: 'Prix ↓',       value: 'prix_desc' },
]

export const STRATEGIE_LABELS: Record<string, string> = {
  'Locataire en place': 'Locataire en place',
  'Travaux lourds':     'Travaux lourds',
  'Viager':             'Viager',
}