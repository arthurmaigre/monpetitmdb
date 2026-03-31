'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import BienCard from '@/components/BienCard'
import MetroBadge from '@/components/MetroBadge'
import RendementBadge from '@/components/RendementBadge'
import PlusValueBadge from '@/components/PlusValueBadge'
import { calculerCashflow } from '@/lib/calculs'

function formatPrix(n: number) {
  return n ? n.toLocaleString('fr-FR') + ' \u20AC' : '-'
}

const SUIVI_OPTIONS = [
  { value: 'a_analyser',       label: '\u00C0 analyser',        color: '#7a6a60', bg: '#f0ede8' },
  { value: 'info_demandee',    label: 'Info demand\u00E9e',     color: '#3498db', bg: '#ebf5fb' },
  { value: 'analyse_complete', label: 'Analyse compl\u00E8te',  color: '#2980b9', bg: '#d6eaf8' },
  { value: 'offre_envoyee',    label: 'Offre envoy\u00E9e',     color: '#f39c12', bg: '#fef9e7' },
  { value: 'en_negociation',   label: 'En n\u00E9gociation',    color: '#e67e22', bg: '#fdebd0' },
  { value: 'visite',           label: 'Visite',                 color: '#8e44ad', bg: '#f4ecf7' },
  { value: 'sous_compromis',   label: 'Sous compromis',         color: '#27ae60', bg: '#eafaf1' },
  { value: 'acte_signe',       label: 'Acte sign\u00E9',        color: '#1e8449', bg: '#d5f5e3' },
  { value: 'ko_pas_rentable',  label: 'KO - Pas rentable',      color: '#e74c3c', bg: '#fdedec' },
  { value: 'ko_offre_refusee', label: 'KO - Offre refus\u00E9e',color: '#e74c3c', bg: '#fdedec' },
  { value: 'ko_non_conforme',  label: 'KO - Non conforme',      color: '#e74c3c', bg: '#fdedec' },
  { value: 'ko_vendu',         label: 'KO - Vendu',             color: '#e74c3c', bg: '#fdedec' },
  { value: 'ko_autre',         label: 'KO - Autre',             color: '#e74c3c', bg: '#fdedec' },
]

