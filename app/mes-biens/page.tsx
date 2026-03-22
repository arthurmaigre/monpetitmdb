'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import BienCard from '@/components/BienCard'
import RendementBadge from '@/components/RendementBadge'
import PlusValueBadge from '@/components/PlusValueBadge'

export default function MesBiensPage() {
  const [biens, setBiens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState('')
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<string>('free')

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { window.location.href = '/login'; return }
        setUserToken(session.access_token)

        // Fetch user plan
        const profileRes = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setPlan(profileData.profile?.plan || 'free')
        }

        const wRes = await fetch('/api/watchlist', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!wRes.ok) throw new Error('Impossible de charger la watchlist')
        const wData = await wRes.json()
        const items = wData.watchlist || []
        setWatchlistIds(new Set(items.map((w: any) => w.bien_id)))

        if (items.length === 0) { setLoading(false); return }

        const biensRes = await fetch('/api/biens?ids=' + items.map((w: any) => w.bien_id).join(','))
        if (!biensRes.ok) throw new Error('Impossible de charger les biens')
        const biensData = await biensRes.json()
        const b = biensData.biens || []
        setBiens(b)

        // Selectionner le premier onglet avec des biens
        const strategies = [...new Set(b.map((x: any) => x.strategie_mdb).filter(Boolean))]
        if (strategies.length > 0) setActiveTab(strategies[0] as string)
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Plan limits
  const watchlistLimit = plan === 'expert' ? Infinity : plan === 'pro' ? 50 : 10
  const isAtLimit = biens.length >= watchlistLimit
  const isExpert = plan === 'expert'

  // Onglets par strategie (seulement celles qui ont des biens)
  const strategies = [...new Set(biens.map(b => b.strategie_mdb).filter(Boolean))] as string[]
  const filteredBiens = activeTab ? biens.filter(b => b.strategie_mdb === activeTab) : biens

  function handleRemove(bienId: string) {
    setBiens(prev => prev.filter(b => b.id !== bienId))
    setWatchlistIds(prev => { const next = new Set(prev); next.delete(bienId); return next })
  }

  if (loading) return (
    <Layout>
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '40px 48px' }}>
        <div style={{ width: '240px', height: '32px', background: '#e8e2d8', borderRadius: '8px', marginBottom: '8px', animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ width: '160px', height: '16px', background: '#e8e2d8', borderRadius: '8px', marginBottom: '32px', animation: 'pulse 1.5s ease infinite', animationDelay: '0.1s' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ height: '320px', background: '#f7f4f0', borderRadius: '16px', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <style>{`
        .mes-biens-wrap { max-width: 1320px; margin: 0 auto; padding: 40px 48px; }
        .mes-biens-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .mes-biens-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; color: #1a1210; }
        .mes-biens-sub { font-size: 16px; color: #9a8a80; margin-top: 4px; }
        .view-toggle { display: flex; gap: 4px; }
        .view-btn { padding: 8px 16px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 150ms ease; background: transparent; color: #9a8a80; }
        .view-btn:hover { border-color: #1a1210; color: #1a1210; }
        .view-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .tab { padding: 8px 20px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 150ms ease; background: #fff; color: #9a8a80; display: flex; align-items: center; gap: 8px; }
        .tab:hover { border-color: #1a1210; color: #1a1210; }
        .tab.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .tab-count { background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 8px; font-size: 12px; }
        .tab.active .tab-count { background: rgba(255,255,255,0.2); }
        .tab:not(.active) .tab-count { background: #f0ede8; color: #9a8a80; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 20px; }
        .empty-state { text-align: center; padding: 80px 40px; color: #9a8a80; background: #fff; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .empty-state h3 { font-family: 'Fraunces', serif; font-size: 24px; color: #1a1210; margin-bottom: 8px; }
        .empty-state p { font-size: 16px; }
        .empty-link { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #c0392b; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; transition: opacity 150ms ease; }
        .empty-link:hover { opacity: 0.85; }
        .mes-biens-error { background: #fdedec; color: #e74c3c; border-radius: 8px; padding: 12px 16px; font-size: 14px; margin-bottom: 16px; }
        .list-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .list-table thead tr { background: #f7f4f0; border-bottom: 2px solid #ede8e0; }
        .list-table thead th { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #9a8a80; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
        .list-table tbody tr { border-bottom: 1px solid #f0ede8; transition: background 150ms ease; }
        .list-table tbody tr:last-child { border-bottom: none; }
        .list-table tbody tr:hover { background: #faf8f5; }
        .list-table td { padding: 12px 16px; font-size: 14px; vertical-align: middle; }
        .list-thumb { width: 72px; height: 52px; border-radius: 8px; object-fit: cover; }
        .list-thumb-empty { width: 72px; height: 52px; border-radius: 8px; background: #ede8e0; display: inline-flex; align-items: center; justify-content: center; color: #ccc; }
        .td-btn { display: inline-block; padding: 8px 16px; background: #1a1210; color: #fff; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 500; white-space: nowrap; transition: opacity 150ms ease; }
        .td-btn:hover { opacity: 0.75; }
        .td-heart { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px; color: #c0392b; transition: transform 150ms ease; }
        .td-heart:hover { transform: scale(1.2); }
        @media (max-width: 768px) {
          .mes-biens-wrap { padding: 24px 16px; }
          .mes-biens-title { font-size: 24px; }
          .mes-biens-header { flex-direction: column; align-items: flex-start; }
          .grid { grid-template-columns: 1fr; gap: 16px; }
          .list-table { font-size: 12px; }
          .list-table thead th, .list-table td { padding: 8px; }
          .list-thumb { width: 56px; height: 40px; }
          .list-thumb-empty { width: 56px; height: 40px; }
        }
      `}</style>

      <div className="mes-biens-wrap">
        <div className="mes-biens-header">
          <div>
            <h1 className="mes-biens-title">
              Ma watchlist
              <span style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                background: isAtLimit && !isExpert ? 'rgba(192,57,43,0.1)' : '#f0ede8',
                color: isAtLimit && !isExpert ? '#c0392b' : '#9a8a80',
                fontSize: 13, fontWeight: 600, marginLeft: 12, verticalAlign: 'middle'
              }}>
                {isExpert ? `${biens.length} biens` : `${biens.length} / ${watchlistLimit}`}
              </span>
            </h1>
            <p className="mes-biens-sub">{biens.length} bien{biens.length > 1 ? 's' : ''} sauvegard{'\u00E9'}{biens.length > 1 ? 's' : ''}</p>
            {isAtLimit && !isExpert && (
              <p style={{ fontSize: 14, color: '#c0392b', marginTop: 8 }}>
                {"Vous avez atteint la limite de votre plan. "}
                <a href="/mon-profil" style={{ color: '#c0392b', fontWeight: 600, textDecoration: 'underline' }}>
                  {plan === 'free' ? "Passer au Pro pour 50 biens" : "Passer \u00E0 Expert pour un acc\u00E8s illimit\u00E9"}
                </a>
              </p>
            )}
          </div>
          <div className="view-toggle" role="group" aria-label="Mode d'affichage">
            <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} aria-pressed={view === 'grid'} aria-label="Affichage en grille">Grille</button>
            <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} aria-pressed={view === 'list'} aria-label="Affichage en liste">Liste</button>
          </div>
        </div>

        {error && <div className="mes-biens-error" role="alert">{error}</div>}

        {biens.length === 0 ? (
          <div className="empty-state">
            <h3>Votre watchlist est vide</h3>
            <p>Ajoutez des biens en cliquant sur le coeur depuis le listing.</p>
            <a href="/biens" className="empty-link">Voir les biens disponibles</a>
          </div>
        ) : (
          <>
            {/* Onglets par strategie */}
            {strategies.length > 1 && (
              <div className="tabs" role="tablist" aria-label="Filtrer par stratégie">
                {strategies.map(strat => {
                  const count = biens.filter(b => b.strategie_mdb === strat).length
                  return (
                    <button key={strat} role="tab" aria-selected={activeTab === strat} className={`tab ${activeTab === strat ? 'active' : ''}`} onClick={() => setActiveTab(strat)}>
                      {strat}
                      <span className="tab-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <p style={{ fontSize: '14px', color: '#9a8a80', marginBottom: '16px' }}>
              <strong style={{ color: '#1a1210' }}>{filteredBiens.length}</strong> bien{filteredBiens.length > 1 ? 's' : ''} {activeTab && `— ${activeTab}`}
            </p>

            {view === 'grid' ? (
              <div className="grid">
                {filteredBiens.map(bien => (
                  <BienCard
                    key={bien.id}
                    bien={bien}
                    inWatchlist={true}
                    userToken={userToken}
                    onWatchlistChange={(bienId, added) => {
                      if (!added) handleRemove(bienId)
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
                    <th>Commune</th>
                    <th>Prix FAI</th>
                    {activeTab !== 'Travaux lourds' && <th>Loyer</th>}
                    {activeTab !== 'Travaux lourds' && <th>Rendement</th>}
                    {activeTab === 'Travaux lourds' && <th>Score travaux</th>}
                    {activeTab === 'Travaux lourds' && <th>DPE</th>}
                    <th>+/- Value</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBiens.map(bien => (
                    <tr key={bien.id}>
                      <td>
                        <button className="td-heart" onClick={async () => {
                          if (!userToken) return
                          const res = await fetch('/api/watchlist', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
                            body: JSON.stringify({ bien_id: bien.id })
                          })
                          if (res.ok) handleRemove(bien.id)
                        }} aria-label={`Retirer ${bien.type_bien || 'ce bien'} de la watchlist`}>{'♥'}</button>
                      </td>
                      <td>{bien.photo_url ? <img src={bien.photo_url} alt="" className="list-thumb" /> : <div className="list-thumb-empty">-</div>}</td>
                      <td style={{ fontWeight: 600 }}>{bien.type_bien} {bien.nb_pieces} - {bien.surface} m2</td>
                      <td style={{ fontWeight: 500 }}>{bien.ville}{bien.code_postal ? ` - ${bien.code_postal}` : ''}</td>
                      <td style={{ fontWeight: 700 }}>{bien.prix_fai?.toLocaleString('fr-FR')} {'\u20AC'}</td>
                      {activeTab !== 'Travaux lourds' && (
                        <td>{bien.loyer ? `${bien.loyer} \u20AC/mois` : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>}</td>
                      )}
                      {activeTab !== 'Travaux lourds' && (
                        <td><RendementBadge rendement={bien.rendement_brut} size="sm" /></td>
                      )}
                      {activeTab === 'Travaux lourds' && (
                        <td>{bien.score_travaux ? <span style={{ fontWeight: 600, color: '#856404', background: '#fff3cd', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>{bien.score_travaux}/5</span> : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>}</td>
                      )}
                      {activeTab === 'Travaux lourds' && (
                        <td>{bien.dpe ? <span style={{ fontWeight: 700, fontSize: '12px', padding: '4px 8px', borderRadius: '6px', color: '#fff', background: ({ A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0e034', E: '#f0a830', F: '#eb6a2a', G: '#e42a1e' } as any)[bien.dpe] || '#9a8a80' }}>{bien.dpe}</span> : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>}</td>
                      )}
                      <td><PlusValueBadge prixFai={bien.prix_fai} estimationPrix={bien.estimation_prix_total} scoreTravaux={bien.score_travaux} surface={bien.surface} size="sm" /></td>
                      <td><a href={`/biens/${bien.id}`} className="td-btn" aria-label={`Voir l'analyse de ${bien.type_bien || 'ce bien'}`}>Analyse</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
