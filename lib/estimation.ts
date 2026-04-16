/**
 * Moteur d'estimation immobiliere base sur DVF (Demandes de Valeurs Foncieres)
 *
 * Architecture en 3 couches :
 * 1. Base statistique DVF (prix marche objectif)
 * 2. Correcteurs qualitatifs (donnees LBC)
 * 3. Niveau de confiance
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface GeoPoint { lat: number; lng: number }

export interface DVFTransaction {
  prix: number
  surface: number
  prix_m2: number
  date: string
  type: string
  distance_m: number
  weight: number
}

export interface CorrectionDetail {
  facteur: string
  multiplicateur: number
  raison: string
}

export interface EstimationResult {
  prix_m2_brut: number
  corrections: CorrectionDetail[]
  multiplicateur_total: number
  prix_m2_corrige: number
  prix_total: number
  confiance: 'A' | 'B' | 'C' | 'D'
  marge_pct: number
  prix_bas: number
  prix_haut: number
  nb_comparables: number
  rayon_m: number
  comparables_sample: DVFTransaction[]
  ecart_prix_fai_pct: number
  latitude: number
  longitude: number
}

interface BienForEstimation {
  surface: number
  prix_fai: number
  type_bien: string
  nb_pieces?: string
  etage?: string
  dpe?: string
  ascenseur?: boolean
  acces_exterieur?: string
  score_travaux?: number
  surface_terrain?: number
  adresse?: string
  ville: string
  code_postal?: string
  nb_sdb?: number
  nb_chambres?: number
  // Champs NLP
  parking_type?: string
  has_piscine?: boolean
  exposition?: string
  vue?: string
  etat_interieur?: string
  jardin_etat?: string
  has_cave?: boolean
  has_gardien?: boolean
  has_double_vitrage?: boolean
  has_cuisine_equipee?: boolean
  is_plain_pied?: boolean
  standing_immeuble?: number
  // Nouveaux champs NLP
  mitoyennete?: string
  has_grenier?: boolean
  assainissement?: string
}

// ═══════════════════════════════════════════════════════════════
// COUCHE 0 — GEOCODING (API BAN)
// ═══════════════════════════════════════════════════════════════

export async function geocodeAddress(
  adresse: string | undefined,
  ville: string,
  codePostal?: string
): Promise<GeoPoint | null> {
  const queries = []

  // Essai 1 : adresse complete
  if (adresse && adresse.length > 5) {
    const q = `${adresse} ${ville}`
    const params = new URLSearchParams({ q, limit: '1' })
    if (codePostal) params.set('postcode', codePostal)
    queries.push(params.toString())
  }

  // Essai 2 : ville + code postal
  const q2 = `${ville}`
  const params2 = new URLSearchParams({ q: q2, limit: '1' })
  if (codePostal) params2.set('postcode', codePostal)
  queries.push(params2.toString())

  for (const qs of queries) {
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?${qs}`, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue
      const data = await res.json()
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates
        return { lat, lng }
      }
    } catch {
      continue
    }
  }

  return null
}

// ═══════════════════════════════════════════════════════════════
// COUCHE 1 — DVF (prix marche objectif)
// ═══════════════════════════════════════════════════════════════

function haversineDistance(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371000
  const dLat = (p2.lat - p1.lat) * Math.PI / 180
  const dLng = (p2.lng - p1.lng) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function polygonCenter(coords: number[][][]): GeoPoint {
  let sumLat = 0, sumLng = 0, n = 0
  for (const ring of coords) {
    for (const [lng, lat] of ring) {
      sumLng += lng
      sumLat += lat
      n++
    }
  }
  return { lat: sumLat / n, lng: sumLng / n }
}

function temporalWeight(dateMutation: string): number {
  const now = Date.now()
  const mutDate = new Date(dateMutation).getTime()
  const monthsOld = (now - mutDate) / (30.44 * 24 * 3600 * 1000)
  return Math.exp(-0.04 * monthsOld)
}

function mapTypeBienToDVF(typeBien: string): string {
  const t = (typeBien || '').toLowerCase()
  if (t.includes('maison')) return 'Maison'
  return 'Appartement'
}

function parseNbPieces(nbPieces: string | undefined): number | null {
  if (!nbPieces) return null
  const match = nbPieces.match(/(\d+)/)
  return match ? parseInt(match[1]) : null
}

async function fetchDVFForPeriod(
  center: GeoPoint, bbox: string, dvfType: string,
  surfaceMin: number, surfaceMax: number,
  anneeMin: number, anneeMax?: number | null,
  nbPieces?: number | null
): Promise<DVFTransaction[]> {
  let url = `https://apidf.cerema.fr/dvf_opendata/geomutations/?in_bbox=${bbox}&nature_mutation=Vente&type_local=${dvfType}&anneemut_min=${anneeMin}&page_size=500`
  if (anneeMax) url += `&anneemut_max=${anneeMax}`
  // Filtre par nombre de pieces exact pour comparer des biens similaires
  if (nbPieces && nbPieces >= 1) {
    url += `&nbpiecespp_min=${nbPieces}&nbpiecespp_max=${nbPieces}`
  }

  const transactions: DVFTransaction[] = []
  let pages = 0

  while (url && pages < 2) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) break
      const data = await res.json()

      for (const feature of (data.features || [])) {
        const p = feature.properties
        const s = parseFloat(p.sbati)
        const prix = parseFloat(p.valeurfonc)

        if (!s || !prix || s <= 0 || prix <= 0) continue
        if (s < surfaceMin || s > surfaceMax) continue

        const prixM2 = prix / s
        if (prixM2 < 500 || prixM2 > 15000) continue

        const geom = feature.geometry
        if (!geom || !geom.coordinates) continue

        let txCenter: GeoPoint
        if (geom.type === 'Point') {
          txCenter = { lat: geom.coordinates[1], lng: geom.coordinates[0] }
        } else {
          txCenter = polygonCenter(geom.coordinates)
        }

        const dist = haversineDistance(center, txCenter)
        if (!isFinite(dist)) continue

        const tw = temporalWeight(p.datemut)
        const distWeight = Math.max(0.1, 1 - dist / 2000)
        const weight = tw * distWeight
        if (!isFinite(weight) || weight <= 0) continue

        transactions.push({
          prix, surface: s, prix_m2: Math.round(prixM2),
          date: p.datemut, type: p.libtypbien,
          distance_m: Math.round(dist), weight
        })
      }

      url = data.next || null
      pages++
    } catch { break }
  }

  return transactions
}

export async function fetchDVFTransactions(
  center: GeoPoint,
  typeBien: string,
  surface: number,
  nbPiecesStr?: string
): Promise<{ transactions: DVFTransaction[], rayon_m: number }> {
  const dvfType = mapTypeBienToDVF(typeBien)
  const surfaceMin = dvfType === 'Maison' ? surface * 0.6 : surface * 0.7
  const surfaceMax = dvfType === 'Maison' ? surface * 1.4 : surface * 1.3
  const nbPieces = parseNbPieces(nbPiecesStr)

  // Rayon adaptatif : ~50m en ville suffit, s'elargit si pas assez de comparables
  const rayons = [0.0005, 0.001, 0.002, 0.003, 0.005, 0.007, 0.01]
  let allTransactions: DVFTransaction[] = []
  let rayonUtilise = 0

  for (const rayon of rayons) {
    const bbox = `${center.lng - rayon},${center.lat - rayon},${center.lng + rayon},${center.lat + rayon}`

    try {
      // Requete sur les deux periodes en parallele avec filtre nb pieces
      const [txPrincipale, txReference] = await Promise.all([
        fetchDVFForPeriod(center, bbox, dvfType, surfaceMin, surfaceMax, new Date().getFullYear() - 3, null, nbPieces),
        fetchDVFForPeriod(center, bbox, dvfType, surfaceMin, surfaceMax, 2018, 2020, nbPieces)
      ])

      // Meme poids que la periode principale (marche post-COVID surgonfle)
      const txRefPonderees = txReference.map(tx => ({ ...tx, weight: tx.weight * 1.0 }))

      const transactions = [...txPrincipale, ...txRefPonderees]

      if (transactions.length > allTransactions.length) {
        allTransactions = transactions
        rayonUtilise = Math.round(rayon * 111000) // degres -> metres approx
      }

      if (allTransactions.length >= 10) break
    } catch {
      continue
    }
  }

  // Fallback sans filtre nb pieces si pas assez de comparables
  if (allTransactions.length < 5 && nbPieces) {
    for (const rayon of rayons) {
      const bbox = `${center.lng - rayon},${center.lat - rayon},${center.lng + rayon},${center.lat + rayon}`
      try {
        const [txP, txR] = await Promise.all([
          fetchDVFForPeriod(center, bbox, dvfType, surfaceMin, surfaceMax, new Date().getFullYear() - 3),
          fetchDVFForPeriod(center, bbox, dvfType, surfaceMin, surfaceMax, 2018, 2020)
        ])
        const txRefP = txR.map(tx => ({ ...tx, weight: tx.weight * 1.0 }))
        const transactions = [...txP, ...txRefP]
        if (transactions.length > allTransactions.length) {
          allTransactions = transactions
          rayonUtilise = Math.round(rayon * 111000)
        }
        if (allTransactions.length >= 10) break
      } catch { continue }
    }
  }

  // Trier par distance
  allTransactions.sort((a, b) => a.distance_m - b.distance_m)

  return { transactions: allTransactions, rayon_m: rayonUtilise }
}

function weightedMedian(values: { value: number, weight: number }[]): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0].value

  const sorted = [...values].sort((a, b) => a.value - b.value)
  const totalWeight = sorted.reduce((sum, v) => sum + v.weight, 0)
  let cumWeight = 0

  for (const item of sorted) {
    cumWeight += item.weight
    if (cumWeight >= totalWeight / 2) {
      return item.value
    }
  }

  return sorted[sorted.length - 1].value
}

// ═══════════════════════════════════════════════════════════════
// COUCHE 2 — CORRECTEURS QUALITATIFS
// ═══════════════════════════════════════════════════════════════

function parseEtage(etage: string | undefined): number | null {
  if (!etage) return null
  const e = etage.toLowerCase().trim()
  if (e === 'rdc' || e === 'rez-de-chaussee' || e === '0') return 0
  if (e.includes('dernier')) return 99
  const match = e.match(/(\d+)/)
  return match ? parseInt(match[1]) : null
}

export function calculateCorrections(bien: BienForEstimation, prixParkingLocal?: { box: number, parking: number } | null): CorrectionDetail[] {
  const corrections: CorrectionDetail[] = []
  const isMaison = (bien.type_bien || '').toLowerCase().includes('maison')

  // --- Etage + ascenseur (appartements uniquement) ---
  if (!isMaison && bien.etage !== undefined) {
    const etage = parseEtage(bien.etage)
    if (etage !== null) {
      let c = 1.0
      if (bien.ascenseur) {
        // Avec ascenseur
        if (etage === 0) { c = 0.88; }
        else if (etage === 1) { c = 0.97; }
        else if (etage <= 3) { c = 1.00; }
        else if (etage <= 5) { c = 1.03; }
        else if (etage >= 6 || etage === 99) { c = 1.06; }
      } else {
        // Sans ascenseur
        if (etage === 0) { c = 0.88; }
        else if (etage === 1) { c = 1.00; }
        else if (etage === 2) { c = 0.98; }
        else if (etage === 3) { c = 0.95; }
        else if (etage === 4) { c = 0.91; }
        else if (etage >= 5) { c = 0.86; }
      }

      if (c !== 1.0) {
        const label = bien.ascenseur ? 'avec ascenseur' : 'sans ascenseur'
        corrections.push({
          facteur: `\u00c9tage ${bien.etage} (${label})`,
          multiplicateur: c,
          raison: etage === 0 ? 'RDC moins valoris\u00e9' :
            (etage >= 4 && !bien.ascenseur) ? 'Etage \u00e9lev\u00e9 sans ascenseur' :
            (etage >= 4 && bien.ascenseur) ? 'Etage \u00e9lev\u00e9 avec ascenseur, prime vue/calme' : ''
        })
      }
    }
  }

  // --- DPE ---
  if (bien.dpe) {
    const dpeCorrections: Record<string, number> = {
      A: 1.08, B: 1.06, C: 1.03, D: 1.00, E: 0.95, F: 0.88, G: 0.80
    }
    const c = dpeCorrections[bien.dpe.toUpperCase()]
    if (c && c !== 1.0) {
      corrections.push({
        facteur: `DPE ${bien.dpe}`,
        multiplicateur: c,
        raison: c > 1 ? 'Bonne performance \u00e9nerg\u00e9tique' : 'Performance \u00e9nerg\u00e9tique d\u00e9grad\u00e9e (obligations DPE 2025+)'
      })
    }
  }

  // --- Acces exterieur ---
  if (bien.acces_exterieur) {
    const ext = bien.acces_exterieur.toLowerCase()
    if (ext.includes('terrasse')) {
      corrections.push({ facteur: 'Terrasse', multiplicateur: 1.06, raison: 'Espace ext\u00e9rieur valorisant' })
    } else if (ext.includes('balcon')) {
      corrections.push({ facteur: 'Balcon', multiplicateur: 1.03, raison: 'Acc\u00e8s ext\u00e9rieur' })
    } else if (ext.includes('jardin') && !isMaison) {
      corrections.push({ facteur: 'Jardin', multiplicateur: 1.04, raison: 'Jardin privatif en appartement' })
    }
  }

  // Score travaux et etat interieur ne sont PAS des correcteurs d'estimation.
  // L'estimation DVF donne le prix marche "en bon etat" = prix de revente apres travaux.
  // La decote travaux est geree separement dans le scenario achat-revente.

  // --- Etat interieur (NLP) — uniquement pour les biens sans travaux ---
  if (bien.etat_interieur && !bien.score_travaux) {
    const etatCorrections: Record<string, number> = {
      neuf: 1.05, refait_recemment: 1.03, bon_etat: 1.00, correct: 1.00,
      a_rafraichir: 1.00, a_renover: 1.00
    }
    const c = etatCorrections[bien.etat_interieur]
    if (c && c !== 1.0) {
      corrections.push({
        facteur: `\u00c9tat : ${bien.etat_interieur.replace(/_/g, ' ')}`,
        multiplicateur: c,
        raison: c > 1 ? 'Bien en tr\u00e8s bon \u00e9tat' : 'Travaux \u00e0 pr\u00e9voir'
      })
    }
  }

  // --- Parking (NLP) — valeur absolue convertie en multiplicateur ---
  if (bien.parking_type && bien.surface) {
    const defaultValues: Record<string, number> = {
      box_ferme: 18000, parking_ouvert: 10000, garage_attenant: 15000
    }
    let pVal: number
    if (prixParkingLocal) {
      pVal = bien.parking_type === 'parking_ouvert' ? prixParkingLocal.parking : prixParkingLocal.box
    } else {
      pVal = defaultValues[bien.parking_type] || 0
    }
    if (pVal) {
      const prixEstime = bien.surface * 3500
      const ratio = 1 + pVal / prixEstime
      const source = prixParkingLocal ? 'DVF local' : 'estimation'
      corrections.push({
        facteur: `Parking (${bien.parking_type.replace(/_/g, ' ')})`,
        multiplicateur: Math.round(ratio * 100) / 100,
        raison: `Valorisation parking ~${pVal.toLocaleString('fr-FR')} \u20AC (${source})`
      })
    }
  }

  // --- Piscine (NLP) ---
  if (bien.has_piscine) {
    const prixEstime = bien.surface * 3500
    const ratio = 1 + 20000 / prixEstime
    corrections.push({
      facteur: 'Piscine',
      multiplicateur: Math.round(ratio * 100) / 100,
      raison: 'Valorisation piscine ~20 000 \u20AC'
    })
  }

  // --- Vue (NLP) ---
  if (bien.vue) {
    const vueCorrections: Record<string, number> = {
      degagee: 1.04, mer: 1.10, parc: 1.03, montagne: 1.05, vis_a_vis: 0.97
    }
    const c = vueCorrections[bien.vue]
    if (c && c !== 1.0) {
      corrections.push({
        facteur: `Vue ${bien.vue.replace(/_/g, ' ')}`,
        multiplicateur: c,
        raison: c > 1 ? 'Vue valorisante' : 'Vis-\u00e0-vis'
      })
    }
  }

  // --- Exposition (NLP) ---
  if (bien.exposition) {
    const expCorrections: Record<string, number> = {
      sud: 1.03, 'sud-ouest': 1.02, 'sud-est': 1.02, est: 1.00, ouest: 1.00, nord: 0.97
    }
    const c = expCorrections[bien.exposition]
    if (c && c !== 1.0) {
      corrections.push({
        facteur: `Exposition ${bien.exposition}`,
        multiplicateur: c,
        raison: c > 1 ? 'Exposition valorisante' : 'Exposition nord'
      })
    }
  }

  // --- Jardin etat (NLP, maisons) ---
  if (bien.jardin_etat && isMaison) {
    const jardinCorrections: Record<string, number> = {
      soigne: 1.03, standard: 1.00, a_amenager: 0.97, friche: 0.93
    }
    const c = jardinCorrections[bien.jardin_etat]
    if (c && c !== 1.0) {
      corrections.push({
        facteur: `Jardin ${bien.jardin_etat.replace(/_/g, ' ')}`,
        multiplicateur: c,
        raison: c > 1 ? 'Jardin bien entretenu' : 'Jardin n\u00e9cessitant des travaux'
      })
    }
  }

  // --- Standing immeuble (Vision) ---
  if (bien.standing_immeuble && !isMaison) {
    const standingCorrections: Record<number, number> = {
      1: 0.90, 2: 0.95, 3: 1.00, 4: 1.05, 5: 1.10
    }
    const c = standingCorrections[bien.standing_immeuble]
    if (c && c !== 1.0) {
      corrections.push({
        facteur: `Standing ${bien.standing_immeuble}/5`,
        multiplicateur: c,
        raison: c > 1 ? 'Immeuble haut standing' : 'Immeuble bas standing'
      })
    }
  }

  // --- Cave / Sous-sol ---
  if (bien.has_cave) {
    corrections.push({
      facteur: isMaison ? 'Sous-sol / Cave' : 'Cave',
      multiplicateur: isMaison ? 1.03 : 1.02,
      raison: 'Espace de rangement suppl\u00e9mentaire'
    })
  }

  // --- Gardien / Concierge (appartements) ---
  if (bien.has_gardien && !isMaison) {
    corrections.push({
      facteur: 'Gardien',
      multiplicateur: 1.02,
      raison: 'Service de gardiennage / conciergerie'
    })
  }

  // --- Double vitrage ---
  if (bien.has_double_vitrage) {
    corrections.push({
      facteur: 'Double vitrage',
      multiplicateur: 1.02,
      raison: 'Isolation phonique et thermique'
    })
  }

  // --- Cuisine equipee ---
  if (bien.has_cuisine_equipee) {
    corrections.push({
      facteur: 'Cuisine \u00e9quip\u00e9e',
      multiplicateur: 1.015,
      raison: '\u00c9conomie de travaux pour l\'acheteur'
    })
  }

  // --- Nombre de salles de bain ---
  if (bien.nb_sdb && bien.nb_sdb >= 2) {
    const c = bien.nb_sdb >= 3 ? 1.06 : 1.04
    corrections.push({
      facteur: `${bien.nb_sdb} salles de bain`,
      multiplicateur: c,
      raison: 'Confort suppl\u00e9mentaire, bien familial'
    })
  }

  // --- Plain-pied (maisons) ---
  if (bien.is_plain_pied && isMaison) {
    corrections.push({
      facteur: 'Plain-pied',
      multiplicateur: 1.04,
      raison: 'Accessibilit\u00e9, recherch\u00e9 par seniors et familles'
    })
  }

  // --- Mitoyennete (maisons) ---
  if (bien.mitoyennete && isMaison) {
    const mitCorrections: Record<string, number> = {
      individuelle: 1.05, semi_mitoyen: 0.98, mitoyen: 0.93
    }
    const c = mitCorrections[bien.mitoyennete]
    if (c && c !== 1.0) {
      corrections.push({
        facteur: bien.mitoyennete === 'individuelle' ? 'Maison individuelle' :
                 bien.mitoyennete === 'semi_mitoyen' ? 'Semi-mitoyenne' : 'Mitoyenne',
        multiplicateur: c,
        raison: c > 1 ? 'Pas de mur partag\u00e9, intimit\u00e9' : 'Murs partag\u00e9s, nuisances potentielles'
      })
    }
  }

  // --- Grenier amenageable ---
  if (bien.has_grenier) {
    corrections.push({
      facteur: 'Grenier / Combles am\u00e9nageables',
      multiplicateur: isMaison ? 1.04 : 1.03,
      raison: 'Potentiel d\'extension de surface habitable'
    })
  }

  // --- Assainissement (maisons) ---
  if (bien.assainissement && isMaison) {
    if (bien.assainissement === 'individuel') {
      corrections.push({
        facteur: 'Assainissement individuel',
        multiplicateur: 0.96,
        raison: 'Co\u00fbt d\'entretien et mise aux normes potentielle'
      })
    }
  }

  return corrections
}

// ═══════════════════════════════════════════════════════════════
// COUCHE 3 — NIVEAU DE CONFIANCE
// ═══════════════════════════════════════════════════════════════

export function calculateConfidence(
  nbComparables: number,
  rayonM: number,
  hasExactAddress: boolean,
  bien: BienForEstimation
): { level: 'A' | 'B' | 'C' | 'D', marge_pct: number } {
  // Compter les variables qualitatives disponibles
  let qualVars = 0
  if (bien.dpe) qualVars++
  if (bien.etage) qualVars++
  if (bien.nb_pieces) qualVars++
  if (bien.ascenseur !== undefined) qualVars++
  if (bien.acces_exterieur) qualVars++
  if (bien.score_travaux) qualVars++
  if (bien.parking_type) qualVars++
  if (bien.vue) qualVars++
  if (bien.exposition) qualVars++
  if (bien.etat_interieur) qualVars++
  if (bien.standing_immeuble) qualVars++
  if (bien.has_cave) qualVars++
  if (bien.has_gardien) qualVars++
  if (bien.has_double_vitrage) qualVars++
  if (bien.nb_sdb) qualVars++
  if (bien.mitoyennete) qualVars++
  if (bien.is_plain_pied) qualVars++

  if (hasExactAddress && nbComparables >= 15 && rayonM <= 500 && qualVars >= 4) {
    return { level: 'A', marge_pct: 5 }
  }
  if (nbComparables >= 8 && qualVars >= 2) {
    return { level: 'B', marge_pct: 10 }
  }
  if (nbComparables >= 5) {
    return { level: 'C', marge_pct: 20 }
  }
  return { level: 'D', marge_pct: 30 }
}

// ═══════════════════════════════════════════════════════════════
// ORCHESTRATEUR PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export async function estimerBien(
  bien: BienForEstimation,
  existingGeo?: GeoPoint | null,
  prixParkingLocal?: { box: number, parking: number } | null
): Promise<EstimationResult | null> {
  // 1. Geocoding (reutilise les coordonnees existantes si disponibles)
  const geo = existingGeo || await geocodeAddress(bien.adresse, bien.ville, bien.code_postal)
  if (!geo) return null

  // 2. Recuperer les transactions DVF (filtre par nb pieces si disponible)
  const { transactions, rayon_m } = await fetchDVFTransactions(geo, bien.type_bien, bien.surface, bien.nb_pieces)
  if (transactions.length === 0) return null

  // 3. Mediane ponderee du prix/m2
  const prixM2Brut = weightedMedian(
    transactions.map(t => ({ value: t.prix_m2, weight: t.weight }))
  )
  if (prixM2Brut <= 0) return null

  // 4. Correcteurs qualitatifs
  const corrections = calculateCorrections(bien, prixParkingLocal)
  const multiplicateurTotalRaw = corrections.reduce((acc, c) => acc * c.multiplicateur, 1.0)
  const multiplicateurTotal = Math.min(1.30, Math.max(0.75, multiplicateurTotalRaw))
  const prixM2Corrige = Math.round(prixM2Brut * multiplicateurTotal)
  const prixTotal = Math.round(prixM2Corrige * bien.surface)

  // 5. Confiance
  const hasExactAddress = !!(bien.adresse && bien.adresse.length > 10)
  const { level: confiance, marge_pct } = calculateConfidence(
    transactions.length, rayon_m, hasExactAddress, bien
  )

  const prixBas = Math.round(prixTotal * (1 - marge_pct / 100))
  const prixHaut = Math.round(prixTotal * (1 + marge_pct / 100))
  const ecartPrixFai = bien.prix_fai ? ((bien.prix_fai - prixTotal) / prixTotal * 100) : 0

  return {
    prix_m2_brut: prixM2Brut,
    corrections,
    multiplicateur_total: Math.round(multiplicateurTotal * 1000) / 1000,
    prix_m2_corrige: prixM2Corrige,
    prix_total: prixTotal,
    confiance,
    marge_pct,
    prix_bas: prixBas,
    prix_haut: prixHaut,
    nb_comparables: transactions.length,
    rayon_m,
    comparables_sample: transactions.slice(0, 5),
    ecart_prix_fai_pct: Math.round(ecartPrixFai * 10) / 10,
    latitude: geo.lat,
    longitude: geo.lng
  }
}
