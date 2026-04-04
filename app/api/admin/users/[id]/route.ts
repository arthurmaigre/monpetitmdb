import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return null

  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await checkAdmin(req)
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 403 })

  const body = await req.json()
  const allowed = ['plan', 'role', 'strategies_autorisees']
  const updates: any = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 })
  return NextResponse.json({ user: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await checkAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Non autorise' }, { status: 403 })

  // Empecher la suppression de son propre compte
  if (id === admin.id) return NextResponse.json({ error: 'Impossible de supprimer votre propre compte' }, { status: 400 })

  // Recuperer stripe_customer_id pour annuler l'abo Stripe
  const { data: profile } = await supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', id).single()

  // Annuler l'abonnement Stripe si existant
  if (profile?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
      const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'active', limit: 10 })
      await Promise.all(subs.data.map(sub => stripe.subscriptions.cancel(sub.id)))
    } catch { /* Stripe error, continue deletion */ }
  }

  // Supprimer watchlist + alertes + profile
  await supabaseAdmin.from('watchlist').delete().eq('user_id', id)
  await supabaseAdmin.from('alertes').delete().eq('user_id', id)
  await supabaseAdmin.from('profiles').delete().eq('id', id)

  // Supprimer le user auth
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true })
}