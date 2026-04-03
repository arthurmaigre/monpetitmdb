import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

// GET — nombre de places early adopter restantes
export async function GET() {
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
