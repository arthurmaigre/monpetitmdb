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

  const { plan } = await req.json()
  const priceId = PRICE_IDS[plan]
  if (!priceId) return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })

  // Early adopter : coupon -30% a vie, limite a 100 utilisateurs
  const earlyAdopterCoupon = process.env.STRIPE_COUPON_EARLY_ADOPTER
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined
  if (earlyAdopterCoupon) {
    try {
      const coupon = await stripe.coupons.retrieve(earlyAdopterCoupon)
      if (coupon.valid) {
        discounts = [{ coupon: earlyAdopterCoupon }]
      }
    } catch { /* coupon invalide ou expire, on continue sans */ }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    metadata: { supabase_user_id: user.id, plan },
    line_items: [{ price: priceId, quantity: 1 }],
    ...(discounts ? { discounts } : {}),
    success_url: `${req.headers.get('origin')}/mon-profil?payment=success`,
    cancel_url: `${req.headers.get('origin')}/mon-profil?payment=cancel`,
  })

  return NextResponse.json({ url: session.url })
}
