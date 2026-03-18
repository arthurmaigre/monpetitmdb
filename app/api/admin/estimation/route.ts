import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return false
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.role === 'admin'
}

export async function GET(req: NextRequest) {
  const isAdmin = await checkAdmin(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorise' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('estimation_config')
    .select('config, updated_at')
    .eq('id', 1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const isAdmin = await checkAdmin(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorise' }, { status: 403 })

  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('estimation_config')
    .update({ config: body.config, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
