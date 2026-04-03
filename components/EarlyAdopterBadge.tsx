'use client'

import { useEffect, useState } from 'react'

export default function EarlyAdopterBadge() {
  const [data, setData] = useState<{ active: boolean; remaining: number; percentOff: number } | null>(null)

  useEffect(() => {
    fetch('/api/stripe/early-adopter')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data?.active) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '12px',
      textAlign: 'center',
      marginBottom: '20px',
      fontSize: '14px',
      fontWeight: 600,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {'\uD83D\uDE80'} Offre early adopter : <strong>{`-${data.percentOff}% \u00E0 vie`}</strong> {'\u2014'} plus que <strong>{data.remaining} place{data.remaining > 1 ? 's' : ''}</strong> !
    </div>
  )
}
