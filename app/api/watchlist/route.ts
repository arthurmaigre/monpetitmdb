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
    .select('bien_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ watchlist: data })
}

// POST — ajouter un bien
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { bien_id } = await req.json()
  if (!bien_id) return NextResponse.json({ error: 'bien_id requis' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .insert({ user_id: user.id, bien_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
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