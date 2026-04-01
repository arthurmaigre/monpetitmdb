import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Mapping departement -> region
const DEPT_REGION: Record<string, string> = {
  '01': 'Auvergne-Rhone-Alpes', '03': 'Auvergne-Rhone-Alpes', '07': 'Auvergne-Rhone-Alpes',
  '15': 'Auvergne-Rhone-Alpes', '26': 'Auvergne-Rhone-Alpes', '38': 'Auvergne-Rhone-Alpes',
  '42': 'Auvergne-Rhone-Alpes', '43': 'Auvergne-Rhone-Alpes', '63': 'Auvergne-Rhone-Alpes',
  '69': 'Auvergne-Rhone-Alpes', '73': 'Auvergne-Rhone-Alpes', '74': 'Auvergne-Rhone-Alpes',
  '21': 'Bourgogne-Franche-Comte', '25': 'Bourgogne-Franche-Comte', '39': 'Bourgogne-Franche-Comte',
  '58': 'Bourgogne-Franche-Comte', '70': 'Bourgogne-Franche-Comte', '71': 'Bourgogne-Franche-Comte',
  '89': 'Bourgogne-Franche-Comte', '90': 'Bourgogne-Franche-Comte',
  '22': 'Bretagne', '29': 'Bretagne', '35': 'Bretagne', '56': 'Bretagne',
  '18': 'Centre-Val de Loire', '28': 'Centre-Val de Loire', '36': 'Centre-Val de Loire',
  '37': 'Centre-Val de Loire', '41': 'Centre-Val de Loire', '45': 'Centre-Val de Loire',
  '08': 'Grand Est', '10': 'Grand Est', '51': 'Grand Est', '52': 'Grand Est',
  '54': 'Grand Est', '55': 'Grand Est', '57': 'Grand Est', '67': 'Grand Est', '68': 'Grand Est', '88': 'Grand Est',
  '02': 'Hauts-de-France', '59': 'Hauts-de-France', '60': 'Hauts-de-France', '62': 'Hauts-de-France', '80': 'Hauts-de-France',
  '75': 'Ile-de-France', '77': 'Ile-de-France', '78': 'Ile-de-France', '91': 'Ile-de-France',
  '92': 'Ile-de-France', '93': 'Ile-de-France', '94': 'Ile-de-France', '95': 'Ile-de-France',
  '14': 'Normandie', '27': 'Normandie', '50': 'Normandie', '61': 'Normandie', '76': 'Normandie',
  '16': 'Nouvelle-Aquitaine', '17': 'Nouvelle-Aquitaine', '19': 'Nouvelle-Aquitaine',
  '23': 'Nouvelle-Aquitaine', '24': 'Nouvelle-Aquitaine', '33': 'Nouvelle-Aquitaine',
  '40': 'Nouvelle-Aquitaine', '47': 'Nouvelle-Aquitaine', '64': 'Nouvelle-Aquitaine',
  '79': 'Nouvelle-Aquitaine', '86': 'Nouvelle-Aquitaine', '87': 'Nouvelle-Aquitaine',
  '09': 'Occitanie', '11': 'Occitanie', '12': 'Occitanie', '30': 'Occitanie',
  '31': 'Occitanie', '32': 'Occitanie', '34': 'Occitanie', '46': 'Occitanie',
  '48': 'Occitanie', '65': 'Occitanie', '66': 'Occitanie', '81': 'Occitanie', '82': 'Occitanie',
  '44': 'Pays de la Loire', '49': 'Pays de la Loire', '53': 'Pays de la Loire',
  '72': 'Pays de la Loire', '85': 'Pays de la Loire',
  '04': 'Provence-Alpes-Cote d\'Azur', '05': 'Provence-Alpes-Cote d\'Azur',
  '06': 'Provence-Alpes-Cote d\'Azur', '13': 'Provence-Alpes-Cote d\'Azur',
  '83': 'Provence-Alpes-Cote d\'Azur', '84': 'Provence-Alpes-Cote d\'Azur',
  '2A': 'Corse', '2B': 'Corse',
}

