import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { type, category, summary, detail, bien_id } = await req.json()

    if (!type || !category || !summary) {
      return NextResponse.json({ error: 'type, category et summary requis' }, { status: 400 })
    }

    // Auth optionnelle (on accepte les feedbacks anonymes)
    let userId: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
    }

    // Chercher un feedback existant avec le meme summary
    const { data: existing } = await supabaseAdmin
      .from('feedbacks')
      .select('id, occurrences')
      .eq('summary', summary)
      .eq('type', type)
      .eq('category', category)
      .maybeSingle()

    if (existing) {
      // Incrementer le compteur
      await supabaseAdmin
        .from('feedbacks')
        .update({
          occurrences: existing.occurrences + 1,
          last_seen: new Date().toISOString(),
          detail: detail || undefined, // garder le dernier detail
        })
        .eq('id', existing.id)

      return NextResponse.json({ status: 'incremented', id: existing.id, occurrences: existing.occurrences + 1 })
    } else {
      // Creer un nouveau feedback
      const { data, error } = await supabaseAdmin
        .from('feedbacks')
        .insert({
          type,
          category,
          summary,
          detail: detail || null,
          user_id: userId,
          bien_id: bien_id || null,
        })
        .select('id')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ status: 'created', id: data.id, occurrences: 1 })
    }
  } catch (err) {
    console.error('Feedback API error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET : liste des feedbacks (admin)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('feedbacks')
    .select('*')
    .order('occurrences', { ascending: false })
    .order('last_seen', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feedbacks: data })
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { error } = await supabaseAdmin.from('feedbacks').delete().eq('id', Number(id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
