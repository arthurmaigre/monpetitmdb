import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/source-overrides
 * Enregistre une tentative de modification d'une donnée source (SE/IA).
 * Déclenché côté client quand l'utilisateur confirme le modal d'alerte.
 *
 * GET /api/admin/source-overrides
 * Retourne la liste des overrides (admin uniquement).
 */

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { bienId, champ, ancienneValeur } = await request.json()
  if (!bienId || !champ) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('biens_source_overrides')
    .insert({ bien_id: bienId, user_id: user.id, champ, ancienne_valeur: ancienneValeur != null ? String(ancienneValeur) : null })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  // Admin only — vérifié via email
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (user.email !== 'arthur.maigre@gmail.com') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('biens_source_overrides')
    .select('id, bien_id, user_id, champ, ancienne_valeur, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ overrides: data || [] })
}
