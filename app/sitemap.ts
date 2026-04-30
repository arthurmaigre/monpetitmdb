import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default async function sitemap() {
  const baseUrl = 'https://www.monpetitmdb.fr'

  // Pages statiques
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${baseUrl}/biens`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },

    { url: `${baseUrl}/strategies`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/cgu`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/mentions-legales`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
  ]

  // Articles de blog et guides publies
  let blogPages: { url: string; lastModified: Date; changeFrequency: 'weekly'; priority: number }[] = []
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: articles } = await supabase
      .from('articles')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })

    if (articles) {
      blogPages = articles.map(a => ({
        url: `${baseUrl}/blog/${a.slug}`,
        lastModified: new Date(a.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
    }
  } catch { /* ignore */ }

  return [...staticPages, ...blogPages]
}
