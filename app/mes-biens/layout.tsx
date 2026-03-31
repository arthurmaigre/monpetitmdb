import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ma Watchlist',
  description:
    "Suivez vos biens immobiliers favoris et gérez votre pipeline d'investissement.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
