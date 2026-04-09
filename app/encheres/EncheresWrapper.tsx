'use client'

import dynamic from 'next/dynamic'

const EncheresClient = dynamic(() => import('./EncheresClient'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6a60' }}>
      Chargement...
    </div>
  ),
})

export default function EncheresWrapper() {
  return <EncheresClient />
}
