import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_1TITHvB8W2KbjDORI3BQPve6',
  expert: process.env.STRIPE_PRICE_EXPERT || 'price_1TITHsB8W2KbjDORrE8wCWpc',
}

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_PRO || 'price_1TITHvB8W2KbjDORI3BQPve6']: 'pro',
  [process.env.STRIPE_PRICE_EXPERT || 'price_1TITHsB8W2KbjDORrE8wCWpc']: 'expert',
}

export async function POST(req: NextRequest) {
  try {
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

    const origin = req.headers.get('origin') || 'https://www.monpetitmdb.fr'

    // Récupérer le stripe_customer_id existant (via supabaseAdmin partagé — clé correcte)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId: string

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id

      // Vérifier si une subscription active existe déjà
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      })

      if (existingSubs.data.length > 0) {
        const sub = existingSubs.data[0]
        const currentPriceId = sub.items.data[0]?.price.id

        if (currentPriceId === priceId) {
          // Déjà abonné à ce plan — rediriger vers le portail
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/mon-profil`,
          })
          return NextResponse.json({ url: portalSession.url, alreadySubscribed: true })
        }

        // Upgrade : modifier la subscription existante (Pro → Expert)
        const targetPlan = PRICE_TO_PLAN[priceId] || plan
        await stripe.subscriptions.update(sub.id, {
          items: [{ id: sub.items.data[0].id, price: priceId }],
          proration_behavior: 'create_prorations',
          metadata: { supabase_user_id: user.id, plan: targetPlan },
        })

        // Mettre à jour le plan en Supabase immédiatement
        await supabaseAdmin
          .from('profiles')
          .update({ plan: targetPlan })
          .eq('id', user.id)

        return NextResponse.json({ url: `${origin}/mon-profil?payment=success`, upgraded: true })
      }
    } else {
      // Créer un nouveau customer Stripe
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = stripeCustomer.id
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Créer une nouvelle session Checkout (premier abonnement)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      metadata: { supabase_user_id: user.id, plan },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan },
      },
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: success_url ? `${origin}${success_url}` : `${origin}/mon-profil?payment=success`,
      cancel_url: cancel_url ? `${origin}${cancel_url}` : `${origin}/mon-profil?payment=cancel`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[stripe/checkout] Erreur:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}
