import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function formatPrice(prix: number | null): string {
  if (!prix) return ''
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prix)
}

async function getEnchere(id: string) {
  const { data } = await getSupabase()
    .from('encheres')
    .select('type_bien, nb_pieces, surface, ville, code_postal, mise_a_prix, prix_adjuge, date_audience, tribunal, photo_url, statut')
    .eq('id', id)
    .single()
  return data
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const enchere = await getEnchere(id)

  if (!enchere) {
    return { title: 'Enchère introuvable' }
  }

  const parts: string[] = ['Enchère']
  if (enchere.nb_pieces) parts.push(enchere.nb_pieces)
  if (enchere.surface) parts.push(`${enchere.surface}m²`)
  if (enchere.ville) parts.push(enchere.ville)
  const prixLabel = enchere.prix_adjuge
    ? `Adjugé ${formatPrice(enchere.prix_adjuge)}`
    : enchere.mise_a_prix
      ? `Mise à prix ${formatPrice(enchere.mise_a_prix)}`
      : ''
  if (prixLabel) parts.push(`— ${prixLabel}`)
  const title = parts.join(' ')

  const descParts: string[] = []
  if (enchere.type_bien) descParts.push(enchere.type_bien)
  if (enchere.nb_pieces) descParts.push(enchere.nb_pieces)
  if (enchere.surface) descParts.push(`${enchere.surface}m²`)
  if (enchere.ville) descParts.push(`à ${enchere.ville}${enchere.code_postal ? ` (${enchere.code_postal})` : ''}`)
  if (enchere.tribunal) descParts.push(`— ${enchere.tribunal}`)
  if (enchere.date_audience) {
    const d = new Date(enchere.date_audience)
    descParts.push(`— Audience ${d.toLocaleDateString('fr-FR')}`)
  }
  const description = descParts.length > 0
    ? `${descParts.join(' ')}. Analyse complète : estimation DVF, frais d'enchère, simulation fiscale.`
    : 'Enchère immobilière : estimation DVF, frais d\'enchère, simulation fiscale.'

  const images = enchere.photo_url
    ? [{ url: enchere.photo_url, width: 1200, height: 630 }]
    : [{ url: '/og-default.jpg', width: 1200, height: 630 }]

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.monpetitmdb.fr/encheres/${id}`,
    },
    openGraph: {
      title: `${title} | Mon Petit MDB`,
      description,
      type: 'article',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Mon Petit MDB`,
      description,
    },
  }
}

export default async function EnchereLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const enchere = await getEnchere(id)

  const jsonLd = enchere ? {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: `Enchère ${enchere.type_bien ?? 'immobilière'} ${enchere.ville ?? ''}`.trim(),
    url: `https://www.monpetitmdb.fr/encheres/${id}`,
    description: [
      enchere.type_bien,
      enchere.nb_pieces,
      enchere.surface ? `${enchere.surface}m²` : null,
      enchere.ville ? `à ${enchere.ville}` : null,
    ].filter(Boolean).join(' '),
    ...(enchere.ville || enchere.code_postal ? {
      address: {
        '@type': 'PostalAddress',
        ...(enchere.ville ? { addressLocality: enchere.ville } : {}),
        ...(enchere.code_postal ? { postalCode: enchere.code_postal } : {}),
        addressCountry: 'FR',
      },
    } : {}),
    ...(enchere.mise_a_prix ? {
      offers: {
        '@type': 'Offer',
        price: enchere.mise_a_prix,
        priceCurrency: 'EUR',
      },
    } : {}),
  } : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  )
}
