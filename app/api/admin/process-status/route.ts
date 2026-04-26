import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

async function checkAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
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

function computeStatus(lastRun: string | null, result: Record<string, unknown> | null): 'ok' | 'warning' | 'error' {
  if (!lastRun) return 'error'
  const ageH = (Date.now() - new Date(lastRun).getTime()) / 3600000
  if (ageH > 48) return 'error'
  if (ageH > 26) return 'warning'
  if (result?.status === 'error') return 'error'
  return 'ok'
}

export async function GET(req: NextRequest) {
  const isAdmin = await checkAdmin(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const [cronRes, lepQ, idrQ, travQ, enchQ] = await Promise.all([
    supabaseAdmin
      .from('cron_config')
      .select('id,last_run,last_result')
      .in('id', ['poll_se', 'encheres_pipeline', 'extraction_nuit']),

    // File d'attente LEP (valides sans extraction ou en échec)
    supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
      .eq('strategie_mdb', 'Locataire en place')
      .eq('statut', 'Toujours disponible')
      .eq('regex_statut', 'valide')
      .or('extraction_statut.is.null,extraction_statut.in.(echec,echec_quota)'),

    // File d'attente IDR (valides sans extraction ou en échec)
    supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
      .eq('strategie_mdb', 'Immeuble de rapport')
      .eq('statut', 'Toujours disponible')
      .eq('regex_statut', 'valide')
      .or('extraction_statut.is.null,extraction_statut.in.(echec,echec_quota)'),

    // File d'attente Travaux (valides sans score)
    supabaseAdmin.from('biens').select('id', { count: 'exact', head: true })
      .eq('strategie_mdb', 'Travaux lourds')
      .eq('statut', 'Toujours disponible')
      .eq('regex_statut', 'valide')
      .is('score_travaux', null),

    // Totaux enchères
    supabaseAdmin.from('encheres').select('statut', { count: 'exact' })
      .eq('statut', 'a_venir'),
  ])

  const crons = Object.fromEntries(
    (cronRes.data ?? []).map(c => [c.id, c])
  )

  const se = crons['poll_se'] ?? null
  const encheres = crons['encheres_pipeline'] ?? null
  const extraction = crons['extraction_nuit'] ?? null

  return NextResponse.json({
    poll_se: {
      last_run: se?.last_run ?? null,
      status: computeStatus(se?.last_run ?? null, se?.last_result as Record<string, unknown> | null),
      result: se?.last_result ?? null,
    },
    extraction_nuit: {
      last_run: extraction?.last_run ?? null,
      status: computeStatus(extraction?.last_run ?? null, extraction?.last_result as Record<string, unknown> | null),
      result: extraction?.last_result ?? null,
      queue: {
        lep: lepQ.count ?? 0,
        idr: idrQ.count ?? 0,
        travaux: travQ.count ?? 0,
      },
    },
    encheres_pipeline: {
      last_run: encheres?.last_run ?? null,
      status: computeStatus(encheres?.last_run ?? null, encheres?.last_result as Record<string, unknown> | null),
      result: encheres?.last_result ?? null,
      a_venir: enchQ.count ?? 0,
    },
  })
}
