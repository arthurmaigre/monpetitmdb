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
// POST /api/admin/statut
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { data: config } = await supabaseAdmin.from('cron_config').select('enabled').eq('id', 'statut').single()
  if (config && !config.enabled) return NextResponse.json({ skipped: true, reason: 'cron disabled' })

  const fakeReq = new NextRequest(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({}) })
  const result = await POST(fakeReq)

  const resultData = await result.clone().json()
  await supabaseAdmin.from('cron_config').update({ last_run: new Date().toISOString(), last_result: resultData }).eq('id', 'statut')

  return result
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminOrCron(req)
    if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const apiKey = process.env.MOTEURIMMO_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'MOTEURIMMO_API_KEY non configurée' }, { status: 500 })
    }

    // Default: 7 days ago
    const since = body.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Paginate through Moteur Immo deletedAds API
    const allUniqueIds: string[] = []
    let page = 1

    while (page <= 100) {
      const resp = await fetch('https://moteurimmo.fr/api/deletedAds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          types: ['sale'],
          categories: ['house', 'flat', 'block'],
          apiKey,
          creationDateAfter: since,
          page,
          maxLength: 100,
        }),
      })

      if (!resp.ok) {
        const errText = await resp.text().catch(() => 'Unknown error')
        return NextResponse.json(
          { error: `Moteur Immo API error: ${resp.status} ${errText}` },
          { status: 502 }
        )
      }

      const data = await resp.json()
      const deletedAds = data.ads || []
      if (!Array.isArray(deletedAds) || deletedAds.length === 0) break

      const ids = deletedAds
        .map((ad: { uniqueId?: string }) => ad.uniqueId)
        .filter((id: string | undefined): id is string => !!id)
      allUniqueIds.push(...ids)

      if (deletedAds.length < 100) break
      page++
    }

    let checked = allUniqueIds.length
    let expired = 0
    let errorCount = 0

    // Match by moteurimmo_unique_id column (indexed) in batches of 100
    for (let i = 0; i < allUniqueIds.length; i += 100) {
      const batch = allUniqueIds.slice(i, i + 100)
      try {
        const { data: updated, error } = await supabaseAdmin
          .from('biens')
          .update({
            statut: 'Annonce expir\u00E9e',
            derniere_verif_statut: new Date().toISOString(),
          })
          .in('moteurimmo_unique_id', batch)
          .eq('statut', 'Toujours disponible')
          .select('id')

        if (error) {
          console.error(`Statut update error batch ${i}:`, error.message)
          errorCount++
        } else {
          expired += updated?.length || 0
        }
      } catch (e) {
        console.error(`Statut batch ${i} exception:`, e)
        errorCount++
      }
    }

    return NextResponse.json({
      checked,
      expired,
      errors: errorCount,
    })
  } catch (err) {
    console.error('Statut check error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
