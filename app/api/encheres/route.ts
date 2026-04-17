import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import { isVenteDelocalisee } from '@/lib/utils-encheres'

const ENCHERES_SELECT = `
  id, source, id_source, url, sources, statut,
  type_bien, adresse, ville, code_postal, departement,
  surface, nb_pieces, nb_lots, description, occupation,
  tribunal, mise_a_prix, prix_adjuge, frais_preemption,
  date_audience, date_visite, date_surenchere, mise_a_prix_surenchere, consignation, publication,
  avocat_nom, avocat_cabinet, avocat_tel, avocat_email,
  latitude, longitude, photo_url, documents, lots_data,
  score_travaux, score_commentaire, loyer, charges_copro, taxe_fonc_ann,
  estimation_prix_m2, estimation_prix_total, estimation_confiance,
  estimation_nb_comparables, estimation_rayon_m, estimation_date,
  enrichissement_data,
  created_at, updated_at
`

export async function GET(request: NextRequest) {
  // Auth: verify Bearer token
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  // Watchlist mode : charger des IDs spécifiques
  const ids = searchParams.get('ids')
  if (ids) {
    const idList = ids.split(',').filter(Boolean)
    const { data, error } = await supabaseAdmin
      .from('encheres')
      .select(ENCHERES_SELECT)
      .in('id', idList)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ encheres: data || [] })
  }

  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 2000)
  const from = (page - 1) * limit

  // Tri
  const tri = searchParams.get('tri') || 'date_audience_asc'
  let orderCol = 'date_audience'
  let orderAsc = true
  if (tri === 'prix_asc') { orderCol = 'mise_a_prix'; orderAsc = true }
  else if (tri === 'prix_desc') { orderCol = 'mise_a_prix'; orderAsc = false }
  else if (tri === 'recent') { orderCol = 'created_at'; orderAsc = false }
  else if (tri === 'date_audience_desc') { orderCol = 'date_audience'; orderAsc = false }
  else if (tri === 'date_visite_asc') { orderCol = 'date_visite'; orderAsc = true }
  else if (tri === 'date_visite_desc') { orderCol = 'date_visite'; orderAsc = false }

  let query = supabaseAdmin
    .from('encheres')
    .select(ENCHERES_SELECT)
    .eq('enrichissement_statut', 'ok')
    .order(orderCol, { ascending: orderAsc })

  let countQuery = supabaseAdmin
    .from('encheres')
    .select('id', { count: 'exact', head: true })
    .eq('enrichissement_statut', 'ok')

  // Statut (défaut : a_venir + surenchere)
  const statut = searchParams.get('statut')
  if (statut) {
    query = query.eq('statut', statut)
    countQuery = countQuery.eq('statut', statut)
  } else {
    query = query.in('statut', ['a_venir', 'surenchere', 'adjuge'])
    countQuery = countQuery.in('statut', ['a_venir', 'surenchere', 'adjuge'])
  }

  // Type bien
  const type_bien = searchParams.get('type_bien')
  if (type_bien) {
    const types = type_bien.split(',').filter(Boolean)
    if (types.length === 1) { query = query.eq('type_bien', types[0]); countQuery = countQuery.eq('type_bien', types[0]) }
    else if (types.length > 1) { query = query.in('type_bien', types); countQuery = countQuery.in('type_bien', types) }
  }

  // Localisation
  const locationType = searchParams.get('locationType')
  const locationValue = searchParams.get('locationValue')
  const locationCP = searchParams.get('locationCP')

  if (locationType === 'departement' && locationCP) {
    query = query.like('code_postal', `${locationCP}%`)
    countQuery = countQuery.like('code_postal', `${locationCP}%`)
  } else if (locationType === 'region' && locationValue) {
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
      const orFilter = depts.map(d => `code_postal.like.${d}%`).join(',')
      query = query.or(orFilter)
      countQuery = countQuery.or(orFilter)
    }
  } else if (locationType === 'commune' && locationCP === 'tous' && locationValue) {
    query = query.ilike('ville', `${locationValue}%`)
    countQuery = countQuery.ilike('ville', `${locationValue}%`)
  } else if (locationType === 'commune' && locationCP && locationCP !== 'tous') {
    query = query.eq('code_postal', locationCP)
    countQuery = countQuery.eq('code_postal', locationCP)
  }

  // Prix (mise_a_prix)
  const prix_min = searchParams.get('prix_min')
  const prix_max = searchParams.get('prix_max')
  if (prix_min) { query = query.gte('mise_a_prix', Number(prix_min)); countQuery = countQuery.gte('mise_a_prix', Number(prix_min)) }
  if (prix_max) { query = query.lte('mise_a_prix', Number(prix_max)); countQuery = countQuery.lte('mise_a_prix', Number(prix_max)) }

  // Surface
  const surface_min = searchParams.get('surface_min')
  const surface_max = searchParams.get('surface_max')
  if (surface_min) { query = query.gte('surface', Number(surface_min)); countQuery = countQuery.gte('surface', Number(surface_min)) }
  if (surface_max) { query = query.lte('surface', Number(surface_max)); countQuery = countQuery.lte('surface', Number(surface_max)) }

  // Occupation
  const occupation = searchParams.get('occupation')
  if (occupation) { query = query.eq('occupation', occupation); countQuery = countQuery.eq('occupation', occupation) }

  // Tribunal
  const tribunal = searchParams.get('tribunal')
  if (tribunal) { query = query.ilike('tribunal', `%${tribunal}%`); countQuery = countQuery.ilike('tribunal', `%${tribunal}%`) }

  // Date audience max (prochains Xj)
  const date_audience_max = searchParams.get('date_audience_max')
  if (date_audience_max) {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + Number(date_audience_max))
    query = query.lte('date_audience', maxDate.toISOString())
    countQuery = countQuery.lte('date_audience', maxDate.toISOString())
  }

  // Keyword
  const keyword = searchParams.get('keyword')
  if (keyword) {
    const kw = `%${keyword}%`
    query = query.or(`description.ilike.${kw},ville.ilike.${kw},adresse.ilike.${kw},tribunal.ilike.${kw}`)
    countQuery = countQuery.or(`description.ilike.${kw},ville.ilike.${kw},adresse.ilike.${kw},tribunal.ilike.${kw}`)
  }

  // Filtre délocalisée (post-traitement JS — propriété calculée departement ≠ tribunal)
  const delocalise = searchParams.get('delocalise') === 'true'

  // Source (filtre exclusif — post-traitement JS pour éviter les limites PostgREST JSONB)
  // 1 source : biens exclusivement sur cette plateforme
  // 2+ sources : biens présents sur TOUTES les sources sélectionnées (AND, multi-source)
  const sourceFilter = searchParams.get('source')
  const selectedSources = sourceFilter ? sourceFilter.split(',').filter(Boolean) : []

  function getEnchereSources(e: any): string[] {
    let srcs = e.sources
    if (typeof srcs === 'string') try { srcs = JSON.parse(srcs) } catch { srcs = null }
    if (!Array.isArray(srcs) || srcs.length === 0) return e.source ? [e.source] : []
    return [...new Set((srcs as any[]).map((s: any) => s.source).filter(Boolean))] as string[]
  }

  function matchesSourceFilter(e: any): boolean {
    if (selectedSources.length === 0) return true
    const eSrcs = getEnchereSources(e)
    if (selectedSources.length === 1) {
      return eSrcs.length === 1 && eSrcs[0] === selectedSources[0]
    }
    const allSrcs = ['licitor', 'avoventes', 'vench']
    const nonSelected = allSrcs.filter(s => !selectedSources.includes(s))
    return selectedSources.every(s => eSrcs.includes(s)) && nonSelected.every(s => !eSrcs.includes(s))
  }

  const needsJsFilter = selectedSources.length > 0 || delocalise
  if (needsJsFilter) {
    // Fetch tout (max 2000) puis paginer manuellement après filtrage JS
    query = query.limit(2000)
  } else {
    query = query.range(from, from + limit - 1)
  }

  const [{ data, error }, { count: totalCount }] = await Promise.all([query, countQuery])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (needsJsFilter) {
    let filtered = (data || []).filter(matchesSourceFilter)
    if (delocalise) filtered = filtered.filter(e => isVenteDelocalisee(e.departement, e.tribunal))
    const paginated = filtered.slice(from, from + limit)
    return NextResponse.json({
      encheres: paginated,
      total: filtered.length,
      page,
      limit,
      hasMore: from + limit < filtered.length,
    })
  }

  const encheres = data || []
  return NextResponse.json({
    encheres,
    total: totalCount ?? encheres.length,
    page,
    limit,
    hasMore: encheres.length === limit,
  })
}
