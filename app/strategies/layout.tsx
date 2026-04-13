import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Stratégies d'investissement immobilier",
  openGraph: { title: "Stratégies d'investissement immobilier | Mon Petit MDB" },
  description:
    'D\u00E9couvrez les strat\u00E9gies MDB : locataire en place, travaux lourds et immeuble de rapport. Analysez chaque bien comme un marchand de biens.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Investir en marchand de biens',
    description: "4 stratégies d'investissement immobilier façon marchand de biens",
    url: 'https://www.monpetitmdb.fr/strategies',
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
