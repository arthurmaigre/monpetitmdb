'use client'

import { useState } from 'react'
import Image from 'next/image'
import Layout from '@/components/Layout'

interface Article {
  title: string
  slug: string
  category: string
  keyword: string | null
  excerpt: string | null
  cover_url: string | null
  published_at: string
  word_count: number | null
}

export default function BlogClient({ articles }: { articles: Article[] }) {
  const [activeCategory, setActiveCategory] = useState('')

  const categories = [...new Set(articles.map(a => a.category).filter(Boolean))]
  const filtered = activeCategory ? articles.filter(a => a.category === activeCategory) : articles
  const featured = filtered[0]
  const rest = filtered.slice(1)

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function readTime(wc: number | null) {
    if (!wc) return '3 min'
    return `${Math.max(1, Math.round(wc / 250))} min`
  }

  const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
    'Fiscalit\u00e9': { bg: '#d4ddf5', color: '#2a4a8a' },
    'Strat\u00e9gies': { bg: '#d4f5e0', color: '#1a7a40' },
    'March\u00e9': { bg: '#fff8f0', color: '#a06010' },
    'Travaux': { bg: '#fde8e8', color: '#c0392b' },
    'Financement': { bg: '#f0ede8', color: '#6a5a50' },
  }

  function catStyle(cat: string) {
    return CATEGORY_COLORS[cat] || { bg: '#f0ede8', color: '#7a6a60' }
  }

  return (
    <Layout>
      <style>{`
        .blog-wrap { max-width: 1100px; margin: 0 auto; padding: 64px 48px 100px; }
        .blog-header { margin-bottom: 48px; text-align: center; }
        .blog-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #c0392b; margin-bottom: 16px; }
        .blog-title { font-family: 'Fraunces', serif; font-size: 44px; font-weight: 800; letter-spacing: -0.03em; color: #1a1210; margin-bottom: 16px; }
        .blog-sub { font-size: 17px; color: #7a6a60; max-width: 600px; margin: 0 auto; line-height: 1.6; }
        .blog-cats { display: flex; gap: 8px; margin-bottom: 48px; flex-wrap: wrap; justify-content: center; }
        .blog-cat { padding: 8px 20px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 150ms ease; background: #fff; color: #7a6a60; }
        .blog-cat:hover { border-color: #1a1210; color: #1a1210; }
        .blog-cat.active { background: #1a1210; color: #fff; border-color: #1a1210; }

        /* Featured article */
        .blog-featured { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 48px; border-radius: 20px; overflow: hidden; border: 1.5px solid #e8e2d8; background: #fff; transition: all 150ms ease; text-decoration: none; color: inherit; }
        .blog-featured:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(26,18,16,0.1); border-color: #d4cdc4; }
        .blog-featured-visual { background: linear-gradient(135deg, #1a1210 0%, #3a2a20 50%, #c0392b 100%); display: flex; align-items: center; justify-content: center; min-height: 320px; position: relative; overflow: hidden; }
        .blog-featured-visual.has-img { background: #1a1210; }
        .blog-featured-img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
        .blog-featured-visual::after { content: ''; position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30h60M30 0v60' stroke='%23ffffff08' stroke-width='1'/%3E%3C/svg%3E"); }
        .blog-featured-visual.has-img::after { display: none; }
        .blog-featured-icon { font-family: 'Fraunces', serif; font-size: 80px; font-weight: 800; color: rgba(255,255,255,0.15); z-index: 1; }
        .blog-featured-body { padding: 40px; display: flex; flex-direction: column; justify-content: center; }
        .blog-featured-cat { display: inline-block; padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 16px; align-self: flex-start; }
        .blog-featured-title { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 800; color: #1a1210; line-height: 1.3; margin-bottom: 14px; letter-spacing: -0.01em; }
        .blog-featured-excerpt { font-size: 15px; color: #6a5a50; line-height: 1.7; margin-bottom: 20px; }
        .blog-featured-meta { display: flex; align-items: center; gap: 16px; font-size: 12px; color: #7a6a60; }
        .blog-featured-meta svg { width: 14px; height: 14px; stroke: #7a6a60; }
        .blog-featured-cta { display: inline-flex; align-items: center; gap: 6px; margin-top: 20px; font-size: 13px; font-weight: 700; color: #c0392b; }
        .blog-featured-cta::after { content: '\u2192'; transition: transform 0.15s; }
        .blog-featured:hover .blog-featured-cta::after { transform: translateX(4px); }

        /* Regular cards */
        .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .blog-card { background: #fff; border-radius: 16px; border: 1.5px solid #e8e2d8; overflow: hidden; transition: all 150ms ease; text-decoration: none; color: inherit; display: flex; flex-direction: column; }
        .blog-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(26,18,16,0.08); border-color: #d4cdc4; }
        .blog-card-top { height: 6px; }
        .blog-card-cover { width: 100%; height: 180px; object-fit: cover; display: block; }
        .blog-card-cover-placeholder { width: 100%; height: 180px; background: linear-gradient(135deg, #f0ede8 0%, #e8e2d8 100%); display: flex; align-items: center; justify-content: center; }
        .blog-card-cover-placeholder span { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; color: #d4cdc4; }
        .blog-card-body { padding: 24px 28px 28px; flex: 1; display: flex; flex-direction: column; }
        .blog-card-cat { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-bottom: 14px; align-self: flex-start; letter-spacing: 0.02em; }
        .blog-card-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; color: #1a1210; line-height: 1.35; margin-bottom: 10px; }
        .blog-card-excerpt { font-size: 13px; color: #7a6a60; line-height: 1.6; margin-bottom: 16px; flex: 1; }
        .blog-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid #f0ede8; }
        .blog-card-date { font-size: 12px; color: #b0a898; }
        .blog-card-read { font-size: 11px; color: #b0a898; display: flex; align-items: center; gap: 4px; }
        .blog-card-read svg { width: 12px; height: 12px; stroke: #b0a898; }

        /* Divider */
        .blog-divider { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
        .blog-divider-line { flex: 1; height: 1px; background: #e8e2d8; }
        .blog-divider-text { font-size: 11px; font-weight: 700; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.1em; }

        .blog-empty { text-align: center; padding: 80px 40px; color: #7a6a60; }
        .blog-empty h3 { font-family: 'Fraunces', serif; font-size: 24px; color: #1a1210; margin-bottom: 8px; }
        .blog-skel { border-radius: 16px; background: #f0ede8; animation: blogPulse 1.5s ease infinite; }
        @keyframes blogPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @media (max-width: 768px) {
          .blog-wrap { padding: 40px 20px 64px; }
          .blog-title { font-size: 30px; }
          .blog-featured { grid-template-columns: 1fr; }
          .blog-featured-visual { min-height: 180px; }
          .blog-featured-body { padding: 28px; }
          .blog-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="blog-wrap">
        <div className="blog-header">
          <div className="blog-eyebrow">Conseils</div>
          <h1 className="blog-title">{"Guides & analyses"}</h1>
          <p className="blog-sub">{"Fiscalit\u00e9, strat\u00e9gies d\u2019investissement, march\u00e9 immobilier \u2014 tout ce qu\u2019il faut savoir pour investir intelligemment."}</p>
        </div>

        {categories.length > 1 && (
          <div className="blog-cats">
            <button className={`blog-cat ${activeCategory === '' ? 'active' : ''}`} onClick={() => setActiveCategory('')}>Tous</button>
            {categories.map(cat => (
              <button key={cat} className={`blog-cat ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="blog-empty">
            <h3>{"Aucun article pour le moment"}</h3>
            <p>{"Les premiers articles arrivent bient\u00f4t."}</p>
          </div>
        ) : (
          <>
            {/* Article mis en avant */}
            {featured && (
              <a href={`/blog/${featured.slug}`} className="blog-featured">
                <div className={`blog-featured-visual ${featured.cover_url ? 'has-img' : ''}`}>
                  {featured.cover_url
                    ? <Image src={featured.cover_url} alt={featured.title} fill className="blog-featured-img" style={{ objectFit: 'cover' }} />
                    : <span className="blog-featured-icon">MDB</span>
                  }
                </div>
                <div className="blog-featured-body">
                  {featured.category && (
                    <span className="blog-featured-cat" style={{ background: catStyle(featured.category).bg, color: catStyle(featured.category).color }}>
                      {featured.category}
                    </span>
                  )}
                  <h2 className="blog-featured-title">{featured.title}</h2>
                  {featured.excerpt && <p className="blog-featured-excerpt">{featured.excerpt}</p>}
                  <div className="blog-featured-meta">
                    <span>{formatDate(featured.published_at)}</span>
                    <span>{'\u00b7'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {readTime(featured.word_count)} de lecture
                    </span>
                  </div>
                  <span className="blog-featured-cta">Lire l{"'"}article</span>
                </div>
              </a>
            )}

            {/* Autres articles */}
            {rest.length > 0 && (
              <>
                <div className="blog-divider">
                  <div className="blog-divider-line" />
                  <span className="blog-divider-text">{rest.length} autre{rest.length > 1 ? 's' : ''} article{rest.length > 1 ? 's' : ''}</span>
                  <div className="blog-divider-line" />
                </div>
                <div className="blog-grid">
                  {rest.map(article => {
                    const cs = catStyle(article.category)
                    return (
                      <a key={article.slug} href={`/blog/${article.slug}`} className="blog-card">
                        {article.cover_url
                          ? <Image src={article.cover_url} alt={article.title} width={400} height={180} className="blog-card-cover" style={{ objectFit: 'cover', width: '100%' }} />
                          : <div className="blog-card-top" style={{ background: cs.color }} />
                        }
                        <div className="blog-card-body">
                          {article.category && (
                            <span className="blog-card-cat" style={{ background: cs.bg, color: cs.color }}>{article.category}</span>
                          )}
                          <h2 className="blog-card-title">{article.title}</h2>
                          {article.excerpt && <p className="blog-card-excerpt">{article.excerpt}</p>}
                          <div className="blog-card-footer">
                            <span className="blog-card-date">{formatDate(article.published_at)}</span>
                            <span className="blog-card-read">
                              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              {readTime(article.word_count)}
                            </span>
                          </div>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
