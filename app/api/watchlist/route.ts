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

// GET — liste des bien_id en watchlist
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .select('bien_id, created_at, score_travaux_perso')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ watchlist: data })
}

// POST — ajouter un bien
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const { bien_id } = await req.json()
  if (!bien_id) return NextResponse.json({ error: 'bien_id requis' }, { status: 400 })

  // V\u00E9rifier la limite watchlist selon le plan
  const WATCHLIST_LIMITS: Record<string, number | null> = {
    free: 10,
    pro: 50,
    expert: null, // illimit\u00E9
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const plan = profile?.plan || 'free'
  const limit = WATCHLIST_LIMITS[plan] ?? 10

  if (limit !== null) {
    const { count, error: countError } = await supabaseAdmin
      .from('watchlist')
      .select('bien_id', { count: 'exact', head: true })
      .eq('user_id', user.id)

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

  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .insert({ user_id: user.id, bien_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

// PATCH — mettre a jour le score travaux perso
export async function PATCH(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { bien_id, score_travaux_perso } = await req.json()
  if (!bien_id) return NextResponse.json({ error: 'bien_id requis' }, { status: 400 })
  if (score_travaux_perso !== null && (score_travaux_perso < 1 || score_travaux_perso > 5)) {
    return NextResponse.json({ error: 'Score entre 1 et 5' }, { status: 400 })
  }

  // Upsert : si pas encore en watchlist, l'ajouter
  const { data: existing } = await supabaseAdmin
    .from('watchlist')
    .select('bien_id')
    .eq('user_id', user.id)
    .eq('bien_id', bien_id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabaseAdmin
      .from('watchlist')
      .update({ score_travaux_perso })
      .eq('user_id', user.id)
      .eq('bien_id', bien_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabaseAdmin
      .from('watchlist')
      .insert({ user_id: user.id, bien_id, score_travaux_perso })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE — retirer un bien
export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { bien_id } = await req.json()
  if (!bien_id) return NextResponse.json({ error: 'bien_id requis' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('bien_id', bien_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}