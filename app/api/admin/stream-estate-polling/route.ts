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
// Config des 4 stratégies — miroir des saved searches SE
// ──────────────────────────────────────────────────────────────────────────────

const STRATEGIES = [
  {
    strategie: 'Locataire en place',
    propertyTypes: [0, 1, 2],
    keywords: SE_KEYWORDS['Locataire en place'],
  },
  {
    strategie: 'Travaux lourds',
    propertyTypes: [0, 1, 2],
    keywords: SE_KEYWORDS['Travaux lourds'],
  },
  {
    strategie: 'Division',
    propertyTypes: [0, 1, 2],
    keywords: SE_KEYWORDS['Division'],
  },
  {
    strategie: 'Immeuble de rapport',
    propertyTypes: [2, 1],
    keywords: SE_KEYWORDS['Immeuble de rapport'],
  },
]

// ──────────────────────────────────────────────────────────────────────────────
// Appel SE API — GET /documents/properties
// ──────────────────────────────────────────────────────────────────────────────

async function searchSeProperties(
  keywords: string[],
  propertyTypes: number[],
  fromDate: string,
  page: number,
): Promise<{ members: any[]; totalItems: number; hasNext: boolean }> {
  const parts: string[] = []

  // Chaque keyword = une expression group OR indépendante
  keywords.forEach((kw, i) => {
    parts.push(`expressions[${i}][0][value]=${encodeURIComponent(kw)}`)
    parts.push(`expressions[${i}][0][options][includes]=true`)
    parts.push(`expressions[${i}][0][options][strict]=true`)
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

  for (const { strategie, propertyTypes, keywords } of STRATEGIES) {
    summary[strategie] = { fetched: 0, inserted: 0, skipped: 0, faux_positifs: 0, errors: 0 }
    const seen = new Set<string>() // dédup UUID dans ce run

    let page = 1
    let hasNext = true

    while (hasNext) {
      const { members, hasNext: next } = await searchSeProperties(keywords, propertyTypes, fromDate, page)
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

      // Early stop : page entière sans nouvelle insertion → les suivantes sont plus anciennes
      if (members.length > 0 && newOnPage === 0) break
    }
  }

  return NextResponse.json({ ok: true, fromDate, summary })
}
