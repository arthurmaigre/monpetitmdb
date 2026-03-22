import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')

  if (slug) {
    // Article individuel
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('title, slug, content, category, keyword, published_at, word_count, cover_url')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error || !data) return NextResponse.json({ error: 'Article introuvable' }, { status: 404 })
    return NextResponse.json({ article: data })
  }

  // Liste des articles publiés
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('title, slug, category, keyword, published_at, word_count, content, cover_url')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Générer un extrait + cover_url depuis le contenu
  const articles = (data || []).map((a: Record<string, unknown>) => {
    const content = String(a.content || '')

    // Strip HTML tags + markdown, garder le texte brut
    const plain = content
      .replace(/<[^>]+>/g, ' ')           // strip HTML tags
      .replace(/&[a-z]+;/gi, ' ')         // strip HTML entities
      .replace(/[#*_`>\[\]()!|~\-]/g, '') // strip markdown chars
      .replace(/\s+/g, ' ')
      .trim()

    // Sauter le titre (souvent répété en début) et les crédits photo
    const title = String(a.title || '')
    let cleanText = plain.startsWith(title) ? plain.slice(title.length).trim() : plain
    cleanText = cleanText.replace(/^Photo\s*:\s*[^.]+\.\s*/i, '').replace(/^Photo\s*:\s*[^/]+\/\s*\w+\s*/i, '').trim()
    const excerpt = cleanText.length > 180
      ? cleanText.slice(0, 180).replace(/\s\S*$/, '') + '...'
      : cleanText

    // Si pas de cover_url, extraire la première image du contenu
    let cover = a.cover_url as string | null
    if (!cover) {
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/) || content.match(/!\[[^\]]*\]\(([^)]+)\)/)
      if (imgMatch) cover = imgMatch[1]
    }

    return { ...a, content: undefined, excerpt, cover_url: cover }
  })

  return NextResponse.json({ articles })
}
