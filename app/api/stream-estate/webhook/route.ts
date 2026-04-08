import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ──────────────────────────────────────────────────────────────────────────────
// Mapping Stream Estate → table biens
// ──────────────────────────────────────────────────────────────────────────────

const SE_PROPERTY_TYPE_MAP: Record<number, string> = {
  0: 'Appartement',
  1: 'Maison',
  2: 'Immeuble',
  3: 'Parking',
  4: 'Bureau',
  5: 'Terrain',
  6: 'Local commercial',
}

// ──────────────────────────────────────────────────────────────────────────────
// Detection strategie depuis le contenu (meme logique que webhook MI)
// ──────────────────────────────────────────────────────────────────────────────

const STRATEGY_KEYWORDS: { strategie: string; patterns: RegExp[] }[] = [
  {
    strategie: 'Locataire en place',
    patterns: [/locataire\s+en\s+place/i, /vendu\s+lou[eé]/i, /bail\s+en\s+cours/i, /vendu\s+occup[eé]/i, /occup[eé]/i],
  },
  {
    strategie: 'Travaux lourds',
    patterns: [/[àa]\s+r[eé]nover/i, /gros\s+travaux/i, /r[eé]novation\s+(compl[eè]te|totale)/i, /inhabitable/i, /travaux\s+importants/i],
  },
  {
    strategie: 'Division',
    patterns: [/(appartement|maison|bien|propri[eé]t[eé])\s+.{0,15}divisible/i, /divisible\s+en\s+\d+/i, /possibilit[eé]\s+de\s+division/i, /division\s+possible/i, /potentiel\s+de\s+division/i],
  },
  {
    strategie: 'Immeuble de rapport',
    patterns: [/immeuble\s+de\s+rapport/i, /monopropri[eé]t[eé]/i, /vent(e|u)\s+en\s+bloc/i],
  },
]

function detectStrategie(text: string, propertyType?: number): string {
  for (const { strategie, patterns } of STRATEGY_KEYWORDS) {
    if (patterns.some(re => re.test(text))) return strategie
  }
  // Fallback : immeuble → IDR, sinon Travaux lourds
  if (propertyType === 2) return 'Immeuble de rapport'
  return 'Travaux lourds'
}

