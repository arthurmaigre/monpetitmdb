import { createClient } from '@supabase/supabase-js'
import { estimerBien } from '../lib/estimation'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Charger .env depuis le répertoire courant (scrapper/)
try {
  readFileSync(resolve(process.cwd(), '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (m) (process.env[m[1].trim()] as string | undefined) ??= m[2].trim().replace(/^['"]|['"]$/g, '')
  })
} catch { /* env déjà chargé ou .env absent */ }

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_KEY! // service_role key
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '150')
const ENCHERES_LIMIT = parseInt(process.argv.find(a => a.startsWith('--encheres-limit='))?.split('=')[1] ?? '50')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERREUR: SUPABASE_URL et SUPABASE_KEY requis')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── BIENS ───────────────────────────────────────────────────────────────────

async function runBiensEstimation() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const { data: biens, error } = await supabase
    .from('biens')
    .select('id, surface, prix_fai, type_bien, nb_pieces, etage, dpe, ascenseur, acces_exterieur, score_travaux, surface_terrain, adresse, ville, code_postal, latitude, longitude, parking_type, has_piscine, exposition, vue, etat_interieur, jardin_etat, has_cave, has_gardien, has_double_vitrage, has_cuisine_equipee, is_plain_pied, standing_immeuble, nb_sdb, nb_chambres')
    .eq('statut', 'Toujours disponible')
    .or(`estimation_date.is.null,estimation_date.lt.${thirtyDaysAgo}`)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (error) {
    console.error('Biens — erreur Supabase:', error.message)
    return { total: 0, done: 0, errors: 0, skipped: 0 }
  }

  const total = biens?.length ?? 0
  console.log(`\n── Biens : ${total} dans la queue (limit=${LIMIT})`)

  let done = 0, errors = 0, skipped = 0

  for (const bien of (biens ?? [])) {
    const idx = done + errors + skipped + 1

    if (!bien.surface || !bien.prix_fai || !bien.ville) {
      await supabase.from('biens').update({
        estimation_date: new Date().toISOString(),
        estimation_confiance: null
      }).eq('id', bien.id)
      skipped++
      console.log(`skip [${idx}/${total}] ${bien.id} — données manquantes`)
      continue
    }

    try {
      const existingGeo = (bien.latitude && bien.longitude)
        ? { lat: bien.latitude as number, lng: bien.longitude as number }
        : null

      let prixParkingLocal: { box: number, parking: number } | null = null
      const { data: parkingData } = await supabase
        .from('ref_prix_parking')
        .select('prix_median_box, prix_median_parking')
        .ilike('ville', bien.ville)
        .maybeSingle()
      if (parkingData) {
        prixParkingLocal = { box: parkingData.prix_median_box, parking: parkingData.prix_median_parking }
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
        mitoyennete: undefined,
        has_grenier: false,
        assainissement: undefined
      }, existingGeo, prixParkingLocal)

      if (estimation) {
        await supabase.from('biens').update({
          latitude: estimation.latitude,
          longitude: estimation.longitude,
          estimation_prix_m2: estimation.prix_m2_corrige,
          estimation_prix_total: estimation.prix_total,
          estimation_confiance: estimation.confiance,
          estimation_nb_comparables: estimation.nb_comparables,
          estimation_rayon_m: estimation.rayon_m,
          estimation_date: new Date().toISOString(),
          estimation_details: estimation
        }).eq('id', bien.id)
        done++
        console.log(`ok  [${idx}/${total}] ${bien.ville} — ${estimation.confiance} ${estimation.prix_m2_corrige}€/m² (${estimation.rayon_m}m, ${estimation.nb_comparables} tx)`)
      } else {
        await supabase.from('biens').update({
          estimation_date: new Date().toISOString(),
          estimation_confiance: null
        }).eq('id', bien.id)
        errors++
        console.log(`err [${idx}/${total}] ${bien.ville} — aucun comparable DVF`)
      }
    } catch (e) {
      await supabase.from('biens').update({
        estimation_date: new Date().toISOString(),
        estimation_confiance: null
      }).eq('id', bien.id)
      errors++
      console.log(`err [${idx}/${total}] ${bien.id} — ${e instanceof Error ? e.message : String(e)}`)
    }

    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`Biens — résultat : ${done} estimés, ${errors} erreurs, ${skipped} skippés`)
  return { total, done, errors, skipped }
}

// ─── ENCHÈRES ─────────────────────────────────────────────────────────────────

