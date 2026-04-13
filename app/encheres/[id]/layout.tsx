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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  const { data: enchere } = await getSupabase()
    .from('encheres')
    .select('type_bien, nb_pieces, surface, ville, code_postal, mise_a_prix, prix_adjuge, date_audience, tribunal, photo_url, statut')
    .eq('id', id)
    .single()

  if (!enchere) {
    return { title: 'Ench\u00E8re introuvable' }
  }

  const parts: string[] = ['Ench\u00E8re']
  if (enchere.nb_pieces) parts.push(enchere.nb_pieces)
  if (enchere.surface) parts.push(`${enchere.surface}m\u00B2`)
  if (enchere.ville) parts.push(enchere.ville)
  const prixLabel = enchere.prix_adjuge
    ? `Adjug\u00E9 ${formatPrice(enchere.prix_adjuge)}`
    : enchere.mise_a_prix
      ? `Mise \u00E0 prix ${formatPrice(enchere.mise_a_prix)}`
      : ''
  if (prixLabel) parts.push(`\u2014 ${prixLabel}`)
  const title = parts.join(' ')

  const descParts: string[] = []
  if (enchere.type_bien) descParts.push(enchere.type_bien)
  if (enchere.nb_pieces) descParts.push(enchere.nb_pieces)
  if (enchere.surface) descParts.push(`${enchere.surface}m\u00B2`)
  if (enchere.ville) descParts.push(`\u00E0 ${enchere.ville}${enchere.code_postal ? ` (${enchere.code_postal})` : ''}`)
  if (enchere.tribunal) descParts.push(`\u2014 ${enchere.tribunal}`)
  if (enchere.date_audience) {
    const d = new Date(enchere.date_audience)
    descParts.push(`\u2014 Audience ${d.toLocaleDateString('fr-FR')}`)
  }
  const description = descParts.length > 0
    ? `${descParts.join(' ')}. Analyse compl\u00E8te : estimation DVF, frais d\u2019ench\u00E8re, simulation fiscale.`
    : 'Ench\u00E8re immobili\u00E8re : estimation DVF, frais d\u2019ench\u00E8re, simulation fiscale.'

  const images = enchere.photo_url
    ? [{ url: enchere.photo_url, width: 1200, height: 630 }]
    : [{ url: '/og-default.jpg', width: 1200, height: 630 }]

  return {
    title,
    description,
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

export default function EnchereLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
