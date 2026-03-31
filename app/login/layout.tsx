import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
  description:
    'Connectez-vous à votre espace investisseur Mon Petit MDB.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
