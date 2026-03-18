import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function PUT(
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
  const { message_contact, message_statut } = body

  const statutsValides = ['brouillon', 'envoye', 'repondu']
  if (!message_contact || !statutsValides.includes(message_statut)) {
    return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('biens')
    .update({
      message_contact,
      message_statut,
      message_date: new Date().toISOString()
    })
    .eq('id', id)
    .select('message_contact, message_statut, message_date')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, ...data })
}
