import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

async function getAdminUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return null
  return user
}

// GET — nombre de places early adopter restantes
export async function GET(req: NextRequest) {
  const user = await getAdminUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })


  const couponId = process.env.STRIPE_COUPON_EARLY_ADOPTER
  if (!couponId) return NextResponse.json({ active: false })

  try {
    const stripe = getStripe()
    const coupon = await stripe.coupons.retrieve(couponId)
    if (!coupon.valid) return NextResponse.json({ active: false })

    const maxRedemptions = coupon.max_redemptions || 100
    const timesRedeemed = coupon.times_redeemed || 0
    const remaining = maxRedemptions - timesRedeemed

    return NextResponse.json({
      active: remaining > 0,
      remaining,
      maxRedemptions,
      percentOff: coupon.percent_off,
    })
  } catch {
    return NextResponse.json({ active: false })
  }
}
