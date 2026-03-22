import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_PRO || 'price_1TDnxVBsP350Ff8hRjhx0tXi']: 'pro',
  [process.env.STRIPE_PRICE_EXPERT || 'price_1TDnxoBsP350Ff8hsBhWz9Qn']: 'expert',
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.supabase_user_id
    const plan = session.metadata?.plan
    if (userId && plan) {
      await supabaseAdmin
        .from('profiles')
        .update({ plan, stripe_customer_id: session.customer as string })
        .eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    const priceId = subscription.items.data[0]?.price.id
    const plan = PRICE_TO_PLAN[priceId] || 'free'
    const customerId = subscription.customer as string

    if (subscription.status === 'active') {
      await supabaseAdmin
        .from('profiles')
        .update({ plan })
        .eq('stripe_customer_id', customerId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string
    await supabaseAdmin
      .from('profiles')
      .update({ plan: 'free' })
      .eq('stripe_customer_id', customerId)
  }

  return NextResponse.json({ received: true })
}
