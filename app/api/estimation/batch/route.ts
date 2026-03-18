import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estimerBien } from '@/lib/estimation'

export const maxDuration = 300 // 5 minutes max

export async function POST(request: NextRequest) {
  // Recuperer tous les biens actifs sans estimation ou avec estimation > 30 jours
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const { data: biens, error } = await supabaseAdmin
    .from('biens')
    .select('id, surface, prix_fai, type_bien, nb_pieces, etage, dpe, ascenseur, acces_exterieur, score_travaux, surface_terrain, adresse, ville, code_postal, latitude, longitude, parking_type, has_piscine, exposition, vue, etat_interieur, jardin_etat, has_cave, has_gardien, has_double_vitrage, has_cuisine_equipee, is_plain_pied, standing_immeuble, nb_sdb, nb_chambres, estimation_date')
    .eq('statut', 'Toujours disponible')
    .or(`estimation_date.is.null,estimation_date.lt.${thirtyDaysAgo}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = biens?.length || 0
  let done = 0
  let errors = 0

  for (const bien of (biens || [])) {
    if (!bien.surface || !bien.prix_fai || !bien.ville) {
      errors++
      continue
    }

    try {
      const existingGeo = (bien.latitude && bien.longitude) ? { lat: bien.latitude, lng: bien.longitude } : null

      // Prix parking local
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
        has_grenier: false,
        assainissement: undefined
      }, existingGeo, prixParkingLocal)

      if (estimation) {
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
          .eq('id', bien.id)
        done++
      } else {
        errors++
      }
    } catch {
      errors++
    }

    // Pause entre chaque bien pour ne pas surcharger l'API DVF
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return NextResponse.json({ total, done, errors })
}
