import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const metropole = searchParams.get('metropole')
  const prix_min = searchParams.get('prix_min')
  const prix_max = searchParams.get('prix_max')
  const rendement_min = searchParams.get('rendement_min')
  const type_bien = searchParams.get('type_bien')
  const statut = searchParams.get('statut') || 'Toujours disponible'
  const ids = searchParams.get('ids')

  // Si on demande des IDs spécifiques (watchlist)
  if (ids) {
    const idList = ids.split(',').filter(Boolean)
    const { data, error } = await supabaseAdmin
      .from('biens')
      .select(`
  id, url, metropole, ville, quartier,
  type_bien, nb_pieces, surface, etage,
  prix_fai, prix_m2, loyer, type_loyer,
  charges_rec, charges_copro, taxe_fonc_ann,
  rendement_brut, statut, strategie_mdb,
  profil_locataire, fin_bail, score_travaux,
  dpe, annee_construction,
  photo_storage_path, photo_url,
  created_at, updated_at
`)
      .in('id', idList)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ biens: data, total: data?.length ?? 0 })
  }

  let query = supabaseAdmin
    .from('biens')
    .select(`
  id, url, metropole, ville, quartier,
  type_bien, nb_pieces, surface, etage,
  prix_fai, prix_m2, loyer, type_loyer,
  charges_rec, charges_copro, taxe_fonc_ann,
  rendement_brut, statut, strategie_mdb,
  profil_locataire, fin_bail, score_travaux,
  dpe, annee_construction,
  photo_storage_path, photo_url,
  created_at, updated_at
`)
    .eq('statut', statut)
    .order('created_at', { ascending: false })

  if (metropole) query = query.eq('metropole', metropole)
  if (prix_min) query = query.gte('prix_fai', Number(prix_min))
  if (prix_max) query = query.lte('prix_fai', Number(prix_max))
  if (rendement_min) query = query.gte('rendement_brut', Number(rendement_min) / 100)
  if (type_bien) query = query.eq('type_bien', type_bien)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ biens: data, total: data?.length ?? 0 })
}