import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('biens_user_edits')
    .select('champ, nouvelle_valeur, user_id, created_at')
    .eq('bien_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Pour chaque champ, calculer le statut
  const champsMap: Record<string, { valeur: string, users: Set<string>, statut: 'jaune' | 'vert' }> = {}

  for (const edit of data || []) {
    const { champ, nouvelle_valeur, user_id } = edit
    if (!champsMap[champ]) {
      // Première occurrence = valeur la plus récente
      champsMap[champ] = { valeur: nouvelle_valeur, users: new Set(), statut: 'jaune' }
    }
    // Compter les users qui ont renseigné la même valeur que la plus récente
    if (nouvelle_valeur === champsMap[champ].valeur) {
      champsMap[champ].users.add(user_id)
    }
  }

  // Passer en vert si 2+ users ont la même valeur
  const result: Record<string, { valeur: string, statut: 'jaune' | 'vert' }> = {}
  for (const [champ, info] of Object.entries(champsMap)) {
    result[champ] = {
      valeur: info.valeur,
      statut: info.users.size >= 2 ? 'vert' : 'jaune'
    }
  }

  return NextResponse.json({ champs: result })
}