function mapPublisherType(type: number | undefined): string | null {
  if (type === 0) return 'particulier'
  if (type === 1) return 'professionnel'
  return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Extract property + advert from SE webhook payload
// Payload structure (doc SE) :
//   Match : { match: { propertyDocument: {...}, search: "/searches/xxx" } }
//   Event : { event: "ad.update.price", adEvent: {...}, match: { propertyDocument: {...} } }
// ──────────────────────────────────────────────────────────────────────────────

function extractPropertyAndAdvert(payload: any): { property: any; advert: any } | null {
  const propertyDoc = payload.match?.propertyDocument || payload.propertyDocument
  if (!propertyDoc) return null

  const adverts = propertyDoc.adverts || []
  const advert = adverts[0]
  if (!advert) return null

  return { property: propertyDoc, advert }
}

// ──────────────────────────────────────────────────────────────────────────────
// Build bien payload from SE property (colonnes IA JAMAIS incluses)
// ──────────────────────────────────────────────────────────────────────────────

function buildBienPayload(
  property: any,
  advert: any,
  strategie: string,
  metropoleMap: Map<string, string>,
) {
  const surface = property.surface || advert.surface || null
  const prix_fai = advert.price || null
  const code_postal = property.city?.zipcode || null

  const bien: Record<string, unknown> = {
    url: advert.url,
    strategie_mdb: strategie,
    statut: 'Toujours disponible',
    type_bien: SE_PROPERTY_TYPE_MAP[property.propertyType] || null,
    prix_fai,
    surface,
    prix_m2: prix_fai && surface ? Math.round((prix_fai / surface) * 100) / 100 : null,
    nb_pieces: property.room ? `T${property.room}` : (advert.room ? `T${advert.room}` : null),
    nb_chambres: property.bedroom || advert.bedroom || null,
    etage: advert.floor !== undefined && advert.floor !== null
      ? (advert.floor === 0 ? 'RDC' : String(advert.floor))
      : null,
    annee_construction: advert.constructionYear || property.constructionYear || null,
    dpe: advert.energy?.category || null,
    dpe_valeur: advert.energy?.value || null,
    ges: advert.greenHouseGas?.category || null,
    ville: property.city?.name || null,
    code_postal,
    metropole: code_postal ? (metropoleMap.get(code_postal) || null) : null,
    photo_url: advert.pictures?.[0] || property.pictures?.[0] || null,
    latitude: property.location?.lat ?? property.locations?.lat ?? null,
    longitude: property.location?.lon ?? property.locations?.lon ?? null,
    surface_terrain: advert.landSurface || property.landSurface || null,
    // Stream Estate specific
    stream_estate_id: property.uuid,
    source_provider: 'stream_estate',
    publisher_type: mapPublisherType(advert.publisher?.type),
    price_history: advert.events?.length ? advert.events : null,
    // Ascenseur
    ...(advert.elevator === true || property.elevator === true ? { ascenseur: true } : {}),
    ...(advert.elevator === false || property.elevator === false ? { ascenseur: false } : {}),
    // condominiumFees SE = annuel → diviser par 12 pour stocker mensuel
    ...(advert.condominiumFees ? { charges_copro: Math.round(advert.condominiumFees / 12) } : {}),
    // taxe fonciere (annuel, stocke annuel en base)
    ...(advert.propertyTax ? { taxe_fonc_ann: advert.propertyTax } : {}),
    // moteurimmo_data reutilise avec memes cles (compatible pipeline IA)
    moteurimmo_data: {
      uniqueId: property.uuid,
      origin: advert.publisher?.name || null,
      title: advert.title || property.title || null,
      description: advert.description || property.description || null,
      pictureUrls: advert.pictures || property.pictures || [],
      publisher: { name: advert.contact?.name || null },
      duplicates: (property.adverts || [])
        .filter((a: any) => a.url !== advert.url)
        .map((a: any) => ({ url: a.url, origin: a.publisher?.name || null })),
      category: SE_PROPERTY_TYPE_MAP[property.propertyType] || null,
      creationDate: advert.createdAt || null,
      source: 'stream_estate',
      priceHistory: advert.events || null,
      stations: property.stations || null,
      features: advert.features || null,
    },
  }

  return bien
}

// ──────────────────────────────────────────────────────────────────────────────
// Dedup : URL → stream_estate_id → duplicates MI → matching geo
// ──────────────────────────────────────────────────────────────────────────────

async function findExistingBien(
  url: string,
  property: any,
  advert: any,
): Promise<{ id: number; source_provider: string } | null> {
  // 1. Check par URL source directe
  const { data: byUrl } = await supabaseAdmin
    .from('biens')
    .select('id, source_provider')
    .eq('url', url)
    .limit(1)
    .single()
  if (byUrl) return byUrl

  // 2. Check par stream_estate_id (MAJ d'un bien deja rattache)
  if (property.uuid) {
    const { data: bySeid } = await supabaseAdmin
      .from('biens')
      .select('id, source_provider')
      .eq('stream_estate_id', property.uuid)
      .limit(1)
      .single()
    if (bySeid) return bySeid
  }

  // 3. Check dans les duplicates MI (l'URL SE est-elle connue comme doublon MI ?)
  const { data: byDup } = await supabaseAdmin
    .from('biens')
    .select('id, source_provider')
    .contains('moteurimmo_data', { duplicates: [{ url }] })
    .limit(1)
    .single()
  if (byDup) return byDup

  // 4. Matching geographique + prix (fallback)
  const code_postal = property.city?.zipcode
  const surface = property.surface || advert.surface
  const prix = advert.price
  const type_bien = SE_PROPERTY_TYPE_MAP[property.propertyType]
  const nb_pieces = property.room ? `T${property.room}` : null

  if (code_postal && surface && prix && type_bien && nb_pieces) {
    const { data: byGeo } = await supabaseAdmin
      .from('biens')
      .select('id, source_provider')
      .eq('code_postal', code_postal)
      .eq('type_bien', type_bien)
      .eq('nb_pieces', nb_pieces)
      .gte('surface', surface - 1)
      .lte('surface', surface + 1)
      .gte('prix_fai', prix * 0.98)
      .lte('prix_fai', prix * 1.02)
      .limit(1)
      .single()
    if (byGeo) return byGeo
  }

  return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Champs proteges : jamais ecrases par l'upsert SE
// ──────────────────────────────────────────────────────────────────────────────

const PROTECTED_FIELDS = new Set([
  'loyer', 'type_loyer', 'charges_rec', 'fin_bail', 'profil_locataire', 'rendement_brut',
  'score_travaux', 'score_commentaire',
  'nb_lots', 'monopropriete', 'compteurs_individuels', 'lots_data',
  'regex_statut', 'regex_date', 'extraction_statut', 'extraction_date',
  'score_analyse_statut', 'score_analyse_date',
  'estimation_prix_m2', 'estimation_prix_total', 'estimation_confiance',
  'estimation_nb_comparables', 'estimation_rayon_m', 'estimation_date', 'estimation_details',
  'photo_storage_path',
])

// charges_copro et taxe_fonc_ann : inclure seulement si NULL en base (pour biens MI existants)
const CONDITIONAL_FIELDS = new Set(['charges_copro', 'taxe_fonc_ann'])

function stripProtectedFields(
  bien: Record<string, unknown>,
  existingSource: string | null,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(bien)) {
    if (PROTECTED_FIELDS.has(key)) continue
    if (CONDITIONAL_FIELDS.has(key) && existingSource === 'moteurimmo') continue
    clean[key] = value
  }
  return clean
}

// ──────────────────────────────────────────────────────────────────────────────
// Load metropole map (cached en memoire pour la duree du lambda)
// ──────────────────────────────────────────────────────────────────────────────

let _metropoleMap: Map<string, string> | null = null

async function getMetropoleMap(): Promise<Map<string, string>> {
  if (_metropoleMap) return _metropoleMap
  const { data: communes } = await supabaseAdmin
    .from('ref_communes')
    .select('code_postal, metropole')
    .not('metropole', 'is', null)
  _metropoleMap = new Map<string, string>()
  if (communes) {
    for (const c of communes) {
      if (c.metropole) _metropoleMap.set(c.code_postal, c.metropole)
    }
  }
  return _metropoleMap
}

// ──────────────────────────────────────────────────────────────────────────────
// Event handlers
// ──────────────────────────────────────────────────────────────────────────────

async function handlePropertyAdCreate(payload: any) {
  const extracted = extractPropertyAndAdvert(payload)
  if (!extracted) return { action: 'skip', reason: 'no propertyDocument or adverts' }
  const { property, advert } = extracted

  if (!advert.url) return { action: 'skip', reason: 'no url' }

  const metropoleMap = await getMetropoleMap()
  const text = [advert.title || '', advert.description || ''].join(' ')
  const strategie = detectStrategie(text, property.propertyType)

  const bien = buildBienPayload(property, advert, strategie, metropoleMap)
  const existing = await findExistingBien(advert.url, property, advert)

  if (existing) {
    // UPDATE — rattacher + MAJ donnees (colonnes IA protegees)
    const updatePayload = stripProtectedFields(bien, existing.source_provider)

    // Pour les biens MI : charges_copro/taxe_fonc_ann seulement si NULL en base
    if (existing.source_provider === 'moteurimmo') {
      const { data: current } = await supabaseAdmin
        .from('biens')
        .select('charges_copro, taxe_fonc_ann')
        .eq('id', existing.id)
        .single() as { data: { charges_copro: number | null; taxe_fonc_ann: number | null } | null }
      if (current) {
        if (current.charges_copro == null && bien.charges_copro != null) {
          updatePayload.charges_copro = bien.charges_copro
        }
        if (current.taxe_fonc_ann == null && bien.taxe_fonc_ann != null) {
          updatePayload.taxe_fonc_ann = bien.taxe_fonc_ann
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('biens')
      .update(updatePayload)
      .eq('id', existing.id)

    if (error) {
      console.error(`[SE webhook] update error id=${existing.id}: ${error.message}`)
      return { action: 'error', error: error.message }
    }
    return { action: 'updated', id: existing.id, was: existing.source_provider }
  }

  // INSERT nouveau bien
  const { data: inserted, error } = await supabaseAdmin
    .from('biens')
    .insert(bien)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { action: 'duplicate', url: advert.url }
    }
    console.error(`[SE webhook] insert error: ${error.message}`)
    return { action: 'error', error: error.message }
  }

  return { action: 'inserted', id: inserted?.id }
}

async function handleAdUpdatePrice(payload: any) {
  const extracted = extractPropertyAndAdvert(payload)
  if (!extracted) return { action: 'skip', reason: 'no propertyDocument' }
  const { property, advert } = extracted

  const adEvent = payload.adEvent
  const newPrix = adEvent?.fieldNewValue ? Number(adEvent.fieldNewValue) : advert.price
  if (!newPrix) return { action: 'skip', reason: 'no price' }

  const uuid = property.uuid
  const url = advert.url
  const surface = property.surface || advert.surface

  // Match par stream_estate_id d'abord, puis par URL
  const targets = [
    uuid ? { column: 'stream_estate_id', value: uuid } : null,
    url ? { column: 'url', value: url } : null,
  ].filter(Boolean)

  for (const target of targets) {
    const { data } = await supabaseAdmin
      .from('biens')
      .select('id, prix_fai')
      .eq(target!.column, target!.value)
      .limit(1)
      .single()
    if (data) {
      const { error } = await supabaseAdmin
        .from('biens')
        .update({
          prix_fai: newPrix,
          prix_m2: newPrix && surface ? Math.round((newPrix / surface) * 100) / 100 : null,
          price_history: advert.events || null,
        })
        .eq('id', data.id)

      if (error) return { action: 'error', error: error.message }
      return { action: 'price_updated', id: data.id, old: data.prix_fai, new: newPrix }
    }
  }

  return { action: 'skip', reason: 'bien not found' }
}

async function handleAdUpdateExpired(payload: any) {
  const extracted = extractPropertyAndAdvert(payload)
  const uuid = extracted?.property?.uuid
  const url = extracted?.advert?.url

  const targets = [
    uuid ? { column: 'stream_estate_id', value: uuid } : null,
    url ? { column: 'url', value: url } : null,
  ].filter(Boolean)

  for (const target of targets) {
    const { data } = await supabaseAdmin
      .from('biens')
      .select('id')
      .eq(target!.column, target!.value)
      .limit(1)
      .single()
    if (data) {
      const { error } = await supabaseAdmin
        .from('biens')
        .update({ statut: 'Annonce expiree', derniere_verif_statut: new Date().toISOString() })
        .eq('id', data.id)

      if (error) return { action: 'error', error: error.message }
      return { action: 'expired', id: data.id }
    }
  }

  return { action: 'skip', reason: 'bien not found' }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/stream-estate/webhook
// Pas d'auth header (SE n'en envoie pas). Endpoint upsert-only, risque faible.
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const event = payload.event

    let result: any

    if (event) {
      // Event payload : { event, adEvent, match: { propertyDocument } }
      switch (event) {
        case 'ad.update.price':
          result = await handleAdUpdatePrice(payload)
          break
        case 'ad.update.expired':
          result = await handleAdUpdateExpired(payload)
          break
        case 'property.ad.create':
          result = await handlePropertyAdCreate(payload)
          break
        case 'property.ad.update':
          result = await handlePropertyAdCreate(payload) // traite comme create (upsert)
          break
        default:
          result = { action: 'ignored', event }
      }
    } else if (payload.match?.propertyDocument || payload.propertyDocument) {
      // Match payload (nouveau bien) : { match: { propertyDocument, search } }
      result = await handlePropertyAdCreate(payload)
    } else {
      result = { action: 'ignored', reason: 'unknown payload structure' }
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[SE webhook] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 },
    )
  }
}