async function runEncheresEstimation() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const { data: encheres, error } = await supabase
    .from('encheres')
    .select('id, surface, mise_a_prix, type_bien, nb_pieces, adresse, ville, code_postal, latitude, longitude, score_travaux, enrichissement_data')
    .eq('enrichissement_statut', 'ok')
    .eq('statut', 'a_venir')
    .or(`estimation_date.is.null,estimation_date.lt.${thirtyDaysAgo}`)
    .order('date_audience', { ascending: true })
    .limit(ENCHERES_LIMIT)

  if (error) {
    console.error('Enchères — erreur Supabase:', error.message)
    return { total: 0, done: 0, errors: 0, skipped: 0 }
  }

  const total = encheres?.length ?? 0
  console.log(`\n── Enchères : ${total} dans la queue (limit=${ENCHERES_LIMIT})`)

  let done = 0, errors = 0, skipped = 0

  for (const enchere of (encheres ?? [])) {
    const idx = done + errors + skipped + 1

    if (!enchere.surface || !enchere.mise_a_prix || !enchere.ville) {
      await supabase.from('encheres').update({
        estimation_date: new Date().toISOString(),
        estimation_confiance: null
      }).eq('id', enchere.id)
      skipped++
      console.log(`skip [${idx}/${total}] ${enchere.id} — données manquantes`)
      continue
    }

    try {
      const existingGeo = (enchere.latitude && enchere.longitude)
        ? { lat: enchere.latitude as number, lng: enchere.longitude as number }
        : null

      const enrichData = enchere.enrichissement_data || {}

      let prixParkingLocal: { box: number, parking: number } | null = null
      const { data: parkingData } = await supabase
        .from('ref_prix_parking')
        .select('prix_median_box, prix_median_parking')
        .ilike('ville', enchere.ville)
        .maybeSingle()
      if (parkingData) {
        prixParkingLocal = { box: parkingData.prix_median_box, parking: parkingData.prix_median_parking }
      }

      const estimation = await estimerBien({
        surface: enchere.surface,
        prix_fai: enchere.mise_a_prix,
        type_bien: enchere.type_bien,
        nb_pieces: enchere.nb_pieces ? String(enchere.nb_pieces) : undefined,
        adresse: enchere.adresse,
        ville: enchere.ville,
        code_postal: enchere.code_postal,
        score_travaux: enchere.score_travaux || undefined,
        dpe: enrichData.dpe || undefined,
        has_cave: enrichData.has_cave || undefined,
        has_piscine: enrichData.has_piscine || undefined,
        etat_interieur: enrichData.etat_interieur || undefined,
        nb_chambres: enrichData.nb_chambres || undefined,
      }, existingGeo, prixParkingLocal)

      if (estimation) {
        await supabase.from('encheres').update({
          latitude: estimation.latitude,
          longitude: estimation.longitude,
          estimation_prix_m2: estimation.prix_m2_corrige,
          estimation_prix_total: estimation.prix_total,
          estimation_confiance: estimation.confiance,
          estimation_nb_comparables: estimation.nb_comparables,
          estimation_rayon_m: estimation.rayon_m,
          estimation_date: new Date().toISOString(),
          estimation_details: estimation
        }).eq('id', enchere.id)
        done++
        console.log(`ok  [${idx}/${total}] ${enchere.ville} — ${estimation.confiance} ${estimation.prix_m2_corrige}€/m² (${estimation.rayon_m}m, ${estimation.nb_comparables} tx)`)
      } else {
        await supabase.from('encheres').update({
          estimation_date: new Date().toISOString(),
          estimation_confiance: null
        }).eq('id', enchere.id)
        errors++
        console.log(`err [${idx}/${total}] ${enchere.ville} — aucun comparable DVF`)
      }
    } catch (e) {
      await supabase.from('encheres').update({
        estimation_date: new Date().toISOString(),
        estimation_confiance: null
      }).eq('id', enchere.id)
      errors++
      console.log(`err [${idx}/${total}] ${enchere.id} — ${e instanceof Error ? e.message : String(e)}`)
    }

    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`Enchères — résultat : ${done} estimées, ${errors} erreurs, ${skipped} skippées`)
  return { total, done, errors, skipped }
}

// ─── ORCHESTRATEUR ────────────────────────────────────────────────────────────

async function run() {
  const startTime = Date.now()
  console.log(`[${new Date().toISOString()}] Démarrage — biens limit=${LIMIT}, enchères limit=${ENCHERES_LIMIT}`)

  const biensResult = await runBiensEstimation()
  const encheresResult = await runEncheresEstimation()

  const result = {
    biens: biensResult,
    encheres: encheresResult,
    status: 'success' as const
  }

  const { error } = await supabase.from('cron_config').upsert({
    id: 'estimation',
    enabled: true,
    schedule: '0 * * * *',
    last_run: new Date().toISOString(),
    last_result: result,
  }, { onConflict: 'id' })

  if (error) console.error('cron_config upsert erreur:', error.message)
  else console.log(`\n[${new Date().toISOString()}] cron_config mis à jour (${Math.round((Date.now() - startTime) / 1000)}s)`)
}

run().catch(e => {
  console.error('Erreur fatale:', e)
  process.exit(1)
})
