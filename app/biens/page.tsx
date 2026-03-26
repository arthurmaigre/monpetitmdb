'use client'

import dynamic from 'next/dynamic'

const BiensClient = dynamic(() => import('./BiensClient'), { ssr: false })

export default function BiensPage() {
  return <BiensClient />
}