// Noms des departements
const DEPT_NOMS: Record<string, string> = {
  '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence',
  '05': 'Hautes-Alpes', '06': 'Alpes-Maritimes', '07': 'Ardeche', '08': 'Ardennes',
  '09': 'Ariege', '10': 'Aube', '11': 'Aude', '12': 'Aveyron',
  '13': 'Bouches-du-Rhone', '14': 'Calvados', '15': 'Cantal', '16': 'Charente',
  '17': 'Charente-Maritime', '18': 'Cher', '19': 'Correze', '2A': 'Corse-du-Sud',
  '2B': 'Haute-Corse', '21': 'Cote-d\'Or', '22': 'Cotes-d\'Armor', '23': 'Creuse',
  '24': 'Dordogne', '25': 'Doubs', '26': 'Drome', '27': 'Eure',
  '28': 'Eure-et-Loir', '29': 'Finistere', '30': 'Gard', '31': 'Haute-Garonne',
  '32': 'Gers', '33': 'Gironde', '34': 'Herault', '35': 'Ille-et-Vilaine',
  '36': 'Indre', '37': 'Indre-et-Loire', '38': 'Isere', '39': 'Jura',
  '40': 'Landes', '41': 'Loir-et-Cher', '42': 'Loire', '43': 'Haute-Loire',
  '44': 'Loire-Atlantique', '45': 'Loiret', '46': 'Lot', '47': 'Lot-et-Garonne',
  '48': 'Lozere', '49': 'Maine-et-Loire', '50': 'Manche', '51': 'Marne',
  '52': 'Haute-Marne', '53': 'Mayenne', '54': 'Meurthe-et-Moselle', '55': 'Meuse',
  '56': 'Morbihan', '57': 'Moselle', '58': 'Nievre', '59': 'Nord',
  '60': 'Oise', '61': 'Orne', '62': 'Pas-de-Calais', '63': 'Puy-de-Dome',
  '64': 'Pyrenees-Atlantiques', '65': 'Hautes-Pyrenees', '66': 'Pyrenees-Orientales',
  '67': 'Bas-Rhin', '68': 'Haut-Rhin', '69': 'Rhone', '70': 'Haute-Saone',
  '71': 'Saone-et-Loire', '72': 'Sarthe', '73': 'Savoie', '74': 'Haute-Savoie',
  '75': 'Paris', '76': 'Seine-Maritime', '77': 'Seine-et-Marne', '78': 'Yvelines',
  '79': 'Deux-Sevres', '80': 'Somme', '81': 'Tarn', '82': 'Tarn-et-Garonne',
  '83': 'Var', '84': 'Vaucluse', '85': 'Vendee', '86': 'Vienne',
  '87': 'Haute-Vienne', '88': 'Vosges', '89': 'Yonne', '90': 'Territoire de Belfort',
  '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne', '95': 'Val-d\'Oise',
}

