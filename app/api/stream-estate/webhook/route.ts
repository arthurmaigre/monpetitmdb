import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

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
// Keywords SE par stratégie (sans accents, identiques aux saved searches)
// Mis à jour si on modifie les expressions dans Stream Estate
// ──────────────────────────────────────────────────────────────────────────────

const SE_KEYWORDS: Record<string, string[]> = {
  'Locataire en place': [
    'locataire en place', 'vendu loue', 'bail en cours', 'loyer actuel', 'location en cours',
  ],
  'Travaux lourds': [
    'entierement a renover', 'a renover entierement', 'a renover integralement',
    'a rehabiliter', 'inhabitable', 'tout a refaire', 'toiture a refaire',
    'a restaurer', 'a rafraichir', 'a remettre aux normes', 'a remettre en etat',
    'plateau a amenager', 'bien a renover', 'maison a renover',
    'appartement a renover', 'immeuble a renover',
  ],
  'Division': [
    'division possible', 'potentiel de division', 'bien divisible',
    'maison divisible', 'appartement divisible', 'a diviser',
  ],
  'Immeuble de rapport': [
    'immeuble de rapport', 'copropriete a creer', 'vente en bloc',
    'vendu en bloc', 'immeuble locatif', 'immeuble entierement loue',
  ],
}

// ──────────────────────────────────────────────────────────────────────────────
// Prompts Haiku par stratégie — validation sémantique binaire
// ──────────────────────────────────────────────────────────────────────────────

const HAIKU_PROMPTS: Record<string, string> = {
  'Locataire en place': "Ce bien immobilier est-il vendu avec un locataire en place (bail d'habitation en cours, loyer actuel mentionné, occupé par un locataire) ? Réponds uniquement OUI ou NON.",
  'Travaux lourds': "Ce bien immobilier nécessite-t-il des travaux lourds (rénovation complète, gros œuvre, inhabitable, tout à refaire) — et non de simples travaux cosmétiques ou de finition ? Réponds uniquement OUI ou NON.",
  'Division': "Ce bien immobilier a-t-il un vrai potentiel de division en plusieurs logements indépendants (surface suffisante, accès séparés possibles, mention explicite de division) ? Réponds uniquement OUI ou NON.",
  'Immeuble de rapport': "Ce bien immobilier est-il un immeuble de rapport vendu en bloc (immeuble entier avec plusieurs lots locatifs, monopropriété) ? Réponds uniquement OUI ou NON.",
}

// ──────────────────────────────────────────────────────────────────────────────
// detectMatchedKeywords — texte complet sans troncature
// ──────────────────────────────────────────────────────────────────────────────

function detectMatchedKeywords(title: string, description: string, strategie: string): string[] {
  const normalized = (title + ' ' + description)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (SE_KEYWORDS[strategie] || []).filter(kw => normalized.includes(kw))
}

// ──────────────────────────────────────────────────────────────────────────────
// validateWithHaiku — validation sémantique, fail open sur erreur
// ──────────────────────────────────────────────────────────────────────────────

