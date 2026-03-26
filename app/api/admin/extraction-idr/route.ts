import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ──────────────────────────────────────────────────────────────────────────────
// Auth helper
// ──────────────────────────────────────────────────────────────────────────────

async function checkAdminOrCron(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')

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
// System prompt for Immeuble de rapport extraction
// ──────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu extrais les donnees d un immeuble de rapport depuis une annonce immobiliere. Reponds avec UNE SEULE LIGNE JSON.

FORMAT :
{"nb_lots":number|null,"loyer_total_mensuel":number|null,"loyer_total_annuel":number|null,"taxe_fonc_ann":number|null,"monopropriete":boolean|null,"compteurs_individuels":boolean|null,"lots":[{"type":"T1"|"T2"|"T3"|"T4"|"T5"|"Studio"|"Local commercial"|"Garage"|null,"surface":number|null,"loyer":number|null,"type_loyer":"HC"|"CC"|null,"etat":"loue"|"vacant"|"a_renover"|null,"dpe":string|null,"etage":"RDC"|"1"|"2"|"3"|"4"|"5"|"sous-sol"|null}]}

REGLES GENERALES :
- nb_lots : nombre total de lots (appartements + locaux commerciaux + garages). Compter chaque lot mentionne.
- loyer_total_mensuel : somme des loyers mensuels de tous les lots (HC de preference). null si non mentionne.
- loyer_total_annuel : revenu locatif annuel total. Si seulement mensuel, multiplier par 12. null si non mentionne.
- taxe_fonc_ann : taxe fonciere ANNUELLE. null si non mentionne.
- monopropriete : true si "monopropriete", "pas de copropriete", "hors copropriete", "pas de syndic". false si copropriete mentionnee. null si non precise.
- compteurs_individuels : true si "compteurs individuels", "compteurs separes". null si non mentionne.
- NE PAS calculer de rendement. Ne retourner que les donnees brutes.

REGLES PAR LOT :
- type : "Studio" pour studio/F1/T1 < 25m2. "T1" pour T1/F1. "T2" pour T2/F2/2 pieces. Etc. "Local commercial" pour commerce/bureau/local. "Garage" pour garage/box/parking. null si inconnu.
- surface : en m2. null si non mentionnee.
- loyer : montant mensuel du lot. null si non mentionne. NE PAS inventer de loyer.
- type_loyer : "HC" ou "CC". null si non precise.
- etat : "loue" si actuellement occupe/loue. "vacant" si libre/non loue. "a_renover" si travaux necessaires. null si non precise.
- dpe : lettre A a G. null si non mentionne.
- etage : "RDC", "1", "2", etc. "sous-sol" pour cave exploitee. null si non precise.

REGLES IMPORTANTES :
- Si l annonce dit "immeuble de 4 appartements" mais ne detaille que 2, creer 4 lots avec les 2 premiers remplis et les 2 autres avec type et surface si mentionnes, le reste a null.
- Si un lot est "a renover" et qu un loyer "potentiel" ou "estimé" est mentionne, mettre etat:"a_renover" et NE PAS mettre le loyer potentiel dans loyer (loyer = null). Le loyer est uniquement le loyer reel encaisse.
- Loyer en CC ou HC tel que mentionne. Ne pas deduire les charges.
- Si "loyers annuels 33 240 EUR" et 5 lots, ne PAS diviser. Mettre loyer_total_annuel:33240 et loyer:null sur chaque lot si le detail n est pas donne.
- Maximum 20 lots. Au dela, mettre nb_lots au bon chiffre mais ne detailler que les 20 premiers.`

// ──────────────────────────────────────────────────────────────────────────────
// Parse AI JSON response (supports nested arrays)
// ──────────────────────────────────────────────────────────────────────────────

function parseJsonResponse(text: string): Record<string, unknown> | null {
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Find the outermost JSON object
  const start = cleaned.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let end = -1
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++
    else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/extraction-idr (cron entry point)
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { data: config } = await supabaseAdmin.from('cron_config').select('enabled').eq('id', 'extraction_idr').single()
  if (config && !config.enabled) return NextResponse.json({ skipped: true, reason: 'cron disabled' })

  const fakeReq = new NextRequest(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({}) })
  const result = await POST(fakeReq)

  const resultData = await result.clone().json()
  await supabaseAdmin.from('cron_config').update({ last_run: new Date().toISOString(), last_result: resultData }).eq('id', 'extraction_idr')

  return result
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/extraction-idr
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminOrCron(req)
    if (!isAdmin) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

    const body = await req.json()
    const { cursor: initialCursor } = body
    const startTime = Date.now()
    const MAX_MS = 50000

    // Count remaining
    const { count: totalRemaining } = await supabaseAdmin
      .from('biens')
      .select('id', { count: 'exact', head: true })
      .eq('strategie_mdb', 'Immeuble de rapport')
      .eq('statut', 'Toujours disponible')
      .not('moteurimmo_data', 'is', null)
      .is('extraction_statut', null)

    if (!totalRemaining || totalRemaining === 0) {
      return NextResponse.json({
        processed: 0, lots_found: 0, errors: 0,
        next_cursor: null, remaining: 0,
      })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let processed = 0
    let lotsFound = 0
    let errorCount = 0
    let currentCursor: string | null = initialCursor || null

    while (Date.now() - startTime < MAX_MS) {
      let query = supabaseAdmin
        .from('biens')
        .select('id, created_at, prix_fai, loyer, taxe_fonc_ann, moteurimmo_data')
        .eq('strategie_mdb', 'Immeuble de rapport')
        .eq('statut', 'Toujours disponible')
        .not('moteurimmo_data', 'is', null)
        .is('extraction_statut', null)
        .order('created_at', { ascending: true })
        .limit(10) // Moins que locataire car reponses plus longues

      if (currentCursor) query = query.gt('created_at', currentCursor)

      const { data: biens, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!biens || biens.length === 0) break

      for (const bien of biens) {
        if (Date.now() - startTime >= MAX_MS) break
        try {
          // Parse moteurimmo_data (peut etre double-stringed)
          let md: { description?: string; title?: string } | null = null
          try {
            const raw = bien.moteurimmo_data
            if (typeof raw === 'string') {
              // Double-stringed: "{\"title\":...}" ou ""{...}""
              const parsed2 = JSON.parse(raw)
              md = typeof parsed2 === 'string' ? JSON.parse(parsed2) : parsed2
            } else if (raw && typeof raw === 'object') {
              md = raw as { description?: string; title?: string }
            }
          } catch { /* ignore parse errors */ }
          const now = new Date().toISOString()
          const title = (md?.title || '').slice(0, 100)
          const desc = (md?.description || '').slice(0, 1200) // Plus long car descriptions IDR detaillees
          if (!desc) {
            await supabaseAdmin
              .from('biens')
              .update({ extraction_statut: 'no_data', extraction_date: now })
              .eq('id', bien.id)
            processed++
            continue
          }

          const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 800, // Plus de tokens car JSON lots structure
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: `${title}\n\n${desc}` }],
          })

          const responseText = message.content
            .filter(b => b.type === 'text')
            .map(b => b.type === 'text' ? b.text : '')
            .join('')

          const parsed = parseJsonResponse(responseText)
          if (!parsed) {
            console.error(`Failed to parse IDR extraction for bien ${bien.id}`)
            await supabaseAdmin
              .from('biens')
              .update({ extraction_statut: 'echec', extraction_date: now })
              .eq('id', bien.id)
            errorCount++
            processed++
            continue
          }

          // Build update
          const update: Record<string, unknown> = { extraction_statut: 'ok', extraction_date: now }

          // Stocker les lots dans lots_data (JSONB)
          const lots = parsed.lots as unknown[]
          if (Array.isArray(lots) && lots.length > 0) {
            update.lots_data = {
              nb_lots: parsed.nb_lots || lots.length,
              loyer_total_mensuel: parsed.loyer_total_mensuel || null,
              loyer_total_annuel: parsed.loyer_total_annuel || null,
              monopropriete: parsed.monopropriete ?? null,
              compteurs_individuels: parsed.compteurs_individuels ?? null,
              lots,
            }
            lotsFound++
          }

          // Taxe fonciere globale
          if (!bien.taxe_fonc_ann && parsed.taxe_fonc_ann != null) {
            update.taxe_fonc_ann = parsed.taxe_fonc_ann
          }

          // Loyer total (somme) — stocker dans le champ loyer si pas deja renseigne
          if (!bien.loyer && parsed.loyer_total_mensuel && typeof parsed.loyer_total_mensuel === 'number') {
            update.loyer = parsed.loyer_total_mensuel
            update.type_loyer = 'HC'
          }

          // Rendement brut global
          const finalLoyer = (update.loyer as number) || bien.loyer
          if (finalLoyer && bien.prix_fai) {
            update.rendement_brut = Math.round((finalLoyer * 12 / bien.prix_fai) * 10000) / 10000
          }

          await supabaseAdmin.from('biens').update(update).eq('id', bien.id)
          processed++
        } catch (aiErr) {
          console.error(`IDR extraction error for bien ${bien.id}:`, aiErr)
          await supabaseAdmin
            .from('biens')
            .update({ extraction_statut: 'erreur', extraction_date: new Date().toISOString() })
            .eq('id', bien.id)
          errorCount++
          processed++
        }

        currentCursor = bien.created_at
      }

      currentCursor = biens[biens.length - 1].created_at
    }

    return NextResponse.json({
      processed,
      lots_found: lotsFound,
      errors: errorCount,
      next_cursor: currentCursor,
      remaining: (totalRemaining || 0) - processed,
    })
  } catch (err) {
    console.error('IDR extraction error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
