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

    return NextResponse.json(data)
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
