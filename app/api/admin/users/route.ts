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

export async function GET(req: NextRequest) {
  const user = await checkAdmin(req)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, plan, tmi, regime, created_at, strategies_autorisees, stripe_customer_id, prenom, nom, strategie_mdb')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Noms depuis auth.users (user_metadata)
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
  const authMap: Record<string, { full_name: string | null; last_sign_in_at: string | null }> = {}
  for (const au of authUsers) {
    const meta = au.user_metadata || {}
    const name = meta.full_name || meta.name || [meta.first_name, meta.last_name].filter(Boolean).join(' ') || null
    authMap[au.id] = { full_name: name, last_sign_in_at: au.last_sign_in_at || null }
  }

  // Stripe : statut abo + dernier paiement pour les clients payants
  const stripeData: Record<string, any> = {}
  if (process.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const payingUsers = (data || []).filter(u => u.stripe_customer_id)
    await Promise.all(payingUsers.map(async (u) => {
      try {
        const [subs, invoices] = await Promise.all([
          stripe.subscriptions.list({ customer: u.stripe_customer_id, limit: 1 }),
          stripe.invoices.list({ customer: u.stripe_customer_id, limit: 1 }),
        ])
        const sub = subs.data[0] as any
        const inv = invoices.data[0] as any
        stripeData[u.id] = {
          subscription_status: sub?.status || null,
          cancel_at_period_end: sub?.cancel_at_period_end || false,
          current_period_end: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          last_payment_date: inv?.created ? new Date(inv.created * 1000).toISOString() : null,
          last_payment_amount: inv?.amount_paid != null ? inv.amount_paid / 100 : null,
          last_payment_status: inv?.status || null,
        }
      } catch { /* Stripe error, skip */ }
    }))
  }

  const enriched = (data || []).map(u => {
    const displayName = [u.prenom, u.nom].filter(Boolean).join(' ') || authMap[u.id]?.full_name || null
    return {
      ...u,
      full_name: displayName,
      last_sign_in_at: authMap[u.id]?.last_sign_in_at || null,
      stripe: stripeData[u.id] || null,
    }
  })

  return NextResponse.json({ users: enriched })
}