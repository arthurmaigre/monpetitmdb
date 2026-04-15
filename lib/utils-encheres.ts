const TRIBUNAL_DEPARTEMENT: Record<string, string> = {
  'TJ Paris': '75',
  'TJ Lyon': '69',
  'TJ Marseille': '13',
  'TJ Bordeaux': '33',
  'TJ Toulouse': '31',
  'TJ Nantes': '44',
  'TJ Strasbourg': '67',
  'TJ Lille': '59',
  'TJ Nice': '06',
  'TJ Rennes': '35',
  'TJ Montpellier': '34',
  'TJ Grenoble': '38',
  'TJ Toulon': '83',
  'TJ Orléans': '45',
  'TJ Angers': '49',
  'TJ Caen': '14',
  'TJ Rouen': '76',
  'TJ Nancy': '54',
  'TJ Metz': '57',
  'TJ Clermont-Ferrand': '63',
  'TJ Besançon': '25',
  'TJ Dijon': '21',
  'TJ Limoges': '87',
  'TJ Amiens': '80',
  'TJ Reims': '51',
  'TJ Tours': '37',
  'TJ Poitiers': '86',
  'TJ Pau': '64',
  'TJ Brest': '29',
  'TJ Perpignan': '66',
  'TJ Montauban': '82',
  'TJ Chambéry': '73',
  'TJ Aix-en-Provence': '13',
  'TJ Versailles': '78',
  'TJ Bobigny': '93',
  'TJ Créteil': '94',
  'TJ Nanterre': '92',
  'TJ Pontoise': '95',
  'TJ Évry-Courcouronnes': '91',
  'TJ Melun': '77',
}

export function isVenteDelocalisee(departement: string | null, tribunal: string | null): boolean {
  if (!departement || !tribunal) return false
  const depTribunal = TRIBUNAL_DEPARTEMENT[tribunal]
  if (!depTribunal) return false
  return departement !== depTribunal
}
