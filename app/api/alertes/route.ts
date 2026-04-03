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

// GET — liste des alertes de l'utilisateur
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', user.id).single()
  const plan = profile?.plan || 'free'
  if (plan !== 'pro' && plan !== 'expert') return NextResponse.json({ error: 'R\u00E9serv\u00E9 aux plans Pro et Expert' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('alertes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const maxAlertes = plan === 'expert' ? 5 : 1
  return NextResponse.json({ alertes: data, maxAlertes })
}

// POST — créer une alerte
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', user.id).single()
  const plan = profile?.plan || 'free'
  if (plan !== 'pro' && plan !== 'expert') return NextResponse.json({ error: 'R\u00E9serv\u00E9 aux plans Pro et Expert' }, { status: 403 })

  const maxAlertes = plan === 'expert' ? 5 : 1
  const { count } = await supabaseAdmin.from('alertes').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  if ((count ?? 0) >= maxAlertes) return NextResponse.json({ error: `Maximum ${maxAlertes} alerte${maxAlertes > 1 ? 's' : ''}` }, { status: 400 })

  const body = await req.json()
  const { nom, strategie_mdb, metropole, ville, code_postal, prix_min, prix_max, surface_min, surface_max, rendement_min, score_travaux_min, frequence } = body

  if (!nom || !strategie_mdb) return NextResponse.json({ error: 'Nom et strat\u00E9gie requis' }, { status: 400 })

  const filtres: Record<string, any> = { strategie_mdb }
  if (metropole) filtres.metropole = metropole
  if (ville) filtres.ville = ville
  if (code_postal) filtres.code_postal = code_postal
  if (prix_min) filtres.prix_min = Number(prix_min)
  if (prix_max) filtres.prix_max = Number(prix_max)
  if (surface_min) filtres.surface_min = Number(surface_min)
  if (surface_max) filtres.surface_max = Number(surface_max)
  if (rendement_min) filtres.rendement_min = Number(rendement_min)
  if (score_travaux_min) filtres.score_travaux_min = Number(score_travaux_min)

  const { data, error } = await supabaseAdmin
    .from('alertes')
    .insert({
      user_id: user.id,
      nom,
      filtres,
      frequence: frequence || 'quotidien',
      enabled: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alerte: data }, { status: 201 })
}

// PATCH — activer/désactiver une alerte
export async function PATCH(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const { id, enabled } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('alertes')
    .update({ enabled })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — supprimer une alerte
export async function DELETE(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('alertes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
