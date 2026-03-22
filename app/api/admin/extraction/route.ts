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
// System prompt for extraction
// ──────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Extrais les donnees locatives de cette annonce immobiliere. UNE SEULE LIGNE JSON.
{"loyer":number|null,"type_loyer":"HC"|"CC"|null,"charges_recup":number|null,"charges_copro":number|null,"taxe_fonc_ann":number|null,"fin_bail":"YYYY-MM-DD"|"indefini"|null,"type_bail":"nu"|"meuble"|"commercial"|"pre-89"|null,"profil_locataire":"TYPE | depuis YYYY"|"TYPE | X ans"|null}

REGLES LOYER :
- loyer : le montant du loyer mensuel tel que mentionne dans l annonce (ne pas le modifier)
- type_loyer : "HC" si l annonce dit "hors charges", "hc", "charges en sus", "+ charges". "CC" si l annonce dit "charges comprises", "cc", "dont charges". null si pas precise.
- NE PAS deduire les charges du loyer. Stocker le montant exact mentionne.
- Si l annonce dit "loue 800 euros + 50 de charges" → loyer:800, type_loyer:"HC", charges_recup:50
- Si l annonce dit "loue 850 charges comprises dont 50 de charges" → loyer:850, type_loyer:"CC", charges_recup:50

REGLES CHARGES :
- charges_recup : charges recuperables/locatives mensuelles. null si non mentionne.
- charges_copro : charges de copropriete mensuelles. Si annuel, diviser par 12. null si non mentionne.
- taxe_fonc_ann : taxe fonciere ANNUELLE. Si mensuelle, multiplier par 12. null si non mentionne.

REGLES BAIL :
- fin_bail : date de fin au format YYYY-MM-DD. Si seulement mois+annee, mettre le 1er. "indefini" si bail pre-89 ou loi 48. null si non mentionne.
- type_bail : "nu"=location vide, "meuble"=meublee, "commercial"=bail commercial, "pre-89"=bail ancien. null si non mentionne.

