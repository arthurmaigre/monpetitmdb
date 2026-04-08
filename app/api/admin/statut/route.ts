import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

// ──────────────────────────────────────────────────────────────────────────────
// Auth helper
// ──────────────────────────────────────────────────────────────────────────────

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

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

// ──────────────────────────────────────────────────────────────────────────────
// Check if a source URL is still active (HEAD request)
// Returns: 'active' | 'expired' | 'error'
// ──────────────────────────────────────────────────────────────────────────────

async function checkUrlStatus(url: string): Promise<'active' | 'expired' | 'error'> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const resp = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonPetitMDB/1.0; status-check)',
      },
    })
    clearTimeout(timeout)

    // 404, 410 (Gone) → annonce supprimee
    if (resp.status === 404 || resp.status === 410) return 'expired'

    // 200, 301, 302 (redirect suivis) → encore en ligne
    if (resp.ok) return 'active'

    // 403 (bloque) → on ne peut pas savoir, skip
    if (resp.status === 403) return 'error'

    // Autres codes (500, 503...) → erreur temporaire, skip
    return 'error'
  } catch {
    // Timeout, DNS error, network → skip
    return 'error'
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/statut — Verification statut annonces par URL source
//
// Biens SE : geres par event ad.update.expired (webhook)
// Biens MI sans stream_estate_id : verifies par HEAD sur l'URL source
// Biens manuels : ignores (pas d'URL verifiable)
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const isAdmin = await checkAdminOrCron(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: config } = await supabaseAdmin.from('cron_config').select('enabled').eq('id', 'statut').single()
  if (config && !config.enabled) return NextResponse.json({ skipped: true, reason: 'cron disabled' })

  const { searchParams } = new URL(req.url)
  const limitParam = searchParams.get('limit')
  const batchSize = limitParam ? Math.min(Number(limitParam), 50) : 25

  // Fetch biens actifs non-SE, non-manuels, les plus anciennement verifies en premier
  const { data: biens, error: fetchErr } = await supabaseAdmin
    .from('biens')
    .select('id, url')
    .eq('statut', 'Toujours disponible')
    .not('url', 'like', 'manual://%')
    .or('stream_estate_id.is.null')
    .order('derniere_verif_statut', { ascending: true, nullsFirst: true })
    .limit(batchSize)

  if (fetchErr || !biens || biens.length === 0) {
    const resultData = { checked: 0, expired: 0, errors: 0, active: 0 }
    await supabaseAdmin.from('cron_config').update({
      last_run: new Date().toISOString(),
      last_result: resultData,
    }).eq('id', 'statut')
    return NextResponse.json(resultData)
  }

  let checked = 0, expired = 0, active = 0, errorCount = 0

  for (const bien of biens) {
    if (!bien.url) { errorCount++; continue }

    const status = await checkUrlStatus(bien.url)
    checked++

    if (status === 'expired') {
      await supabaseAdmin.from('biens')
        .update({ statut: 'Annonce expiree', derniere_verif_statut: new Date().toISOString() })
        .eq('id', bien.id)
      expired++
    } else if (status === 'active') {
      await supabaseAdmin.from('biens')
        .update({ derniere_verif_statut: new Date().toISOString() })
        .eq('id', bien.id)
      active++
    } else {
      // error → on met a jour la date pour ne pas re-verifier en boucle
      await supabaseAdmin.from('biens')
        .update({ derniere_verif_statut: new Date().toISOString() })
        .eq('id', bien.id)
      errorCount++
    }
  }

  const resultData = { checked, expired, active, errors: errorCount }
  await supabaseAdmin.from('cron_config').update({
    last_run: new Date().toISOString(),
    last_result: resultData,
  }).eq('id', 'statut')

  return NextResponse.json(resultData)
}
