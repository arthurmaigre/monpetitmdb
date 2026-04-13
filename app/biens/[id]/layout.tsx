import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function formatPrice(prix: number | null): string {
  if (!prix) return ''
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prix)
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  const { data: bien } = await supabase
    .from('biens')
    .select('type_bien, nb_pieces, surface, ville, quartier, code_postal, prix_fai, rendement_brut, photo_url, moteurimmo_data, strategie_mdb')
    .eq('id', id)
    .single()

  if (!bien) {
    return { title: 'Bien introuvable' }
  }

  const parts: string[] = []
  if (bien.nb_pieces) parts.push(bien.nb_pieces)
  if (bien.surface) parts.push(`${bien.surface}m\u00B2`)
  if (bien.ville) parts.push(bien.ville)
  if (bien.prix_fai) parts.push(formatPrice(bien.prix_fai))
  const title = parts.length > 0 ? parts.join(' ') : `${bien.type_bien || 'Bien'} ${bien.ville || ''}`

  const descParts: string[] = []
  if (bien.type_bien) descParts.push(bien.type_bien)
  if (bien.nb_pieces) descParts.push(bien.nb_pieces)
  if (bien.surface) descParts.push(`${bien.surface}m\u00B2`)
  if (bien.ville) descParts.push(`\u00E0 ${bien.ville}${bien.code_postal ? ` (${bien.code_postal})` : ''}`)
  if (bien.prix_fai) descParts.push(`\u2014 ${formatPrice(bien.prix_fai)}`)
  if (bien.rendement_brut) descParts.push(`\u2014 Rendement brut ${bien.rendement_brut.toFixed(1)}%`)
  const description = descParts.length > 0
    ? `${descParts.join(' ')}. Analyse compl\u00E8te : estimation DVF, simulation fiscale, score travaux.`
    : 'Analyse immobili\u00E8re compl\u00E8te : estimation DVF, simulation fiscale, score travaux.'

  // Extract first photo from moteurimmo_data or photo_url
  let imageUrl: string | undefined
  try {
    const mi = typeof bien.moteurimmo_data === 'string' ? JSON.parse(bien.moteurimmo_data) : bien.moteurimmo_data
    if (mi?.pictureUrls?.[0]) imageUrl = mi.pictureUrls[0]
  } catch { /* ignore */ }
  if (!imageUrl && bien.photo_url) imageUrl = bien.photo_url

  const images = imageUrl
    ? [{ url: imageUrl, width: 1200, height: 630 }]
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

export default function BienLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