REGLES PROFIL :
- TYPE EXACTEMENT parmi : Particulier, Etudiant, Senior, Famille, Colocation, Professionnel, Commercial
- Anciennete : "depuis YYYY" ou "X ans". Si inconnue = null pour tout le champ profil_locataire.`

// ──────────────────────────────────────────────────────────────────────────────
// Parse AI JSON response
// ──────────────────────────────────────────────────────────────────────────────

function parseJsonResponse(text: string): Record<string, unknown> | null {
  // Strip markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Extract first {...}
  const match = cleaned.match(/\{[^}]+\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/extraction
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Check if cron is enabled
  const { data: config } = await supabaseAdmin.from('cron_config').select('enabled').eq('id', 'extraction').single()
  if (config && !config.enabled) return NextResponse.json({ skipped: true, reason: 'cron disabled' })

  const fakeReq = new NextRequest(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({}) })
  const result = await POST(fakeReq)

  // Log last run
  const resultData = await result.clone().json()
  await supabaseAdmin.from('cron_config').update({ last_run: new Date().toISOString(), last_result: resultData }).eq('id', 'extraction')

  return result
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminOrCron(req)
    if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { cursor: initialCursor } = body
    const startTime = Date.now()
    const MAX_MS = 50000 // 50s max

    // Count remaining
    const { count: totalRemaining } = await supabaseAdmin
      .from('biens')
      .select('id', { count: 'exact', head: true })
      .eq('strategie_mdb', 'Locataire en place')
      .eq('statut', 'Toujours disponible')
      .not('moteurimmo_data', 'is', null)
      .is('extraction_statut', null)

    if (!totalRemaining || totalRemaining === 0) {
      return NextResponse.json({
        processed: 0, loyer_found: 0, profil_found: 0,
        errors: 0, next_cursor: null, remaining: 0,
      })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let processed = 0
    let loyerFound = 0
    let profilFound = 0
    let errorCount = 0
    let currentCursor: string | null = initialCursor || null

    // Loop until timeout or no more biens
    while (Date.now() - startTime < MAX_MS) {
    let query = supabaseAdmin
      .from('biens')
      .select('id, created_at, prix_fai, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann, fin_bail, profil_locataire, moteurimmo_data')
      .eq('strategie_mdb', 'Locataire en place')
      .eq('statut', 'Toujours disponible')
      .not('moteurimmo_data', 'is', null)
      .is('extraction_statut', null)
      .order('created_at', { ascending: true })
      .limit(10)

    if (currentCursor) query = query.gt('created_at', currentCursor)

    const { data: biens, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!biens || biens.length === 0) break

    for (const bien of biens) {
      if (Date.now() - startTime >= MAX_MS) break
      try {
        const md = bien.moteurimmo_data as { description?: string; title?: string } | null
        const now = new Date().toISOString()
        const desc = (md?.description || '').slice(0, 800)
        if (!desc) {
          // Mark as processed with NC
          await supabaseAdmin
            .from('biens')
            .update({ profil_locataire: 'NC', extraction_statut: 'no_data', extraction_date: now })
            .eq('id', bien.id)
          processed++
          continue
        }

        const message = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: desc }],
        })

        const responseText = message.content
          .filter(b => b.type === 'text')
          .map(b => b.type === 'text' ? b.text : '')
          .join('')

        const parsed = parseJsonResponse(responseText)
        if (!parsed) {
          console.error(`Failed to parse extraction for bien ${bien.id}`)
          await supabaseAdmin
            .from('biens')
            .update({ profil_locataire: 'NC', extraction_statut: 'echec', extraction_date: now })
            .eq('id', bien.id)
          errorCount++
          processed++
          continue
        }

        // Build update object
        const update: Record<string, unknown> = { extraction_statut: 'ok', extraction_date: now }

        // Loyer: only set if no existing loyer
        if (!bien.loyer && parsed.loyer && typeof parsed.loyer === 'number') {
          update.loyer = parsed.loyer
          update.type_loyer = parsed.type_loyer || 'HC'
          loyerFound++
        }

        // Charges
        if (!bien.charges_rec && parsed.charges_recup != null) {
          update.charges_rec = parsed.charges_recup
        }
        if (!bien.charges_copro && parsed.charges_copro != null) {
          update.charges_copro = parsed.charges_copro
        }
        if (!bien.taxe_fonc_ann && parsed.taxe_fonc_ann != null) {
          update.taxe_fonc_ann = parsed.taxe_fonc_ann
        }

        // Bail
        if (!bien.fin_bail && parsed.fin_bail != null) {
          update.fin_bail = parsed.fin_bail
        }

        // Profil locataire
        if (parsed.profil_locataire && typeof parsed.profil_locataire === 'string') {
          update.profil_locataire = parsed.profil_locataire
          profilFound++
        } else {
          update.profil_locataire = 'NC'
        }

        // Recalculate rendement_brut
        const finalLoyer = (update.loyer as number) || bien.loyer
        if (finalLoyer && bien.prix_fai) {
          update.rendement_brut = Math.round((finalLoyer * 12 / bien.prix_fai) * 10000) / 10000
        }

        await supabaseAdmin.from('biens').update(update).eq('id', bien.id)
        processed++
      } catch (aiErr) {
        console.error(`Extraction error for bien ${bien.id}:`, aiErr)
        // Mark as processed to avoid retrying endlessly
        await supabaseAdmin
          .from('biens')
          .update({ profil_locataire: 'NC', extraction_statut: 'erreur', extraction_date: new Date().toISOString() })
          .eq('id', bien.id)
        errorCount++
        processed++
      }
    }

    currentCursor = biens[biens.length - 1].created_at
    if (biens.length < 10) break
    } // end while

    return NextResponse.json({
      processed,
      loyer_found: loyerFound,
      profil_found: profilFound,
      errors: errorCount,
      next_cursor: currentCursor,
      remaining: (totalRemaining || 0) - processed,
    })
  } catch (err) {
    console.error('Extraction error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
