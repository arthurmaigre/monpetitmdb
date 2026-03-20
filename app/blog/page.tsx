'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'

interface Article {
  title: string
  slug: string
  category: string
  keyword: string | null
  author: string | null
  published_at: string
  word_count: number | null
}

export default function BlogPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')

  useEffect(() => {
    fetch('/api/blog')
      .then(r => r.json())
      .then(d => setArticles(d.articles || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const categories = [...new Set(articles.map(a => a.category).filter(Boolean))]
  const filtered = activeCategory ? articles.filter(a => a.category === activeCategory) : articles

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function readTime(wc: number | null) {
    if (!wc) return '3 min'
    return `${Math.max(1, Math.round(wc / 250))} min`
  }

  function extractExcerpt(title: string) {
    // On n'a pas le contenu dans la liste, on affiche juste le keyword ou rien
    return ''
  }

  return (
    <Layout>
      <style>{`
        .blog-wrap { max-width: 1100px; margin: 0 auto; padding: 64px 48px 100px; }
        .blog-header { margin-bottom: 48px; }
        .blog-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #c0392b; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .blog-eyebrow::before { content: ''; width: 24px; height: 2px; background: #c0392b; }
        .blog-title { font-family: 'Fraunces', serif; font-size: 48px; font-weight: 800; letter-spacing: -0.03em; color: #1a1210; margin-bottom: 12px; }
        .blog-sub { font-size: 17px; color: #9a8a80; max-width: 560px; }
        .blog-cats { display: flex; gap: 8px; margin-bottom: 40px; flex-wrap: wrap; }
        .blog-cat { padding: 8px 20px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 150ms ease; background: #fff; color: #9a8a80; }
        .blog-cat:hover { border-color: #1a1210; color: #1a1210; }
        .blog-cat.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .blog-card { background: #fff; border-radius: 16px; border: 1.5px solid #e8e2d8; overflow: hidden; transition: all 150ms ease; text-decoration: none; color: inherit; display: flex; flex-direction: column; }
        .blog-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(26,18,16,0.08); border-color: #d4cdc4; }
        .blog-card-cat { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #f0ede8; color: #9a8a80; margin-bottom: 12px; }
        .blog-card-body { padding: 28px; flex: 1; display: flex; flex-direction: column; }
        .blog-card-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; color: #1a1210; line-height: 1.3; margin-bottom: 12px; }
        .blog-card-keyword { font-size: 14px; color: #9a8a80; line-height: 1.6; margin-bottom: 16px; flex: 1; }
        .blog-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #f0ede8; }
        .blog-card-author { display: flex; align-items: center; gap: 8px; }
        .blog-card-avatar { width: 28px; height: 28px; border-radius: 50%; background: #c0392b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
        .blog-card-name { font-size: 12px; font-weight: 600; color: #1a1210; }
        .blog-card-date { font-size: 12px; color: #9a8a80; }
        .blog-card-meta { text-align: right; }
        .blog-card-read { font-size: 11px; color: #9a8a80; }
        .blog-empty { text-align: center; padding: 80px 40px; color: #9a8a80; }
        .blog-empty h3 { font-family: 'Fraunces', serif; font-size: 24px; color: #1a1210; margin-bottom: 8px; }
        /* SKELETON */
        .blog-skel { border-radius: 16px; background: #f0ede8; animation: blogPulse 1.5s ease infinite; }
        @keyframes blogPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        /* RESPONSIVE */
        @media (max-width: 768px) {
          .blog-wrap { padding: 40px 24px 64px; }
          .blog-title { font-size: 32px; }
          .blog-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="blog-wrap">
        <div className="blog-header">
          <div className="blog-eyebrow">Blog</div>
          <h1 className="blog-title">{"Guides & analyses"}</h1>
          <p className="blog-sub">{"Fiscalit\u00E9, strat\u00E9gies d\u2019investissement, march\u00E9 immobilier \u2014 tout ce qu\u2019il faut savoir pour investir intelligemment."}</p>
        </div>

        {/* Filtres catégories */}
        {categories.length > 1 && (
          <div className="blog-cats">
            <button className={`blog-cat ${activeCategory === '' ? 'active' : ''}`} onClick={() => setActiveCategory('')}>Tous</button>
            {categories.map(cat => (
              <button key={cat} className={`blog-cat ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="blog-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="blog-skel" style={{ height: '280px', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="blog-empty">
            <h3>{"Aucun article pour le moment"}</h3>
            <p>{"Les premiers articles arrivent bient\u00F4t."}</p>
          </div>
        ) : (
          <div className="blog-grid">
            {filtered.map(article => {
              const author = article.author || 'La r\u00E9daction Mon Petit MDB'
              return (
                <a key={article.slug} href={`/blog/${article.slug}`} className="blog-card">
                  <div className="blog-card-body">
                    {article.category && <span className="blog-card-cat">{article.category}</span>}
                    <h2 className="blog-card-title">{article.title}</h2>
                    {article.keyword && <p className="blog-card-keyword">{article.keyword}</p>}
                    <div className="blog-card-footer">
                      <div className="blog-card-author">
                        <div className="blog-card-avatar">{author[0]}</div>
                        <div>
                          <div className="blog-card-name">{author}</div>
                          <div className="blog-card-date">{formatDate(article.published_at)}</div>
                        </div>
                      </div>
                      <div className="blog-card-meta">
                        <div className="blog-card-read">{readTime(article.word_count)} de lecture</div>
                      </div>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
