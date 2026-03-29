'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

export default function AdminPage() {
  const [stats, setStats] = useState<any>({ biens: 0, users: 0, watchlist: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {}
      setLoading(false)
    }
    loadStats()
  }, [])

  const fmt = (n: number) => n ? n.toLocaleString('fr-FR') : '0'

  return (
    <Layout>
      <style>{`
        .admin-wrap { max-width: 1200px; margin: 48px auto; padding: 0 48px; }
        .admin-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; margin-bottom: 4px; color: #1a1210; }
        .admin-sub { font-size: 14px; color: #7a6a60; margin-bottom: 40px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
        .stat-card { background: #fff; border-radius: 16px; padding: 24px 28px; border: 1px solid #e8e2d8; transition: box-shadow 150ms ease; }
        .stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .stat-label { font-size: 11px; font-weight: 600; color: #7a6a60; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
        .stat-value { font-family: 'Fraunces', serif; font-size: 36px; font-weight: 800; color: #1a1210; line-height: 1; }
        .stat-detail { font-size: 11px; color: #7a6a60; margin-top: 6px; }
        .section-label { font-size: 11px; font-weight: 700; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }
        .nav-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 32px; }
        .nav-card { background: #fff; border-radius: 14px; padding: 24px 28px; border: 1px solid #e8e2d8; text-decoration: none; color: #1a1210; transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease; display: flex; align-items: flex-start; gap: 16px; }
        .nav-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-color: #c0b0a0; }
        .nav-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .nav-card-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .nav-card-sub { font-size: 12px; color: #7a6a60; line-height: 1.4; }
        @media (max-width: 768px) {
          .admin-wrap { padding: 0 20px; margin: 32px auto; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .nav-grid { grid-template-columns: 1fr; }
          .stat-value { font-size: 28px; }
        }
      `}</style>

      <div className="admin-wrap">
        <h1 className="admin-title">Back-office</h1>
        <p className="admin-sub">Tableau de bord administrateur</p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Biens en base</div>
            <div className="stat-value">{loading ? '...' : fmt(stats.biens)}</div>
            <div className="stat-detail">{!loading && stats.disponibles ? `${fmt(stats.disponibles)} disponibles` : ''}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Utilisateurs</div>
            <div className="stat-value">{loading ? '...' : fmt(stats.users)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Watchlists</div>
            <div className="stat-value">{loading ? '...' : fmt(stats.watchlist)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Articles blog</div>
            <div className="stat-value">{loading ? '...' : fmt(stats.articles || 0)}</div>
          </div>
        </div>

        <div className="section-label">Gestion</div>
        <div className="nav-grid">
          <a href="/admin/biens" className="nav-card">
            <div className="nav-icon" style={{ background: '#d4f5e0', color: '#1a7a40' }}>{'\uD83C\uDFE0'}</div>
            <div>
              <div className="nav-card-title">Gestion des biens</div>
              <div className="nav-card-sub">Modifier statuts, champs manquants, supprimer</div>
            </div>
          </a>
          <a href="/admin/users" className="nav-card">
            <div className="nav-icon" style={{ background: '#d4ddf5', color: '#2a4a8a' }}>{'\uD83D\uDC65'}</div>
            <div>
              <div className="nav-card-title">Utilisateurs</div>
              <div className="nav-card-sub">{"Plans, r\u00F4les, date d\u2019inscription"}</div>
            </div>
          </a>
          <a href="/admin/estimation" className="nav-card">
            <div className="nav-icon" style={{ background: '#fff8f0', color: '#a06010' }}>{'\uD83D\uDCCA'}</div>
            <div>
              <div className="nav-card-title">{"Moteur d\u2019estimation"}</div>
              <div className="nav-card-sub">{"M\u00E9thodologie DVF, correcteurs, confiance"}</div>
            </div>
          </a>
        </div>

        <div className="section-label">Pipeline</div>
        <div className="nav-grid">
          <a href="/admin/sourcing" className="nav-card">
            <div className="nav-icon" style={{ background: '#fde8e8', color: '#c0392b' }}>{'\u2699'}</div>
            <div>
              <div className="nav-card-title">Sourcing & Batches</div>
              <div className="nav-card-sub">Ingestion, regex, extraction IA, score travaux, IDR</div>
            </div>
          </a>
          <a href="/editorial" className="nav-card">
            <div className="nav-icon" style={{ background: '#f0f4ff', color: '#2a4a8a' }}>{'\u270F'}</div>
            <div>
              <div className="nav-card-title">{"CMS \u00C9ditorial"}</div>
              <div className="nav-card-sub">{"R\u00E9daction, fact-check, publication d\u2019articles"}</div>
            </div>
          </a>
          <a href="/admin/guide-fiscal" className="nav-card">
            <div className="nav-icon" style={{ background: '#f5f0ff', color: '#6a4a9a' }}>{'\uD83D\uDCDD'}</div>
            <div>
              <div className="nav-card-title">{"R\u00E9f\u00E9rence fiscale"}</div>
              <div className="nav-card-sub">{"Guide des 7 r\u00E9gimes fiscaux"}</div>
            </div>
          </a>
        </div>
      </div>
    </Layout>
  )
}