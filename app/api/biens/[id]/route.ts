import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabaseAdmin
    .from('biens')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  // Générer une URL signée pour la photo si elle existe
  let photoUrl = null
  if (data.photo_storage_path) {
    const { data: signed } = await supabaseAdmin
      .storage
      .from('mdb-files')
      .createSignedUrl(data.photo_storage_path, 3600 * 24 * 7)
    photoUrl = signed?.signedUrl ?? null
  }

  return NextResponse.json({ bien: { ...data, photo_signed_url: photoUrl } })
}