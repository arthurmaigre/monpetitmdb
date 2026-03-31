import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Questions fréquentes',
  description:
    'Réponses aux questions fréquentes sur Mon Petit MDB : fonctionnement, tarifs, stratégies MDB, estimation DVF, données et sécurité.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
