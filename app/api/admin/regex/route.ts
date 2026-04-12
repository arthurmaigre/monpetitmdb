import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'
import { REGEX_CONFIGS, testRegex } from '@/lib/regex-strategies'

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
// POST /api/admin/regex
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { data: config } = await supabaseAdmin.from('cron_config').select('enabled').eq('id', 'regex').single()
  if (config && !config.enabled) return NextResponse.json({ skipped: true, reason: 'cron disabled' })

  const fakeReq = new NextRequest(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({}) })
  const result = await POST(fakeReq)

  const resultData = await result.clone().json()
  await supabaseAdmin.from('cron_config').update({ last_run: new Date().toISOString(), last_result: resultData }).eq('id', 'regex')

  return result
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminOrCron(req)
    if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { strategie, cursor: initialCursor } = body
    const startTime = Date.now()
    const MAX_MS = 15000 // 15s max, leave margin for updates + cron-job.org 30s timeout

    if (strategie && !REGEX_CONFIGS[strategie]) {
      return NextResponse.json({ error: 'Stratégie invalide' }, { status: 400 })
    }

    let totalChecked = 0
    let totalFP = 0
    let currentCursor: string | null = initialCursor || null

    // Loop until timeout or no more biens
    while (Date.now() - startTime < MAX_MS) {
      let query = supabaseAdmin
        .from('biens')
        .select('id, created_at, strategie_mdb, surface, moteurimmo_data')
        .eq('statut', 'Toujours disponible')
        .is('regex_statut', null)
        .not('moteurimmo_data', 'is', null)
        .order('created_at', { ascending: true })
        .limit(500)

      if (strategie) query = query.eq('strategie_mdb', strategie)
      if (currentCursor) query = query.gt('created_at', currentCursor)

      const { data: biens, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!biens || biens.length === 0) break

      const idsToMarkFP: string[] = []
      const idsValid: string[] = []
      const now = new Date().toISOString()

      for (const bien of biens) {
        const config = REGEX_CONFIGS[bien.strategie_mdb]
        if (!config) { idsValid.push(bien.id); continue }
        let md: { title?: string; description?: string; surface?: number } | null = null
        try {
          const raw = bien.moteurimmo_data
          if (typeof raw === 'string') md = JSON.parse(raw)
          else if (raw && typeof raw === 'object') md = raw as any
        } catch { /* ignore */ }
        const text = [md?.title || '', md?.description || ''].join(' ')

        // Division : exiger surface >= 80m² (un petit bien n'est pas divisible)
        if (bien.strategie_mdb === 'Division' && bien.surface && bien.surface < 80) {
          idsToMarkFP.push(bien.id)
          totalFP++
          continue
        }

        if (!testRegex(text, config)) {
          idsToMarkFP.push(bien.id)
          totalFP++
        } else {
          idsValid.push(bien.id)
        }
      }

      // Batch updates (100 at a time)
      for (let i = 0; i < idsToMarkFP.length; i += 100) {
        await supabaseAdmin.from('biens')
          .update({ statut: 'Faux positif', regex_statut: 'faux_positif', regex_date: now })
          .in('id', idsToMarkFP.slice(i, i + 100))
      }
      for (let i = 0; i < idsValid.length; i += 100) {
        await supabaseAdmin.from('biens')
          .update({ regex_statut: 'valide', regex_date: now })
          .in('id', idsValid.slice(i, i + 100))
      }

      totalChecked += biens.length
      currentCursor = biens[biens.length - 1].created_at
      if (biens.length < 1000) break // no more biens
    }

    return NextResponse.json({
      checked: totalChecked,
      faux_positifs: totalFP,
      next_cursor: currentCursor,
    })
  } catch (err) {
    console.error('Regex validation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
