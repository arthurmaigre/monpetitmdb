import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Stratégies d'investissement immobilier",
  openGraph: { title: "Stratégies d'investissement immobilier | Mon Petit MDB" },
  description:
    'D\u00E9couvrez les strat\u00E9gies MDB : locataire en place, travaux lourds et immeuble de rapport. Analysez chaque bien comme un marchand de biens.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
