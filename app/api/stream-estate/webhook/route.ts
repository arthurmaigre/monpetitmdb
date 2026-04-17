import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  SE_PROPERTY_TYPE_MAP,
  SE_KEYWORDS,
  detectMatchedKeywords,
  validateWithHaiku,
  buildBienPayload,
  findExistingBien,
  getMetropoleMap,
  insertBienWithUrls,
} from '@/lib/stream-estate-ingest'

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

const STRATEGY_PATTERNS: { strategie: string; patterns: RegExp[] }[] = [
  {
    strategie: 'Locataire en place',
    patterns: [/locataire\s+en\s+place/i, /vendu\s+lou[eé]/i, /bail\s+en\s+cours/i, /vendu\s+occup[eé]/i],
  },
  {
    strategie: 'Travaux lourds',
    patterns: [/[àa]\s+r[eé]nover/i, /gros\s+travaux/i, /r[eé]novation\s+(compl[eè]te|totale)/i, /inhabitable/i],
  },
  {
    strategie: 'Division',
    patterns: [/(appartement|maison|bien)\s+.{0,15}divisible/i, /division\s+possible/i, /potentiel\s+de\s+division/i],
  },
  {
    strategie: 'Immeuble de rapport',
    patterns: [/immeuble\s+de\s+rapport/i, /monopropri[eé]t[eé]/i, /vent(e|u)\s+en\s+bloc/i],
  },
]

function detectStrategieFromContent(text: string, propertyType?: number): string {
  for (const { strategie, patterns } of STRATEGY_PATTERNS) {
    if (patterns.some(re => re.test(text))) return strategie
  }
  if (propertyType === 2) return 'Immeuble de rapport'
  return 'Travaux lourds'
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
// Extract property + advert from SE webhook payload
// ──────────────────────────────────────────────────────────────────────────────

function extractPropertyAndAdvert(payload: any): { property: any; advert: any } | null {
  const propertyDoc = payload.match?.propertyDocument || payload.propertyDocument
  if (!propertyDoc) return null
  const advert = (propertyDoc.adverts || [])[0]
  if (!advert) return null
  return { property: propertyDoc, advert }
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
  const strategie = strategieFromSearch || detectStrategieFromContent(title + ' ' + description, property.propertyType)

  // Dedup avant Haiku
  const existing = await findExistingBien(advert.url, property, advert)

  if (existing) {
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
        if (current.charges_copro == null && bien.charges_copro != null) updatePayload.charges_copro = bien.charges_copro
        if (current.taxe_fonc_ann == null && bien.taxe_fonc_ann != null) updatePayload.taxe_fonc_ann = bien.taxe_fonc_ann
      }
    }

    const { error } = await supabaseAdmin.from('biens').update(updatePayload).eq('id', existing.id)
    if (error) return { action: 'error', error: error.message }
    return { action: 'updated', id: existing.id, was: existing.source_provider }
  }

  // Nouveau bien : Haiku + INSERT
  const sourceKeywords = detectMatchedKeywords(title, description, strategie)
  const isValid = await validateWithHaiku(title, description, strategie)
  console.log(`[SE webhook] ${strategie} → ${isValid ? 'valide' : 'faux_positif'} (${sourceKeywords.join(', ')})`)

  const bien = buildBienPayload(property, advert, strategie, metropoleMap, sourceKeywords, isValid)
  const result = await insertBienWithUrls(bien, property, advert)
  return { ...result, haiku: isValid ? 'valide' : 'faux_positif' }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/stream-estate/webhook
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const event = payload.event

    let result: any

    if (event === 'property.ad.create' || (!event && (payload.match?.propertyDocument || payload.propertyDocument))) {
      result = await handlePropertyAdCreate(payload)
    } else {
      result = { action: 'ignored', event }
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
