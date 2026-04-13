import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
  openGraph: { title: 'Connexion | Mon Petit MDB' },
  description:
    'Connectez-vous à votre espace investisseur Mon Petit MDB.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
