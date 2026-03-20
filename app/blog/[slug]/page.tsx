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

  useEffect(() => {
    fetch(`/api/blog?slug=${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setArticle(d.article))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
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
        .article-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #9a8a80; text-decoration: none; margin-bottom: 32px; transition: color 150ms ease; }
        .article-back:hover { color: #1a1210; }
        .article-cat { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #f0ede8; color: #9a8a80; margin-bottom: 16px; }
        .article-title { font-family: 'Fraunces', serif; font-size: 40px; font-weight: 800; letter-spacing: -0.02em; color: #1a1210; line-height: 1.15; margin-bottom: 20px; }
        .article-meta { display: flex; align-items: center; gap: 12px; padding-bottom: 32px; margin-bottom: 32px; border-bottom: 1px solid #e8e2d8; }
        .article-avatar { width: 36px; height: 36px; border-radius: 50%; background: #c0392b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
        .article-author-name { font-size: 14px; font-weight: 600; color: #1a1210; }
        .article-author-date { font-size: 12px; color: #9a8a80; }
        .article-read { font-size: 12px; color: #9a8a80; margin-left: auto; }
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
        .article-content blockquote { border-left: 3px solid #c0392b; padding: 12px 20px; margin: 24px 0; background: #faf8f5; border-radius: 0 8px 8px 0; font-style: italic; color: #9a8a80; }
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
        /* RESPONSIVE */
        @media (max-width: 768px) {
          .article-title { font-size: 28px; }
          .article-content { font-size: 16px; }
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
            <p style={{ fontSize: '15px', color: '#9a8a80', marginBottom: '24px' }}>{"Cet article n\u2019existe pas ou n\u2019est pas encore publi\u00E9."}</p>
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

            <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content }} />

            <div className="article-footer">
              <a href="/blog">{"Voir tous les articles \u2192"}</a>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
