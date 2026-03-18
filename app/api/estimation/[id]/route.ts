import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estimerBien } from '@/lib/estimation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Recuperer le bien
  const { data: bien, error } = await supabaseAdmin
    .from('biens')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !bien) {
    return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 })
  }

  // Verifier le cache (< 30 jours)
  if (bien.estimation_date && bien.estimation_details) {
    const age = Date.now() - new Date(bien.estimation_date).getTime()
    const joursDiff = age / (24 * 3600 * 1000)
    if (joursDiff < 30) {
      return NextResponse.json({ estimation: bien.estimation_details, cached: true })
    }
  }

  // Verifier les champs obligatoires
  if (!bien.surface || !bien.prix_fai || !bien.ville) {
    return NextResponse.json({
      error: 'Donnees insuffisantes pour estimer',
      missing: [
        !bien.surface && 'surface',
        !bien.prix_fai && 'prix_fai',
        !bien.ville && 'ville'
      ].filter(Boolean)
    }, { status: 400 })
  }

  // Reutiliser les coordonnees si deja geocode
  const existingGeo = (bien.latitude && bien.longitude) ? { lat: bien.latitude, lng: bien.longitude } : null

  // Recuperer le prix parking local depuis ref_prix_parking
  let prixParkingLocal: { box: number, parking: number } | null = null
  if (bien.ville) {
    const { data: parkingData } = await supabaseAdmin
      .from('ref_prix_parking')
      .select('prix_median_box, prix_median_parking')
      .ilike('ville', bien.ville)
      .maybeSingle()
    if (parkingData) {
      prixParkingLocal = { box: parkingData.prix_median_box, parking: parkingData.prix_median_parking }
    }
  }

  // Lancer l'estimation
  const estimation = await estimerBien({
    surface: bien.surface,
    prix_fai: bien.prix_fai,
    type_bien: bien.type_bien,
    nb_pieces: bien.nb_pieces,
    etage: bien.etage,
    dpe: bien.dpe,
    ascenseur: bien.ascenseur,
    acces_exterieur: bien.acces_exterieur,
    score_travaux: bien.score_travaux,
    surface_terrain: bien.surface_terrain,
    adresse: bien.adresse,
    ville: bien.ville,
    code_postal: bien.code_postal,
    parking_type: bien.parking_type,
    has_piscine: bien.has_piscine,
    exposition: bien.exposition,
    vue: bien.vue,
    etat_interieur: bien.etat_interieur,
    jardin_etat: bien.jardin_etat,
    has_cave: bien.has_cave,
    has_gardien: bien.has_gardien,
    has_double_vitrage: bien.has_double_vitrage,
    has_cuisine_equipee: bien.has_cuisine_equipee,
    is_plain_pied: bien.is_plain_pied,
    standing_immeuble: bien.standing_immeuble,
    nb_sdb: bien.nb_sdb,
    nb_chambres: bien.nb_chambres,
    mitoyennete: bien.mitoyennete,
    has_grenier: bien.has_grenier,
    assainissement: bien.assainissement
  }, existingGeo, prixParkingLocal)

  if (!estimation) {
    return NextResponse.json({
      error: 'Estimation impossible',
      raison: 'Pas assez de transactions comparables ou geocoding impossible'
    }, { status: 422 })
  }

  // Sauvegarder en cache + coordonnees
  await supabaseAdmin
    .from('biens')
    .update({
      latitude: estimation.latitude,
      longitude: estimation.longitude,
      estimation_prix_m2: estimation.prix_m2_corrige,
      estimation_prix_total: estimation.prix_total,
      estimation_confiance: estimation.confiance,
      estimation_nb_comparables: estimation.nb_comparables,
      estimation_rayon_m: estimation.rayon_m,
      estimation_date: new Date().toISOString(),
      estimation_details: estimation
    })
    .eq('id', id)

  return NextResponse.json({ estimation, cached: false })
}
