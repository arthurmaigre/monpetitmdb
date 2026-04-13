import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  const body = await req.json()
  const allowed = ['prenom', 'nom', 'entreprise', 'tmi', 'regime', 'regime2', 'strategie_mdb', 'strategie_mdb_2', 'apport', 'apport_pct', 'taux_credit', 'duree_ans', 'frais_notaire', 'metropole_favorite', 'taux_assurance', 'objectif_cashflow', 'objectif_pv', 'budget_travaux_m2', 'assurance_pno', 'frais_gestion_pct', 'honoraires_comptable', 'cfe', 'frais_oga', 'frais_bancaires', 'type_credit']
  const updates: any = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  // Cooldown 7 jours pour changement strategie/regime2 en Pro
  const proRestrictedFields = ['strategie_mdb', 'strategie_mdb_2', 'regime2']
  const hasProRestricted = proRestrictedFields.some(f => body[f] !== undefined)
  if (hasProRestricted) {
    const { data: current } = await supabaseAdmin.from('profiles').select('plan, role, pro_config_updated_at').eq('id', user.id).single()
    const isAdmin = current?.role === 'admin'
    if (!isAdmin && current?.plan === 'pro' && current?.pro_config_updated_at) {
      const lastChange = new Date(current.pro_config_updated_at)
      const daysSince = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) {
        const nextDate = new Date(lastChange.getTime() + 7 * 24 * 60 * 60 * 1000)
        return NextResponse.json({ error: `Modification possible \u00E0 partir du ${nextDate.toLocaleDateString('fr-FR')}`, cooldown: true, nextDate: nextDate.toISOString() }, { status: 429 })
      }
    }
    if (current?.plan === 'pro') updates.pro_config_updated_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}