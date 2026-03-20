'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import BienCard from '@/components/BienCard'
import MetroBadge from '@/components/MetroBadge'
import RendementBadge from '@/components/RendementBadge'
import PlusValueBadge from '@/components/PlusValueBadge'
import { Bien } from '@/lib/types'
import { TYPES_BIEN, TRIS } from '@/lib/constants'
import { calculerCashflow } from '@/lib/calculs'

function formatPrix(n: number) {
  return n ? n.toLocaleString('fr-FR') + ' \u20AC' : '-'
}

function getSessionFilters() {
  if (typeof window === 'undefined') return null
  try {
    const saved = sessionStorage.getItem('biens_filters')
    return saved ? JSON.parse(saved) : null
  } catch { return null }
}

export default function BiensPage() {
  const saved = useRef(getSessionFilters())
  const [allBiens, setAllBiens] = useState<Bien[]>([])
  const [metropoles, setMetropoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>(saved.current?.view || 'grid')
  const [strategie, setStrategie] = useState(saved.current?.strategie || '')
  const [metropole, setMetropole] = useState(saved.current?.metropole || 'Toutes')
  const [ville, setVille] = useState(saved.current?.ville || 'Toutes')
  const [communeSearch, setCommuneSearch] = useState(saved.current?.communeSearch || '')
  const [communeSuggestions, setCommuneSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCommune, setSelectedCommune] = useState<{ code_postal: string, nom_commune: string, type?: string, label?: string } | null>(saved.current?.selectedCommune || null)
  const communeTimeout = useRef<any>(null)
  const [typeBien, setTypeBien] = useState(saved.current?.typeBien || 'Tous')
  const [prixMin, setPrixMin] = useState(saved.current?.prixMin || '')
  const [prixMax, setPrixMax] = useState(saved.current?.prixMax || '')
  const [rendMin, setRendMin] = useState(saved.current?.rendMin || '')
  const [scoreTravauxMin, setScoreTravauxMin] = useState(saved.current?.scoreTravauxMin || '')
  const [tri, setTri] = useState(saved.current?.tri || 'recent')
  const [totalBiens, setTotalBiens] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const PAGE_SIZE = 50
  const [userId, setUserId] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
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

  // Sauvegarder les filtres dans sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('biens_filters', JSON.stringify({
        strategie, metropole, ville, communeSearch, selectedCommune,
        typeBien, prixMin, prixMax, rendMin, scoreTravauxMin, tri, view,
      }))
    } catch {}
  }, [strategie, metropole, ville, communeSearch, selectedCommune, typeBien, prixMin, prixMax, rendMin, scoreTravauxMin, tri, view])

  // Sauvegarder la position de scroll avant de quitter
  useEffect(() => {
    const saveScroll = () => {
      try { sessionStorage.setItem('biens_scroll', String(window.scrollY)) } catch {}
    }
    window.addEventListener('beforeunload', saveScroll)
    // Sauvegarder aussi quand on clique sur un lien
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a')
      if (link && link.href.includes('/biens/')) saveScroll()
    }
    document.addEventListener('click', handleClick)
    return () => { window.removeEventListener('beforeunload', saveScroll); document.removeEventListener('click', handleClick) }
  }, [])

  // Restaurer le scroll apres chargement des biens
  const scrollRestored = useRef(false)
  useEffect(() => {
    if (!loading && allBiens.length > 0 && !scrollRestored.current) {
      scrollRestored.current = true
      try {
        const savedScroll = sessionStorage.getItem('biens_scroll')
        if (savedScroll) {
          requestAnimationFrame(() => {
            window.scrollTo(0, parseInt(savedScroll))
          })
        }
      } catch {}
    }
  }, [loading, allBiens])

  // Construire l'URL API avec filtres
  function buildApiUrl(page: number) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    if (strategie) params.set('strategie', strategie)
    if (selectedCommune) {
      params.set('locationType', selectedCommune.type || 'commune')
      params.set('locationValue', selectedCommune.nom_commune)
      params.set('locationCP', selectedCommune.code_postal)
    }
    if (typeBien !== 'Tous') params.set('type_bien', typeBien)
    if (prixMin) params.set('prix_min', prixMin)
    if (prixMax) params.set('prix_max', prixMax)
    if (rendMin) params.set('rendement_min', rendMin)
    return `/api/biens?${params.toString()}`
  }

  // Charger les biens quand la strategie ou les filtres changent
  useEffect(() => {
    if (!strategie) { setAllBiens([]); setLoading(false); setTotalBiens(0); setHasMore(false); return }
    setLoading(true)
    setError(null)
    setCurrentPage(1)
    setScoreTravauxMin('')
    scrollRestored.current = false
    fetch(buildApiUrl(1))
      .then(r => { if (!r.ok) throw new Error('Erreur serveur'); return r.json() })
      .then(d => {
        setAllBiens(d.biens || [])
        setTotalBiens(d.total || 0)
        setHasMore(d.hasMore || false)
        setLoading(false)
      })
      .catch(() => { setError('Impossible de charger les biens. Veuillez réessayer.'); setLoading(false) })
  }, [strategie, selectedCommune, typeBien, prixMin, prixMax, rendMin])

  // Charger plus de biens
  const loadMoreRef = useRef<(() => void) | undefined>(undefined)
  loadMoreRef.current = () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = currentPage + 1
    fetch(buildApiUrl(nextPage))
      .then(r => r.json())
      .then(d => {
        setAllBiens(prev => [...prev, ...(d.biens || [])])
        setCurrentPage(nextPage)
        setHasMore(d.hasMore || false)
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }

  // Scroll infini via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMoreRef.current?.()
    }, { rootMargin: '400px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading])

  useEffect(() => {
    async function load() {
      const [metroData, sessionData] = await Promise.all([
        fetch('/api/metropoles').then(r => r.json()),
        supabase.auth.getSession(),
      ])
      setMetropoles(metroData.metropoles || [])

      const session = sessionData.data.session
      if (session) {
        setUserId(session.user.id)
        setUserToken(session.access_token)
        const [wRes, pRes] = await Promise.all([
          fetch('/api/watchlist', { headers: { Authorization: `Bearer ${session.access_token}` } }),
          fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
        ])
        const wData = await wRes.json()
        setWatchlistIds(new Set((wData.watchlist || []).map((w: any) => w.bien_id)))
        const pData = await pRes.json()
        if (pData.profile?.budget_travaux_m2) setBudgetTravauxM2(pData.profile.budget_travaux_m2)
      }
      if (!strategie) setLoading(false)
    }
    load()
  }, [])

  function handleCommuneSearch(value: string) {
    setCommuneSearch(value)
    if (communeTimeout.current) clearTimeout(communeTimeout.current)
    if (value.length < 2) { setCommuneSuggestions([]); setShowSuggestions(false); return }
    communeTimeout.current = setTimeout(async () => {
      const params = new URLSearchParams({ q: value })
      if (metropole !== 'Toutes') params.set('metropole', metropole)
      const res = await fetch(`/api/communes?${params}`)
      const data = await res.json()
      setCommuneSuggestions(data.communes || [])
      setShowSuggestions(true)
    }, 200)
  }

  function selectCommune(commune: any) {
    setSelectedCommune(commune)
    setCommuneSearch(commune.label || commune.nom_commune)
    setShowSuggestions(false)
  }

  function clearCommune() {
    setSelectedCommune(null)
    setCommuneSearch('')
    setCommuneSuggestions([])
  }

  async function updateBien(bien: any, champ: string, valeur: any) {
    if (!userToken) return
    if ((bien as any)[champ] !== null && (bien as any)[champ] !== undefined) return
    setSaving(bien.id + champ)
    const res = await fetch('/api/biens/' + bien.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ [champ]: valeur })
    })
    if (res.ok) {
      const data = await res.json()
      setAllBiens(prev => prev.map(b => b.id === bien.id ? { ...b, ...data.bien } : b))
    }
    setSaving(null)
  }

  const villes = metropole === 'Toutes' ? [] :
    [...new Set(allBiens.filter(b => b.metropole === metropole).map(b => b.ville))].sort()

  const strategies = ['Locataire en place', 'Travaux lourds', 'Division', 'Découpe']

  // Filtres cote client (les autres sont cote serveur)
  let filtered = allBiens.filter(b => {
    if (scoreTravauxMin && (!(b as any).score_travaux || (b as any).score_travaux < Number(scoreTravauxMin))) return false
    return true
  })

  filtered = [...filtered].sort((a, b) => {
    if (tri === 'rendement_desc') return (b.rendement_brut || 0) - (a.rendement_brut || 0)
    if (tri === 'rendement_asc') return (a.rendement_brut || 0) - (b.rendement_brut || 0)
    if (tri === 'prix_asc') return (a.prix_fai || 0) - (b.prix_fai || 0)
    if (tri === 'prix_desc') return (b.prix_fai || 0) - (a.prix_fai || 0)
    return 0
  })

  useEffect(() => {
    if (view !== 'list' || loading) return
    const tw = tableWrapRef.current
    if (!tw) return
    const measure = () => {
      const table = tw.querySelector('table')
      if (table) setTableWidth(table.scrollWidth)
    }
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(tw)
    return () => obs.disconnect()
  }, [view, loading, strategie, allBiens.length])

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
    const valeur = (bien as any).type_loyer
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

  return (
    <Layout>
      <style>{`
        .main { max-width: 1600px; margin: 0 auto; padding: 32px 48px; box-sizing: border-box; }
        .filter-bar { background: #fff; border-radius: 16px; padding: 16px 24px; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
        .filter-group { display: flex; flex-direction: column; gap: 4px; }
        .filter-label { font-size: 12px; font-weight: 600; color: #9a8a80; letter-spacing: 0.08em; text-transform: uppercase; }
        .filter-bar select, .filter-bar input { padding: 8px 12px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; background: #f7f4f0; color: #1a1210; outline: none; transition: border-color 150ms ease; }
        .filter-bar select:focus, .filter-bar input:focus { border-color: #c0392b; }
        .filter-bar select.required { border-color: #c0392b; background: #fff8f7; }
        .filter-bar input { width: 140px; }
        .filter-sep { width: 1px; height: 44px; background: #e8e2d8; align-self: flex-end; margin: 0 4px; }
        .view-toggle { margin-left: auto; display: flex; gap: 4px; align-self: flex-end; }
        .view-btn { padding: 8px 16px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 150ms ease; background: transparent; color: #888; }
        .view-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .results-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .results-count { font-size: 14px; color: #9a8a80; }
        .results-count strong { color: #1a1210; font-weight: 600; }
        .empty-state { text-align: center; padding: 80px 40px; color: #9a8a80; }
        .empty-state h3 { font-family: 'Fraunces', serif; font-size: 22px; color: #1a1210; margin-bottom: 8px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 24px; }
        .list-wrap { position: relative; overflow-x: scroll; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .list-wrap::-webkit-scrollbar { height: 0; }
        .floating-scroll { position: fixed; bottom: 0; left: 48px; right: 48px; z-index: 50; overflow-x: auto; overflow-y: hidden; background: rgba(240,237,232,0.95); backdrop-filter: blur(6px); border-top: 1px solid #e8e2d8; height: 16px; max-width: 1504px; margin: 0 auto; }
        .floating-scroll-inner { height: 1px; pointer-events: none; }
        .list-table { border-collapse: separate; border-spacing: 0; background: #fff; min-width: 100%; }
        .list-table thead tr { background: #f7f4f0; }
        .list-table thead th { padding: 12px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #9a8a80; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; vertical-align: bottom; border-bottom: 2px solid #ede8e0; }
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
        .td-strat { display: inline-block; font-size: 12px; font-weight: 600; color: #2a4a8a; background: #d4ddf5; padding: 4px 8px; border-radius: 20px; white-space: nowrap; }
        .td-btn { display: inline-block; padding: 8px 16px; background: #1a1210; color: #fff; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 500; white-space: nowrap; transition: opacity 150ms ease; }
        .td-btn:hover { opacity: 0.75; }
        .td-btn-contact { display: inline-block; padding: 8px 12px; background: #c0392b; color: #fff; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 500; white-space: nowrap; transition: opacity 150ms ease; }
        .td-btn-contact:hover { opacity: 0.75; }
        .td-heart { background: none; border: none; cursor: pointer; font-size: 18px; padding: 4px; border-radius: 50%; transition: transform 150ms ease; }
        .td-heart:hover { transform: scale(1.2); }
        .edit-hint { font-size: 12px; color: #9a8a80; margin-bottom: 12px; font-style: italic; }
        .commune-wrap { position: relative; flex: 1; display: flex; }
        .commune-input { padding: 8px 12px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; background: #f7f4f0; color: #1a1210; outline: none; transition: border-color 150ms ease; min-width: 280px; width: auto; flex: 1; }
        .commune-input:focus { border-color: #c0392b; }
        .commune-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 14px; color: #9a8a80; padding: 2px 6px; }
        .commune-clear:hover { color: #c0392b; }
        .commune-dropdown { position: absolute; top: 100%; left: 0; min-width: 100%; width: max-content; max-width: 450px; background: #fff; border: 1.5px solid #e8e2d8; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 20; max-height: 240px; overflow-y: auto; margin-top: 4px; }
        .commune-item { padding: 8px 12px; cursor: pointer; font-size: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0ede8; transition: background 150ms ease; }
        .commune-item:last-child { border-bottom: none; }
        .commune-item:hover { background: #faf8f5; }
        .commune-item-name { font-weight: 500; color: #1a1210; }
        .commune-item-cp { font-size: 12px; color: #9a8a80; font-weight: 600; }
        .commune-item-metro { font-size: 12px; color: #b0a898; }

        /* Skeleton loader */
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .skeleton-img { height: 180px; background: linear-gradient(90deg, #f0ede8 25%, #e8e2d8 50%, #f0ede8 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite linear; }
        .skeleton-line { border-radius: 4px; background: linear-gradient(90deg, #f0ede8 25%, #e8e2d8 50%, #f0ede8 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite linear; }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 24px; height: 24px; border: 3px solid #e8e2d8; border-top-color: #c0392b; border-radius: 50%; animation: spin 0.6s linear infinite; }

        /* Responsive: Mobile (< 640px) */
        @media (max-width: 639px) {
          .main { padding: 16px; }
          .filter-bar { flex-direction: column; gap: 12px; padding: 12px 16px; border-radius: 12px; }
          .filter-sep { display: none; }
          .view-toggle { margin-left: 0; justify-content: stretch; width: 100%; }
          .view-toggle .view-btn { flex: 1; text-align: center; }
          .view-toggle .view-btn:last-child { display: none; }
          .grid { grid-template-columns: 1fr; gap: 16px; }
          .commune-input { width: 100% !important; }
          .filter-group { width: 100%; }
          .filter-bar select, .filter-bar input { width: 100%; }
          .empty-state { padding: 48px 24px; }
          .floating-scroll { left: 16px; right: 16px; }
        }

        /* Responsive: Tablet (640px - 1023px) */
        @media (min-width: 640px) and (max-width: 1023px) {
          .main { padding: 24px 32px; }
          .grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .commune-input { width: 240px; }
          .floating-scroll { left: 32px; right: 32px; }
        }

        /* Responsive: Desktop (>= 1024px) */
        @media (min-width: 1024px) {
          .grid { grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); }
        }
      `}</style>

      <div className="main">
        <div className="filter-bar">
          <div className="filter-group">
            <label className="filter-label">Strategie MDB</label>
            <select value={strategie} onChange={e => setStrategie(e.target.value)} className={!strategie ? 'required' : ''}>
              <option value="">-- Choisir une strategie --</option>
              {strategies.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-sep" />
          <div className="filter-group" style={{ flex: 1 }}>
            <label className="filter-label">Localisation</label>
            <div className="commune-wrap">
              <input
                className="commune-input"
                type="text"
                placeholder="Rechercher une ville, un département..."
                value={communeSearch}
                onChange={e => handleCommuneSearch(e.target.value)}
                onFocus={() => { if (communeSuggestions.length > 0) setShowSuggestions(true) }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {selectedCommune && <button className="commune-clear" onClick={clearCommune}>x</button>}
              {showSuggestions && communeSuggestions.length > 0 && (
                <div className="commune-dropdown">
                  {communeSuggestions.map((c, i) => (
                    <div key={`${c.code_postal}-${c.nom_commune}-${i}`} className="commune-item" onMouseDown={() => selectCommune(c)}>
                      <span className="commune-item-name">{c.label || c.nom_commune}</span>
                      {c.type && c.type !== 'commune' && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: c.type === 'metropole' ? '#d4ddf5' : c.type === 'region' ? '#d4f5e0' : '#fff8f0', color: c.type === 'metropole' ? '#2a4a8a' : c.type === 'region' ? '#1a7a40' : '#a06010', fontWeight: 600 }}>{c.type}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="filter-group">
            <label className="filter-label">Type</label>
            <select value={typeBien} onChange={e => setTypeBien(e.target.value)}>
              {TYPES_BIEN.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-sep" />
          <div className="filter-group">
            <label className="filter-label">Prix min</label>
            <input type="number" placeholder={"50 000 \u20AC"} value={prixMin} onChange={e => setPrixMin(e.target.value)} style={{ width: '120px' }} />
          </div>
          <div className="filter-group">
            <label className="filter-label">Prix max</label>
            <input type="number" placeholder={"300 000 \u20AC"} value={prixMax} onChange={e => setPrixMax(e.target.value)} style={{ width: '120px' }} />
          </div>
          {strategie !== 'Travaux lourds' && (
            <div className="filter-group">
              <label className="filter-label">Rdt brut min</label>
              <input type="number" placeholder="5 %" step="0.5" value={rendMin} onChange={e => setRendMin(e.target.value)} style={{ width: '80px' }} />
            </div>
          )}
          {strategie === 'Travaux lourds' && (
            <div className="filter-group">
              <label className="filter-label">Score travaux</label>
              <select value={scoreTravauxMin} onChange={e => setScoreTravauxMin(e.target.value)}>
                <option value="">Tous</option>
                <option value="1">1 - Rafra{'\u00EE'}chissement</option>
                <option value="2">2 - L{'\u00E9'}gers</option>
                <option value="3">3 - Moyens</option>
                <option value="4">4 - Lourds</option>
                <option value="5">5 - R{'\u00E9'}habilitation</option>
              </select>
            </div>
          )}
          <div className="filter-sep" />
          <div className="filter-group">
            <label className="filter-label">Trier par</label>
            <select value={tri} onChange={e => setTri(e.target.value)}>
              {TRIS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="view-toggle">
            <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>Grille</button>
            <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Liste</button>
          </div>
        </div>

        {!strategie ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ marginBottom: '16px', opacity: 0.6 }}>
              <rect x="8" y="12" width="48" height="40" rx="6" stroke="#9a8a80" strokeWidth="2.5" fill="none"/>
              <path d="M8 24h48M24 24v28M40 24v28" stroke="#9a8a80" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="32" cy="18" r="3" fill="#c0392b"/>
            </svg>
            <h3>Choisissez une stratégie pour commencer</h3>
            <p style={{ marginBottom: '24px' }}>Sélectionnez une stratégie MDB dans le filtre ci-dessus pour afficher les biens correspondants.</p>
            <button onClick={() => { const sel = document.querySelector('.filter-bar select') as HTMLSelectElement; if (sel) sel.focus() }} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'opacity 150ms ease' }}>Commencer</button>
          </div>
        ) : (
          <>
            <div className="results-bar">
              <p className="results-count">
                <strong>{filtered.length}</strong> bien{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''} sur <strong>{totalBiens.toLocaleString('fr-FR')}</strong>
                {strategie && <> - {strategie}</>}
                {metropole !== 'Toutes' && <> - {metropole}</>}
                {ville !== 'Toutes' && <> - {ville}</>}
                {typeBien !== 'Tous' && <> - {typeBien}</>}
              </p>
            </div>

            {error && (
              <div style={{ background: '#fdedec', border: '1px solid #e74c3c', borderRadius: '12px', padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="#e74c3c"/><path d="M10 5v6M10 13.5v1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <span style={{ color: '#c0392b', fontSize: '14px', fontWeight: 500, flex: 1 }}>{error}</span>
                <button onClick={() => { setError(null); setLoading(true); fetch(buildApiUrl(1)).then(r => r.json()).then(d => { setAllBiens(d.biens || []); setTotalBiens(d.total || 0); setHasMore(d.hasMore || false); setLoading(false) }).catch(() => { setError('Impossible de charger les biens. Veuillez réessayer.'); setLoading(false) }) }} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Réessayer</button>
              </div>
            )}

            {loading ? (
              <div className="grid">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-img" />
                    <div style={{ padding: '16px' }}>
                      <div className="skeleton-line" style={{ width: '60%', height: '16px', marginBottom: '12px' }} />
                      <div className="skeleton-line" style={{ width: '40%', height: '12px', marginBottom: '8px' }} />
                      <div className="skeleton-line" style={{ width: '80%', height: '12px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : view === 'grid' ? (
              <div className="grid">
                {filtered.map(bien => (
                  <BienCard
                    key={bien.id}
                    bien={bien}
                    inWatchlist={watchlistIds.has(bien.id)}
                    userToken={userToken}
                    onWatchlistChange={(bienId, added) => {
                      setWatchlistIds(prev => {
                        const next = new Set(prev)
                        added ? next.add(bienId) : next.delete(bienId)
                        return next
                      })
                    }}
                  />
                ))}
              </div>
            ) : (
              <>
                {userId && <p className="edit-hint">Les champs NC sont editables — vos modifications enrichissent la base de donnees.</p>}
                {!userId && <p className="edit-hint">Connectez-vous pour enrichir les donnees manquantes.</p>}
                <div className="list-wrap" ref={tableWrapRef} onScroll={() => syncScroll('table')}><table className="list-table">
                  <thead>
                    <tr>
                      <th className="sticky-col-head" style={{ left: 0, width: '40px', minWidth: '40px' }}><span></span></th>
                      <th className="sticky-col-head" style={{ left: '40px', width: '80px', minWidth: '80px' }}><span></span></th>
                      <th className="sticky-col-head" style={{ left: '120px', minWidth: '220px', borderRight: '2px solid #ede8e0' }}>Bien<span></span></th>
                      <th>Commune<span></span></th>
                      <th>Métropole<span></span></th>
                      <th>Prix FAI<span></span></th>
                      {strategie !== 'Travaux lourds' && <th>Prix cible<span></span></th>}
                      {strategie !== 'Travaux lourds' && <th>Écart<span></span></th>}
                      <th>Prix/m2<span></span></th>
                      {strategie === 'Travaux lourds' ? (
                        <>
                          <th>Score travaux<span></span></th>
                          <th>{"Estimation travaux"}<span></span></th>
                          <th>DPE<span></span></th>
                          <th>Année<span></span></th>
                          <th>+/- Value<span></span></th>
                        </>
                      ) : (
                        <>
                          <th>Loyer<span>/mois</span></th>
                          <th>Type loyer<span></span></th>
                          <th>Charges récup.<span>/mois</span></th>
                          <th>Charges copro<span>/mois</span></th>
                          <th>Taxe foncière<span>/an</span></th>
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
                    {filtered.map(bien => (
                      <tr key={bien.id}>
                        <td className="sticky-col" style={{ left: 0, width: '40px', minWidth: '40px' }}>
                          <button
                            className="td-heart"
                            onClick={async () => {
                              if (!userToken) { window.location.href = '/login'; return }
                              const isIn = watchlistIds.has(bien.id)
                              const method = isIn ? 'DELETE' : 'POST'
                              const res = await fetch('/api/watchlist', {
                                method,
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
                                body: JSON.stringify({ bien_id: bien.id })
                              })
                              if (res.ok) {
                                setWatchlistIds(prev => {
                                  const next = new Set(prev)
                                  isIn ? next.delete(bien.id) : next.add(bien.id)
                                  return next
                                })
                              }
                            }}
                            style={{ color: watchlistIds.has(bien.id) ? '#c0392b' : '#c0b0a0' }}
                            title={watchlistIds.has(bien.id) ? 'Retirer' : 'Ajouter a la watchlist'}>
                            {watchlistIds.has(bien.id) ? '♥' : '♡'}
                          </button>
                        </td>
                        <td className="sticky-col" style={{ left: '40px', width: '80px', minWidth: '80px' }}>{bien.photo_url ? <img src={bien.photo_url} alt="" className="list-thumb" /> : <div className="list-thumb-empty">-</div>}</td>
                        <td className="sticky-col" style={{ left: '120px', minWidth: '220px', borderRight: '2px solid #f0ede8' }}>
                          <span className="td-bien-title">{bien.type_bien} {bien.nb_pieces} - {bien.surface} m2</span>
                          {bien.quartier && <span className="td-bien-quartier">{bien.quartier}</span>}
                        </td>
                        <td style={{ fontWeight: 500, minWidth: '180px' }}>{bien.ville}{(bien as any).code_postal ? ` - ${(bien as any).code_postal}` : ''}</td>
                        <td><MetroBadge metropole={bien.metropole} /></td>
                        {(() => {
                          const peutCalculer = bien.loyer && bien.prix_fai
                          const resultat = peutCalculer ? calculerCashflow(
                            { prix_fai: bien.prix_fai, loyer: bien.loyer, type_loyer: bien.type_loyer, charges_rec: bien.charges_rec || 0, charges_copro: bien.charges_copro || 0, taxe_fonc_ann: bien.taxe_fonc_ann || 0, surface: bien.surface },
                            { apport: 20000, tauxCredit: 3.5, tauxAssurance: 0.3, dureeAns: 20, fraisNotaire: 7.5, objectifCashflow: 0 },
                            { tmi: 30, regime: 'nu_micro_foncier' }
                          ) : null
                          const ecartPct = resultat ? ((resultat.prix_cible - bien.prix_fai) / bien.prix_fai * 100) : null
                          const isLocataire = strategie !== 'Travaux lourds'
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
                            <td style={{ color: '#9a8a80' }}>{bien.prix_m2 ? `${bien.prix_m2.toLocaleString('fr-FR')} \u20AC` : '-'}</td>
                            {!isLocataire ? (
                              <>
                                <td>
                                  {(bien as any).score_travaux ? (
                                    <span style={{ fontSize: '12px', fontWeight: 600, background: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '6px' }}>
                                      {(bien as any).score_travaux}/5
                                    </span>
                                  ) : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>}
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {(bien as any).score_travaux && bien.surface ? (
                                    (() => {
                                      const budget = budgetTravauxM2[String((bien as any).score_travaux)] || 0
                                      const total = Math.round(budget * bien.surface)
                                      return <span style={{ fontWeight: 500 }}>{total.toLocaleString('fr-FR')} {'\u20AC'}</span>
                                    })()
                                  ) : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>-</span>}
                                </td>
                                <td>
                                  {(bien as any).dpe ? (
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: '28px', height: '28px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', color: '#fff',
                                      background: ({ A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0e034', E: '#f0a830', F: '#eb6a2a', G: '#e42a1e' } as any)[(bien as any).dpe] || '#9a8a80'
                                    }}>{(bien as any).dpe}</span>
                                  ) : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>}
                                </td>
                                <td style={{ color: '#9a8a80' }}>{(bien as any).annee_construction || <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>NC</span>}</td>
                                <td><PlusValueBadge prixFai={bien.prix_fai} estimationPrix={(bien as any).estimation_prix_total} scoreTravaux={(bien as any).score_travaux} surface={bien.surface} size="sm" /></td>
                              </>
                            ) : (
                              <>
                                <td><CellEditable bien={bien} champ="loyer" suffix={` \u20AC`} /></td>
                                <td><CellTypeLoyer bien={bien} /></td>
                                <td><CellEditable bien={bien} champ="charges_rec" suffix={` \u20AC`} /></td>
                                <td><CellEditable bien={bien} champ="charges_copro" suffix={` \u20AC`} /></td>
                                <td><CellEditable bien={bien} champ="taxe_fonc_ann" suffix={` \u20AC`} /></td>
                                <td><RendementBadge rendement={bien.rendement_brut} size="sm" /></td>
                                <td><PlusValueBadge prixFai={bien.prix_fai} estimationPrix={(bien as any).estimation_prix_total} scoreTravaux={(bien as any).score_travaux} surface={bien.surface} size="sm" /></td>
                                <td style={{ fontWeight: 600, fontSize: '13px', color: resultat && resultat.cashflow_brut >= 0 ? '#1a7a40' : '#c0392b' }}>
                                  {resultat ? `${resultat.cashflow_brut >= 0 ? '+' : ''}${Math.round(resultat.cashflow_brut).toLocaleString('fr-FR')} \u20AC` : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>-</span>}
                                </td>
                                <td style={{ color: '#9a8a80', fontSize: '12px' }}>{bien.profil_locataire || '-'}</td>
                              </>
                            )}
                          </>
                        })()}
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <a href={`/biens/${bien.id}`} className="td-btn">Analyse</a>
                          {' '}
                          <a href={`/biens/${bien.id}#contact`} className="td-btn-contact">Récupérer les données</a>
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
            {hasMore && (
              <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                {loadingMore && <div className="spinner" />}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}