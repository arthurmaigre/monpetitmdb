import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import BienFicheClient from './BienFicheClient'

export const revalidate = 3600

async function getBien(id: string) {
  const { data } = await supabaseAdmin
    .from('biens')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

async function getEnchere(id: string) {
  const { data } = await supabaseAdmin
    .from('encheres')
    .select('*')
    .eq('id', id)
    .single()
  if (!data) return null
  // prix_fai = champ virtuel pour compatibilité avec BienFicheClient (~35 usages)
  // Logique : prix adjugé si disponible (bien vendu), sinon mise à prix (enchère à venir)
  const prixRef = (data.prix_adjuge > 0 ? data.prix_adjuge : data.mise_a_prix) || 0
  return { ...data, prix_fai: prixRef }
}

export default async function FicheBienPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ source?: string }>
}) {
  const { id } = await params
  const { source } = await searchParams
  const isEnchere = source === 'encheres'

  const bien = isEnchere ? await getEnchere(id) : await getBien(id)

  if (!bien) notFound()

  return <BienFicheClient initialBien={bien} id={id} isEnchere={isEnchere} />
}
