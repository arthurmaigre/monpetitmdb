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
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/register'; return }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Erreur lors de la redirection. Réessayez ou contactez le support.')
      }
    } catch {
      setError('Erreur de connexion. Vérifiez votre réseau et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className}
        style={{ display: 'block', textAlign: 'center', width: '100%' }}
      >
        {loading ? 'Redirection...' : label}
      </button>

      {error && (
        <div style={{ marginTop: '8px', padding: '10px 14px', background: '#fdedec', color: '#c0392b', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>
          {error}
        </div>
      )}
    </>
  )
}
