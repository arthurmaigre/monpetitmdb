import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('biens')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Bien introuvable' }, { status: 404 })
  }

  let photoUrl = null
  if (data.photo_storage_path) {
    const { data: signed } = await supabaseAdmin
      .storage
      .from('mdb-files')
      .createSignedUrl(data.photo_storage_path, 3600 * 24 * 7)
    photoUrl = signed?.signedUrl ?? null
  }

  return NextResponse.json({ bien: { ...data, photo_signed_url: photoUrl } })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const body = await req.json()

  const { data: bien } = await supabaseAdmin
    .from('biens')
    .select('loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann, prix_fai, adresse, latitude, longitude')
    .eq('id', id)
    .maybeSingle()

  if (!bien) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })

  const { data: userEdits } = await supabaseAdmin
    .from('biens_user_edits')
    .select('champ')
    .eq('bien_id', id)

  const champsUserEdits = new Set(userEdits?.map((e: any) => e.champ) || [])

  const champsAutorises = ['loyer', 'type_loyer', 'charges_rec', 'charges_copro', 'taxe_fonc_ann', 'fin_bail', 'adresse', 'latitude', 'longitude']
  const updates: any = {}
  const audits: any[] = []

  for (const champ of champsAutorises) {
    if (body[champ] === undefined) continue
    const valeurActuelle = (bien as any)[champ]
    const champsLibres = ['adresse', 'latitude', 'longitude', 'fin_bail']
    if (valeurActuelle === null || champsUserEdits.has(champ) || champsLibres.includes(champ)) {
      updates[champ] = body[champ]
      audits.push({
        bien_id: id,
        user_id: user.id,
        champ,
        ancienne_valeur: valeurActuelle !== null ? String(valeurActuelle) : null,
        nouvelle_valeur: String(body[champ])
      })
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ modifiable' }, { status: 400 })
  }

  // Recalculer le rendement brut si le loyer est mis à jour
  const nouveauLoyer = updates.loyer ?? bien.loyer
  if (nouveauLoyer && bien.prix_fai) {
    updates.rendement_brut = (nouveauLoyer * 12) / bien.prix_fai
  }

  const { data, error } = await supabaseAdmin
    .from('biens')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (audits.length > 0) {
    await supabaseAdmin.from('biens_user_edits').insert(audits)
  }

  return NextResponse.json({ bien: data })
}