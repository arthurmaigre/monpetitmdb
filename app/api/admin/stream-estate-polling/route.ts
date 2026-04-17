import { NextRequest, NextResponse } from 'next/server'
import {
  SE_KEYWORDS,
  detectMatchedKeywords,
  validateWithHaiku,
  buildBienPayload,
  findExistingBien,
  getMetropoleMap,
  insertBienWithUrls,
} from '@/lib/stream-estate-ingest'

const SE_API = 'https://api.stream.estate'
const SE_API_KEY = process.env.STREAM_ESTATE_API_KEY!

// ──────────────────────────────────────────────────────────────────────────────
// Expressions miroir exact des saved searches SE (inclusions + exclusions)
// Un appel API par groupe → évite les URLs 414 trop longues
// ──────────────────────────────────────────────────────────────────────────────

type ExprWord = { word: string; includes: boolean; strict: boolean }
type ExprGroup = ExprWord[]

const LEP_EXCLUSIONS: ExprWord[] = [
  { word: 'bail commercial',       includes: false, strict: true },
  { word: 'local commercial',      includes: false, strict: true },
  { word: 'fonds de commerce',     includes: false, strict: true },
  { word: 'murs commerciaux',      includes: false, strict: true },
  { word: 'ehpad',                 includes: false, strict: true },
  { word: 'residence senior',      includes: false, strict: true },
  { word: 'residence de tourisme', includes: false, strict: true },
  { word: 'residence etudiante',   includes: false, strict: true },
  { word: 'residence hoteliere',   includes: false, strict: true },
  { word: 'residence de service',  includes: false, strict: true },
  { word: 'residence geree',       includes: false, strict: true },
  { word: 'maison de retraite',    includes: false, strict: true },
  { word: 'lmnp',                  includes: false, strict: true },
]

function inc(word: string): ExprWord { return { word, includes: true, strict: true } }

const STRATEGIES: { strategie: string; propertyTypes: number[]; expressions: ExprGroup[]; surfaceMin?: number }[] = [
  {
    strategie: 'Locataire en place',
    propertyTypes: [0, 1, 2],
    expressions: [
      [inc('locataire en place'), ...LEP_EXCLUSIONS],
      [inc('vendu loue'),         ...LEP_EXCLUSIONS],
      [inc('bail en cours'),      ...LEP_EXCLUSIONS],
      [inc('loyer actuel'),       ...LEP_EXCLUSIONS],
      [inc('location en cours'),  ...LEP_EXCLUSIONS],
    ],
  },
  {
    strategie: 'Travaux lourds',
    propertyTypes: [0, 1, 2],
    expressions: [
      [inc('entierement a renover')],
      [inc('a renover entierement')],
      [inc('a renover integralement')],
      [inc('a rehabiliter')],
      [inc('inhabitable')],
      [inc('tout a refaire')],
      [inc('toiture a refaire')],
      [inc('a restaurer')],
      [inc('a rafraichir')],
      [inc('a remettre aux normes')],
      [inc('a remettre en etat')],
      [inc('plateau a amenager')],
      [inc('bien a renover')],
      [inc('maison a renover')],
      [inc('appartement a renover')],
      [inc('immeuble a renover')],
    ],
  },
  {
    strategie: 'Division',
    propertyTypes: [0, 1, 2],
    surfaceMin: 100,
    expressions: [
      [inc('division possible')],
      [inc('potentiel de division')],
      [inc('bien divisible')],
      [inc('maison divisible')],
      [inc('appartement divisible')],
      [inc('a diviser')],
    ],
  },
  {
    strategie: 'Immeuble de rapport',
    propertyTypes: [2, 1],
    expressions: [
      [inc('immeuble de rapport')],
      [inc('copropriete a creer')],
      [inc('vente en bloc')],
      [inc('vendu en bloc')],
      [inc('immeuble locatif')],
      [inc('immeuble entierement loue')],
    ],
  },
]

// ──────────────────────────────────────────────────────────────────────────────
// Appel SE API — 1 seul groupe d'expressions par appel (évite URL 414)
// ──────────────────────────────────────────────────────────────────────────────

function buildSeBaseParts(
  group: ExprGroup,
  propertyTypes: number[],
  fromDate: string,
  itemsPerPage: number,
  surfaceMin?: number,
): string[] {
  const parts: string[] = []
  group.forEach((expr, ei) => {
    parts.push(`expressions[0][${ei}][word]=${encodeURIComponent(expr.word)}`)
    parts.push(`expressions[0][${ei}][options][includes]=${expr.includes}`)
    parts.push(`expressions[0][${ei}][options][strict]=${expr.strict}`)
  })
  propertyTypes.forEach(t => parts.push(`propertyTypes[]=${t}`))
  if (surfaceMin) parts.push(`surfaceMin=${surfaceMin}`)
  parts.push(`transactionType=0`)
  parts.push(`fromDate=${encodeURIComponent(fromDate)}`)
  parts.push(`itemsPerPage=${itemsPerPage}`)
  parts.push(`order[createdAt]=desc`)
  parts.push(`lat=46.6`)
  parts.push(`lon=2.2`)
  parts.push(`radius=600`)
  parts.push(`withCoherentPrice=true`)
  return parts
}

