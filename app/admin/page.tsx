'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

export default function AdminPage() {
  const [stats, setStats] = useState({ biens: 0, users: 0, watchlist: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      setStats(data)
      setLoading(false)
    }
    loadStats()
  }, [])

  return (
    <Layout>
      <style>{`
        .admin-wrap { max-width: 1200px; margin: 48px auto; padding: 0 48px; }
        .admin-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .admin-sub { font-size: 14px; color: #9a8a80; margin-bottom: 40px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: #fff; border-radius: 16px; padding: 28px 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .stat-label { font-size: 12px; font-weight: 600; color: #9a8a80; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
        .stat-value { font-family: 'Fraunces', serif; font-size: 40px; font-weight: 800; color: #1a1210; }
        .nav-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .nav-card { background: #fff; border-radius: 16px; padding: 28px 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); text-decoration: none; color: #1a1210; transition: transform 0.15s, box-shadow 0.15s; display: block; }
        .nav-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .nav-card-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; margin-bottom: 6px; }
        .nav-card-sub { font-size: 13px; color: #9a8a80; }
      `}</style>

      <div className="admin-wrap">
        <h1 className="admin-title">Back-office</h1>
        <p className="admin-sub">Tableau de bord administrateur</p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Biens en base</div>
            <div className="stat-value">{loading ? '...' : stats.biens}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Utilisateurs</div>
            <div className="stat-value">{loading ? '...' : stats.users}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Watchlists</div>
            <div className="stat-value">{loading ? '...' : stats.watchlist}</div>
          </div>
        </div>

        <div className="nav-grid">
          <a href="/admin/biens" className="nav-card">
            <div className="nav-card-title">Gestion des biens</div>
            <div className="nav-card-sub">Modifier statuts, champs manquants, supprimer</div>
          </a>
          <a href="/admin/users" className="nav-card">
            <div className="nav-card-title">Gestion des utilisateurs</div>
            <div className="nav-card-sub">Plans, rôles, date d'inscription</div>
          </a>
          <a href="/admin/estimation" className="nav-card">
            <div className="nav-card-title">{"Moteur d'estimation"}</div>
            <div className="nav-card-sub">{"M\u00e9thodologie DVF, correcteurs, niveaux de confiance"}</div>
          </a>
        </div>
      </div>
    </Layout>
  )
}