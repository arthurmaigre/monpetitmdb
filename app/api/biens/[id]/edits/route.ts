import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('biens_user_edits')
    .select('champ')
    .eq('bien_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const champs = [...new Set(data?.map((e: any) => e.champ) || [])]
  return NextResponse.json({ champs })
}