async function fetchSeGroupPage(baseParts: string[], page: number): Promise<any[]> {
  const url = `${SE_API}/documents/properties?${[...baseParts, `page=${page}`].join('&')}`
  const res = await fetch(url, { headers: { 'X-API-KEY': SE_API_KEY } })
  if (!res.ok) throw new Error(`SE API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data['hydra:member'] || []
}

// ──────────────────────────────────────────────────────────────────────────────
// Traitement d'une property SE → pipeline keyword + Haiku
// ──────────────────────────────────────────────────────────────────────────────

async function processProperty(
  property: any,
  strategie: string,
  metropoleMap: Map<string, string>,
  dry: boolean,
): Promise<{ action: string; id?: number; haiku?: string; title?: string; keywords?: string[] }> {
  const adverts: any[] = property.adverts || []
  if (adverts.length === 0) return { action: 'skip' }

  const advert = adverts[0]
  if (!advert.url) return { action: 'skip' }

  if (!dry) {
    const existing = await findExistingBien(advert.url, property, advert)
    if (existing) return { action: 'skip_existing', id: existing.id }
  }

  const title = advert.title || property.title || ''
  const description = advert.description || property.description || ''

  const sourceKeywords = detectMatchedKeywords(title, description, strategie)
  const isValid = await validateWithHaiku(title, description, strategie)
  console.log(`[SE polling${dry ? ' DRY' : ''}] ${strategie} → ${isValid ? 'valide' : 'faux_positif'} (${sourceKeywords.join(', ') || 'aucun keyword local'})`)

  if (dry) {
    return { action: isValid ? 'valide' : 'faux_positif', haiku: isValid ? 'valide' : 'faux_positif', title, keywords: sourceKeywords }
  }

  const bien = buildBienPayload(property, advert, strategie, metropoleMap, sourceKeywords, isValid)
  const result = await insertBienWithUrls(bien, property, advert)
  return { ...result, haiku: isValid ? 'valide' : 'faux_positif' }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stream-estate-polling
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const fromDateParam = req.nextUrl.searchParams.get('fromDate')
  let fromDate: string
  if (fromDateParam) {
    fromDate = fromDateParam
  } else {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    fromDate = since.toISOString()
  }

  const limitParam = req.nextUrl.searchParams.get('limit')
  const limitPerStrategy = limitParam ? parseInt(limitParam, 10) : Infinity
  const dry = req.nextUrl.searchParams.get('dry') === 'true'

  // itemsPerPage adaptatif : on demande exactement N items à SE si limit défini
  const itemsPerPage = isFinite(limitPerStrategy) ? Math.min(limitPerStrategy, 30) : 30

  try {
    const metropoleMap = await getMetropoleMap()

    const summary: Record<string, {
      fetched: number; inserted: number; skipped: number
      faux_positifs: number; valides: number; errors: number
      exemples?: string[]
    }> = {}

    for (const { strategie, propertyTypes, expressions, surfaceMin } of STRATEGIES) {
      summary[strategie] = { fetched: 0, inserted: 0, skipped: 0, faux_positifs: 0, valides: 0, errors: 0 }
      if (dry) summary[strategie].exemples = []
      const seen = new Set<string>()

      // Pour chaque expression : paginer et traiter chaque page immédiatement
      const CHUNK_SIZE = 15
      const CONCURRENCY = 3

      for (const group of expressions) {
        if (isFinite(limitPerStrategy) && seen.size >= limitPerStrategy) break

        const baseParts = buildSeBaseParts(group, propertyTypes, fromDate, itemsPerPage, surfaceMin)
        let page = 1

        while (true) {
          if (isFinite(limitPerStrategy) && seen.size >= limitPerStrategy) break

          const members = await fetchSeGroupPage(baseParts, page)
          const newProperties: any[] = []
          for (const property of members) {
            const uuid: string = property.uuid
            if (!uuid || seen.has(uuid)) continue
            seen.add(uuid)
            newProperties.push(property)
            if (isFinite(limitPerStrategy) && seen.size >= limitPerStrategy) break
          }

          summary[strategie].fetched += newProperties.length

          // Traiter cette page en chunks parallèles
          const chunks: any[][] = []
          for (let i = 0; i < newProperties.length; i += CHUNK_SIZE) {
            chunks.push(newProperties.slice(i, i + CHUNK_SIZE))
          }

          for (let i = 0; i < chunks.length; i += CONCURRENCY) {
            const batch = chunks.slice(i, i + CONCURRENCY)
            const batchResults = await Promise.all(
              batch.map(chunk =>
                Promise.all(
                  chunk.map(async (property: any) => {
                    try {
                      return { result: await processProperty(property, strategie, metropoleMap, dry) }
                    } catch (err) {
                      console.error(`[SE polling] error uuid=${property.uuid}:`, err)
                      return { result: null }
                    }
                  })
                )
              )
            )

            for (const chunkResults of batchResults) {
              for (const { result } of chunkResults) {
                if (!result) { summary[strategie].errors++; continue }
                if (dry) {
                  if (result.action === 'valide') summary[strategie].valides++
                  else if (result.action === 'faux_positif') summary[strategie].faux_positifs++
                  if (result.title) {
                    summary[strategie].exemples!.push(
                      `[${result.action}] ${result.title} (${(result.keywords || []).join(', ') || 'aucun keyword'})`
                    )
                  }
                } else {
                  if (result.action === 'inserted') {
                    summary[strategie].inserted++
                    if (result.haiku === 'faux_positif') summary[strategie].faux_positifs++
                  } else {
                    summary[strategie].skipped++
                  }
                }
              }
            }
          }

          if (members.length < itemsPerPage) break
          page++
        }
      }
    }

    return NextResponse.json({ ok: true, fromDate, dry, summary })
  } catch (err) {
    console.error('[SE polling] fatal error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
