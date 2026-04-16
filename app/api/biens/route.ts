import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

function getOrderClause(tri: string | null): [string, { ascending: boolean; nullsFirst?: boolean }] {
  switch (tri) {
    case 'rendement_desc': return ['rendement_brut', { ascending: false, nullsFirst: false }]
    case 'rendement_asc': return ['rendement_brut', { ascending: true, nullsFirst: false }]
    case 'prix_asc': return ['prix_fai', { ascending: true }]
    case 'prix_desc': return ['prix_fai', { ascending: false }]
    case 'prixm2_asc': return ['prix_m2', { ascending: true }]
    case 'prixm2_desc': return ['prix_m2', { ascending: false }]
    case 'score_desc': return ['score_travaux', { ascending: false, nullsFirst: false }]
    // plusvalue_desc/plusvalue_asc : pas de colonne en base, tri client-side
    case 'recent':
    default: return ['created_at', { ascending: false }]
  }
}

const STRATEGIES = ['Locataire en place', 'Travaux lourds', 'Division', 'Immeuble de rapport']
const TYPES_BIEN = ['Appartement', 'Maison', 'Immeuble', 'Local commercial', 'Terrain', 'Parking', 'Autre']

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const body = await req.json()
  const { url, strategie_mdb, ville, code_postal, type_bien, surface, prix_fai, loyer, nb_pieces,
    adresse, etage, annee_construction, dpe, nb_chambres, nb_sdb,
    type_loyer, charges_rec, charges_copro, taxe_fonc_ann, profil_locataire, fin_bail,
    score_travaux, score_commentaire, latitude, longitude } = body

  // Validation champs obligatoires
  if (!ville || typeof ville !== 'string')
    return NextResponse.json({ error: 'Ville requise' }, { status: 400 })
  if (!code_postal || !/^\d{5}$/.test(code_postal))
    return NextResponse.json({ error: 'Code postal invalide (5 chiffres)' }, { status: 400 })
  if (!type_bien || !TYPES_BIEN.includes(type_bien))
    return NextResponse.json({ error: 'Type de bien invalide' }, { status: 400 })
  if (!surface || surface <= 0)
    return NextResponse.json({ error: 'Surface requise' }, { status: 400 })
  if (!prix_fai || prix_fai <= 0)
    return NextResponse.json({ error: 'Prix FAI requis' }, { status: 400 })

  // Déduplication par URL si fournie
  if (url) {
    const { data: existing } = await supabaseAdmin
      .from('biens')
      .select('id')
      .eq('url', url)
      .maybeSingle()
    if (existing) {
      // Le bien existe déjà, on l'ajoute directement en watchlist
      await supabaseAdmin.from('watchlist').upsert(
        { user_id: user.id, bien_id: existing.id, suivi: 'a_analyser' },
        { onConflict: 'user_id,bien_id' }
      )
      return NextResponse.json({ bien: existing, alreadyExisted: true })
    }
  }

  // Vérifier limite watchlist
  const WATCHLIST_LIMITS: Record<string, number | null> = { free: 10, pro: 50, expert: null }
  const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', user.id).single()
  const plan = profile?.plan || 'free'
  const limit = WATCHLIST_LIMITS[plan] ?? 10

  if (limit !== null) {
    const { count } = await supabaseAdmin
      .from('watchlist')
      .select('bien_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((count ?? 0) >= limit) {
      return NextResponse.json({ error: 'Limite watchlist atteinte', limit, plan, upgrade: true }, { status: 403 })
    }
  }

  // Inférer la stratégie si non fournie
  let finalStrategie = strategie_mdb
  if (!finalStrategie || !STRATEGIES.includes(finalStrategie)) {
    if (type_bien === 'Immeuble') finalStrategie = 'Immeuble de rapport'
    else if (loyer && Number(loyer) > 0) finalStrategie = 'Locataire en place'
    else if (score_travaux && Number(score_travaux) >= 3) finalStrategie = 'Travaux lourds'
    else finalStrategie = 'Travaux lourds'
  }

  // Créer le bien
  const bienData: Record<string, any> = {
    url: url || `manual://${user.id}/${Date.now()}`,
    strategie_mdb: finalStrategie,
    ville: ville.trim(),
    code_postal,
    type_bien,
    surface: Number(surface),
    prix_fai: Number(prix_fai),
    prix_m2: Math.round(Number(prix_fai) / Number(surface)),
    statut: 'Toujours disponible',
  }

  // Étape 1 — Caractéristiques
  if (nb_pieces) bienData.nb_pieces = nb_pieces
  if (adresse) bienData.adresse = adresse.trim()
  if (etage) bienData.etage = etage.trim()
  if (annee_construction && Number(annee_construction) > 0) bienData.annee_construction = Number(annee_construction)
  if (dpe && /^[A-G]$/i.test(dpe)) bienData.dpe = dpe.toUpperCase()
  if (nb_chambres && Number(nb_chambres) > 0) bienData.nb_chambres = Number(nb_chambres)
  if (nb_sdb && Number(nb_sdb) > 0) bienData.nb_sdb = Number(nb_sdb)

  // Étape 2 — Données locatives
  if (loyer && Number(loyer) > 0) {
    bienData.loyer = Number(loyer)
    bienData.type_loyer = type_loyer || 'HC'
    bienData.rendement_brut = (Number(loyer) * 12) / Number(prix_fai)
  }
  if (charges_rec && Number(charges_rec) > 0) bienData.charges_rec = Number(charges_rec)
  if (charges_copro && Number(charges_copro) > 0) bienData.charges_copro = Number(charges_copro)
  if (taxe_fonc_ann && Number(taxe_fonc_ann) > 0) bienData.taxe_fonc_ann = Number(taxe_fonc_ann)
  if (profil_locataire && profil_locataire.trim()) bienData.profil_locataire = profil_locataire.trim()
  if (fin_bail) bienData.fin_bail = fin_bail

  // Étape 3 — Travaux
  if (score_travaux && Number(score_travaux) >= 1 && Number(score_travaux) <= 5) bienData.score_travaux = Number(score_travaux)
  if (score_commentaire && score_commentaire.trim()) bienData.score_commentaire = score_commentaire.trim().slice(0, 500)

  // Coordonnées GPS (BAN)
  if (latitude && longitude) { bienData.latitude = Number(latitude); bienData.longitude = Number(longitude) }

  const { data: newBien, error: insertError } = await supabaseAdmin
    .from('biens')
    .insert(bienData)
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Auto-ajout en watchlist
  await supabaseAdmin.from('watchlist').insert({
    user_id: user.id,
    bien_id: newBien.id,
    suivi: 'a_analyser',
  })

  return NextResponse.json({ bien: newBien, alreadyExisted: false }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })


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
  estimation_prix_total, lots_data, nb_lots, monopropriete, compteurs_individuels,
  moteurimmo_data, latitude, longitude,
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
  estimation_prix_total, lots_data, nb_lots, monopropriete, compteurs_individuels,
  moteurimmo_data, latitude, longitude,
  created_at, updated_at
