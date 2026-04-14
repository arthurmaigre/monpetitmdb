import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_1TDnxVBsP350Ff8hRjhx0tXi',
  expert: process.env.STRIPE_PRICE_EXPERT || 'price_1TDnxoBsP350Ff8hsBhWz9Qn',
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
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

  const { plan, success_url, cancel_url } = await req.json()
  const priceId = PRICE_IDS[plan]
  if (!priceId) return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })

  // Récupérer le stripe_customer_id existant pour éviter les doublons
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerParam: { customer: string } | { customer_email: string }
  if (profile?.stripe_customer_id) {
    customerParam = { customer: profile.stripe_customer_id }
  } else {
    const stripeCustomer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomer.id })
      .eq('id', user.id)
    customerParam = { customer: stripeCustomer.id }
  }

  const origin = req.headers.get('origin')
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    ...customerParam,
    metadata: { supabase_user_id: user.id, plan },
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: success_url ? `${origin}${success_url}` : `${origin}/mon-profil?payment=success`,
    cancel_url: cancel_url ? `${origin}${cancel_url}` : `${origin}/mon-profil?payment=cancel`,
  })

  return NextResponse.json({ url: session.url })
}
