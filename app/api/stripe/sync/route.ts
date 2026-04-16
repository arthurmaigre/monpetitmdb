import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_PRO || 'price_1TITHvB8W2KbjDORI3BQPve6']: 'pro',
  [process.env.STRIPE_PRICE_EXPERT || 'price_1TITHsB8W2KbjDORrE8wCWpc']: 'expert',
}

// GET /api/stripe/sync — vérifie le plan Stripe et met à jour Supabase si nécessaire
// Utilisé comme fallback après retour Stripe si le webhook n'a pas encore déclenché
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ plan: profile?.plan || 'free', synced: false })
    }

    const stripe = getStripe()
    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    })

    let stripePlan = 'free'
    if (subs.data.length > 0) {
      const priceId = subs.data[0].items.data[0]?.price.id
      stripePlan = PRICE_TO_PLAN[priceId] || 'free'
    }

    // Mettre à jour Supabase si le plan Stripe diffère
    if (stripePlan !== profile.plan) {
      await supabaseAdmin
        .from('profiles')
        .update({ plan: stripePlan })
        .eq('id', user.id)
      return NextResponse.json({ plan: stripePlan, synced: true })
    }

    return NextResponse.json({ plan: profile.plan, synced: false })
  } catch (err: any) {
    console.error('[stripe/sync] Erreur:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Erreur sync' }, { status: 500 })
  }
}
