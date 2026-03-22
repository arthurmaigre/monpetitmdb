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
// Score travaux prompt
// ──────────────────────────────────────────────────────────────────────────────

const SCORE_PROMPT = `Tu es un expert en renovation immobiliere francaise.
Analyse cette annonce et attribue un score de travaux de 1 a 5.

REGLE DU CRITERE DOMINANT : le signal le plus grave fixe le plancher du score.

Score 1 - Rafraichissement : logement habitable, cosmetique (peintures, sols)
Score 2 - Renovation legere : cuisine OU salle de bain a refaire
Score 3 - Renovation complete : tous corps d etat (elec, plomberie, isolation), structure saine
Score 4 - Renovation lourde : structure partielle + tous corps d etat
Score 5 - Rehabilitation totale : structure entiere a reprendre, inhabitable

SIGNAUX : DPE G=min 3, DPE F=min 2, toiture/charpente=4-5, elec+plomberie=min 3, humidite=min 3, succession/inhabitable=+1

REGLE ANNEE DE CONSTRUCTION : l annee seule ne suffit PAS a augmenter le score. Un bien ancien (avant 1950) peut avoir ete renove depuis. N appliquer +1 QUE si l annonce contient des signaux EXPLICITES de vetuste ("en l etat", "d origine", "jamais renove", "electrique vetuste", "pas d isolation", "a remettre aux normes"). L absence de mention de renovation ne signifie PAS absence de renovation.

JSON une seule ligne : {"score": <1-5>, "commentaire": "<1-2 phrases>"}`

// ──────────────────────────────────────────────────────────────────────────────
// Parse AI JSON response
// ──────────────────────────────────────────────────────────────────────────────

function parseScoreResponse(text: string): { score: number; commentaire: string } | null {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match = cleaned.match(/\{[^}]+\}/)
  if (!match) return null
  try {
    const obj = JSON.parse(match[0])
    const score = Number(obj.score)
    if (!score || score < 1 || score > 5) return null
    return {
      score: Math.round(score),
      commentaire: String(obj.commentaire || '').slice(0, 200),
    }
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/score-travaux
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const fakeReq = new NextRequest(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({}) })
  return POST(fakeReq)
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminOrCron(req)
    if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { cursor: initialCursor, withPhotos = false } = body
    const startTime = Date.now()
    const MAX_MS = 50000

    // Count remaining
    const { count: totalRemaining } = await supabaseAdmin
      .from('biens')
      .select('id', { count: 'exact', head: true })
      .eq('strategie_mdb', 'Travaux lourds')
      .eq('statut', 'Toujours disponible')
      .is('score_travaux', null)
      .not('moteurimmo_data', 'is', null)

    if (!totalRemaining || totalRemaining === 0) {
      return NextResponse.json({
        processed: 0, scored: 0, errors: 0,
        next_cursor: null, remaining: 0,
      })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let processed = 0
    let scored = 0
    let errorCount = 0
    let currentCursor: string | null = initialCursor || null

    while (Date.now() - startTime < MAX_MS) {
    let query = supabaseAdmin
      .from('biens')
      .select('id, created_at, dpe, annee_construction, prix_fai, surface, moteurimmo_data')
      .eq('strategie_mdb', 'Travaux lourds')
      .eq('statut', 'Toujours disponible')
      .is('score_travaux', null)
      .not('moteurimmo_data', 'is', null)
      .order('created_at', { ascending: true })
      .limit(10)

    if (currentCursor) query = query.gt('created_at', currentCursor)

    const { data: biens, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!biens || biens.length === 0) break

    for (const bien of biens) {
      if (Date.now() - startTime >= MAX_MS) break
      try {
        const md = bien.moteurimmo_data as { title?: string; description?: string; pictureUrls?: string[] } | null
        const title = md?.title || ''
        const desc = (md?.description || '').slice(0, 900)
        const photoUrls = md?.pictureUrls || []

        if (!desc && !title) {
          await supabaseAdmin
            .from('biens')
            .update({ score_travaux: 1, score_commentaire: 'Pas de description disponible', score_analyse_statut: 'no_data', score_analyse_date: new Date().toISOString() })
            .eq('id', bien.id)
          processed++
          continue
        }

        const textContent = `${SCORE_PROMPT}\n\nTitre: ${title}\nDescription: ${desc}\nDPE: ${bien.dpe || 'NC'}\nAnnee: ${bien.annee_construction || 'NC'}\nPrix: ${bien.prix_fai} | Surface: ${bien.surface}m2`

        // Build message content: text + optional photos
        const contentParts: Anthropic.MessageCreateParams['messages'][0]['content'] = []

        if (withPhotos && photoUrls.length > 0) {
          // Add up to 3 photos for visual analysis
          for (const url of photoUrls.slice(0, 3)) {
            try {
              contentParts.push({ type: 'image', source: { type: 'url', url } })
            } catch { /* skip invalid URLs */ }
          }
        }

        contentParts.push({ type: 'text', text: withPhotos && photoUrls.length > 0
          ? textContent + '\n\nAnalyse aussi les photos ci-dessus pour affiner le score (etat des murs, sols, plafonds, facade, toiture, menuiseries).'
          : textContent
        })

        const message = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 150,
          messages: [{ role: 'user', content: contentParts }],
        })

        const responseText = message.content
          .filter(b => b.type === 'text')
          .map(b => b.type === 'text' ? b.text : '')
          .join('')

        const result = parseScoreResponse(responseText)
        if (!result) {
          console.error(`Failed to parse score for bien ${bien.id}: ${responseText}`)
          errorCount++
          processed++
          continue
        }

        await supabaseAdmin
          .from('biens')
          .update({
            score_travaux: result.score,
            score_commentaire: result.commentaire,
            score_analyse_statut: 'ok',
            score_analyse_date: new Date().toISOString(),
          })
          .eq('id', bien.id)

        scored++
        processed++
      } catch (aiErr) {
        console.error(`Score error for bien ${bien.id}:`, aiErr)
        await supabaseAdmin
          .from('biens')
          .update({ score_analyse_statut: 'erreur', score_analyse_date: new Date().toISOString() })
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
      scored,
      errors: errorCount,
      next_cursor: currentCursor,
      remaining: (totalRemaining || 0) - processed,
    })
  } catch (err) {
    console.error('Score travaux error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
