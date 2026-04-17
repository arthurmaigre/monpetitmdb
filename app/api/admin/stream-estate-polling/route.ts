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
// ──────────────────────────────────────────────────────────────────────────────

type ExprWord = { word: string; includes: boolean; strict: boolean }
type ExprGroup = ExprWord[]

const LEP_EXCLUSIONS: ExprWord[] = [
  { word: 'bail commercial',      includes: false, strict: true },
  { word: 'local commercial',     includes: false, strict: true },
  { word: 'fonds de commerce',    includes: false, strict: true },
  { word: 'murs commerciaux',     includes: false, strict: true },
  { word: 'ehpad',                includes: false, strict: true },
  { word: 'residence senior',     includes: false, strict: true },
  { word: 'residence de tourisme',includes: false, strict: true },
  { word: 'residence etudiante',  includes: false, strict: true },
  { word: 'residence hoteliere',  includes: false, strict: true },
  { word: 'residence de service', includes: false, strict: true },
  { word: 'residence geree',      includes: false, strict: true },
  { word: 'maison de retraite',   includes: false, strict: true },
  { word: 'lmnp',                 includes: false, strict: true },
]

function inc(word: string): ExprWord { return { word, includes: true, strict: true } }

const STRATEGIES: { strategie: string; propertyTypes: number[]; expressions: ExprGroup[] }[] = [
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
// Appel SE API — GET /documents/properties
// ──────────────────────────────────────────────────────────────────────────────

async function searchSeProperties(
  expressions: ExprGroup[],
  propertyTypes: number[],
  fromDate: string,
  page: number,
): Promise<{ members: any[]; totalItems: number; hasNext: boolean }> {
  const parts: string[] = []

  expressions.forEach((group, gi) => {
    group.forEach((expr, ei) => {
      parts.push(`expressions[${gi}][${ei}][value]=${encodeURIComponent(expr.word)}`)
      parts.push(`expressions[${gi}][${ei}][options][includes]=${expr.includes}`)
      parts.push(`expressions[${gi}][${ei}][options][strict]=${expr.strict}`)
    })
  })

  propertyTypes.forEach(t => parts.push(`propertyTypes[]=${t}`))

  parts.push(`transactionType=0`)
  parts.push(`fromDate=${encodeURIComponent(fromDate)}`)
  parts.push(`page=${page}`)
  parts.push(`itemsPerPage=30`)
  parts.push(`order[createdAt]=desc`)
  parts.push(`lat=46.6`)
  parts.push(`lon=2.2`)
  parts.push(`radius=600`)
  parts.push(`withCoherentPrice=true`)

  const url = `${SE_API}/documents/properties?${parts.join('&')}`
  const res = await fetch(url, { headers: { 'X-API-KEY': SE_API_KEY } })

  if (!res.ok) throw new Error(`SE API ${res.status}: ${await res.text()}`)

  const data = await res.json()
  const members: any[] = data['hydra:member'] || []
  const totalItems: number = data['hydra:totalItems'] || 0
  const hasNext = !!data['hydra:view']?.['hydra:next']

  return { members, totalItems, hasNext }
}

// ──────────────────────────────────────────────────────────────────────────────
// Traitement d'une property SE → même pipeline que le webhook
// ──────────────────────────────────────────────────────────────────────────────

async function processProperty(
  property: any,
  strategie: string,
  metropoleMap: Map<string, string>,
): Promise<{ action: string; id?: number; haiku?: string }> {
  const adverts: any[] = property.adverts || []
  if (adverts.length === 0) return { action: 'skip' }

  const advert = adverts[0]
  if (!advert.url) return { action: 'skip' }

  const existing = await findExistingBien(advert.url, property, advert)
  if (existing) return { action: 'skip_existing', id: existing.id }

  const title = advert.title || property.title || ''
  const description = advert.description || property.description || ''

  const sourceKeywords = detectMatchedKeywords(title, description, strategie)
  const isValid = await validateWithHaiku(title, description, strategie)
  console.log(`[SE polling] ${strategie} → ${isValid ? 'valide' : 'faux_positif'} (${sourceKeywords.join(', ')})`)

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

  // fromDate = début du jour courant UTC
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const fromDate = today.toISOString()

  const metropoleMap = await getMetropoleMap()

  const summary: Record<string, { fetched: number; inserted: number; skipped: number; faux_positifs: number; errors: number }> = {}

  for (const { strategie, propertyTypes, expressions } of STRATEGIES) {
    summary[strategie] = { fetched: 0, inserted: 0, skipped: 0, faux_positifs: 0, errors: 0 }
    const seen = new Set<string>()

    let page = 1
    let hasNext = true

    while (hasNext) {
      const { members, hasNext: next } = await searchSeProperties(expressions, propertyTypes, fromDate, page)
      hasNext = next
      page++

      let newOnPage = 0

      for (const property of members) {
        const uuid: string = property.uuid
        if (!uuid || seen.has(uuid)) continue
        seen.add(uuid)
        summary[strategie].fetched++

        try {
          const result = await processProperty(property, strategie, metropoleMap)
          if (result.action === 'inserted') {
            summary[strategie].inserted++
            newOnPage++
            if (result.haiku === 'faux_positif') summary[strategie].faux_positifs++
          } else {
            summary[strategie].skipped++
          }
        } catch (err) {
          console.error(`[SE polling] error uuid=${uuid}:`, err)
          summary[strategie].errors++
        }
      }

      if (members.length > 0 && newOnPage === 0) break
    }
  }

  return NextResponse.json({ ok: true, fromDate, summary })
}
