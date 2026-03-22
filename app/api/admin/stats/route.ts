import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

async function checkAdminOrCron(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return false
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

async function count(table: string, filters: Record<string, unknown> = {}, isNull?: string[]): Promise<number> {
  let q = supabaseAdmin.from(table).select('id', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filters)) {
    q = q.eq(k, v)
  }
  for (const col of isNull || []) {
    q = q.is(col, null)
  }
  const { count: c } = await q
  return c || 0
}

async function countNotNull(table: string, col: string, filters: Record<string, unknown> = {}): Promise<number> {
  let q = supabaseAdmin.from(table).select('id', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filters)) {
    q = q.eq(k, v)
  }
  q = q.not(col, 'is', null)
  const { count: c } = await q
  return c || 0
}

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await checkAdminOrCron(req)
    if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const ACTIF = { statut: 'Toujours disponible' }
    const LOC = { strategie_mdb: 'Locataire en place', statut: 'Toujours disponible' }
    const TRAV = { strategie_mdb: 'Travaux lourds', statut: 'Toujours disponible' }

    // Batch 1: counts globaux (6 requêtes)
    const [total, users, watchlist, disponible, expiree, fauxPositif] = await Promise.all([
      count('biens'),
      count('profiles'),
      count('watchlist'),
      count('biens', { statut: 'Toujours disponible' }),
      count('biens', { statut: 'Annonce expirée' }),
      count('biens', { statut: 'Faux positif' }),
    ])

    // Batch 2: par stratégie (4 requêtes)
    const [locataire, travaux, division, decoupe] = await Promise.all([
      count('biens', { strategie_mdb: 'Locataire en place' }),
      count('biens', { strategie_mdb: 'Travaux lourds' }),
      count('biens', { strategie_mdb: 'Division' }),
      count('biens', { strategie_mdb: 'Découpe' }),
    ])

    // Batch 3: qualité données locataire en place (6 requêtes)
    const [locActif, locSansLoyer, locSansCharges, locSansTaxe, locSansProfil, locSansBail] = await Promise.all([
      count('biens', LOC),
      count('biens', LOC, ['loyer']),
      count('biens', LOC, ['charges_copro']),
      count('biens', LOC, ['taxe_fonc_ann']),
      count('biens', { ...LOC, profil_locataire: 'NC' }),
      count('biens', LOC, ['fin_bail']),
    ])

    // Batch 4: qualité données travaux lourds + extraction/score pending (6 requêtes)
    const [travActif, travSansScore, travSansDpe, extractionDone, extractionPending, scorePending] = await Promise.all([
      count('biens', TRAV),
      count('biens', TRAV, ['score_travaux']),
      count('biens', TRAV, ['dpe']),
      countNotNull('biens', 'extraction_statut', LOC),
      count('biens', LOC, ['extraction_statut']),
      count('biens', TRAV, ['score_travaux']),
    ])

    // Batch 5: regex + estimation (4 requêtes)
    const [regexDone, regexPending, estimationDone, estimationPending] = await Promise.all([
      countNotNull('biens', 'regex_statut', ACTIF),
      count('biens', ACTIF, ['regex_statut']),
      countNotNull('biens', 'estimation_prix_total', ACTIF),
      count('biens', ACTIF, ['estimation_prix_total']),
    ])

    // Batch 6: données générales (4 requêtes)
    const [sansPrix, sansSurface, avecPhoto, sansPhoto] = await Promise.all([
      count('biens', ACTIF, ['prix_fai']),
      count('biens', ACTIF, ['surface']),
      countNotNull('biens', 'photo_url', ACTIF),
      count('biens', ACTIF, ['photo_url']),
    ])

    return NextResponse.json({
      // Compat /admin page
      biens: total, users, watchlist,

      // Global
      total, disponible, expiree, faux_positifs: fauxPositif,

      // Par stratégie
      locataire, travaux, division, decoupe,

      // Statut pipeline
      regex_done: regexDone,
      regex_pending: regexPending,
      extraction_done: extractionDone,
      extraction_pending: extractionPending,
      score_done: travActif - travSansScore,
      score_pending: scorePending,
      estimation_done: estimationDone,
      estimation_pending: estimationPending,

      // Qualité — Locataire en place
      loc_actif: locActif,
      loc_sans_loyer: locSansLoyer,
      loc_sans_charges: locSansCharges,
      loc_sans_taxe: locSansTaxe,
      loc_sans_profil: locSansProfil,
      loc_sans_bail: locSansBail,
      loc_completude: locActif > 0 ? Math.round((1 - locSansLoyer / locActif) * 100) : 0,

      // Qualité — Travaux lourds
      trav_actif: travActif,
      trav_sans_score: travSansScore,
      trav_sans_dpe: travSansDpe,
      trav_completude: travActif > 0 ? Math.round((1 - travSansScore / travActif) * 100) : 0,

      // Qualité — Données générales
      sans_prix: sansPrix,
      sans_surface: sansSurface,
      avec_photo: avecPhoto,
      sans_photo: sansPhoto,
    })
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
