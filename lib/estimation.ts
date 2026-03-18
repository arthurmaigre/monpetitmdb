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
  // Champs NLP
  parking_type?: string
  has_piscine?: boolean
  exposition?: string
  vue?: string
  etat_interieur?: string
  jardin_etat?: string
  has_cave?: boolean
  standing_immeuble?: number
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
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?${qs}`)
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

async function fetchDVFForPeriod(
  center: GeoPoint, bbox: string, dvfType: string,
  surfaceMin: number, surfaceMax: number,
  anneeMin: number, anneeMax?: number | null
): Promise<DVFTransaction[]> {
  let url = `https://apidf-preprod.cerema.fr/dvf_opendata/geomutations/?in_bbox=${bbox}&nature_mutation=Vente&type_local=${dvfType}&anneemut_min=${anneeMin}&page_size=100`
  if (anneeMax) url += `&anneemut_max=${anneeMax}`

  const transactions: DVFTransaction[] = []
  let pages = 0

  while (url && pages < 5) {
    try {
      const res = await fetch(url)
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
        let txCenter: GeoPoint
        if (geom.type === 'Point') {
          txCenter = { lat: geom.coordinates[1], lng: geom.coordinates[0] }
        } else {
          txCenter = polygonCenter(geom.coordinates)
        }

        const dist = haversineDistance(center, txCenter)
        const tw = temporalWeight(p.datemut)
        const distWeight = Math.max(0.1, 1 - dist / 2000)

        transactions.push({
          prix, surface: s, prix_m2: Math.round(prixM2),
          date: p.datemut, type: p.libtypbien,
          distance_m: Math.round(dist), weight: tw * distWeight
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
  surface: number
): Promise<{ transactions: DVFTransaction[], rayon_m: number }> {
  const dvfType = mapTypeBienToDVF(typeBien)
  const surfaceMin = dvfType === 'Maison' ? surface * 0.6 : surface * 0.7
  const surfaceMax = dvfType === 'Maison' ? surface * 1.4 : surface * 1.3

  // Rayon adaptatif : 0.003 (~300m) -> 0.006 -> 0.009 -> 0.01 max
  const rayons = [0.003, 0.005, 0.007, 0.01]
  let allTransactions: DVFTransaction[] = []
  let rayonUtilise = 0

  for (const rayon of rayons) {
    const bbox = `${center.lng - rayon},${center.lat - rayon},${center.lng + rayon},${center.lat + rayon}`

    try {
      // Requete sur les deux periodes en parallele et fusion
      const [txPrincipale, txReference] = await Promise.all([
        fetchDVFForPeriod(center, bbox, dvfType, surfaceMin, surfaceMax, 2022),
        fetchDVFForPeriod(center, bbox, dvfType, surfaceMin, surfaceMax, 2018, 2020)
      ])

      // Appliquer un poids supplementaire de 0.7 aux transactions pre-COVID
      const txRefPonderees = txReference.map(tx => ({ ...tx, weight: tx.weight * 0.7 }))

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

export function calculateCorrections(bien: BienForEstimation): CorrectionDetail[] {
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

  // --- Score travaux (strategie travaux lourds) ---
  if (bien.score_travaux) {
    const travauxCorrections: Record<number, number> = {
      1: 1.00, 2: 0.95, 3: 0.85, 4: 0.75, 5: 0.60
    }
    const c = travauxCorrections[bien.score_travaux]
    if (c && c !== 1.0) {
      corrections.push({
        facteur: `Score travaux ${bien.score_travaux}/5`,
        multiplicateur: c,
        raison: bien.score_travaux >= 4 ? 'Travaux lourds \u00e0 pr\u00e9voir' : 'Travaux de r\u00e9novation \u00e0 pr\u00e9voir'
      })
    }
  }

  // --- Etat interieur (NLP) ---
  if (bien.etat_interieur && !bien.score_travaux) {
    const etatCorrections: Record<string, number> = {
      neuf: 1.05, refait_recemment: 1.03, bon_etat: 1.00, correct: 1.00,
      a_rafraichir: 0.93, a_renover: 0.82
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
    const parkingValues: Record<string, number> = {
      box_ferme: 18000, parking_ouvert: 10000, garage_attenant: 15000
    }
    const pVal = parkingValues[bien.parking_type]
    if (pVal) {
      // Convertir en multiplicateur approximatif base sur le prix total estime
      const prixEstime = bien.surface * 3500 // approximation pour le calcul du ratio
      const ratio = 1 + pVal / prixEstime
      corrections.push({
        facteur: `Parking (${bien.parking_type.replace(/_/g, ' ')})`,
        multiplicateur: Math.round(ratio * 100) / 100,
        raison: `Valorisation parking ~${pVal.toLocaleString('fr-FR')} \u20AC`
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

  // --- Cave ---
  if (bien.has_cave) {
    corrections.push({
      facteur: 'Cave',
      multiplicateur: 1.02,
      raison: 'Espace de rangement suppl\u00e9mentaire'
    })
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
  existingGeo?: GeoPoint | null
): Promise<EstimationResult | null> {
  // 1. Geocoding (reutilise les coordonnees existantes si disponibles)
  const geo = existingGeo || await geocodeAddress(bien.adresse, bien.ville, bien.code_postal)
  if (!geo) return null

  // 2. Recuperer les transactions DVF
  const { transactions, rayon_m } = await fetchDVFTransactions(geo, bien.type_bien, bien.surface)
  if (transactions.length === 0) return null

  // 3. Mediane ponderee du prix/m2
  const prixM2Brut = weightedMedian(
    transactions.map(t => ({ value: t.prix_m2, weight: t.weight }))
  )
  if (prixM2Brut <= 0) return null

  // 4. Correcteurs qualitatifs
  const corrections = calculateCorrections(bien)
  const multiplicateurTotal = corrections.reduce((acc, c) => acc * c.multiplicateur, 1.0)
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
