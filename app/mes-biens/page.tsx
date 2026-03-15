'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import BienCard from '@/components/BienCard'

export default function MesBiensPage() {
  const [biens, setBiens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setUserToken(session.access_token)

      const wRes = await fetch('/api/watchlist', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const wData = await wRes.json()
      const items = wData.watchlist || []
      setWatchlistIds(new Set(items.map((w: any) => w.bien_id)))

      if (items.length === 0) { setLoading(false); return }

      // Charger les biens de la watchlist
      const biensRes = await fetch('/api/biens?ids=' + items.map((w: any) => w.bien_id).join(','))
      const biensData = await biensRes.json()
      setBiens(biensData.biens || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Layout><p style={{ textAlign: 'center', padding: '80px', color: '#9a8a80' }}>Chargement...</p></Layout>

  return (
    <Layout>
      <style>{`
        .mes-biens-wrap { max-width: 1320px; margin: 0 auto; padding: 40px 48px; }
        .mes-biens-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 12px; }
        .mes-biens-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; color: #1a1210; }
        .mes-biens-sub { font-size: 14px; color: #9a8a80; margin-top: 4px; }
        .view-toggle { display: flex; gap: 4px; }
        .view-btn { padding: 9px 16px; border-radius: 9px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; background: transparent; color: #888; }
        .view-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 20px; }
        .empty-state { text-align: center; padding: 80px 40px; color: #9a8a80; background: #fff; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .empty-state h3 { font-family: 'Fraunces', serif; font-size: 22px; color: #1a1210; margin-bottom: 8px; }
        .empty-link { display: inline-block; margin-top: 16px; padding: 11px 24px; background: #c0392b; color: #fff; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; }
        .list-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .list-table thead tr { background: #f7f4f0; border-bottom: 2px solid #ede8e0; }
        .list-table thead th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #9a8a80; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
        .list-table tbody tr { border-bottom: 1px solid #f0ede8; transition: background 0.12s; }
        .list-table tbody tr:last-child { border-bottom: none; }
        .list-table tbody tr:hover { background: #faf8f5; }
        .list-table td { padding: 12px 16px; font-size: 13px; vertical-align: middle; }
        .list-thumb { width: 72px; height: 52px; border-radius: 8px; object-fit: cover; }
        .list-thumb-empty { width: 72px; height: 52px; border-radius: 8px; background: #ede8e0; display: inline-flex; align-items: center; justify-content: center; color: #ccc; }
        .td-btn { display: inline-block; padding: 7px 16px; background: #1a1210; color: #fff; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 500; white-space: nowrap; }
        .td-btn:hover { opacity: 0.75; }
        .td-heart { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px; color: #c0392b; }
      `}</style>

      <div className="mes-biens-wrap">
        <div className="mes-biens-header">
          <div>
            <h1 className="mes-biens-title">Ma watchlist</h1>
            <p className="mes-biens-sub">{biens.length} bien{biens.length > 1 ? 's' : ''} sauvegarde{biens.length > 1 ? 's' : ''}</p>
          </div>
          <div className="view-toggle">
            <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>Grille</button>
            <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Liste</button>
          </div>
        </div>

        {biens.length === 0 ? (
          <div className="empty-state">
            <h3>Votre watchlist est vide</h3>
            <p>Ajoutez des biens en cliquant sur le coeur depuis le listing.</p>
            <a href="/biens" className="empty-link">Voir les biens disponibles</a>
          </div>
        ) : view === 'grid' ? (
          <div className="grid">
            {biens.map(bien => (
              <BienCard
                key={bien.id}
                bien={bien}
                inWatchlist={true}
                userToken={userToken}
                onWatchlistChange={(bienId, added) => {
                  if (!added) setBiens(prev => prev.filter(b => b.id !== bienId))
                  setWatchlistIds(prev => { const next = new Set(prev); added ? next.add(bienId) : next.delete(bienId); return next })
                }}
              />
            ))}
          </div>
        ) : (
          <table className="list-table">
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th>Bien</th>
                <th>Ville</th>
                <th>Prix FAI</th>
                <th>Loyer</th>
                <th>Rendement</th>
                <th>Strategie</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {biens.map(bien => (
                <tr key={bien.id}>
                  <td>
                    <button className="td-heart" onClick={async () => {
                      if (!userToken) return
                      const res = await fetch('/api/watchlist', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
                        body: JSON.stringify({ bien_id: bien.id })
                      })
                      if (res.ok) setBiens(prev => prev.filter(b => b.id !== bien.id))
                    }}>♥</button>
                  </td>
                  <td>{bien.photo_url ? <img src={bien.photo_url} alt="" className="list-thumb" /> : <div className="list-thumb-empty">-</div>}</td>
                  <td style={{ fontWeight: 600 }}>{bien.type_bien} {bien.nb_pieces} - {bien.surface} m2</td>
                  <td>{bien.ville}</td>
                  <td style={{ fontWeight: 700 }}>{bien.prix_fai?.toLocaleString('fr-FR')} €</td>
                  <td>{bien.loyer ? `${bien.loyer} €/mois` : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>}</td>
                  <td style={{ color: '#c0392b', fontWeight: 600 }}>{bien.rendement_brut ? `${(bien.rendement_brut * 100).toFixed(2)} %` : '-'}</td>
                  <td>{bien.strategie_mdb || '-'}</td>
                  <td><a href={`/biens/${bien.id}`} className="td-btn">Analyse</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}