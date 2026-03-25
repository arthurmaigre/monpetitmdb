import type { Metadata } from 'next'
import CookieBanner from '@/components/CookieBanner'

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
        <script dangerouslySetInnerHTML={{ __html: `
          var c=localStorage.getItem('mdb_cookie_consent');
          if(c!=='refused'){
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-P2NK7FXK');
          }
        `}} />
      </head>
      <body>
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P2NK7FXK" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} /></noscript>
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}