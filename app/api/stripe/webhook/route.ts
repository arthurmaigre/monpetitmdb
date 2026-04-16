import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_PRO || 'price_1TITHvB8W2KbjDORI3BQPve6']: 'pro',
  [process.env.STRIPE_PRICE_EXPERT || 'price_1TITHsB8W2KbjDORrE8wCWpc']: 'expert',
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
    try {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      const plan = session.metadata?.plan
      if (userId && plan) {
        await supabaseAdmin
          .from('profiles')
          .update({ plan, stripe_customer_id: session.customer as string })
          .eq('id', userId)
      }
    } catch (err) {
      console.error('[webhook] checkout.session.completed error:', err)
    }
  }

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    try {
      const subscription = event.data.object as Stripe.Subscription
      const priceId = subscription.items.data[0]?.price.id
      const customerId = subscription.customer as string

      // Essayer d'abord via les metadata de la subscription (plus fiable)
      const userId = subscription.metadata?.supabase_user_id

      if (subscription.status === 'active') {
        const plan = PRICE_TO_PLAN[priceId]
        if (plan) {
          if (userId) {
            await supabaseAdmin
              .from('profiles')
              .update({ plan, stripe_customer_id: customerId })
              .eq('id', userId)
          } else {
            await supabaseAdmin
              .from('profiles')
              .update({ plan })
              .eq('stripe_customer_id', customerId)
          }
        }
      } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        await supabaseAdmin
          .from('profiles')
          .update({ plan: 'free' })
          .eq('stripe_customer_id', customerId)
      }
    } catch (err) {
      console.error(`[webhook] ${event.type} error:`, err)
    }
  }

  if (event.type === 'invoice.payment_failed') {
    try {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      console.warn(`[Stripe] Paiement echoue pour customer ${customerId} — Stripe retentera automatiquement`)
    } catch (err) {
      console.error('[webhook] invoice.payment_failed error:', err)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    try {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      await supabaseAdmin
        .from('profiles')
        .update({ plan: 'free' })
        .eq('stripe_customer_id', customerId)
    } catch (err) {
      console.error('[webhook] customer.subscription.deleted error:', err)
    }
  }

  return NextResponse.json({ received: true })
}
