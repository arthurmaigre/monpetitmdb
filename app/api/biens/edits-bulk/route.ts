import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/biens/edits-bulk?ids=id1,id2,...
 * Retourne les statuts de validation (vert/jaune) pour N biens en un seul appel.
 * Même logique que /api/biens/[id]/edits mais bulk.
 */
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('ids')
  if (!ids) return NextResponse.json({})

  const idList = ids.split(',').filter(Boolean).slice(0, 200) // max 200 biens

  const { data, error } = await supabaseAdmin
    .from('biens_user_edits')
    .select('bien_id, champ, nouvelle_valeur, user_id')
    .in('bien_id', idList)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Grouper par bien_id
  const byBien: Record<string, typeof data> = {}
  for (const edit of data || []) {
    const bid = String(edit.bien_id)
    if (!byBien[bid]) byBien[bid] = []
    byBien[bid].push(edit)
  }

  // Pour chaque bien, calculer les statuts par champ
  const result: Record<string, Record<string, { valeur: string, statut: 'jaune' | 'vert' }>> = {}

  for (const [bienId, edits] of Object.entries(byBien)) {
    const champsMap: Record<string, { valeur: string, users: Set<string> }> = {}

    for (const edit of edits) {
      const { champ, nouvelle_valeur, user_id } = edit
      if (!champsMap[champ]) {
        champsMap[champ] = { valeur: nouvelle_valeur, users: new Set() }
      }
      if (nouvelle_valeur === champsMap[champ].valeur) {
        champsMap[champ].users.add(user_id)
      }
    }

    result[bienId] = {}
    for (const [champ, info] of Object.entries(champsMap)) {
      result[bienId][champ] = {
        valeur: info.valeur,
        statut: info.users.size >= 2 ? 'vert' : 'jaune',
      }
    }
  }

  return NextResponse.json(result)
}
