import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Metadata } from 'next'
import BlogClient from './BlogClient'

export const metadata: Metadata = {
  title: 'Conseils immobiliers — Guides & analyses',
  openGraph: { title: 'Conseils immobiliers — Guides & analyses | Mon Petit MDB' },
  description: 'Fiscalit\u00E9, strat\u00E9gies d\u2019investissement, march\u00E9 immobilier \u2014 tout ce qu\u2019il faut savoir pour investir intelligemment.',
}

export const revalidate = 3600 // Revalide toutes les heures

async function getArticles() {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('title, slug, category, keyword, published_at, word_count, content, cover_url')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (data || []).map((a: Record<string, unknown>) => {
    const content = String(a.content || '')
    const plain = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/[#*_`>\[\]()!|~\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const title = String(a.title || '')
    let cleanText = plain.startsWith(title) ? plain.slice(title.length).trim() : plain
    cleanText = cleanText.replace(/^Photo\s*:\s*[^.]+\.\s*/i, '').replace(/^Photo\s*:\s*[^/]+\/\s*\w+\s*/i, '').trim()
    const excerpt = cleanText.length > 180
      ? cleanText.slice(0, 180).replace(/\s\S*$/, '') + '...'
      : cleanText

    let cover = a.cover_url as string | null
    if (!cover) {
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/) || content.match(/!\[[^\]]*\]\(([^)]+)\)/)
      if (imgMatch) cover = imgMatch[1]
    }

    return {
      title: a.title as string,
      slug: a.slug as string,
      category: a.category as string,
      keyword: a.keyword as string | null,
      published_at: a.published_at as string,
      word_count: a.word_count as number | null,
      excerpt,
      cover_url: cover,
    }
  })
}

export default async function BlogPage() {
  const articles = await getArticles()

  return <BlogClient articles={articles} />
}
