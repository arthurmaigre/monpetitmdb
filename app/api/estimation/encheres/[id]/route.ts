import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estimerBien } from '@/lib/estimation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const force = request.nextUrl.searchParams.get('force') === 'true'

  // Récupérer l'enchère
  const { data: enchere, error } = await supabaseAdmin
    .from('encheres')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !enchere) {
    return NextResponse.json({ error: 'Enchère introuvable' }, { status: 404 })
  }

  // Cache (< 30 jours) sauf si force=true
  if (!force && enchere.estimation_date && enchere.estimation_details) {
    const age = Date.now() - new Date(enchere.estimation_date).getTime()
    if (age / (24 * 3600 * 1000) < 30) {
      return NextResponse.json({ estimation: enchere.estimation_details, cached: true })
    }
  }

  // Vérifier les champs obligatoires
  // Pour les enchères, on utilise mise_a_prix au lieu de prix_fai
  if (!enchere.surface || !enchere.mise_a_prix || !enchere.ville) {
    return NextResponse.json({
      error: 'Données insuffisantes pour estimer',
      missing: [
        !enchere.surface && 'surface',
        !enchere.mise_a_prix && 'mise_a_prix',
        !enchere.ville && 'ville',
      ].filter(Boolean)
    }, { status: 400 })
  }

  const existingGeo = (enchere.latitude && enchere.longitude)
    ? { lat: enchere.latitude, lng: enchere.longitude }
    : null

  // Prix parking local
  let prixParkingLocal: { box: number; parking: number } | null = null
  if (enchere.ville) {
    const { data: parkingData } = await supabaseAdmin
      .from('ref_prix_parking')
      .select('prix_median_box, prix_median_parking')
      .ilike('ville', enchere.ville)
      .maybeSingle()
    if (parkingData) {
      prixParkingLocal = { box: parkingData.prix_median_box, parking: parkingData.prix_median_parking }
    }
  }

  // Extraire DPE et autres données depuis enrichissement_data si disponibles
  const enrichData = typeof enchere.enrichissement_data === 'string'
    ? JSON.parse(enchere.enrichissement_data)
    : enchere.enrichissement_data || {}

  // Lancer l'estimation — même moteur que pour les biens classiques
  const estimation = await estimerBien({
    surface: enchere.surface,
    prix_fai: enchere.mise_a_prix,  // mise_a_prix au lieu de prix_fai
    type_bien: enchere.type_bien,
    nb_pieces: enchere.nb_pieces ? String(enchere.nb_pieces) : undefined,
    dpe: enrichData.dpe || undefined,
    adresse: enchere.adresse,
    ville: enchere.ville,
    code_postal: enchere.code_postal,
    has_cave: enrichData.has_cave || undefined,
    has_piscine: enrichData.has_piscine || undefined,
    etat_interieur: enrichData.etat_interieur || undefined,
    nb_chambres: enrichData.nb_chambres || undefined,
    score_travaux: enchere.score_travaux || undefined,
  }, existingGeo, prixParkingLocal)

  if (!estimation) {
    return NextResponse.json({
      error: 'Estimation impossible',
      raison: 'Pas assez de transactions comparables ou géocodage impossible'
    }, { status: 422 })
  }

  // Sauvegarder en cache dans la table encheres
  await supabaseAdmin
    .from('encheres')
    .update({
      latitude: estimation.latitude,
      longitude: estimation.longitude,
      estimation_prix_m2: estimation.prix_m2_corrige,
      estimation_prix_total: estimation.prix_total,
      estimation_confiance: estimation.confiance,
      estimation_nb_comparables: estimation.nb_comparables,
      estimation_rayon_m: estimation.rayon_m,
      estimation_date: new Date().toISOString(),
      estimation_details: estimation,
    })
    .eq('id', id)

  return NextResponse.json({ estimation, cached: false })
}
