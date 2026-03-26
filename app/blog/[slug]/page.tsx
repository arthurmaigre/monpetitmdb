import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ArticleClient from './ArticleClient'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data } = await supabaseAdmin
    .from('articles')
    .select('title, excerpt, cover_url, category')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!data) return { title: 'Article introuvable' }

  return {
    title: data.title,
    description: data.excerpt || `${data.title} — Mon Petit MDB`,
    openGraph: {
      title: data.title,
      description: data.excerpt || undefined,
      images: data.cover_url ? [data.cover_url] : undefined,
      type: 'article',
    },
  }
}

async function getArticle(slug: string) {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('title, slug, content, category, keyword, published_at, word_count, cover_url, author')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  return data
}

async function getRelatedArticles(slug: string) {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('title, slug, cover_url, published_at')
    .eq('status', 'published')
    .neq('slug', slug)
    .order('published_at', { ascending: false })
    .limit(3)

  return data || []
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const [article, related] = await Promise.all([
    getArticle(slug),
    getRelatedArticles(slug),
  ])

  if (!article) notFound()

  return <ArticleClient article={article} related={related} />
}
