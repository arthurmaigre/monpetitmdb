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
  id, url, metropole, ville, quartier, code_postal,
  type_bien, nb_pieces, surface, etage,
  prix_fai, prix_m2, loyer, type_loyer,
  charges_rec, charges_copro, taxe_fonc_ann,
  rendement_brut, statut, strategie_mdb,
  profil_locataire, fin_bail, score_travaux,
  dpe, annee_construction,
  photo_storage_path, photo_url,
  estimation_prix_total,
  moteurimmo_data,
  created_at, updated_at
`)
      .in('id', idList)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ biens: data, total: data?.length ?? 0 })
  }

  let query = supabaseAdmin
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
  estimation_prix_total,
  moteurimmo_data,
  created_at, updated_at
`)
    .eq('statut', statut)
    .order('created_at', { ascending: false })

  // Count separement (plus leger, pas de timeout)
  let countQuery = supabaseAdmin
    .from('biens')
    .select('id', { count: 'exact', head: true })
    .eq('statut', statut)

  const strategie = searchParams.get('strategie')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const from = (page - 1) * limit

  const locationType = searchParams.get('locationType')
  const locationValue = searchParams.get('locationValue')
  const locationCP = searchParams.get('locationCP')

  if (strategie) { query = query.eq('strategie_mdb', strategie); countQuery = countQuery.eq('strategie_mdb', strategie) }
  if (locationType === 'metropole' && locationValue) {
    query = query.eq('metropole', locationValue); countQuery = countQuery.eq('metropole', locationValue)
  } else if (locationType === 'departement' && locationCP) {
    query = query.like('code_postal', `${locationCP}%`); countQuery = countQuery.like('code_postal', `${locationCP}%`)
  } else if (locationType === 'region' && locationValue) {
    // Region : recuperer les departements de la region depuis le mapping
    const deptsByRegion: Record<string, string[]> = {
      'Auvergne-Rhone-Alpes': ['01','03','07','15','26','38','42','43','63','69','73','74'],
      'Bourgogne-Franche-Comte': ['21','25','39','58','70','71','89','90'],
      'Bretagne': ['22','29','35','56'],
      'Centre-Val de Loire': ['18','28','36','37','41','45'],
      'Grand Est': ['08','10','51','52','54','55','57','67','68','88'],
      'Hauts-de-France': ['02','59','60','62','80'],
      'Ile-de-France': ['75','77','78','91','92','93','94','95'],
      'Normandie': ['14','27','50','61','76'],
      'Nouvelle-Aquitaine': ['16','17','19','23','24','33','40','47','64','79','86','87'],
      'Occitanie': ['09','11','12','30','31','32','34','46','48','65','66','81','82'],
      'Pays de la Loire': ['44','49','53','72','85'],
      "Provence-Alpes-Cote d'Azur": ['04','05','06','13','83','84'],
      'Corse': ['2A','2B'],
    }
    const depts = deptsByRegion[locationValue]
    if (depts) {
      query = query.or(depts.map(d => `code_postal.like.${d}%`).join(','))
    }
  } else if (locationType === 'commune' && locationCP === 'tous' && locationValue) {
    query = query.ilike('ville', locationValue)
  } else if (locationType === 'commune' && locationCP && locationCP !== 'tous') {
    query = query.eq('code_postal', locationCP)
  } else if (metropole) {
    query = query.eq('metropole', metropole)
  }
  if (prix_min) query = query.gte('prix_fai', Number(prix_min))
  if (prix_max) query = query.lte('prix_fai', Number(prix_max))
  if (rendement_min) query = query.gte('rendement_brut', Number(rendement_min) / 100)
  if (type_bien) query = query.eq('type_bien', type_bien)

  query = query.range(from, from + limit - 1)

  const [{ data, error }, { count: totalCount }] = await Promise.all([query, countQuery])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Extraire pictureUrls du moteurimmo_data et supprimer le JSON lourd
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

  return NextResponse.json({ biens, total: totalCount ?? biens.length, page, limit, hasMore: biens.length === limit })
}