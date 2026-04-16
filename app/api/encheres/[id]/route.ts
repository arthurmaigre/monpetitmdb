import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data, error } = await supabase
    .from('encheres')
    .select('*')
    .eq('id', id)
    .eq('enrichissement_statut', 'ok')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Enchere introuvable' }, { status: 404 })
  }

  return NextResponse.json({ enchere: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  const { data: enchere } = await supabaseAdmin
    .from('encheres')
    .select('surface, nb_pieces, nb_lots, loyer, charges_copro, taxe_fonc_ann, adresse, latitude, longitude, score_travaux, score_commentaire, mise_a_prix, frais_preemption')
    .eq('id', id)
    .maybeSingle()

  if (!enchere) return NextResponse.json({ error: 'Enchère introuvable' }, { status: 404 })

  const champsAutorises = [
    'surface', 'nb_pieces', 'nb_lots',
    'loyer', 'charges_copro', 'taxe_fonc_ann',
    'adresse', 'latitude', 'longitude',
    'score_travaux', 'score_commentaire', 'lots_data',
    'frais_preemption',
  ]
  const champsLibres = ['adresse', 'latitude', 'longitude', 'score_travaux', 'score_commentaire', 'lots_data']

  const { data: userEdits } = await supabaseAdmin
    .from('biens_user_edits')
    .select('champ')
    .eq('bien_id', id)

  const champsUserEdits = new Set(userEdits?.map((e: any) => e.champ) || [])

  const updates: any = {}
  const audits: any[] = []

  for (const champ of champsAutorises) {
    if (body[champ] === undefined) continue
    const valeurActuelle = (enchere as any)[champ]
    if (valeurActuelle === null || champsUserEdits.has(champ) || champsLibres.includes(champ)) {
      updates[champ] = body[champ]
      audits.push({
        bien_id: id,
        user_id: user.id,
        champ,
        ancienne_valeur: valeurActuelle !== null ? String(valeurActuelle) : null,
        nouvelle_valeur: String(body[champ]),
      })
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ modifiable' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('encheres')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (audits.length > 0) {
    await supabaseAdmin.from('biens_user_edits').insert(audits)
  }

  return NextResponse.json({ enchere: data })
}
