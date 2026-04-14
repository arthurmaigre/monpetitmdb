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
    .select('title, cover_url, category')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!data) return { title: 'Article introuvable' }

  return {
    title: data.title,
    description: `${data.title} — Mon Petit MDB`,
    alternates: { canonical: `https://www.monpetitmdb.fr/blog/${slug}` },
    openGraph: {
      title: data.title,
      description: `${data.title} — Mon Petit MDB`,
      images: data.cover_url ? [data.cover_url] : undefined,
      type: 'article',
    },
  }
}

async function getArticle(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('title, slug, content, category, keyword, published_at, word_count, cover_url')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) console.error('[blog/slug] getArticle error:', error.message, '| slug:', slug)
  if (!data) console.error('[blog/slug] Article not found for slug:', slug, '| supabaseUrl:', process.env.NEXT_PUBLIC_SUPABASE_URL, '| hasSecretKey:', !!process.env.SUPABASE_SECRET_KEY)
  return data
}

async function getRelatedArticles(slug: string) {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('title, slug, cover_url, published_at, category')
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

  return (
    <>
      <ArticleClient article={article} related={related} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "datePublished": article.published_at,
        "author": { "@type": "Organization", "name": "Mon Petit MDB" },
        "image": article.cover_url || undefined,
        "publisher": { "@type": "Organization", "name": "Mon Petit MDB" },
        "mainEntityOfPage": { "@type": "WebPage", "@id": `https://www.monpetitmdb.fr/blog/${article.slug}` }
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.monpetitmdb.fr" },
          { "@type": "ListItem", "position": 2, "name": "Conseils", "item": "https://www.monpetitmdb.fr/blog" },
          { "@type": "ListItem", "position": 3, "name": article.title, "item": `https://www.monpetitmdb.fr/blog/${article.slug}` }
        ]
      }) }} />
    </>
  )
}
