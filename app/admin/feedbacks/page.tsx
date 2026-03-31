'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

interface Feedback {
  id: number
  type: string
  category: string
  summary: string
  detail: string | null
  occurrences: number
  first_seen: string
  last_seen: string
  user_id: string | null
  bien_id: number | null
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  bug: { bg: '#fde8e8', color: '#c0392b' },
  suggestion: { bg: '#d4ddf5', color: '#2a4a8a' },
  plainte: { bg: '#fff8f0', color: '#a06010' },
  question: { bg: '#f0f4f0', color: '#7a6a60' },
}

const CAT_LABELS: Record<string, string> = {
  calculs: 'Calculs',
  affichage: 'Affichage',
  donnees: "Donn\u00E9es",
  ux: 'UX',
  fiscalite: "Fiscalit\u00E9",
  estimation: 'Estimation',
  performance: 'Performance',
  autre: 'Autre',
}

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await fetch('/api/feedback', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setFeedbacks(data.feedbacks || [])
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter
    ? feedbacks.filter(f => f.type === filter || f.category === filter)
    : feedbacks

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <Layout>
      <style>{`
        .fb-wrap { max-width: 1200px; margin: 48px auto; padding: 0 48px; }
        .fb-title { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 800; margin-bottom: 8px; }
        .fb-sub { font-size: 14px; color: #7a6a60; margin-bottom: 32px; }
        .fb-filters { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .fb-filter { padding: 6px 14px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-size: 12px; font-weight: 600; cursor: pointer; background: #fff; color: #7a6a60; font-family: 'DM Sans', sans-serif; transition: all 150ms ease; }
        .fb-filter:hover { border-color: #1a1210; color: #1a1210; }
        .fb-filter.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .fb-card { background: #fff; border-radius: 12px; border: 1px solid #e8e2d8; padding: 16px 20px; margin-bottom: 12px; display: flex; gap: 16px; align-items: flex-start; transition: box-shadow 150ms ease; }
        .fb-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .fb-count { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 800; color: #1a1210; min-width: 48px; text-align: center; line-height: 1; padding-top: 4px; }
        .fb-count-label { font-size: 10px; color: #7a6a60; text-align: center; }
        .fb-body { flex: 1; }
        .fb-summary { font-size: 14px; font-weight: 600; color: #1a1210; margin-bottom: 4px; }
        .fb-detail { font-size: 12px; color: #7a6a60; line-height: 1.5; margin-bottom: 8px; }
        .fb-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .fb-badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
        .fb-date { font-size: 11px; color: #b0a898; }
        .fb-empty { text-align: center; padding: 60px 20px; color: #7a6a60; }
        .back-link { display: inline-block; margin-bottom: 24px; font-size: 13px; color: #7a6a60; text-decoration: none; }
        .back-link:hover { color: #1a1210; }
        @media (max-width: 768px) {
          .fb-wrap { padding: 0 16px; margin: 24px auto; }
          .fb-title { font-size: 22px; }
        }
      `}</style>

      <div className="fb-wrap">
        <a href="/admin" className="back-link">{"Retour au dashboard"}</a>
        <h1 className="fb-title">Feedbacks utilisateurs</h1>
        <p className="fb-sub">{"Remont\u00E9es automatiques via Memo \u2014 tri\u00E9es par nombre d\u2019occurrences"}</p>

        <div className="fb-filters">
          <button className={`fb-filter ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>Tous ({feedbacks.length})</button>
          <button className={`fb-filter ${filter === 'bug' ? 'active' : ''}`} onClick={() => setFilter('bug')}>Bugs ({feedbacks.filter(f => f.type === 'bug').length})</button>
          <button className={`fb-filter ${filter === 'suggestion' ? 'active' : ''}`} onClick={() => setFilter('suggestion')}>Suggestions ({feedbacks.filter(f => f.type === 'suggestion').length})</button>
          <button className={`fb-filter ${filter === 'plainte' ? 'active' : ''}`} onClick={() => setFilter('plainte')}>Plaintes ({feedbacks.filter(f => f.type === 'plainte').length})</button>
        </div>

        {loading ? (
          <div className="fb-empty">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="fb-empty">
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Aucun feedback pour le moment</p>
            <p>{"Les feedbacks seront collect\u00E9s automatiquement via Memo."}</p>
          </div>
        ) : (
          filtered.map(fb => {
            const tc = TYPE_COLORS[fb.type] || TYPE_COLORS.question
            return (
              <div key={fb.id} className="fb-card">
                <div>
                  <div className="fb-count">{fb.occurrences}</div>
                  <div className="fb-count-label">fois</div>
                </div>
                <div className="fb-body">
                  <div className="fb-summary">{fb.summary}</div>
                  {fb.detail && <div className="fb-detail">{fb.detail}</div>}
                  <div className="fb-meta">
                    <span className="fb-badge" style={{ background: tc.bg, color: tc.color }}>{fb.type}</span>
                    <span className="fb-badge" style={{ background: '#f0ede8', color: '#7a6a60' }}>{CAT_LABELS[fb.category] || fb.category}</span>
                    <span className="fb-date">{formatDate(fb.first_seen)}{fb.occurrences > 1 ? ` \u2192 ${formatDate(fb.last_seen)}` : ''}</span>
                    {fb.bien_id && <a href={`/biens/${fb.bien_id}`} style={{ fontSize: '11px', color: '#c0392b', textDecoration: 'none' }}>Bien #{fb.bien_id}</a>}
                    <button onClick={async () => {
                      if (!confirm('Supprimer ce feedback ?')) return
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) return
                      await fetch(`/api/feedback?id=${fb.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
                      setFeedbacks(prev => prev.filter(f => f.id !== fb.id))
                    }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#c0b0a0', cursor: 'pointer', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', transition: 'color 150ms ease' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#c0392b' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#c0b0a0' }}
                    >{'\u2717'} supprimer</button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </Layout>
  )
}
