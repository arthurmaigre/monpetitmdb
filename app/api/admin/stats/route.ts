import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

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
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await checkAdminOrCron(req)
    if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Une seule requête SQL pour toutes les stats
    const { data, error } = await supabaseAdmin.rpc('admin_stats')

    if (error) {
      // Fallback: si la fonction n'existe pas, retourner des zeros
      console.error('admin_stats RPC error:', error)
      return NextResponse.json({
        biens: 0, users: 0, watchlist: 0, total: 0,
        disponible: 0, expiree: 0, faux_positifs: 0,
        locataire: 0, travaux: 0, division: 0, decoupe: 0,
        regex_done: 0, regex_pending: 0,
        extraction_done: 0, extraction_pending: 0,
        score_done: 0, score_pending: 0,
        estimation_done: 0, estimation_pending: 0,
        loc_actif: 0, loc_sans_loyer: 0, loc_sans_charges: 0,
        loc_sans_taxe: 0, loc_sans_profil: 0, loc_sans_bail: 0, loc_completude: 0,
        trav_actif: 0, trav_sans_score: 0, trav_sans_dpe: 0, trav_completude: 0,
        sans_prix: 0, sans_surface: 0, avec_photo: 0, sans_photo: 0,
      })
    }

    // Recent activity stats
    const now = new Date()
    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [r24, r7, e24, e7] = await Promise.all([
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true }).gte('created_at', h24),
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true }).gte('created_at', d7),
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true }).eq('statut', 'Annonce expir\u00E9e').gte('derniere_verif_statut', h24),
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true }).eq('statut', 'Annonce expir\u00E9e').gte('derniere_verif_statut', d7),
    ])

    // Moteur Immo count (7 days) — quick call per strategy
    let moteurimmo_7d = 0
    const apiKey = process.env.MOTEURIMMO_API_KEY
    if (apiKey) {
      const d7date = d7.slice(0, 10)
      const nowDate = now.toISOString().slice(0, 10)
      const strategies = [
        { keywords: ['locataire en place', 'vendu lou\u00E9', 'bail en cours'], categories: ['house', 'flat', 'block'] },
        { keywords: ['\u00E0 r\u00E9nover', 'r\u00E9novation compl\u00E8te', 'gros travaux', 'tout \u00E0 refaire'], categories: ['house', 'flat', 'block'], options: ['hasWorksRequired'] },
        { keywords: ['divisible', 'possibilit\u00E9 de division', 'division possible'], categories: ['house', 'flat', 'block', 'misc'] },
        { keywords: ['immeuble de rapport', 'monopropri\u00E9t\u00E9', 'vente en bloc'], categories: ['block', 'house'] },
      ]
      try {
        const counts = await Promise.all(strategies.map(async (s) => {
          const body: Record<string, unknown> = {
            types: ['sale'], categories: s.categories, keywords: s.keywords,
            keywordsOperator: 'or', maxLength: 1, page: 1,
            creationDateAfter: d7date, creationDateBefore: nowDate, apiKey,
          }
          if ((s as any).options) body.options = (s as any).options
          const resp = await fetch('https://moteurimmo.fr/api/ads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          if (!resp.ok) return 0
          const result = await resp.json()
          return result.nbResults || result.totalResults || (Array.isArray(result.ads) ? result.ads.length : 0)
        }))
        moteurimmo_7d = counts.reduce((a, b) => a + b, 0)
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      ...data,
      added_24h: r24.count || 0,
      added_7d: r7.count || 0,
      expired_24h: e24.count || 0,
      expired_7d: e7.count || 0,
      moteurimmo_7d,
    })
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