export default function MesBiensPage() {
  useEffect(() => { document.title = 'Ma Watchlist | Mon Petit MDB' }, [])

  const [biens, setBiens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState('')
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<string>('free')
  const [suiviMap, setSuiviMap] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [budgetTravauxM2, setBudgetTravauxM2] = useState<Record<string, number>>({ '1': 200, '2': 500, '3': 800, '4': 1200, '5': 1800 })
  const tableWrapRef = useRef<HTMLDivElement>(null)
  const floatingScrollRef = useRef<HTMLDivElement>(null)
  const [tableWidth, setTableWidth] = useState(0)
  const syncing = useRef(false)

  const syncScroll = useCallback((source: 'table' | 'float') => {
    if (syncing.current) return
    syncing.current = true
    const tw = tableWrapRef.current
    const fs = floatingScrollRef.current
    if (tw && fs) {
      if (source === 'table') fs.scrollLeft = tw.scrollLeft
      else tw.scrollLeft = fs.scrollLeft
    }
    requestAnimationFrame(() => { syncing.current = false })
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { window.location.href = '/login'; return }
        setUserToken(session.access_token)
        setUserId(session.user.id)

        const profileRes = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setPlan(profileData.profile?.plan || 'free')
          if (profileData.profile?.budget_travaux_m2) setBudgetTravauxM2(profileData.profile.budget_travaux_m2)
        }

        const wRes = await fetch('/api/watchlist', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!wRes.ok) throw new Error('Impossible de charger la watchlist')
        const wData = await wRes.json()
        const items = wData.watchlist || []
        setWatchlistIds(new Set(items.map((w: any) => w.bien_id)))
        const suiviInit: Record<string, string> = {}
        items.forEach((w: any) => { suiviInit[w.bien_id] = w.suivi || 'a_analyser' })
        setSuiviMap(suiviInit)

        if (items.length === 0) { setLoading(false); return }

        const biensRes = await fetch('/api/biens?ids=' + items.map((w: any) => w.bien_id).join(','))
        if (!biensRes.ok) throw new Error('Impossible de charger les biens')
        const biensData = await biensRes.json()
        setBiens(biensData.biens || [])

        const strategies = [...new Set((biensData.biens || []).map((x: any) => x.strategie_mdb).filter(Boolean))]
        if (strategies.length > 0) setActiveTab(strategies[0] as string)
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (view !== 'list' || loading) return
    const tw = tableWrapRef.current
    if (!tw) return
    const measure = () => { const table = tw.querySelector('table'); if (table) setTableWidth(table.scrollWidth) }
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(tw)
    return () => obs.disconnect()
  }, [view, loading, activeTab, biens.length])

  const watchlistLimit = plan === 'expert' ? Infinity : plan === 'pro' ? 50 : 10
  const isAtLimit = biens.length >= watchlistLimit
  const isExpert = plan === 'expert'
  const strategies = [...new Set(biens.map(b => b.strategie_mdb).filter(Boolean))] as string[]
  const filteredBiens = activeTab ? biens.filter(b => b.strategie_mdb === activeTab) : biens

  async function handleSuiviChange(bienId: string, newSuivi: string) {
    setSuiviMap(prev => ({ ...prev, [bienId]: newSuivi }))
    await fetch('/api/watchlist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ bien_id: bienId, suivi: newSuivi })
    })
  }

  function handleRemove(bienId: string) {
    setBiens(prev => prev.filter(b => b.id !== bienId))
    setWatchlistIds(prev => { const next = new Set(prev); next.delete(bienId); return next })
  }

  async function updateBien(bien: any, champ: string, valeur: any) {
    if (!userToken) return
    if (bien[champ] !== null && bien[champ] !== undefined) return
    setSaving(bien.id + champ)
    const res = await fetch('/api/biens/' + bien.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ [champ]: valeur })
    })
    if (res.ok) {
      const data = await res.json()
      setBiens(prev => prev.map(b => b.id === bien.id ? { ...b, ...data.bien } : b))
    }
    setSaving(null)
  }

  function CellEditable({ bien, champ, suffix = '' }: { bien: any, champ: string, suffix?: string }) {
    const valeur = bien[champ]
    const estSaving = saving === bien.id + champ
    if (valeur !== null && valeur !== undefined) return <span style={{ color: '#555' }}>{valeur}{suffix}</span>
    if (!userId) return <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>
    return (
      <input type="number" defaultValue="" placeholder="NC" disabled={!!estSaving}
        style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', background: estSaving ? '#f0ede8' : '#faf8f5', outline: 'none' }}
        onBlur={e => { if (e.target.value) updateBien(bien, champ, Number(e.target.value)) }}
        onFocus={e => e.target.style.borderColor = '#c0392b'} />
    )
  }

  function CellTypeLoyer({ bien }: { bien: any }) {
    const valeur = bien.type_loyer
    if (valeur !== null && valeur !== undefined) return <span style={{ color: '#555' }}>{valeur}</span>
    if (!userId) return <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>
    return (
      <select defaultValue="" onChange={e => { if (e.target.value) updateBien(bien, 'type_loyer', e.target.value) }}
        style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', background: '#faf8f5', outline: 'none' }}>
        <option value="">NC</option>
        <option value="HC">HC</option>
        <option value="CC">CC</option>
      </select>
    )
  }

  function SuiviSelect({ bienId }: { bienId: string }) {
    const opt = SUIVI_OPTIONS.find(o => o.value === (suiviMap[bienId] || 'a_analyser')) || SUIVI_OPTIONS[0]
    return (
      <select className="suivi-select" value={suiviMap[bienId] || 'a_analyser'} onChange={e => handleSuiviChange(bienId, e.target.value)} style={{ color: opt.color, background: opt.bg }}>
        {SUIVI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
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
        .mes-biens-wrap { max-width: 1600px; margin: 0 auto; padding: 32px 48px; }
        .mes-biens-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .mes-biens-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; color: #1a1210; }
        .mes-biens-sub { font-size: 16px; color: #7a6a60; margin-top: 4px; }
        .view-toggle { display: flex; gap: 4px; }
        .view-btn { padding: 8px 16px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 150ms ease; background: transparent; color: #7a6a60; }
        .view-btn:hover { border-color: #1a1210; color: #1a1210; }
        .view-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .tab { padding: 8px 20px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 150ms ease; background: #fff; color: #7a6a60; display: flex; align-items: center; gap: 8px; }
        .tab:hover { border-color: #1a1210; color: #1a1210; }
        .tab.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .tab-count { background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 8px; font-size: 12px; }
        .tab.active .tab-count { background: rgba(255,255,255,0.2); }
        .tab:not(.active) .tab-count { background: #f0ede8; color: #7a6a60; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 20px; }
        .empty-state { text-align: center; padding: 80px 40px; color: #7a6a60; background: #fff; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .empty-state h3 { font-family: 'Fraunces', serif; font-size: 24px; color: #1a1210; margin-bottom: 8px; }
        .empty-link { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #c0392b; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; transition: opacity 150ms ease; }
        .empty-link:hover { opacity: 0.85; }
        .mes-biens-error { background: #fdedec; color: #e74c3c; border-radius: 8px; padding: 12px 16px; font-size: 14px; margin-bottom: 16px; }
        .list-wrap { position: relative; overflow-x: scroll; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .list-wrap::-webkit-scrollbar { height: 0; }
        .floating-scroll { position: fixed; bottom: 0; left: 48px; right: 48px; z-index: 50; overflow-x: auto; overflow-y: hidden; background: rgba(240,237,232,0.95); backdrop-filter: blur(6px); border-top: 1px solid #e8e2d8; height: 16px; max-width: 1504px; margin: 0 auto; }
        .floating-scroll-inner { height: 1px; pointer-events: none; }
        .list-table { border-collapse: separate; border-spacing: 0; background: #fff; min-width: 100%; }
        .list-table thead tr { background: #f7f4f0; }
        .list-table thead th { padding: 12px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #7a6a60; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; vertical-align: bottom; border-bottom: 2px solid #ede8e0; }
        .list-table thead th span { display: block; font-size: 10px; font-weight: 400; color: #b0a898; letter-spacing: 0; text-transform: none; margin-top: 2px; height: 14px; }
        .list-table tbody tr { transition: background 150ms ease; }
        .list-table tbody tr:hover { background: #faf8f5; }
        .list-table td { padding: 8px 12px; font-size: 14px; vertical-align: middle; border-bottom: 1px solid #f0ede8; text-align: center; }
        .sticky-col { position: sticky; z-index: 2; background: #fff; text-align: left; }
        .sticky-col-head { position: sticky; z-index: 3; background: #f7f4f0; text-align: left !important; }
        .list-table tbody tr:hover .sticky-col { background: #faf8f5; }
        .list-thumb { width: 72px; height: 52px; border-radius: 8px; object-fit: cover; }
        .list-thumb-empty { width: 72px; height: 52px; border-radius: 8px; background: #ede8e0; display: inline-flex; align-items: center; justify-content: center; color: #ccc; font-size: 10px; }
        .td-bien-title { font-weight: 600; color: #1a1210; display: block; margin-bottom: 2px; }
        .td-bien-quartier { font-size: 12px; color: #b0a898; display: block; }
        .td-prix { font-weight: 500; font-size: 14px; letter-spacing: -0.01em; white-space: nowrap; }
        .td-btn { display: inline-block; padding: 8px 16px; background: #1a1210; color: #fff; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 500; white-space: nowrap; transition: opacity 150ms ease; }
        .td-btn:hover { opacity: 0.75; }
        .td-btn-contact { display: inline-block; padding: 8px 12px; background: #c0392b; color: #fff; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 500; white-space: nowrap; transition: opacity 150ms ease; }
        .td-btn-contact:hover { opacity: 0.75; }
        .td-heart { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px; border-radius: 50%; transition: transform 150ms ease; color: #c0392b; }
        .td-heart:hover { transform: scale(1.2); }
        .edit-hint { font-size: 12px; color: #7a6a60; margin-bottom: 12px; font-style: italic; }
        .suivi-select { font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 6px; border: 1px solid #e8e2d8; cursor: pointer; outline: none; min-width: 130px; }
        .suivi-select:focus { border-color: #c0392b; box-shadow: 0 0 0 2px rgba(192,57,43,0.1); }
        @media (max-width: 768px) {
          .mes-biens-wrap { padding: 24px 16px; }
          .mes-biens-title { font-size: 24px; }
          .mes-biens-header { flex-direction: column; align-items: flex-start; }
          .grid { grid-template-columns: 1fr; gap: 16px; }
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
                color: isAtLimit && !isExpert ? '#c0392b' : '#7a6a60',
                fontSize: 13, fontWeight: 600, marginLeft: 12, verticalAlign: 'middle'
              }}>
                {isExpert ? `${biens.length} biens` : `${biens.length} / ${watchlistLimit}`}
              </span>
            </h1>
            <p className="mes-biens-sub">{biens.length} bien{biens.length > 1 ? 's' : ''} sauvegard{'\u00E9'}{biens.length > 1 ? 's' : ''}</p>
            {isAtLimit && !isExpert && (
              <p style={{ fontSize: 14, color: '#c0392b', marginTop: 8 }}>
                {"Vous avez atteint la limite de votre plan. "}
                <a href="/#pricing" style={{ color: '#c0392b', fontWeight: 600, textDecoration: 'underline' }}>
                  {plan === 'free' ? "Passer au Pro pour 50 biens" : "Passer \u00E0 Expert pour un acc\u00E8s illimit\u00E9"}
                </a>
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {biens.length > 0 && (
              <button
                onClick={() => {
                  const headers = ['Type', 'Ville', 'Surface', 'Prix FAI', 'Prix/m2', 'Loyer', 'Rendement', 'Strategie', 'URL']
                  const rows = biens.map((b: any) => [
                    b.type_bien || '', b.ville || '', b.surface || '', b.prix_fai || '', b.prix_m2 ? Math.round(b.prix_m2) : '',
                    b.loyer || '', b.rendement_brut ? `${(b.rendement_brut * 100).toFixed(1)}%` : '', b.strategie_mdb || '', b.url || ''
                  ])
                  const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
                  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = 'watchlist.csv'; a.click()
                  URL.revokeObjectURL(url)
                }}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e8e2d8', background: '#fff', fontSize: '12px', fontWeight: 600, color: '#1a1210', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
              >
                {"Exporter CSV \u2193"}
              </button>
            )}
            <div className="view-toggle" role="group" aria-label="Mode d'affichage">
              <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>Grille</button>
              <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Liste</button>
            </div>
          </div>
        </div>

        {error && <div className="mes-biens-error" role="alert">{error}</div>}

        {biens.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: '16px', opacity: 0.5 }}>
              <path d="M44.84 12.61a13.5 13.5 0 0 0-12.84 4.06 13.5 13.5 0 0 0-12.84-4.06 13.5 13.5 0 0 0 0 19.1L32 49.23l12.84-17.52a13.5 13.5 0 0 0 0-19.1z" stroke="#c0392b" strokeWidth="2.5" fill="none"/>
            </svg>
            <h3>Votre watchlist est vide</h3>
            <p>{"Explorez les biens et cliquez sur le \u2764 pour constituer votre s\u00E9lection."}</p>
            <a href="/biens" className="empty-link">{"Explorer les biens disponibles \u2192"}</a>
          </div>
        ) : (
          <>
            {strategies.length > 1 && (
              <div className="tabs" role="tablist">
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

            <p style={{ fontSize: '14px', color: '#7a6a60', marginBottom: '16px' }}>
              <strong style={{ color: '#1a1210' }}>{filteredBiens.length}</strong> bien{filteredBiens.length > 1 ? 's' : ''} {activeTab && `\u2014 ${activeTab}`}
            </p>

            {view === 'grid' ? (
              <div className="grid">
                {filteredBiens.map(bien => {
                  const opt = SUIVI_OPTIONS.find(o => o.value === (suiviMap[bien.id] || 'a_analyser')) || SUIVI_OPTIONS[0]
                  return (
                  <BienCard
                    key={bien.id}
                    bien={bien}
                    inWatchlist={true}
                    userToken={userToken}
                    onWatchlistChange={(bienId, added) => { if (!added) handleRemove(bienId) }}
                    extraTitleRight={
                      <select className="suivi-select" value={suiviMap[bien.id] || 'a_analyser'} onChange={e => handleSuiviChange(bien.id, e.target.value)} style={{ color: opt.color, background: opt.bg, flexShrink: 0 }}>
                        {SUIVI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    }
                  />
                  )
                })}
              </div>
            ) : (
              <>
                {userId && <p className="edit-hint">Les champs NC sont editables — vos modifications enrichissent la base de donnees.</p>}
                <div className="list-wrap" ref={tableWrapRef} onScroll={() => syncScroll('table')}><table className="list-table">
                  <thead>
                    <tr>
                      <th className="sticky-col-head" style={{ left: 0, width: '40px', minWidth: '40px' }}><span></span></th>
                      <th className="sticky-col-head" style={{ left: '40px', width: '130px', minWidth: '130px' }}>Suivi<span></span></th>
                      <th className="sticky-col-head" style={{ left: '170px', width: '80px', minWidth: '80px' }}><span></span></th>
                      <th className="sticky-col-head" style={{ left: '250px', minWidth: '220px', borderRight: '2px solid #ede8e0' }}>Bien<span></span></th>
                      <th>Commune<span></span></th>
                      <th>{"M\u00E9tropole"}<span></span></th>
                      <th>Prix FAI<span></span></th>
                      {activeTab !== 'Travaux lourds' && <th>Prix cible<span></span></th>}
                      {activeTab !== 'Travaux lourds' && <th>{"\u00C9cart"}<span></span></th>}
                      <th>Prix/m2<span></span></th>
                      {activeTab === 'Travaux lourds' ? (
                        <>
                          <th>Score travaux<span></span></th>
                          <th>Estimation travaux<span></span></th>
                          <th>DPE<span></span></th>
                          <th>{"Ann\u00E9e"}<span></span></th>
                          <th>+/- Value<span></span></th>
                        </>
                      ) : (
                        <>
                          <th>Loyer<span>/mois</span></th>
                          <th>Type loyer<span></span></th>
                          <th>{"Charges r\u00E9cup."}<span>/mois</span></th>
                          <th>Charges copro<span>/mois</span></th>
                          <th>{"Taxe fonci\u00E8re"}<span>/an</span></th>
                          <th>Rendement brut<span></span></th>
                          <th>+/- Value<span></span></th>
                          <th>Cashflow brut<span>/mois</span></th>
                          <th>Locataire<span></span></th>
                        </>
                      )}
                      <th>Actions<span></span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBiens.map(bien => (
                      <tr key={bien.id}>
                        <td className="sticky-col" style={{ left: 0, width: '40px', minWidth: '40px' }}>
                          <button className="td-heart" onClick={async () => {
                            if (!userToken) return
                            const res = await fetch('/api/watchlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify({ bien_id: bien.id }) })
                            if (res.ok) handleRemove(bien.id)
                          }}>{'\u2665'}</button>
                        </td>
                        <td className="sticky-col" style={{ left: '40px', width: '130px', minWidth: '130px' }}>
                          <SuiviSelect bienId={bien.id} />
                        </td>
                        <td className="sticky-col" style={{ left: '170px', width: '80px', minWidth: '80px' }}>{bien.photo_url ? <img src={bien.photo_url} alt="" className="list-thumb" /> : <div className="list-thumb-empty">-</div>}</td>
                        <td className="sticky-col" style={{ left: '250px', minWidth: '220px', borderRight: '2px solid #f0ede8' }}>
                          <span className="td-bien-title">{bien.type_bien || 'Bien'} {bien.nb_pieces}{bien.surface ? ` - ${bien.surface} m\u00B2` : ''}</span>
                          {bien.quartier && <span className="td-bien-quartier">{bien.quartier}</span>}
                        </td>
                        <td style={{ fontWeight: 500, minWidth: '180px' }}>{bien.ville}{bien.code_postal ? ` - ${bien.code_postal}` : ''}</td>
                        <td><MetroBadge metropole={bien.metropole} /></td>
                        {(() => {
                          const peutCalculer = bien.loyer && bien.prix_fai
                          const resultat = peutCalculer ? calculerCashflow(
                            { prix_fai: bien.prix_fai, loyer: bien.loyer, type_loyer: bien.type_loyer, charges_rec: bien.charges_rec || 0, charges_copro: bien.charges_copro || 0, taxe_fonc_ann: bien.taxe_fonc_ann || 0, surface: bien.surface },
                            { apport: 20000, tauxCredit: 3.5, tauxAssurance: 0.3, dureeAns: 20, fraisNotaire: 7.5, objectifCashflow: 0 },
                            { tmi: 30, regime: 'nu_micro_foncier' }
                          ) : null
                          const ecartPct = resultat ? ((resultat.prix_cible - bien.prix_fai) / bien.prix_fai * 100) : null
                          const isLocataire = activeTab !== 'Travaux lourds'
                          return <>
                            <td className="td-prix">{formatPrix(bien.prix_fai)}</td>
                            {isLocataire && (
                              <td className="td-prix" style={{ fontSize: '13px' }}>
                                {resultat ? (
                                  resultat.prix_cible >= bien.prix_fai
                                    ? <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', background: '#d4f5e0', color: '#1a7a40', whiteSpace: 'nowrap' }}>Cash Flow Positif</span>
                                    : formatPrix(resultat.prix_cible)
                                ) : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>-</span>}
                              </td>
                            )}
                            {isLocataire && (
                              <td>
                                {resultat && resultat.prix_cible < bien.prix_fai && ecartPct !== null ? (
                                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', background: '#fde8e8', color: '#c0392b', whiteSpace: 'nowrap' }}>
                                    {ecartPct.toFixed(1)}&nbsp;%
                                  </span>
                                ) : resultat && resultat.prix_cible >= bien.prix_fai ? null : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>-</span>}
                              </td>
                            )}
                            <td style={{ color: '#7a6a60' }}>{bien.prix_m2 ? `${Math.round(bien.prix_m2).toLocaleString('fr-FR')} \u20AC` : '-'}</td>
                            {!isLocataire ? (
                              <>
                                <td>
                                  {bien.score_travaux ? (
                                    <span style={{ fontSize: '12px', fontWeight: 600, background: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '6px' }}>
                                      {bien.score_travaux}/5
                                    </span>
                                  ) : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>}
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {bien.score_travaux && bien.surface ? (
                                    (() => {
                                      const budget = budgetTravauxM2[String(bien.score_travaux)] || 0
                                      const total = Math.round(budget * bien.surface)
                                      return <span style={{ fontWeight: 500 }}>{total.toLocaleString('fr-FR')} {'\u20AC'}</span>
                                    })()
                                  ) : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>-</span>}
                                </td>
                                <td>
                                  {bien.dpe ? (
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: '28px', height: '28px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', color: '#fff',
                                      background: ({ A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0e034', E: '#f0a830', F: '#eb6a2a', G: '#e42a1e' } as any)[bien.dpe] || '#7a6a60'
                                    }}>{bien.dpe}</span>
                                  ) : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>}
                                </td>
                                <td style={{ color: '#7a6a60' }}>{bien.annee_construction || <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>}</td>
                                <td><PlusValueBadge prixFai={bien.prix_fai} estimationPrix={bien.estimation_prix_total} scoreTravaux={bien.score_travaux} surface={bien.surface} size="sm" /></td>
                              </>
                            ) : (
                              <>
                                <td><CellEditable bien={bien} champ="loyer" suffix={` \u20AC`} /></td>
                                <td><CellTypeLoyer bien={bien} /></td>
                                <td><CellEditable bien={bien} champ="charges_rec" suffix={` \u20AC`} /></td>
                                <td><CellEditable bien={bien} champ="charges_copro" suffix={` \u20AC`} /></td>
                                <td><CellEditable bien={bien} champ="taxe_fonc_ann" suffix={` \u20AC`} /></td>
                                <td><RendementBadge rendement={bien.rendement_brut} size="sm" /></td>
                                <td><PlusValueBadge prixFai={bien.prix_fai} estimationPrix={bien.estimation_prix_total} scoreTravaux={bien.score_travaux} surface={bien.surface} size="sm" /></td>
                                <td style={{ fontWeight: 600, fontSize: '13px', color: resultat && resultat.cashflow_brut >= 0 ? '#1a7a40' : '#c0392b' }}>
                                  {resultat ? `${resultat.cashflow_brut >= 0 ? '+' : ''}${Math.round(resultat.cashflow_brut).toLocaleString('fr-FR')} \u20AC` : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>-</span>}
                                </td>
                                <td style={{ color: '#7a6a60', fontSize: '12px' }}>{bien.profil_locataire && bien.profil_locataire !== 'NC' ? bien.profil_locataire : '-'}</td>
                              </>
                            )}
                          </>
                        })()}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <a href={`/biens/${bien.id}`} className="td-btn">{"Voir l\u2019analyse"}</a>
                          {' '}
                          <a href={`/biens/${bien.id}#contact`} className="td-btn-contact">{"R\u00E9cup\u00E9rer les donn\u00E9es"}</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                {tableWidth > 0 && (
                  <div className="floating-scroll" ref={floatingScrollRef} onScroll={() => syncScroll('float')}>
                    <div className="floating-scroll-inner" style={{ width: tableWidth }} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
