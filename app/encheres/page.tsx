import type { Metadata } from 'next'
import EncheresWrapper from './EncheresWrapper'

export const metadata: Metadata = {
  title: 'Enchères judiciaires immobilières | Mon Petit MDB',
  description: 'Ventes aux enchères judiciaires immobilières en France. Mise à prix, estimation DVF, décote, tribunal, documents juridiques.',
  alternates: {
    canonical: '/encheres',
  },
}

export default function EncheresPage() {
  return <EncheresWrapper />
}
