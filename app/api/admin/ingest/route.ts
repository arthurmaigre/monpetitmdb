import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

// ──────────────────────────────────────────────────────────────────────────────
// Strategy configs for Moteur Immo API
// ──────────────────────────────────────────────────────────────────────────────

const STRATEGY_CONFIGS: Record<string, { keywords: string[]; categories: string[]; options?: string[] }> = {
  'Locataire en place': {
    keywords: ['locataire en place', 'vendu loué', 'bail en cours'],
    categories: ['house', 'flat', 'block'],
  },
  'Travaux lourds': {
    keywords: [
      'à rénover', 'rénovation complète', 'gros travaux', 'tout à refaire',
      'entièrement à rénover', 'à réhabiliter', 'travaux importants',
      "vendu en l'état", 'toiture à refaire', 'mise aux normes',
      'inhabitable', 'rénovation totale',
    ],
    categories: ['house', 'flat', 'block'],
    options: ['hasWorksRequired'],
  },
  'Division': {
    keywords: [
      'divisible', 'possibilité de division', 'division possible',
      'diviser en', 'créer des lots', 'créer plusieurs logements',
    ],
    categories: ['house', 'flat', 'block', 'misc'],
  },
  'Découpe': {
    keywords: [
      'immeuble de rapport', 'monopropriété', 'copropriété à créer',
      'pas de copropriété', 'hors copropriété',
      'vente en bloc', 'vendu en bloc', 'plusieurs appartements',
    ],
    categories: ['block', 'house'],
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// Auth helper — admin user OR cron secret
// ──────────────────────────────────────────────────────────────────────────────

async function checkAdminOrCron(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')

  // Cron secret bypass
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return false

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

// ──────────────────────────────────────────────────────────────────────────────
// Map Moteur Immo ad → bien row
// ──────────────────────────────────────────────────────────────────────────────

interface MoteurImmoAd {
  uniqueId?: string
  url?: string
  origin?: string
  adId?: string
  title?: string
  description?: string
  publisher?: unknown
  price?: number
  surface?: number
  rooms?: number
  floor?: number
  energyGrade?: string
  rent?: number
  propertyCharges?: number
  propertyTax?: number
  location?: { city?: string; postalCode?: string }
  position?: [number, number]
  pictureUrls?: string[]
  options?: string[]
  duplicates?: unknown
  priceStats?: { rent?: number }
  originalPrice?: number
  priceDrop?: unknown
  creationDate?: string
  lastPriceChangeDate?: string
  lastPublicationDate?: string
  deletionDate?: string
}

function mapOptionsToFields(options: string[] | undefined) {
  const fields: Record<string, unknown> = {}
  if (!options) return fields

  for (const opt of options) {
    switch (opt) {
      case 'hasLift': fields.ascenseur = true; break
      case 'hasNoLift': fields.ascenseur = false; break
      case 'hasCave': fields.has_cave = true; break
      case 'hasSwimmingPool': fields.has_piscine = true; break
      case 'hasGarage': fields.parking_type = 'box_ferme'; break
      case 'hasParking': if (!fields.parking_type) fields.parking_type = 'parking_ouvert'; break
      case 'hasTerrace': fields.acces_exterieur = 'Terrasse'; break
      case 'hasBalcony': if (!fields.acces_exterieur) fields.acces_exterieur = 'Balcon'; break
      case 'hasGarden': fields.acces_exterieur = 'Jardin'; break
    }
  }
  return fields
}

function mapAdToBien(ad: MoteurImmoAd, strategie: string, metropoleMap: Map<string, string>) {
  const optionFields = mapOptionsToFields(ad.options)
  const loyer = ad.rent || ad.priceStats?.rent || null
  const surface = ad.surface || null
  const prix_fai = ad.price || null

  const code_postal = ad.location?.postalCode || null
  const metropole = code_postal ? (metropoleMap.get(code_postal) || null) : null

  const bien: Record<string, unknown> = {
    url: ad.url,
    strategie_mdb: strategie,
    statut: 'Toujours disponible',
    prix_fai,
    surface,
    prix_m2: prix_fai && surface ? Math.round((prix_fai / surface) * 100) / 100 : null,
    nb_pieces: ad.rooms ? `T${ad.rooms}` : null,
    etage: ad.floor !== undefined && ad.floor !== null ? (ad.floor === 0 ? 'RDC' : String(ad.floor)) : null,
    dpe: ad.energyGrade || null,
    loyer,
    charges_copro: ad.propertyCharges || null,
    taxe_fonc_ann: ad.propertyTax || null,
    ville: ad.location?.city || null,
    code_postal,
    metropole,
    photo_url: ad.pictureUrls?.[0] || null,
    longitude: ad.position?.[0] || null,
    latitude: ad.position?.[1] || null,
    rendement_brut: loyer && prix_fai ? Math.round((loyer * 12 / prix_fai) * 10000) / 10000 : null,
    moteurimmo_unique_id: ad.uniqueId || null,
    moteurimmo_data: {
      uniqueId: ad.uniqueId,
      origin: ad.origin,
      adId: ad.adId,
      title: ad.title,
      description: ad.description,
      publisher: ad.publisher,
      pictureUrls: ad.pictureUrls,
      options: ad.options,
      duplicates: ad.duplicates,
      priceStats: ad.priceStats,
      originalPrice: ad.originalPrice,
      priceDrop: ad.priceDrop,
      creationDate: ad.creationDate,
      lastPriceChangeDate: ad.lastPriceChangeDate,
      lastPublicationDate: ad.lastPublicationDate,
      deletionDate: ad.deletionDate,
    },
    ...optionFields,
  }

  return bien
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ingest (Vercel Cron)
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { data: config } = await supabaseAdmin.from('cron_config').select('enabled').eq('id', 'ingest').single()
  if (config && !config.enabled) return NextResponse.json({ skipped: true, reason: 'cron disabled' })

  const { searchParams } = new URL(req.url)
  const strategieParam = searchParams.get('strategie')
  const hoursParam = searchParams.get('hours')

  const now = new Date()
  const hours = hoursParam ? Number(hoursParam) : 24
  const twoDaysAgo = new Date(now.getTime() - hours * 60 * 60 * 1000)
  const strategies = strategieParam && STRATEGY_CONFIGS[strategieParam] ? [strategieParam] : Object.keys(STRATEGY_CONFIGS)
  const totals = { new: 0, updated: 0, errors: 0, processed: 0, total: 0, strategie: strategieParam || 'toutes' }

  for (const strategie of strategies) {
    const fakeReq = new NextRequest(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({
        strategie,
        dateAfter: twoDaysAgo.toISOString().slice(0, 10),
        dateBefore: now.toISOString().slice(0, 10),
      }),
    })
    try {
      const result = await POST(fakeReq)
      const data = await result.json()
      if (data.new) totals.new += data.new
      if (data.updated) totals.updated += data.updated
      if (data.errors) totals.errors += data.errors
      if (data.processed) totals.processed += data.processed
      if (data.total) totals.total += data.total
    } catch { totals.errors++ }
  }

  await supabaseAdmin.from('cron_config').update({ last_run: new Date().toISOString(), last_result: totals }).eq('id', 'ingest')

  return NextResponse.json(totals)
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/ingest
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminOrCron(req)
    if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { strategie, dateAfter, dateBefore } = body

    if (!strategie || !STRATEGY_CONFIGS[strategie]) {
      return NextResponse.json({ error: 'Stratégie invalide' }, { status: 400 })
    }
    if (!dateAfter || !dateBefore) {
      return NextResponse.json({ error: 'dateAfter et dateBefore requis' }, { status: 400 })
    }

    const config = STRATEGY_CONFIGS[strategie]
    const apiKey = process.env.MOTEURIMMO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'MOTEURIMMO_API_KEY non configurée' }, { status: 500 })
    }

    // Load metropole map from ref_communes
    const { data: communes } = await supabaseAdmin
      .from('ref_communes')
      .select('code_postal, metropole')
      .not('metropole', 'is', null)
    const metropoleMap = new Map<string, string>()
    if (communes) {
      for (const c of communes) {
        if (c.metropole) metropoleMap.set(c.code_postal, c.metropole)
      }
    }

    // Paginate through Moteur Immo API
    let page = 1
    let totalApi = 0
    let newCount = 0
    let updatedCount = 0
    let errorCount = 0
    const allAds: MoteurImmoAd[] = []

    while (page <= 100) {
      const apiBody: Record<string, unknown> = {
        types: ['sale'],
        categories: config.categories,
        keywords: config.keywords,
        keywordsOperator: 'or',
        page,
        maxLength: 100,
        sortBy: 'creationDate-desc',
        creationDateAfter: dateAfter,
        creationDateBefore: dateBefore,
        apiKey,
      }
      if (config.options && config.options.length > 0) {
        apiBody.options = config.options
      }

      const resp = await fetch('https://moteurimmo.fr/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody),
      })

      if (!resp.ok) {
        const errText = await resp.text().catch(() => 'Unknown error')
        console.error(`Moteur Immo API error page ${page}: ${resp.status} ${errText}`)
        break
      }

      const data = await resp.json()
      const ads: MoteurImmoAd[] = data.ads || data || []
      if (!Array.isArray(ads) || ads.length === 0) break

      allAds.push(...ads)
      totalApi += ads.length

      // If fewer than 100, we've reached the last page
      if (ads.length < 100) break
      page++
    }

    // Insert/update biens in batches of 50
    for (let i = 0; i < allAds.length; i += 50) {
      const batch = allAds.slice(i, i + 50)
      const biens = batch
        .filter(ad => ad.url)
        .map(ad => mapAdToBien(ad, strategie, metropoleMap))

      // Check which URLs already exist
      const urls = biens.map(b => b.url).filter(Boolean)
      const { data: existing } = await supabaseAdmin
        .from('biens')
        .select('url')
        .in('url', urls)
      const existingUrls = new Set((existing || []).map((e: any) => e.url))

      for (const bien of biens) {
        if (existingUrls.has(bien.url)) {
          updatedCount++
          continue
        }

        const { error } = await supabaseAdmin
          .from('biens')
          .insert(bien)

        if (error) {
          if (error.code === '23505') {
            updatedCount++
          } else {
            console.error(`Insert error for ${bien.url}: ${error.message}`)
            errorCount++
          }
        } else {
          newCount++
        }
      }
    }

    return NextResponse.json({
      new: newCount,
      updated: updatedCount,
      errors: errorCount,
      total_api: totalApi,
      pages: page,
    })
  } catch (err) {
    console.error('Ingest error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
