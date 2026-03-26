'use client'

import { useEffect } from 'react'

export default function TarifsPage() {
  useEffect(() => {
    window.location.href = '/#pricing'
  }, [])

  return null
}