async function validateWithHaiku(title: string, description: string, strategie: string): Promise<boolean> {
  const prompt = HAIKU_PROMPTS[strategie]
  if (!prompt) return true // stratégie inconnue → fail open

  try {
    const text = `Titre : ${title}\n\nDescription : ${description}`
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [
        { role: 'user', content: `${prompt}\n\n${text}` },
      ],
    })
    const answer = (response.content[0] as { type: string; text: string }).text.trim().toUpperCase()
    return answer.startsWith('OUI')
  } catch (err) {
    console.error('[SE webhook] Haiku validation error:', err)
    return true // fail open
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Lookup strategie depuis table stream_estate_searches (cache en memoire)
// ──────────────────────────────────────────────────────────────────────────────

let _searchMap: Map<string, string> | null = null
let _searchMapTs = 0

async function getStrategieFromSearch(searchIri: string | undefined): Promise<string | null> {
  if (!searchIri) return null
  if (!_searchMap || Date.now() - _searchMapTs > 5 * 60 * 1000) {
    const { data } = await supabaseAdmin
      .from('stream_estate_searches')
      .select('search_iri, strategie_mdb')
    _searchMap = new Map()
    if (data) {
      for (const row of data) _searchMap.set(row.search_iri, row.strategie_mdb)
    }
    _searchMapTs = Date.now()
  }
  return _searchMap.get(searchIri) || null
}

// ──────────────────────────────────────────────────────────────────────────────
// Detection strategie depuis le contenu (fallback si pas de search IRI)
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

function detectStrategieFromContent(text: string, propertyType?: number): string {
  for (const { strategie, patterns } of STRATEGY_KEYWORDS) {
    if (patterns.some(re => re.test(text))) return strategie
  }
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
// Build bien payload
// ──────────────────────────────────────────────────────────────────────────────

function buildBienPayload(
  property: any,
  advert: any,
  strategie: string,
  metropoleMap: Map<string, string>,
  sourceKeywords: string[],
  isValid: boolean,
) {
  const surface = property.surface || advert.surface || null
  const prix_fai = advert.price || null
  const code_postal = property.city?.zipcode || null

  const bien: Record<string, unknown> = {
    url: advert.url,
    strategie_mdb: strategie,
    statut: isValid ? 'Toujours disponible' : 'Faux positif',
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
    stream_estate_id: property.uuid,
    source_provider: 'stream_estate',
    publisher_type: mapPublisherType(advert.publisher?.type),
    price_history: advert.events?.length ? advert.events : null,
    // Validation Haiku inline
    regex_statut: isValid ? 'valide' : 'faux_positif',
    // Tracking keywords SE pour stats FP
    source_keywords: sourceKeywords.length > 0 ? sourceKeywords : null,
    ...(advert.elevator === true || property.elevator === true ? { ascenseur: true } : {}),
    ...(advert.elevator === false || property.elevator === false ? { ascenseur: false } : {}),
    ...(advert.condominiumFees ? { charges_copro: Math.round(advert.condominiumFees / 12) } : {}),
    ...(advert.propertyTax ? { taxe_fonc_ann: advert.propertyTax } : {}),
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
// Dedup : URL → stream_estate_id → biens_source_urls → geo
// ──────────────────────────────────────────────────────────────────────────────

async function findExistingBien(
  url: string,
  property: any,
  advert: any,
): Promise<{ id: number; source_provider: string } | null> {
  const { data: byUrl } = await supabaseAdmin
    .from('biens')
    .select('id, source_provider')
    .eq('url', url)
    .limit(1)
    .single()
  if (byUrl) return byUrl

  if (property.uuid) {
    const { data: bySeid } = await supabaseAdmin
      .from('biens')
      .select('id, source_provider')
      .eq('stream_estate_id', property.uuid)
      .limit(1)
      .single()
    if (bySeid) return bySeid
  }

  const { data: bySourceUrl } = await supabaseAdmin
    .from('biens_source_urls')
    .select('bien_id')
    .eq('url', url)
    .limit(1)
    .single()
  if (bySourceUrl) {
    const { data: bienFromUrl } = await supabaseAdmin
      .from('biens')
      .select('id, source_provider')
      .eq('id', bySourceUrl.bien_id)
      .single()
    if (bienFromUrl) return bienFromUrl
  }

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
// Champs protégés (jamais écrasés par upsert SE)
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
// Metropole map (cache memoire)
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
// handlePropertyAdCreate
// ──────────────────────────────────────────────────────────────────────────────

async function handlePropertyAdCreate(payload: any) {
  const extracted = extractPropertyAndAdvert(payload)
  if (!extracted) return { action: 'skip', reason: 'no propertyDocument or adverts' }
  const { property, advert } = extracted

  if (!advert.url) return { action: 'skip', reason: 'no url' }

  const metropoleMap = await getMetropoleMap()

  const searchIri = payload.match?.search || null
  const strategieFromSearch = await getStrategieFromSearch(searchIri)
  const title = advert.title || property.title || ''
  const description = advert.description || property.description || ''
  const text = title + ' ' + description
  const strategie = strategieFromSearch || detectStrategieFromContent(text, property.propertyType)

  // Vérifier d'abord si le bien existe (évite Haiku inutile pour les ad.update)
  const existing = await findExistingBien(advert.url, property, advert)

  if (existing) {
    // Bien déjà en DB : mise à jour sans Haiku (regex_statut est protégé)
    const sourceKeywords = detectMatchedKeywords(title, description, strategie)
    const bien = buildBienPayload(property, advert, strategie, metropoleMap, sourceKeywords, true)
    const updatePayload = stripProtectedFields(bien, existing.source_provider)

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

  // Nouveau bien : validation Haiku + INSERT
  const sourceKeywords = detectMatchedKeywords(title, description, strategie)
  const isValid = await validateWithHaiku(title, description, strategie)
  console.log(`[SE webhook] Haiku: ${strategie} → ${isValid ? 'valide' : 'faux_positif'} (keywords: ${sourceKeywords.join(', ')})`)

  const bien = buildBienPayload(property, advert, strategie, metropoleMap, sourceKeywords, isValid)

  const { data: inserted, error } = await supabaseAdmin
    .from('biens')
    .insert(bien)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { action: 'duplicate', url: advert.url }
    console.error(`[SE webhook] insert error: ${error.message}`)
    return { action: 'error', error: error.message }
  }

  if (inserted?.id) {
    const urlsToInsert: { bien_id: number; url: string }[] = []
    if (advert.url) urlsToInsert.push({ bien_id: inserted.id, url: advert.url })
    const otherAdverts = (property.adverts || []).filter((a: any) => a.url && a.url !== advert.url)
    for (const a of otherAdverts) {
      urlsToInsert.push({ bien_id: inserted.id, url: a.url })
    }
    if (urlsToInsert.length > 0) {
      await supabaseAdmin
        .from('biens_source_urls')
        .upsert(urlsToInsert, { onConflict: 'url', ignoreDuplicates: true })
    }
  }

  return { action: 'inserted', id: inserted?.id, haiku: isValid ? 'valide' : 'faux_positif' }
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
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const event = payload.event

    let result: any

    if (event) {
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
          result = { action: 'ignored', event }
          break
        default:
          result = { action: 'ignored', event }
      }
    } else if (payload.match?.propertyDocument || payload.propertyDocument) {
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
