'use client'

import { useEffect, useState } from 'react'

type EarlyAdopterData = {
  remaining: number
  maxRedemptions: number
}

export default function EarlyAdopterBadge() {
  const [data, setData] = useState<EarlyAdopterData | null>(null)

  useEffect(() => {
    fetch('/api/stripe/early-adopter')
      .then(r => r.json())
      .then((d: EarlyAdopterData) => {
        if (typeof d.remaining === 'number') setData(d)
      })
      .catch(() => {})
  }, [])

  const taken = data ? data.maxRedemptions - data.remaining : null

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
      {'🎯'} Early Bird <strong>{'-30 % à vie'}</strong> {'—'} Code EARLYBIRD
      <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 400, opacity: 0.9 }}>
        {data !== null
          ? <>{taken}/{data.maxRedemptions} places prises — il en reste <strong>{data.remaining}</strong></>
          : <>Code promo : <strong style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.05em' }}>EARLYBIRD</strong> {'à saisir au moment du paiement'}</>
        }
      </div>
    </div>
  )
}
