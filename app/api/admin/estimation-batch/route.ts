import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estimerBien } from '@/lib/estimation'

export const maxDuration = 300

// GET — appel cron (cron-job.org) : /api/admin/estimation-batch?limit=50
// Authorization: Bearer <CRON_SECRET>
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verifier si le cron est active dans cron_config
  const { data: config } = await supabaseAdmin
    .from('cron_config')
    .select('enabled')
    .eq('id', 'estimation')
    .maybeSingle()
  if (config && !config.enabled) {
    return NextResponse.json({ message: 'Cron estimation desactive', skipped: true })
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10'), 200)
  const result = await runEstimationBatch(limit)

  // Mettre a jour last_run dans cron_config
  await supabaseAdmin
    .from('cron_config')
    .update({ last_run: new Date().toISOString(), last_result: result })
    .eq('id', 'estimation')

  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}

async function runEstimationBatch(limit: number) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const { data: biens, error } = await supabaseAdmin
    .from('biens')
    .select('id, surface, prix_fai, type_bien, nb_pieces, etage, dpe, ascenseur, acces_exterieur, score_travaux, surface_terrain, adresse, ville, code_postal, latitude, longitude, parking_type, has_piscine, exposition, vue, etat_interieur, jardin_etat, has_cave, has_gardien, has_double_vitrage, has_cuisine_equipee, is_plain_pied, standing_immeuble, nb_sdb, nb_chambres, estimation_date')
    .eq('statut', 'Toujours disponible')
    .or(`estimation_date.is.null,estimation_date.lt.${thirtyDaysAgo}`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { error: error.message, total: 0, done: 0, errors: 0, skipped: 0 }

  const total = biens?.length || 0
  let done = 0
  let errors = 0
  let skipped = 0

  const errorDetails: { id: string, ville: string, raison: string }[] = []
  const skipDetails: { id: string, raison: string }[] = []

  async function processBien(bien: NonNullable<typeof biens>[number]): Promise<'done' | 'error' | 'skipped'> {
    if (!bien.surface || !bien.prix_fai || !bien.ville) {
      const manquant = [!bien.surface && 'surface', !bien.prix_fai && 'prix_fai', !bien.ville && 'ville'].filter(Boolean).join(', ')
      await supabaseAdmin.from('biens').update({ estimation_date: new Date().toISOString(), estimation_confiance: null }).eq('id', bien.id)
      skipDetails.push({ id: bien.id, raison: `donnees manquantes: ${manquant}` })
      return 'skipped'
    }

    try {
      const existingGeo = (bien.latitude && bien.longitude) ? { lat: bien.latitude, lng: bien.longitude } : null

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
        surface: bien.surface, prix_fai: bien.prix_fai, type_bien: bien.type_bien,
        nb_pieces: bien.nb_pieces, etage: bien.etage, dpe: bien.dpe,
        ascenseur: bien.ascenseur, acces_exterieur: bien.acces_exterieur,
        score_travaux: bien.score_travaux, surface_terrain: bien.surface_terrain,
        adresse: bien.adresse, ville: bien.ville, code_postal: bien.code_postal,
        parking_type: bien.parking_type, has_piscine: bien.has_piscine,
        exposition: bien.exposition, vue: bien.vue, etat_interieur: bien.etat_interieur,
        jardin_etat: bien.jardin_etat, has_cave: bien.has_cave, has_gardien: bien.has_gardien,
        has_double_vitrage: bien.has_double_vitrage, has_cuisine_equipee: bien.has_cuisine_equipee,
        is_plain_pied: bien.is_plain_pied, standing_immeuble: bien.standing_immeuble,
        nb_sdb: bien.nb_sdb, nb_chambres: bien.nb_chambres,
        has_grenier: false, assainissement: undefined
      }, existingGeo, prixParkingLocal)

      if (estimation) {
        await supabaseAdmin
          .from('biens')
          .update({
            latitude: estimation.latitude, longitude: estimation.longitude,
            estimation_prix_m2: estimation.prix_m2_corrige,
            estimation_prix_total: estimation.prix_total,
            estimation_confiance: estimation.confiance,
            estimation_nb_comparables: estimation.nb_comparables,
            estimation_rayon_m: estimation.rayon_m,
            estimation_date: new Date().toISOString(),
            estimation_details: estimation
          })
          .eq('id', bien.id)
        return 'done'
      } else {
        await supabaseAdmin.from('biens').update({ estimation_date: new Date().toISOString(), estimation_confiance: null }).eq('id', bien.id)
        errorDetails.push({ id: bien.id, ville: bien.ville, raison: 'aucun comparable DVF trouve' })
        return 'error'
      }
    } catch (e) {
      await supabaseAdmin.from('biens').update({ estimation_date: new Date().toISOString(), estimation_confiance: null }).eq('id', bien.id)
      errorDetails.push({ id: bien.id, ville: bien.ville || '?', raison: e instanceof Error ? e.message : String(e) })
      return 'error'
    }
  }

  // Traiter tous les biens en parallele
  const results = await Promise.all((biens || []).map(processBien))
  for (const r of results) {
    if (r === 'done') done++
    else if (r === 'error') errors++
    else skipped++
  }

  return { total, done, errors, skipped, errorDetails, skipDetails }
}
