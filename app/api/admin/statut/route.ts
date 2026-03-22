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
  const fakeReq = new NextRequest(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({}) })
  return POST(fakeReq)
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

    // Call Moteur Immo deletedAds API
    const resp = await fetch('https://moteurimmo.fr/api/deletedAds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        types: ['sale'],
        categories: ['house', 'flat', 'block'],
        apiKey,
        creationDateAfter: since,
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
    const deletedAds = data.ads || data || []

    if (!Array.isArray(deletedAds)) {
      return NextResponse.json({ error: 'Format de réponse inattendu' }, { status: 502 })
    }

    let checked = 0
    let expired = 0
    let errorCount = 0

    // Process deleted ads in batches
    const urls: string[] = deletedAds
      .map((ad: { url?: string }) => ad.url)
      .filter((url: string | undefined): url is string => !!url)

    checked = urls.length

    // Update in batches of 100
    for (let i = 0; i < urls.length; i += 100) {
      const batch = urls.slice(i, i + 100)
      const { data: updated, error } = await supabaseAdmin
        .from('biens')
        .update({
          statut: 'Annonce expirée',
          derniere_verif_statut: new Date().toISOString(),
        })
        .in('url', batch)
        .select('id')

      if (error) {
        console.error(`Statut update error batch ${i}:`, error.message)
        errorCount++
      } else {
        expired += updated?.length || 0
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
