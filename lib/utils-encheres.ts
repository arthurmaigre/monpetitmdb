const TRIBUNAL_DEPARTEMENT: Record<string, string> = {
  // Île-de-France
  'TJ de Paris': '75',
  'TJ de Versailles': '78',
  'TJ de Nanterre': '92',
  'TJ de Bobigny': '93',
  'TJ de Créteil': '94',
  'TJ de Pontoise': '95',
  'TJ de Évry-Courcouronnes': '91',
  'TJ de Evry-Courcouronnes': '91',   // variante sans accent
  'TJ de Melun': '77',
  'TJ de Meaux': '77',
  'TJ de Fontainebleau': '77',
  'TJ de Fontaineble': '77',          // typo Sonnet

  // Normandie
  'TJ de Rouen': '76',
  'TJ de Dieppe': '76',
  'TJ du Havre': '76',
  'TJ de Du Havre': '76',             // typo Sonnet
  'TJ de Caen': '14',
  'TJ de Lisieux': '14',
  'TJ de Alençon': '61',
  'TJ de Argentan': '61',
  'TJ de Coutances': '50',
  'TJ de Evreux': '27',
  'TJ de Évreux': '27',

  // Hauts-de-France
  'TJ de Lille': '59',
  'TJ de Valenciennes': '59',
  'TJ de Cambrai': '59',
  'TJ de Béthune': '62',
  'TJ de Arras': '62',
  'TJ de Amiens': '80',
  'TJ de Abbeville': '80',
  'TJ de Laon': '02',
  'TJ de Soissons': '02',
  'TJ de Saint Quentin': '02',
  'TJ de Saint-Quentin': '02',
  'TJ de Beauvais': '60',
  'TJ de Senlis': '60',
  'TJ de Compiègne': '60',

  // Grand Est
  'TJ de Strasbourg': '67',
  'TJ de Colmar': '68',
  'TJ de Nancy': '54',
  'TJ de Metz': '57',
  'TJ de Reims': '51',
  'TJ de Châlons-en-Champagne': '51',
  'TJ de Troyes': '10',
  'TJ de Chaumont': '52',
  'TJ de Bar-le-Duc': '55',
  'TJ de Épinal': '88',
  'TJ de Epinal': '88',               // variante sans accent
  'TJ de Belfort': '90',
  'TJ de Besançon': '25',
  'TJ de Besancon': '25',             // variante sans accent
  'TJ de Montbéliard': '25',
  'TJ de Vesoul': '70',
  'TJ de Lons-le-Saunier': '39',

  // Bourgogne-Franche-Comté
  'TJ de Dijon': '21',
  'TJ de Chalon-sur-Saône': '71',
  'TJ de Chalon-sur-Saone': '71',     // variante sans accent
  'TJ de Auxerre': '89',
  'TJ de Sens': '89',
  'TJ de Nevers': '58',

  // Bretagne / Pays de la Loire
  'TJ de Rennes': '35',
  'TJ de Saint-Brieuc': '22',
  'TJ de Saint Brieuc': '22',
  'TJ de Brest': '29',
  'TJ de Quimper': '29',
  'TJ de Lorient': '56',
  'TJ de Vannes': '56',
  'TJ de Nantes': '44',
  'TJ de Saint-Nazaire': '44',
  'TJ de Saint Nazaire': '44',
  'TJ de Laval': '53',
  'TJ du Mans': '72',
  'TJ de Du Mans': '72',              // typo Sonnet
  'TJ de Angers': '49',
  'TJ de La Roche-sur-Yon': '85',
  'TJ de Les-Sables-D-Olonne': '85',  // typo Sonnet

  // Centre-Val de Loire
  'TJ de Orléans': '45',
  'TJ de Montargis': '45',
  'TJ de Chartres': '28',
  'TJ de Blois': '41',
  'TJ de Tours': '37',
  'TJ de Bourges': '18',

  // Auvergne-Rhône-Alpes
  'TJ de Lyon': '69',
  'TJ de Villefranche-sur-Saône': '69',
  'TJ de Saint-Étienne': '42',
  'TJ de Roanne': '42',
  'TJ de Clermont-Ferrand': '63',
  'TJ de Clermont Ferrand': '63',     // variante sans tiret
  'TJ de Cusset': '03',
  'TJ de Montluçon': '03',
  'TJ de Montlucon': '03',            // variante sans accent
  'TJ de Puy-en-Velay': '43',
  'TJ de Valence': '26',
  'TJ de Privas': '07',
  'TJ de Grenoble': '38',
  'TJ de Vienne': '38',
  'TJ de Bourgoin-Jallieu': '38',
  'TJ de Chambéry': '73',
  'TJ de Albertville': '73',
  'TJ de Annecy': '74',
  'TJ de Bonneville': '74',
  'TJ de Thonon-les-Bains': '74',

  // Nouvelle-Aquitaine
  'TJ de Bordeaux': '33',
  'TJ de Libourne': '33',
  'TJ de Périgueux': '24',
  'TJ de Perigueux': '24',            // variante sans accent
  'TJ de Bergerac': '24',
  'TJ de Agen': '47',
  'TJ de La Rochelle': '17',
  'TJ de Saintes': '17',
  'TJ de Angoulême': '16',
  'TJ de Angouleme': '16',            // variante sans accent
  'TJ de Poitiers': '86',
  'TJ de Niort': '79',
  'TJ de Limoges': '87',
  'TJ de Brive-la-Gaillarde': '19',
  'TJ de Tulle': '19',
  'TJ de Guéret': '23',
  'TJ de Pau': '64',
  'TJ de Bayonne': '64',
  'TJ de Mont-de-Marsan': '40',

  // Occitanie
  'TJ de Toulouse': '31',
  'TJ de Saint Gaudens': '31',
  'TJ de Saint-Gaudens': '31',
  'TJ de Auch': '32',
  'TJ de Montauban': '82',
  'TJ de Castres': '81',
  'TJ de Albi': '81',
  'TJ de Narbonne': '11',
  'TJ de Carcassonne': '11',
  'TJ de Perpignan': '66',
  'TJ de Montpellier': '34',
  'TJ de Béziers': '34',
  'TJ de Nîmes': '30',
  'TJ de Nimes': '30',                // variante sans accent
  'TJ de Alès': '30',
  'TJ de Foix': '09',
  'TJ de Cahors': '46',
  'TJ de Rodez': '12',

  // PACA
  'TJ de Marseille': '13',
  'TJ de Aix-en-Provence': '13',
  'TJ de Tarascon': '13',
  'TJ de Toulon': '83',
  'TJ de Draguignan': '83',
  'TJ de Nice': '06',
  'TJ de Grasse': '06',
  'TJ de Digne-les-Bains': '04',
  'TJ de Gne-les-Bains': '04',       // typo Sonnet pour Digne-les-Bains
  'TJ de Gap': '05',
  'TJ de Carpentras': '84',

  // Corse
  'TJ de Bastia': '2b',
  'TJ de Ajaccio': '2a',

  // DOM
  'TJ de Basse Terre': '97',
  'TJ de Fort-de-France': '97',
  'TJ de Cayenne': '97',
  'TJ de Saint-Denis': '97',
}

export function isVenteDelocalisee(departement: string | null, tribunal: string | null): boolean {
  if (!departement || !tribunal) return false
  const depTribunal = TRIBUNAL_DEPARTEMENT[tribunal]
  if (!depTribunal) return false
  return departement !== depTribunal
}
