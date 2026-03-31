import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    "Contactez l'équipe Mon Petit MDB. Une question sur le sourcing immobilier, la simulation fiscale ou votre abonnement ? Écrivez-nous.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
