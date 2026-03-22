import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

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
// GET /api/admin/stats
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await checkAdminOrCron(req)
    if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Run all count queries in parallel
    const [
      totalRes,
      usersRes,
      watchlistRes,
      locataireRes,
      travauxRes,
      divisionRes,
      decoupeRes,
      disponibleRes,
      expireeRes,
      fauxPositifRes,
      extractionPendingRes,
      scorePendingRes,
    ] = await Promise.all([
      // Total biens
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true }),
      // Total users
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      // Total watchlist
      supabaseAdmin.from('watchlist').select('id', { count: 'exact', head: true }),
      // By strategie
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
        .eq('strategie_mdb', 'Locataire en place'),
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
        .eq('strategie_mdb', 'Travaux lourds'),
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
        .eq('strategie_mdb', 'Division'),
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
        .eq('strategie_mdb', 'Découpe'),
      // By statut
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
        .eq('statut', 'Toujours disponible'),
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
        .eq('statut', 'Annonce expirée'),
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
        .eq('statut', 'Faux positif'),
      // Extraction pending (Locataire en place, profil_locataire IS null)
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
        .eq('strategie_mdb', 'Locataire en place')
        .eq('statut', 'Toujours disponible')
        .is('profil_locataire', null),
      // Score pending (Travaux lourds + Locataire en place, score_travaux IS null)
      supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
        .in('strategie_mdb', ['Travaux lourds', 'Locataire en place'])
        .eq('statut', 'Toujours disponible')
        .is('score_travaux', null),
    ])

    return NextResponse.json({
      biens: totalRes.count || 0,
      users: usersRes.count || 0,
      watchlist: watchlistRes.count || 0,
      by_strategie: {
        'Locataire en place': locataireRes.count || 0,
        'Travaux lourds': travauxRes.count || 0,
        'Division': divisionRes.count || 0,
        'Découpe': decoupeRes.count || 0,
      },
      by_statut: {
        'Toujours disponible': disponibleRes.count || 0,
        'Annonce expirée': expireeRes.count || 0,
        'Faux positif': fauxPositifRes.count || 0,
      },
      pending: {
        extraction: extractionPendingRes.count || 0,
        score_travaux: scorePendingRes.count || 0,
      },
    })
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
