'use client'

import { useState } from 'react'
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

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'Fiscalit\u00e9': { bg: '#d4ddf5', color: '#2a4a8a' },
  'Strat\u00e9gies': { bg: '#d4f5e0', color: '#1a7a40' },
  'March\u00e9': { bg: '#fff8f0', color: '#a06010' },
  'Travaux': { bg: '#fde8e8', color: '#c0392b' },
  'Financement': { bg: '#f0ede8', color: '#6a5a50' },
}

const CATEGORY_ORDER = ['Strat\u00e9gies', 'Fiscalit\u00e9', 'March\u00e9', 'Travaux', 'Financement']

function catStyle(cat: string) {
  return CATEGORY_COLORS[cat] || { bg: '#f0ede8', color: '#7a6a60' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function readTime(wc: number | null) {
  if (!wc) return '3 min'
  return `${Math.max(1, Math.round(wc / 250))} min`
}

export default function GuideListClient({ articles }: { articles: Article[] }) {
  const [activeCategory, setActiveCategory] = useState('')

  const categories = CATEGORY_ORDER.filter(cat => articles.some(a => a.category === cat))

  // Group by category
  const grouped: Record<string, Article[]> = {}
  for (const cat of CATEGORY_ORDER) {
    const catArticles = articles.filter(a => a.category === cat)
    if (catArticles.length > 0) grouped[cat] = catArticles
  }

  const filtered = activeCategory ? articles.filter(a => a.category === activeCategory) : articles

  return (
    <Layout>
      <style>{`
        .guides-wrap { max-width: 1100px; margin: 0 auto; padding: 64px 48px 100px; }
        .guides-header { margin-bottom: 48px; text-align: center; }
        .guides-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #c0392b; margin-bottom: 16px; }
        .guides-title { font-family: 'Fraunces', serif; font-size: 44px; font-weight: 800; letter-spacing: -0.03em; color: #1a1210; margin-bottom: 16px; }
        .guides-sub { font-size: 17px; color: #7a6a60; max-width: 650px; margin: 0 auto; line-height: 1.6; }
        .guides-cats { display: flex; gap: 8px; margin-bottom: 48px; flex-wrap: wrap; justify-content: center; }
        .guides-cat-btn { padding: 8px 20px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 150ms ease; background: #fff; color: #7a6a60; }
        .guides-cat-btn:hover { border-color: #1a1210; color: #1a1210; }
        .guides-cat-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; }

        /* Section per category */
        .guides-section { margin-bottom: 48px; }
        .guides-section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .guides-section-badge { padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .guides-section-count { font-size: 12px; color: #b0a898; }
        .guides-section-line { flex: 1; height: 1px; background: #e8e2d8; }

        /* Cards */
        .guides-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .guides-card { background: #fff; border-radius: 16px; border: 1.5px solid #e8e2d8; overflow: hidden; transition: all 150ms ease; text-decoration: none; color: inherit; display: flex; flex-direction: column; }
        .guides-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(26,18,16,0.08); border-color: #d4cdc4; }
        .guides-card-top { height: 6px; }
        .guides-card-cover { width: 100%; height: 180px; object-fit: cover; display: block; }
        .guides-card-body { padding: 24px 28px 28px; flex: 1; display: flex; flex-direction: column; }
        .guides-card-cat { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-bottom: 14px; align-self: flex-start; letter-spacing: 0.02em; }
        .guides-card-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; color: #1a1210; line-height: 1.35; margin-bottom: 10px; }
        .guides-card-excerpt { font-size: 13px; color: #7a6a60; line-height: 1.6; margin-bottom: 16px; flex: 1; }
        .guides-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid #f0ede8; }
        .guides-card-date { font-size: 12px; color: #b0a898; }
        .guides-card-read { font-size: 11px; color: #b0a898; display: flex; align-items: center; gap: 4px; }
        .guides-card-read svg { width: 12px; height: 12px; stroke: #b0a898; }

        .guides-empty { text-align: center; padding: 80px 40px; color: #7a6a60; }
        .guides-empty h3 { font-family: 'Fraunces', serif; font-size: 24px; color: #1a1210; margin-bottom: 8px; }

        @media (max-width: 768px) {
          .guides-wrap { padding: 40px 20px 64px; }
          .guides-title { font-size: 30px; }
          .guides-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="guides-wrap">
        <div className="guides-header">
          <div className="guides-eyebrow">Guides</div>
          <h1 className="guides-title">{"Guides investissement immobilier"}</h1>
          <p className="guides-sub">{"Strat\u00e9gies marchand de biens, fiscalit\u00e9 locative, travaux, march\u00e9 immobilier \u2014 tout ce qu\u2019il faut savoir pour investir intelligemment."}</p>
        </div>

        {categories.length > 1 && (
          <div className="guides-cats">
            <button className={`guides-cat-btn ${activeCategory === '' ? 'active' : ''}`} onClick={() => setActiveCategory('')}>Tous</button>
            {categories.map(cat => (
              <button key={cat} className={`guides-cat-btn ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="guides-empty">
            <h3>{"Aucun guide pour le moment"}</h3>
            <p>{"Les premiers guides arrivent bient\u00f4t."}</p>
          </div>
        ) : activeCategory ? (
          /* Flat grid when filtering */
          <div className="guides-grid">
            {filtered.map(article => renderCard(article))}
          </div>
        ) : (
          /* Grouped by category when showing all */
          Object.entries(grouped).map(([cat, catArticles]) => {
            const cs = catStyle(cat)
            return (
              <div key={cat} className="guides-section">
                <div className="guides-section-header">
                  <span className="guides-section-badge" style={{ background: cs.bg, color: cs.color }}>{cat}</span>
                  <span className="guides-section-count">{catArticles.length} guide{catArticles.length > 1 ? 's' : ''}</span>
                  <div className="guides-section-line" />
                </div>
                <div className="guides-grid">
                  {catArticles.map(article => renderCard(article))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Layout>
  )
}

function renderCard(article: Article) {
  const cs = catStyle(article.category)
  return (
    <a key={article.slug} href={`/guide/${article.slug}`} className="guides-card">
      {article.cover_url
        ? <img src={article.cover_url} alt={article.title} className="guides-card-cover" />
        : <div className="guides-card-top" style={{ background: cs.color }} />
      }
      <div className="guides-card-body">
        {article.category && (
          <span className="guides-card-cat" style={{ background: cs.bg, color: cs.color }}>{article.category}</span>
        )}
        <h2 className="guides-card-title">{article.title}</h2>
        {article.excerpt && <p className="guides-card-excerpt">{article.excerpt}</p>}
        <div className="guides-card-footer">
          <span className="guides-card-date">{formatDate(article.published_at)}</span>
          <span className="guides-card-read">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {readTime(article.word_count)}
          </span>
        </div>
      </div>
    </a>
  )
}
