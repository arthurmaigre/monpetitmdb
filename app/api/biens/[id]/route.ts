import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabaseAdmin
    .from('biens')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
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
  { params }: { params: { id: string } }
) {
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
    .select('loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann')
    .eq('id', params.id)
    .single()

  if (!bien) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })

  const champsAutorises = ['loyer', 'type_loyer', 'charges_rec', 'charges_copro', 'taxe_fonc_ann']
  const updates: any = {}
  for (const champ of champsAutorises) {
    if (body[champ] !== undefined && (bien as any)[champ] === null) {
      updates[champ] = body[champ]
    }
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Aucun champ modifiable' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('biens')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bien: data })
}