import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Metadata } from 'next'
import GuideListClient from './GuideListClient'

export const metadata: Metadata = {
  title: 'Guides investissement immobilier — Mon Petit MDB',
  description: 'Guides pratiques pour investir dans l\u2019immobilier : strat\u00e9gies marchand de biens, fiscalit\u00e9 locative, travaux, march\u00e9 immobilier et financement.',
  openGraph: {
    title: 'Guides investissement immobilier',
    description: 'Guides pratiques pour investir dans l\u2019immobilier : strat\u00e9gies, fiscalit\u00e9, travaux et march\u00e9.',
    siteName: 'Mon Petit MDB',
  },
}

export const revalidate = 3600

const GUIDE_CATEGORIES = ['Strat\u00e9gies', 'Fiscalit\u00e9', 'March\u00e9', 'Travaux', 'Financement']

async function getGuideArticles() {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('title, slug, category, keyword, published_at, word_count, content, cover_url, excerpt')
    .eq('status', 'published')
    .in('category', GUIDE_CATEGORIES)
    .order('published_at', { ascending: false })

  return (data || []).map((a: Record<string, unknown>) => {
    const content = String(a.content || '')
    let excerpt = a.excerpt as string | null

    if (!excerpt) {
      const plain = content
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/[#*_`>\[\]()!|~\-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      const title = String(a.title || '')
      let cleanText = plain.startsWith(title) ? plain.slice(title.length).trim() : plain
      cleanText = cleanText.replace(/^Photo\s*:\s*[^.]+\.\s*/i, '').replace(/^Photo\s*:\s*[^/]+\/\s*\w+\s*/i, '').trim()
      excerpt = cleanText.length > 180
        ? cleanText.slice(0, 180).replace(/\s\S*$/, '') + '...'
        : cleanText
    }

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

export default async function GuidesPage() {
  const articles = await getGuideArticles()

  return <GuideListClient articles={articles} />
}
