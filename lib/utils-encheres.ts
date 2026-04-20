const TRIBUNAL_DEPARTEMENT: Record<string, string> = {
  'TJ de Paris': '75',
  'TJ de Lyon': '69',
  'TJ de Marseille': '13',
  'TJ de Bordeaux': '33',
  'TJ de Toulouse': '31',
  'TJ de Nantes': '44',
  'TJ de Strasbourg': '67',
  'TJ de Lille': '59',
  'TJ de Nice': '06',
  'TJ de Rennes': '35',
  'TJ de Montpellier': '34',
  'TJ de Grenoble': '38',
  'TJ de Toulon': '83',
  'TJ de Orléans': '45',
  'TJ de Angers': '49',
  'TJ de Caen': '14',
  'TJ de Rouen': '76',
  'TJ de Nancy': '54',
  'TJ de Metz': '57',
  'TJ de Clermont-Ferrand': '63',
  'TJ de Besançon': '25',
  'TJ de Dijon': '21',
  'TJ de Limoges': '87',
  'TJ de Amiens': '80',
  'TJ de Reims': '51',
  'TJ de Tours': '37',
  'TJ de Poitiers': '86',
  'TJ de Pau': '64',
  'TJ de Brest': '29',
  'TJ de Perpignan': '66',
  'TJ de Montauban': '82',
  'TJ de Chambéry': '73',
  'TJ de Aix-en-Provence': '13',
  'TJ de Versailles': '78',
  'TJ de Bobigny': '93',
  'TJ de Créteil': '94',
  'TJ de Nanterre': '92',
  'TJ de Pontoise': '95',
  'TJ de Évry-Courcouronnes': '91',
  'TJ de Melun': '77',
}

export function isVenteDelocalisee(departement: string | null, tribunal: string | null): boolean {
  if (!departement || !tribunal) return false
  const depTribunal = TRIBUNAL_DEPARTEMENT[tribunal]
  if (!depTribunal) return false
  return departement !== depTribunal
}
