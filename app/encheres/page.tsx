import type { Metadata } from 'next'
import EncheresWrapper from './EncheresWrapper'

export const metadata: Metadata = {
  title: 'Enchères judiciaires immobilières | Mon Petit MDB',
  description: 'Ventes aux enchères judiciaires immobilières en France. Mise à prix, estimation DVF, décote, tribunal, documents juridiques.',
  alternates: {
    canonical: 'https://www.monpetitmdb.fr/encheres',
  },
  openGraph: {
    title: 'Enchères judiciaires immobilières | MonPetitMDB',
    description: 'Trouvez des biens en vente aux enchères judiciaires avec décote. Analyse MDB complète.',
    url: 'https://www.monpetitmdb.fr/encheres',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Enchères judiciaires immobilières | Mon Petit MDB',
    description: 'Ventes aux enchères judiciaires immobilières en France. Mise à prix, estimation DVF, décote, tribunal, documents juridiques.',
  },
}

export default function EncheresPage() {
  return <EncheresWrapper />
}
