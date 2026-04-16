import type { Metadata } from 'next'
import EncheresWrapper from './EncheresWrapper'

export const metadata: Metadata = {
  title: 'Enchères immobilières — MonPetitMDB',
  description: 'Trouvez les meilleures ventes aux enchères immobilières en France. Biens sélectionnés selon les critères marchands de biens.',
  alternates: {
    canonical: 'https://www.monpetitmdb.fr/encheres',
  },
  openGraph: {
    title: 'Enchères immobilières — MonPetitMDB',
    description: 'Trouvez les meilleures ventes aux enchères immobilières en France. Biens sélectionnés selon les critères marchands de biens.',
    url: 'https://www.monpetitmdb.fr/encheres',
    type: 'website',
    images: [{ url: 'https://www.monpetitmdb.fr/og-encheres.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Enchères immobilières — MonPetitMDB',
    description: 'Trouvez les meilleures ventes aux enchères immobilières en France. Biens sélectionnés selon les critères marchands de biens.',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Enchères immobilières — MonPetitMDB',
  description: 'Trouvez les meilleures ventes aux enchères immobilières en France. Biens sélectionnés selon les critères marchands de biens.',
  url: 'https://www.monpetitmdb.fr/encheres',
}

export default function EncheresPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EncheresWrapper />
    </>
  )
}
