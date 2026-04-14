import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact',
  openGraph: { title: 'Contact | Mon Petit MDB' },
  description:
    "Contactez l'équipe Mon Petit MDB. Une question sur le sourcing immobilier, la simulation fiscale ou votre abonnement ? Écrivez-nous.",
  alternates: { canonical: 'https://www.monpetitmdb.fr/contact' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
