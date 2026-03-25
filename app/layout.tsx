import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mon Petit MDB',
  description: 'Investissement locatif intelligent',
  other: {
    'facebook-domain-verification': '18tkxn3dzwx80c8cqhlv8j0sli0hst',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}