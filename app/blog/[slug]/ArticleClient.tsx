'use client'

import { useState, useMemo } from 'react'
import Layout from '@/components/Layout'

interface Article {
  title: string
  slug: string
  content: string
  category: string
  keyword: string | null
  published_at: string
  word_count: number | null
  cover_url: string | null
  excerpt?: string | null
}

interface RelatedArticle {
  title: string
  slug: string
  cover_url: string | null
  published_at: string
  category: string
}

export default function ArticleClient({ article, related }: { article: Article; related: RelatedArticle[] }) {
  const [copied, setCopied] = useState(false)

  const toc = useMemo(() => {
    if (!article?.content) return []
    const headings: { id: string; text: string; level: number }[] = []
    const regex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi
    let match
    while ((match = regex.exec(article.content)) !== null) {
      const text = match[2].replace(/<[^>]+>/g, '')
      const id = text.replace(/\s+/g, '-').toLowerCase().slice(0, 50)
      headings.push({ id, text, level: parseInt(match[1]) })
    }
    return headings
  }, [article])

  const contentWithIds = useMemo(() => {
    if (!article?.content) return ''
    let idx = 0
    return article.content.replace(/<h([23])([^>]*)>(.*?)<\/h[23]>/gi, (full, level, attrs, inner) => {
      if (idx < toc.length) {
        const id = toc[idx].id
        idx++
        return `<h${level}${attrs} id="${id}">${inner}</h${level}>`
      }
      return full
    })
  }, [article, toc])

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
        .guide-layout { max-width: 1100px; margin: 0 auto; padding: 48px 24px 100px; display: grid; grid-template-columns: 220px 1fr; gap: 48px; }
        .guide-sidebar { position: sticky; top: 100px; align-self: start; }
        .guide-sidebar-toc { background: #f7f4f0; border-radius: 12px; padding: 20px; }
        .guide-sidebar-title { font-size: 11px; font-weight: 700; color: #1a1210; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
        .guide-sidebar-toc a { display: block; font-size: 13px; color: #7a6a60; text-decoration: none; padding: 4px 0; line-height: 1.4; transition: color 150ms ease; }
        .guide-sidebar-toc a:hover { color: #c0392b; }
        .guide-sidebar-toc a.toc-h3 { padding-left: 14px; font-size: 12px; }
        .guide-main { min-width: 0; }

        .guide-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #7a6a60; margin-bottom: 28px; flex-wrap: wrap; }
        .guide-breadcrumb a { color: #7a6a60; text-decoration: none; transition: color 150ms ease; }
        .guide-breadcrumb a:hover { color: #c0392b; }
        .guide-breadcrumb-sep { color: #d4cdc4; }
        .guide-breadcrumb-current { color: #1a1210; font-weight: 600; }

        .guide-cat { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-bottom: 16px; }
        .guide-title { font-family: 'Fraunces', serif; font-size: 40px; font-weight: 800; letter-spacing: -0.02em; color: #1a1210; line-height: 1.15; margin-bottom: 20px; }
        .guide-meta { display: flex; align-items: center; gap: 12px; padding-bottom: 28px; margin-bottom: 28px; border-bottom: 1px solid #e8e2d8; flex-wrap: wrap; }
        .guide-avatar { width: 36px; height: 36px; border-radius: 50%; background: #c0392b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
        .guide-author-name { font-size: 14px; font-weight: 600; color: #1a1210; }
        .guide-author-date { font-size: 12px; color: #7a6a60; }
        .guide-read { font-size: 12px; color: #7a6a60; margin-left: auto; display: flex; align-items: center; gap: 6px; }
        .guide-wc { font-size: 11px; color: #b0a898; }

        .guide-content { font-family: 'Lora', 'Georgia', serif; font-size: 17px; color: #4a3f3b; line-height: 1.85; }
        .guide-content h1 { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; color: #1a1210; margin: 40px 0 16px; letter-spacing: -0.02em; }
        .guide-content h2 { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 700; color: #1a1210; margin: 36px 0 12px; }
        .guide-content h3 { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; color: #1a1210; margin: 28px 0 10px; }
        .guide-content p { margin-bottom: 20px; }
        .guide-content strong { color: #1a1210; }
        .guide-content a { color: #c0392b; text-decoration: underline; text-underline-offset: 2px; }
        .guide-content ul, .guide-content ol { margin-bottom: 20px; padding-left: 24px; }
        .guide-content li { margin-bottom: 8px; }
        .guide-content blockquote { border-left: 3px solid #c0392b; padding: 12px 20px; margin: 24px 0; background: #faf8f5; border-radius: 0 8px 8px 0; font-style: italic; color: #7a6a60; }
        .guide-content img { max-width: 100%; height: auto; border-radius: 12px; margin: 24px 0; }
        .guide-content table { width: 100%; border-collapse: collapse; margin: 24px 0; font-family: 'DM Sans', sans-serif; font-size: 14px; }
        .guide-content th { background: #f7f4f0; padding: 10px 14px; text-align: left; font-weight: 600; color: #1a1210; border-bottom: 2px solid #e8e2d8; }
        .guide-content td { padding: 10px 14px; border-bottom: 1px solid #f0ede8; }
        .guide-content hr { border: none; border-top: 1px solid #e8e2d8; margin: 32px 0; }

        .guide-cta { margin-top: 48px; padding: 32px; border-radius: 16px; background: linear-gradient(135deg, #1a1210 0%, #3a2a20 100%); text-align: center; }
        .guide-cta-title { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 10px; }
        .guide-cta-sub { font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 20px; line-height: 1.5; }
        .guide-cta a { display: inline-block; padding: 12px 28px; border-radius: 10px; background: #c0392b; color: #fff; text-decoration: none; font-size: 14px; font-weight: 700; transition: opacity 150ms ease; }
        .guide-cta a:hover { opacity: 0.9; }

        .guide-share { display: flex; align-items: center; gap: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8e2d8; }
        .guide-share-label { font-size: 13px; font-weight: 600; color: #7a6a60; }
        .guide-share-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e2d8; background: #fff; font-size: 12px; font-weight: 600; color: #1a1210; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 150ms ease; text-decoration: none; }
        .guide-share-btn:hover { border-color: #c0392b; color: #c0392b; }
        .guide-share-copied { background: #d4f5e0; border-color: #27ae60; color: #1a7a40; }

        .guide-related { margin-top: 48px; padding-top: 32px; border-top: 1px solid #e8e2d8; }
        .guide-related-title { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 700; margin-bottom: 20px; color: #1a1210; }
        .guide-related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .guide-related-card { background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e2d8; text-decoration: none; color: inherit; transition: transform 150ms ease, box-shadow 150ms ease; display: block; }
        .guide-related-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .guide-related-card img { width: 100%; height: 120px; object-fit: cover; }
        .guide-related-card-body { padding: 14px 16px; }
        .guide-related-card-cat { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-bottom: 6px; }
        .guide-related-card-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #1a1210; }
        .guide-related-card-date { font-size: 12px; color: #7a6a60; }

        .guide-footer { margin-top: 32px; text-align: center; }
        .guide-footer a { display: inline-block; padding: 12px 24px; border-radius: 10px; background: #1a1210; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; transition: opacity 150ms ease; }
        .guide-footer a:hover { opacity: 0.85; }

        @media (max-width: 900px) {
          .guide-layout { grid-template-columns: 1fr; gap: 0; }
          .guide-sidebar { position: static; margin-bottom: 24px; }
          .guide-title { font-size: 28px; }
          .guide-content { font-size: 16px; }
          .guide-related-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="guide-layout">
        <aside className="guide-sidebar">
          {toc.length >= 3 && (
            <nav className="guide-sidebar-toc">
              <div className="guide-sidebar-title">Sommaire</div>
              {toc.map((h, i) => (
                <a key={i} href={`#${h.id}`} className={h.level === 3 ? 'toc-h3' : ''}>{h.text}</a>
              ))}
            </nav>
          )}
        </aside>

        <main className="guide-main">
          <nav className="guide-breadcrumb">
            <a href="/">Accueil</a>
            <span className="guide-breadcrumb-sep">{'>'}</span>
            <a href="/blog">Conseils</a>
            <span className="guide-breadcrumb-sep">{'>'}</span>
            <span className="guide-breadcrumb-current">{article.title}</span>
          </nav>

          {article.category && (
            <span className="guide-cat" style={{ background: catStyle(article.category).bg, color: catStyle(article.category).color }}>
              {article.category}
            </span>
          )}
          <h1 className="guide-title">{article.title}</h1>

          <div className="guide-meta">
            <div className="guide-avatar">L</div>
            <div>
              <div className="guide-author-name">{"La r\u00e9daction Mon Petit MDB"}</div>
              <div className="guide-author-date">{formatDate(article.published_at)}</div>
            </div>
            <div className="guide-read">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a6a60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {readTime(article.word_count)} de lecture
              {article.word_count && <span className="guide-wc">{'\u00b7'} {article.word_count.toLocaleString('fr-FR')} mots</span>}
            </div>
          </div>

          {article.cover_url && (
            <img src={article.cover_url} alt={article.title} style={{ width: '100%', height: 'auto', borderRadius: '16px', marginBottom: '32px', maxHeight: '400px', objectFit: 'cover' }} />
          )}

          <div className="guide-content" dangerouslySetInnerHTML={{ __html: contentWithIds }} />

          <div className="guide-cta">
            <div className="guide-cta-title">{"Trouvez votre prochain investissement"}</div>
            <p className="guide-cta-sub">{"Acc\u00e9dez \u00e0 des milliers de biens analys\u00e9s avec estimation DVF, fiscalit\u00e9 7 r\u00e9gimes et scoring IA."}</p>
            <a href="/register">{"Essayer Mon Petit MDB \u2192"}</a>
          </div>

          <div className="guide-share">
            <span className="guide-share-label">Partager :</span>
            <a className="guide-share-btn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} target="_blank" rel="noopener noreferrer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              LinkedIn
            </a>
            <a className="guide-share-btn" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(article.title || '')}`} target="_blank" rel="noopener noreferrer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              X
            </a>
            <button className={`guide-share-btn ${copied ? 'guide-share-copied' : ''}`} onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              {copied ? "Lien copi\u00e9 !" : "Copier le lien"}
            </button>
          </div>

          {related.length > 0 && (
            <div className="guide-related">
              <h3 className="guide-related-title">{"\u00c0 lire aussi"}</h3>
              <div className="guide-related-grid">
                {related.map((r) => {
                  const cs = catStyle(r.category)
                  return (
                    <a key={r.slug} href={`/blog/${r.slug}`} className="guide-related-card">
                      {r.cover_url && <img src={r.cover_url} alt="" />}
                      <div className="guide-related-card-body">
                        {r.category && <span className="guide-related-card-cat" style={{ background: cs.bg, color: cs.color }}>{r.category}</span>}
                        <div className="guide-related-card-title">{r.title}</div>
                        <div className="guide-related-card-date">{formatDate(r.published_at)}</div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          <div className="guide-footer">
            <a href="/blog">{"Voir tous les articles \u2192"}</a>
          </div>
        </main>
      </div>
    </Layout>
  )
}
