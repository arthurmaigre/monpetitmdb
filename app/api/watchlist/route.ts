import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

// GET — liste des bien_id en watchlist (avec source_table)
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .select('bien_id, created_at, score_travaux_perso, suivi, source_table')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ watchlist: data })
}

// POST — ajouter un bien ou une enchère
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { bien_id, source_table } = body
  if (!bien_id) return NextResponse.json({ error: 'bien_id requis' }, { status: 400 })

  const table = source_table === 'encheres' ? 'encheres' : 'biens'

  // Vérifier la limite watchlist selon le plan
  const WATCHLIST_LIMITS: Record<string, number | null> = {
    free: 10,
    pro: 50,
    expert: null,
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan || 'free'
  const limit = plan in WATCHLIST_LIMITS ? WATCHLIST_LIMITS[plan] : 10

  if (limit !== null) {
    const { count, error: countError } = await supabaseAdmin
      .from('watchlist')
      .select('bien_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('suivi', 'archive')

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })

    if ((count ?? 0) >= limit) {
      return NextResponse.json({
        error: 'Limite watchlist atteinte',
        limit,
        plan,
        upgrade: true,
      }, { status: 403 })
    }
  }

  // Vérifier doublon (même bien_id + même source_table)
  const { data: existing } = await supabaseAdmin
    .from('watchlist')
    .select('bien_id')
    .eq('user_id', user.id)
    .eq('bien_id', bien_id)
    .eq('source_table', table)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Déjà dans la watchlist' }, { status: 409 })

  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .insert({ user_id: user.id, bien_id, source_table: table })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

// PATCH — mettre a jour le score travaux perso ou le suivi
const SUIVI_VALUES = ['a_analyser', 'info_demandee', 'analyse_complete', 'offre_envoyee', 'en_negociation', 'visite', 'sous_compromis', 'acte_signe', 'ko_pas_rentable', 'ko_offre_refusee', 'ko_non_conforme', 'ko_vendu', 'ko_autre', 'archive']

export async function PATCH(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const body = await req.json()
  const { bien_id, score_travaux_perso, suivi, source_table } = body
  if (!bien_id) return NextResponse.json({ error: 'bien_id requis' }, { status: 400 })
  if (score_travaux_perso !== undefined && score_travaux_perso !== null && (score_travaux_perso < 1 || score_travaux_perso > 5)) {
    return NextResponse.json({ error: 'Score entre 1 et 5' }, { status: 400 })
  }
  if (suivi !== undefined && !SUIVI_VALUES.includes(suivi)) {
    return NextResponse.json({ error: 'Statut de suivi invalide' }, { status: 400 })
  }

  const table = source_table === 'encheres' ? 'encheres' : 'biens'
  const updates: Record<string, any> = {}
  if (score_travaux_perso !== undefined) updates.score_travaux_perso = score_travaux_perso
  if (suivi !== undefined) updates.suivi = suivi

  // Upsert : si pas encore en watchlist, l'ajouter
  const { data: existing } = await supabaseAdmin
    .from('watchlist')
    .select('bien_id')
    .eq('user_id', user.id)
    .eq('bien_id', bien_id)
    .eq('source_table', table)
    .maybeSingle()

  if (existing) {
    const { error } = await supabaseAdmin
      .from('watchlist')
      .update(updates)
      .eq('user_id', user.id)
      .eq('bien_id', bien_id)
      .eq('source_table', table)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin
      .from('watchlist')
      .insert({ user_id: user.id, bien_id, source_table: table, ...updates })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE — archiver un bien (soft delete)
export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const body = await req.json()
  const { bien_id, source_table } = body
  if (!bien_id) return NextResponse.json({ error: 'bien_id requis' }, { status: 400 })

  const table = source_table === 'encheres' ? 'encheres' : 'biens'

  const { error } = await supabaseAdmin
    .from('watchlist')
    .update({ suivi: 'archive' })
    .eq('user_id', user.id)
    .eq('bien_id', bien_id)
    .eq('source_table', table)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
