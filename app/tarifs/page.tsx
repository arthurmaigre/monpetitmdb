'use client'

import { useEffect } from 'react'

export default function TarifsPage() {
  useEffect(() => {
    window.location.href = '/#pricing'
  }, [])

  return (
    <head>
      <meta name="robots" content="noindex, nofollow" />
    </head>
  )
}