`)
    .eq('statut', statut)
    .eq('regex_statut', 'valide')
    .order(...getOrderClause(searchParams.get('tri')))

  // Count separement (plus leger, pas de timeout)
  let countQuery = supabaseAdmin
    .from('biens')
    .select('id', { count: 'exact', head: true })
    .eq('statut', statut)
    .eq('regex_statut', 'valide')

  const strategie = searchParams.get('strategie')

  // Stratégies Locataire en place et IDR : extraction IA doit être faite
  if (strategie === 'Locataire en place' || strategie === 'Immeuble de rapport') {
    query = query.eq('extraction_statut', 'ok')
    countQuery = countQuery.eq('extraction_statut', 'ok')
  }
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 2000)
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
  } else if (metropole) {
    query = query.eq('metropole', metropole)
    countQuery = countQuery.eq('metropole', metropole)
  }
  if (prix_min) { query = query.gte('prix_fai', Number(prix_min)); countQuery = countQuery.gte('prix_fai', Number(prix_min)) }
  if (prix_max) { query = query.lte('prix_fai', Number(prix_max)); countQuery = countQuery.lte('prix_fai', Number(prix_max)) }
  if (rendement_min) { query = query.gte('rendement_brut', Number(rendement_min) / 100); countQuery = countQuery.gte('rendement_brut', Number(rendement_min) / 100) }
  if (type_bien) { query = query.eq('type_bien', type_bien); countQuery = countQuery.eq('type_bien', type_bien) }

  const surface_min = searchParams.get('surface_min')
  const surface_max = searchParams.get('surface_max')
  if (surface_min) { query = query.gte('surface', Number(surface_min)); countQuery = countQuery.gte('surface', Number(surface_min)) }
  if (surface_max) { query = query.lte('surface', Number(surface_max)); countQuery = countQuery.lte('surface', Number(surface_max)) }

  const score_travaux_min = searchParams.get('score_travaux_min')
  if (score_travaux_min) {
    query = query.gte('score_travaux', Number(score_travaux_min))
    countQuery = countQuery.gte('score_travaux', Number(score_travaux_min))
  } else if (strategie === 'Travaux lourds') {
    query = query.gte('score_travaux', 1)
    countQuery = countQuery.gte('score_travaux', 1)
  }

  const keyword = searchParams.get('keyword')
  if (keyword) {
    const kw = `%${keyword}%`
    query = query.or(`moteurimmo_data->>title.ilike.${kw},moteurimmo_data->>description.ilike.${kw},ville.ilike.${kw},adresse.ilike.${kw}`)
    countQuery = countQuery.or(`moteurimmo_data->>title.ilike.${kw},moteurimmo_data->>description.ilike.${kw},ville.ilike.${kw},adresse.ilike.${kw}`)
  }

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