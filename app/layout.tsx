import type { Metadata, Viewport } from 'next'
import CookieBanner from '@/components/CookieBanner'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.monpetitmdb.fr'),
  alternates: {
    canonical: '/',
  },
  title: {
    default: 'Mon Petit MDB — Sourcing immobilier pour investisseurs',
    template: '%s | Mon Petit MDB',
  },
  description: 'Sourcez, analysez et comparez les biens immobiliers avec la m\u00E9thodologie marchand de biens. 90 000+ biens, 60+ plateformes, 7 r\u00E9gimes fiscaux.',
  openGraph: {
    title: 'Mon Petit MDB — Sourcing immobilier pour investisseurs',
    description: 'La m\u00E9thodologie marchand de biens accessible \u00E0 tous. Estimation DVF, simulation fiscale, 4 strat\u00E9gies d\u2019investissement.',
    siteName: 'Mon Petit MDB',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mon Petit MDB',
    description: 'Sourcing immobilier intelligent pour investisseurs particuliers.',
  },
  other: {
    'facebook-domain-verification': '18tkxn3dzwx80c8cqhlv8j0sli0hst',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" style={{ scrollBehavior: 'smooth' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800&family=Inter:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
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
        <style>{`
          body { font-size: 14px; line-height: 1.5; }
          @media (min-width: 768px) { body { font-size: 16px; } }
          h1, h2, h3, h4, h5, h6 { line-height: 1.15; }
          p { line-height: 1.5; }
          *:focus-visible {
            outline: 2px solid #c0392b;
            outline-offset: 2px;
          }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              transition-duration: 0.01ms !important;
            }
          }
          @media (hover: none) {
            * { -webkit-tap-highlight-color: rgba(192,57,43,0.1); }
          }
        `}</style>
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P2NK7FXK" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} /></noscript>
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}