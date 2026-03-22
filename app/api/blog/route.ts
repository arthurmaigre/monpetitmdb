import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')

  if (slug) {
    // Article individuel
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('title, slug, content, category, keyword, published_at, word_count')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error || !data) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })
    return NextResponse.json({ article: data })
  }

  // Liste des articles publiés
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('title, slug, category, keyword, published_at, word_count')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articles: data || [] })
}
