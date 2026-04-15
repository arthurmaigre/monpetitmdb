export default function Layout({ children }: { children: React.ReactNode }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Enchères judiciaires immobilières | Mon Petit MDB',
    description: 'Ventes aux enchères judiciaires immobilières en France. Mise à prix, estimation DVF, décote, tribunal, documents juridiques.',
    url: 'https://www.monpetitmdb.fr/encheres',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {children}
    </>
  )
}
