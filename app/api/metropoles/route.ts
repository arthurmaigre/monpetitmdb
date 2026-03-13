import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('biens')
    .select('metropole')
    .eq('statut', 'Toujours disponible')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const metropoles = [...new Set(data.map((r: any) => r.metropole))].filter(Boolean).sort()

  return NextResponse.json({ metropoles })
}