import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import GuideArticleClient from './GuideArticleClient'

export const revalidate = 3600

const GUIDE_CATEGORIES = ['Stratégies', 'Fiscalité', 'Marché', 'Travaux', 'Financement']

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
    .in('category', GUIDE_CATEGORIES)
    .maybeSingle()

  if (!data) return { title: 'Guide introuvable' }

  return {
    title: `${data.title} — Guide investissement immobilier`,
    description: data.excerpt || `${data.title} — Guide pratique Mon Petit MDB`,
    openGraph: {
      title: data.title,
      description: data.excerpt || undefined,
      images: data.cover_url ? [data.cover_url] : undefined,
      type: 'article',
      siteName: 'Mon Petit MDB',
    },
  }
}

async function getArticle(slug: string) {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('title, slug, content, category, keyword, published_at, word_count, cover_url, author, excerpt')
    .eq('slug', slug)
    .eq('status', 'published')
    .in('category', GUIDE_CATEGORIES)
    .maybeSingle()

  return data
}

async function getRelatedArticles(slug: string, category: string) {
  // Prefer same category, then other guide categories
  const { data: sameCategory } = await supabaseAdmin
    .from('articles')
    .select('title, slug, cover_url, published_at, category')
    .eq('status', 'published')
    .eq('category', category)
    .neq('slug', slug)
    .in('category', GUIDE_CATEGORIES)
    .order('published_at', { ascending: false })
    .limit(3)

  if (sameCategory && sameCategory.length >= 3) return sameCategory

  // Fill remaining with other guide articles
  const existingSlugs = (sameCategory || []).map(a => a.slug)
  existingSlugs.push(slug)

  const { data: others } = await supabaseAdmin
    .from('articles')
    .select('title, slug, cover_url, published_at, category')
    .eq('status', 'published')
    .in('category', GUIDE_CATEGORIES)
    .not('slug', 'in', `(${existingSlugs.map(s => `"${s}"`).join(',')})`)
    .order('published_at', { ascending: false })
    .limit(3 - (sameCategory?.length || 0))

  return [...(sameCategory || []), ...(others || [])]
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) notFound()

  const related = await getRelatedArticles(slug, article.category)

  return (
    <>
      <GuideArticleClient article={article} related={related} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "datePublished": article.published_at,
        "author": { "@type": "Person", "name": article.author || "Mon Petit MDB" },
        "image": article.cover_url || undefined,
        "publisher": { "@type": "Organization", "name": "Mon Petit MDB", "url": "https://www.monpetitmdb.fr" },
        "description": article.excerpt || undefined,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": `https://www.monpetitmdb.fr/guide/${article.slug}`
        }
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://www.monpetitmdb.fr" },
          { "@type": "ListItem", "position": 2, "name": "Guides", "item": "https://www.monpetitmdb.fr/guide" },
          { "@type": "ListItem", "position": 3, "name": article.title, "item": `https://www.monpetitmdb.fr/guide/${article.slug}` }
        ]
      }) }} />
    </>
  )
}
