import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Biens immobiliers à analyser',
  openGraph: { title: 'Biens immobiliers à analyser | Mon Petit MDB' },
  description:
    'Explorez 90 000+ biens immobiliers enrichis : estimation DVF, simulation fiscale 7 régimes, score travaux IA. Filtrez par stratégie, ville, rendement.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Biens immobiliers à analyser | Mon Petit MDB',
    description: 'Analysez des biens immobiliers selon les stratégies marchands de biens',
    url: 'https://www.monpetitmdb.fr/biens',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {children}
    </>
  )
}
