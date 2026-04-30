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
// Accessible publiquement (sans auth) — retourne uniquement remaining/maxRedemptions
// Avec auth admin — retourne aussi active et percentOff
export async function GET(req: NextRequest) {
  const isAdmin = !!(await getAdminUser(req))

  const couponId = process.env.STRIPE_COUPON_EARLY_ADOPTER
  if (!couponId) return NextResponse.json({ active: false, remaining: 0, maxRedemptions: 100 })

  try {
    const stripe = getStripe()
    const coupon = await stripe.coupons.retrieve(couponId)

    const maxRedemptions = coupon.max_redemptions || 100
    const timesRedeemed = coupon.times_redeemed || 0
    const remaining = maxRedemptions - timesRedeemed

    if (isAdmin) {
      return NextResponse.json({
        active: coupon.valid && remaining > 0,
        remaining,
        maxRedemptions,
        percentOff: coupon.percent_off,
      })
    }

    return NextResponse.json({ remaining, maxRedemptions })
  } catch {
    return NextResponse.json({ remaining: 0, maxRedemptions: 100 })
  }
}
