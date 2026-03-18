import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const metropole = searchParams.get('metropole')

  if (!q || q.length < 2) {
    return NextResponse.json({ communes: [] })
  }

  let query = supabaseAdmin
    .from('ref_communes')
    .select('code_postal, nom_commune, metropole')

  // Recherche par code postal ou par nom de commune
  const isPostalCode = /^\d+$/.test(q)
  if (isPostalCode) {
    query = query.like('code_postal', `${q}%`)
  } else {
    query = query.ilike('nom_commune', `%${q}%`)
  }

  if (metropole && metropole !== 'Toutes') {
    query = query.eq('metropole', metropole)
  }

  query = query.order('nom_commune').limit(20)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Deduplique par code_postal + nom_commune
  const seen = new Set()
  const uniques = (data || []).filter(c => {
    const key = `${c.code_postal}-${c.nom_commune}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({ communes: uniques })
}
