import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Stratégies d'investissement immobilier",
  description:
    'Découvrez les 4 stratégies MDB : locataire en place, travaux lourds, division et immeuble de rapport. Analysez chaque bien comme un marchand de biens.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
