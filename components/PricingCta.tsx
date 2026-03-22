'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface PricingCtaProps {
  plan: 'pro' | 'expert'
  label: string
  className?: string
}

export default function PricingCta({ plan, label, className }: PricingCtaProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/register'
        return
      }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else window.location.href = '/register'
    } catch {
      window.location.href = '/register'
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
      style={{ display: 'block', textAlign: 'center', width: '100%' }}
    >
      {loading ? 'Redirection...' : label}
    </button>
  )
}
