import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Créer un compte',
  openGraph: { title: 'Créer un compte | Mon Petit MDB' },
  description:
    'Créez votre compte Mon Petit MDB et accédez gratuitement à 90 000+ biens immobiliers analysés.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
