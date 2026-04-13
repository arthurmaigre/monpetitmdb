import { supabaseAdmin } from '@/lib/supabase-admin'
import BiensClient from './BiensClient'

export const revalidate = 3600

const DEFAULT_STRATEGIE = 'Locataire en place'
const SSR_LIMIT = 12

async function getInitialBiens() {
  try {
    const [{ data }, { count }] = await Promise.all([
      supabaseAdmin
        .from('biens')
        .select(`
          id, url, metropole, ville, quartier, code_postal,
          type_bien, nb_pieces, surface, etage,
          prix_fai, prix_m2, loyer, type_loyer,
          charges_rec, charges_copro, taxe_fonc_ann,
          rendement_brut, statut, strategie_mdb,
          profil_locataire, fin_bail, score_travaux,
          dpe, annee_construction,
          photo_storage_path, photo_url,
          estimation_prix_total, lots_data, nb_lots, monopropriete, compteurs_individuels,
          moteurimmo_data, latitude, longitude,
          created_at, updated_at
        `)
        .eq('statut', 'Toujours disponible')
        .eq('regex_statut', 'valide')
        .eq('extraction_statut', 'ok')
        .eq('strategie_mdb', DEFAULT_STRATEGIE)
        .order('created_at', { ascending: false })
        .range(0, SSR_LIMIT - 1),
      supabaseAdmin
        .from('biens')
        .select('id', { count: 'exact', head: true })
        .eq('statut', 'Toujours disponible')
        .eq('regex_statut', 'valide')
        .eq('extraction_statut', 'ok')
        .eq('strategie_mdb', DEFAULT_STRATEGIE),
    ])

    const biens = (data || []).map((b: any) => {
      let pictureUrls = null
      if (b.moteurimmo_data) {
        try {
          const mi = typeof b.moteurimmo_data === 'string' ? JSON.parse(b.moteurimmo_data) : b.moteurimmo_data
          pictureUrls = mi?.pictureUrls || null
        } catch {}
      }
      const { moteurimmo_data, ...rest } = b
      return { ...rest, pictureUrls }
    })

    return { biens, total: count ?? biens.length }
  } catch {
    return { biens: [], total: 0 }
  }
}

export default async function BiensPage() {
  const { biens, total } = await getInitialBiens()

  return (
    <BiensClient
      initialBiens={biens}
      initialTotal={total}
      initialStrategie={DEFAULT_STRATEGIE}
    />
  )
}