const METROPOLES = [
  'Paris', 'Lyon', 'Marseille', 'Nantes', 'Bordeaux', 'Toulouse', 'Rennes',
  'Lille', 'Nice', 'Rouen', 'Toulon', 'Strasbourg', 'Montpellier', 'Grenoble',
  'Clermont-Ferrand', 'Dijon', 'Orleans', 'Saint-Etienne', 'Tours', 'Metz',
  'Nancy', 'Brest',
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const metropole = searchParams.get('metropole')

  if (!q || q.length < 2) {
    return NextResponse.json({ communes: [] })
  }

  const qLower = q.toLowerCase()
  const results: { type: string, code_postal: string, nom_commune: string, label: string }[] = []

  // 1. Recherche par metropole
  if (!metropole || metropole === 'Toutes') {
    for (const m of METROPOLES) {
      if (m.toLowerCase().startsWith(qLower)) {
        results.push({ type: 'metropole', code_postal: 'metropole', nom_commune: m, label: `${m.toUpperCase()} (m\u00e9tropole)` })
      }
    }
  }

  // 2. Recherche par region
  const regionsMatch = new Set<string>()
  for (const [, region] of Object.entries(DEPT_REGION)) {
    if (region.toLowerCase().startsWith(qLower) && !regionsMatch.has(region)) {
      regionsMatch.add(region)
      results.push({ type: 'region', code_postal: 'region', nom_commune: region, label: `${region.toUpperCase()} (r\u00e9gion)` })
    }
  }

  // 3. Recherche par departement (numero ou nom)
  const isNumber = /^\d+$/.test(q)
  for (const [code, nom] of Object.entries(DEPT_NOMS)) {
    const match = isNumber ? code.startsWith(q) : nom.toLowerCase().startsWith(qLower)
    if (match) {
      results.push({ type: 'departement', code_postal: code, nom_commune: nom, label: `${nom.toUpperCase()} (${code})` })
    }
  }

  // 4. Recherche par commune (existant)
  let query = supabaseAdmin
    .from('ref_communes')
    .select('code_postal, nom_commune, metropole')

  // Normaliser les espaces en tirets pour matcher les noms composes (Saint Nazaire → Saint-Nazaire)
  const qNormalized = q.replace(/\s+/g, '-')
  if (isNumber) {
    query = query.like('code_postal', `${q}%`)
  } else {
    query = query.ilike('nom_commune', `${qNormalized}%`)
  }

  if (metropole && metropole !== 'Toutes') {
    query = query.eq('metropole', metropole)
  }

  query = query.order('nom_commune').limit(50)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Completer avec les villes des biens (couvre toute la France, pas seulement les 22 metropoles)
  const biensQuery = isNumber
    ? supabaseAdmin.from('biens').select('ville, code_postal').like('code_postal', `${q}%`).not('ville', 'is', null).limit(50)
    : supabaseAdmin.from('biens').select('ville, code_postal').ilike('ville', `${qNormalized}%`).not('ville', 'is', null).limit(50)
  const { data: biensData } = await biensQuery
  if (biensData && biensData.length > 0) {
    const seenBiens = new Set<string>()
    // Marquer les communes deja trouvees dans ref_communes
    for (const c of (data || [])) seenBiens.add(`${c.code_postal}-${c.nom_commune}`)
    for (const b of biensData) {
      const key = `${b.code_postal || ''}-${b.ville}`
      if (!seenBiens.has(key) && b.ville && b.code_postal) {
        seenBiens.add(key)
        results.push({ type: 'commune', code_postal: b.code_postal, nom_commune: b.ville, label: `${b.ville} (${b.code_postal})` })
      }
    }
  }

  // Deduplique par code_postal + nom_commune
  const seen = new Set()
  const uniques = (data || []).filter(c => {
    const key = `${c.code_postal}-${c.nom_commune}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Regrouper par ville : si une ville a plusieurs CP, ajouter une entree "toute la ville" en tete
  const villeCount = new Map<string, number>()
  for (const c of uniques) {
    villeCount.set(c.nom_commune, (villeCount.get(c.nom_commune) || 0) + 1)
  }
  const villesAjoutees = new Set<string>()
  for (const c of uniques) {
    if ((villeCount.get(c.nom_commune) || 0) > 1 && !villesAjoutees.has(c.nom_commune)) {
      results.push({ type: 'commune', code_postal: 'tous', nom_commune: c.nom_commune, label: `${c.nom_commune} (toute la ville)` })
      villesAjoutees.add(c.nom_commune)
    }
    results.push({ type: 'commune', code_postal: c.code_postal, nom_commune: c.nom_commune, label: `${c.nom_commune} (${c.code_postal})` })
  }

  return NextResponse.json({ communes: results.slice(0, 50) })
}
