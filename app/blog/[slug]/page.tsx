'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Layout from '@/components/Layout'

export default function ArticlePage() {
  const params = useParams()
  const slug = params.slug as string
  const [article, setArticle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const [related, setRelated] = useState<any[]>([])
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([])

  useEffect(() => {
    fetch(`/api/blog?slug=${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => {
        setArticle(d.article)
        // Extract TOC from HTML content
        if (d.article?.content) {
          const headings: { id: string; text: string; level: number }[] = []
          const regex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi
          let match
          while ((match = regex.exec(d.article.content)) !== null) {
            const id = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 50)
            headings.push({ id, text: match[2].replace(/<[^>]+>/g, ''), level: parseInt(match[1]) })
          }
          setToc(headings)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

    // Fetch related articles
    fetch('/api/blog')
      .then(r => r.json())
      .then(d => {
        const articles = (d.articles || []).filter((a: any) => a.slug !== slug).slice(0, 3)
        setRelated(articles)
      })
      .catch(() => {})
  }, [slug])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function readTime(wc: number | null) {
    if (!wc) return '3 min'
    return `${Math.max(1, Math.round(wc / 250))} min`
  }

  return (
    <Layout>
      <style>{`
        .article-wrap { max-width: 780px; margin: 0 auto; padding: 48px 24px 100px; }
        .article-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #7a6a60; text-decoration: none; margin-bottom: 32px; transition: color 150ms ease; }
        .article-back:hover { color: #1a1210; }
        .article-cat { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #f0ede8; color: #7a6a60; margin-bottom: 16px; }
        .article-title { font-family: 'Fraunces', serif; font-size: 40px; font-weight: 800; letter-spacing: -0.02em; color: #1a1210; line-height: 1.15; margin-bottom: 20px; }
        .article-meta { display: flex; align-items: center; gap: 12px; padding-bottom: 32px; margin-bottom: 32px; border-bottom: 1px solid #e8e2d8; }
        .article-avatar { width: 36px; height: 36px; border-radius: 50%; background: #c0392b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
        .article-author-name { font-size: 14px; font-weight: 600; color: #1a1210; }
        .article-author-date { font-size: 12px; color: #7a6a60; }
        .article-read { font-size: 12px; color: #7a6a60; margin-left: auto; }
        /* Article content styling */
        .article-content { font-family: 'Lora', 'Georgia', serif; font-size: 17px; color: #4a3f3b; line-height: 1.85; }
        .article-content h1 { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; color: #1a1210; margin: 40px 0 16px; letter-spacing: -0.02em; }
        .article-content h2 { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 700; color: #1a1210; margin: 36px 0 12px; }
        .article-content h3 { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; color: #1a1210; margin: 28px 0 10px; }
        .article-content p { margin-bottom: 20px; }
        .article-content strong { color: #1a1210; }
        .article-content a { color: #c0392b; text-decoration: underline; text-underline-offset: 2px; }
        .article-content ul, .article-content ol { margin-bottom: 20px; padding-left: 24px; }
        .article-content li { margin-bottom: 8px; }
        .article-content blockquote { border-left: 3px solid #c0392b; padding: 12px 20px; margin: 24px 0; background: #faf8f5; border-radius: 0 8px 8px 0; font-style: italic; color: #7a6a60; }
        .article-content img { max-width: 100%; height: auto; border-radius: 12px; margin: 24px 0; }
        .article-content table { width: 100%; border-collapse: collapse; margin: 24px 0; font-family: 'DM Sans', sans-serif; font-size: 14px; }
        .article-content th { background: #f7f4f0; padding: 10px 14px; text-align: left; font-weight: 600; color: #1a1210; border-bottom: 2px solid #e8e2d8; }
        .article-content td { padding: 10px 14px; border-bottom: 1px solid #f0ede8; }
        .article-content hr { border: none; border-top: 1px solid #e8e2d8; margin: 32px 0; }
        /* SKELETON */
        .art-skel { background: #f0ede8; border-radius: 8px; animation: artPulse 1.5s ease infinite; }
        @keyframes artPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .article-footer { margin-top: 48px; padding-top: 32px; border-top: 1px solid #e8e2d8; text-align: center; }
        .article-footer a { display: inline-block; padding: 12px 24px; border-radius: 10px; background: #1a1210; color: #fff; text-decoration: none; font-size: 14px; font-weight: 600; transition: opacity 150ms ease; }
        .article-footer a:hover { opacity: 0.85; }
        .share-bar { display: flex; align-items: center; gap: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8e2d8; }
        .share-label { font-size: 13px; font-weight: 600; color: #7a6a60; }
        .share-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e2d8; background: #fff; font-size: 12px; font-weight: 600; color: #1a1210; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 150ms ease; text-decoration: none; }
        .share-btn:hover { border-color: #c0392b; color: #c0392b; }
        .share-copied { background: #d4f5e0; border-color: #27ae60; color: #1a7a40; }
        /* TOC */
        .article-toc { background: #f7f4f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
        .article-toc-title { font-size: 13px; font-weight: 700; color: #1a1210; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
        .article-toc a { display: block; font-size: 14px; color: #7a6a60; text-decoration: none; padding: 4px 0; transition: color 150ms ease; }
        .article-toc a:hover { color: #c0392b; }
        .article-toc a.toc-h3 { padding-left: 16px; font-size: 13px; }
        /* RELATED */
        .related { margin-top: 48px; padding-top: 32px; border-top: 1px solid #e8e2d8; }
        .related-title { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 700; margin-bottom: 20px; }
        .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .related-card { background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e2d8; text-decoration: none; color: inherit; transition: transform 150ms ease, box-shadow 150ms ease; display: block; }
        .related-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .related-card img { width: 100%; height: 120px; object-fit: cover; }
        .related-card-body { padding: 14px 16px; }
        .related-card-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
        .related-card-date { font-size: 12px; color: #7a6a60; }
        /* RESPONSIVE */
        @media (max-width: 768px) {
          .article-title { font-size: 28px; }
          .article-content { font-size: 16px; }
          .related-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="article-wrap">
        <a href="/blog" className="article-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Retour aux articles
        </a>

        {loading ? (
          <>
            <div className="art-skel" style={{ width: '80px', height: '24px', marginBottom: '16px' }} />
            <div className="art-skel" style={{ width: '100%', height: '48px', marginBottom: '12px' }} />
            <div className="art-skel" style={{ width: '70%', height: '48px', marginBottom: '32px' }} />
            <div className="art-skel" style={{ width: '250px', height: '36px', marginBottom: '32px' }} />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="art-skel" style={{ width: '100%', height: '18px', marginBottom: '12px', animationDelay: `${i * 0.1}s` }} />
            ))}
          </>
        ) : notFound || !article ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '28px', fontWeight: 700, color: '#1a1210', marginBottom: '12px' }}>Article introuvable</h2>
            <p style={{ fontSize: '15px', color: '#7a6a60', marginBottom: '24px' }}>{"Cet article n\u2019existe pas ou n\u2019est pas encore publi\u00E9."}</p>
            <a href="/blog" style={{ color: '#c0392b', textDecoration: 'underline', fontSize: '14px' }}>Voir tous les articles</a>
          </div>
        ) : (
          <>
            {article.category && <span className="article-cat">{article.category}</span>}
            <h1 className="article-title">{article.title}</h1>

            <div className="article-meta">
              <div className="article-avatar">{(article.author || 'R')[0]}</div>
              <div>
                <div className="article-author-name">{article.author || 'La r\u00E9daction Mon Petit MDB'}</div>
                <div className="article-author-date">{formatDate(article.published_at)}</div>
              </div>
              <span className="article-read">{readTime(article.word_count)} de lecture</span>
            </div>

            {/* Table des matières */}
            {toc.length >= 3 && (
              <div className="article-toc">
                <div className="article-toc-title">Sommaire</div>
                {toc.map((h, i) => (
                  <a key={i} href={`#${h.id}`} className={h.level === 3 ? 'toc-h3' : ''}>{h.text}</a>
                ))}
              </div>
            )}

            <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content }} />

            {/* Partage */}
            <div className="share-bar">
              <span className="share-label">Partager :</span>
              <a
                className="share-btn"
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                LinkedIn
              </a>
              <a
                className="share-btn"
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(article.title || '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                X
              </a>
              <button
                className={`share-btn ${copied ? 'share-copied' : ''}`}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                {copied ? "Lien copi\u00E9 !" : "Copier le lien"}
              </button>
            </div>

            {/* Articles liés */}
            {related.length > 0 && (
              <div className="related">
                <h3 className="related-title">{"\u00C0 lire aussi"}</h3>
                <div className="related-grid">
                  {related.map((r: any) => (
                    <a key={r.slug} href={`/blog/${r.slug}`} className="related-card">
                      {r.cover_url && <img src={r.cover_url} alt="" />}
                      <div className="related-card-body">
                        <div className="related-card-title">{r.title}</div>
                        <div className="related-card-date">{new Date(r.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="article-footer">
              <a href="/blog">{"Voir tous les articles \u2192"}</a>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
