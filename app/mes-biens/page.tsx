'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import BienCard from '@/components/BienCard'
import EnchereCard from '@/components/EnchereCard'
import MetroBadge from '@/components/MetroBadge'
import RendementBadge from '@/components/RendementBadge'
import PlusValueBadge from '@/components/PlusValueBadge'
import { calculerCashflow } from '@/lib/calculs'
import AddressAutocomplete from '@/components/ui/AddressAutocomplete'
import TypeBienIllustration from '@/components/TypeBienIllustration'

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
  { value: 'archive',          label: 'Archiv\u00E9',           color: '#95a5a6', bg: '#f0f0f0' },
]

const SUIVI_OPTIONS_ENCHERE = [
  { value: 'a_analyser',          label: '\u00C0 analyser',            color: '#7a6a60', bg: '#f0ede8' },
  { value: 'info_demandee',       label: 'Info demand\u00E9e',         color: '#3498db', bg: '#ebf5fb' },
  { value: 'visite_programmee',   label: 'Visite programm\u00E9e',     color: '#8e44ad', bg: '#f4ecf7' },
  { value: 'visite_effectuee',    label: 'Visite effectu\u00E9e',      color: '#6c3483', bg: '#e8daef' },
  { value: 'enchere_programmee',  label: 'Ench\u00E8re programm\u00E9e', color: '#e67e22', bg: '#fdebd0' },
  { value: 'enchere_effectuee',   label: 'Ench\u00E8re effectu\u00E9e', color: '#d35400', bg: '#fae5d3' },
  { value: 'enchere_gagnee',      label: 'Ench\u00E8re gagn\u00E9e',   color: '#1e8449', bg: '#d5f5e3' },
  { value: 'enchere_perdue',      label: 'Ench\u00E8re perdue',        color: '#e74c3c', bg: '#fdedec' },
  { value: 'archive',             label: 'Archiv\u00E9',               color: '#95a5a6', bg: '#f0f0f0' },
]

function getSuiviOptions(strategie?: string) {
  return strategie === 'Ench\u00E8res' ? SUIVI_OPTIONS_ENCHERE : SUIVI_OPTIONS
}

export default function MesBiensPage() {
  const [biens, setBiens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState('')
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<string>('free')
  const [suiviMap, setSuiviMap] = useState<Record<string, string>>({})
  const [commentaireMap, setCommentaireMap] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [budgetTravauxM2, setBudgetTravauxM2] = useState<Record<string, number>>({ '1': 200, '2': 500, '3': 800, '4': 1200, '5': 1800 })
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [addStep, setAddStep] = useState(1)
  const [addForm, setAddForm] = useState<Record<string, any>>({})
  const [hasLocatif, setHasLocatif] = useState(false)
  const [etageFocus, setEtageFocus] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
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
        setWatchlistIds(new Set(items.map((w: any) => String(w.bien_id))))
        const suiviInit: Record<string, string> = {}
        const commentaireInit: Record<string, string> = {}
        items.forEach((w: any) => {
          suiviInit[String(w.bien_id)] = w.suivi || 'a_analyser'
          commentaireInit[String(w.bien_id)] = w.commentaire || ''
        })
        setSuiviMap(suiviInit)
        setCommentaireMap(commentaireInit)

        if (items.length === 0) { setLoading(false); return }

        // Séparer les IDs par source_table
        const biensIds = items.filter((w: any) => w.source_table !== 'encheres').map((w: any) => w.bien_id)
        const encheresIds = items.filter((w: any) => w.source_table === 'encheres').map((w: any) => w.bien_id)

        // Charger biens classiques + enchères en parallèle
        const authHeaders = { headers: { Authorization: `Bearer ${session.access_token}` } }
        const [biensRes, encheresRes] = await Promise.all([
          biensIds.length > 0 ? fetch('/api/biens?ids=' + biensIds.join(','), authHeaders) : Promise.resolve(null),
          encheresIds.length > 0 ? fetch('/api/encheres?ids=' + encheresIds.join(','), authHeaders) : Promise.resolve(null)
        ])
        const biensData = biensRes && biensRes.ok ? await biensRes.json() : { biens: [] }
        const encheresData = encheresRes && encheresRes.ok ? await encheresRes.json() : { encheres: [] }

        // Fallback sur snapshot pour les annonces disparues
        const liveBiensMap = new Map((biensData.biens || []).map((b: any) => [String(b.id), b]))
        const liveEncheresMap = new Map((encheresData.encheres || []).map((e: any) => [String(e.id), e]))
        const allBiensItems = items
          .filter((w: any) => w.source_table !== 'encheres')
          .map((w: any) => liveBiensMap.get(String(w.bien_id)) || (w.snapshot_data ? { ...w.snapshot_data, _fromSnapshot: true } : null))
          .filter(Boolean)
        const allEncheresItems = items
          .filter((w: any) => w.source_table === 'encheres')
          .map((w: any) => {
            const live = liveEncheresMap.get(String(w.bien_id))
            if (live) return { ...(live as any), strategie_mdb: 'Ench\u00E8res' }
            if (w.snapshot_data) return { ...w.snapshot_data, strategie_mdb: 'Ench\u00E8res', _fromSnapshot: true }
            return null
          })
          .filter(Boolean)
        const allBiens = [...allBiensItems, ...allEncheresItems]
        setBiens(allBiens)

        const strategies = [...new Set(allBiens.map((x: any) => x.strategie_mdb).filter(Boolean))]
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
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
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

  const effectiveView = isMobile ? 'grid' : view
  const activeBiens = biens.filter(b => suiviMap[b.id] !== 'archive')
  const archivedBiens = biens.filter(b => suiviMap[b.id] === 'archive')
  const displayBiens = showArchived ? archivedBiens : activeBiens
  const watchlistLimit = plan === 'expert' ? Infinity : plan === 'pro' ? 50 : 10
  const isAtLimit = activeBiens.length >= watchlistLimit
  const isExpert = plan === 'expert'
  const strategies = [...new Set(displayBiens.map(b => b.strategie_mdb).filter(Boolean))] as string[]
  const filteredBiens = activeTab && !showArchived ? displayBiens.filter(b => b.strategie_mdb === activeTab) : displayBiens

  async function handleSuiviChange(bienId: string, newSuivi: string) {
    setSuiviMap(prev => ({ ...prev, [bienId]: newSuivi }))
    await fetch('/api/watchlist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ bien_id: bienId, suivi: newSuivi })
    })
  }

  async function handleArchive(bienId: string) {
    if (!userToken) return
    setSuiviMap(prev => ({ ...prev, [bienId]: 'archive' }))
    await fetch('/api/watchlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ bien_id: bienId })
    })
  }

  async function handleRestore(bienId: string) {
    if (!userToken) return
    setSuiviMap(prev => ({ ...prev, [bienId]: 'a_analyser' }))
    await fetch('/api/watchlist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ bien_id: bienId, suivi: 'a_analyser' })
    })
  }

  function handleRemove(bienId: string) {
    handleArchive(bienId)
  }

  async function handleCommentaireBlur(bien: any, value: string) {
    if (!userToken) return
    setCommentaireMap(prev => ({ ...prev, [String(bien.id)]: value }))
    const sourceTable = bien.strategie_mdb === 'Ench\u00E8res' ? 'encheres' : 'biens'
    await fetch('/api/watchlist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ bien_id: bien.id, source_table: sourceTable, commentaire: value }),
    })
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

  function SuiviSelect({ bienId, strategie }: { bienId: string, strategie?: string }) {
    const opts = getSuiviOptions(strategie)
    const opt = opts.find(o => o.value === (suiviMap[bienId] || 'a_analyser')) || opts[0]
    return (
      <select className="suivi-select" value={suiviMap[bienId] || 'a_analyser'} onChange={e => handleSuiviChange(bienId, e.target.value)} style={{ color: opt.color, background: opt.bg }}>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }

  function openAddModal() {
    setAddError(''); setAddStep(1); setAddForm({ type_bien: 'Appartement' }); setHasLocatif(false); setShowAddModal(true)
  }

  function updateAddForm(fields: Record<string, any>) {
    setAddForm(prev => ({ ...prev, ...fields }))
  }

  function validateStep1(): boolean {
    const { type_bien, ville, code_postal, surface, prix_fai } = addForm
    if (!type_bien) { setAddError('Type de bien requis'); return false }
    if (!ville?.trim()) { setAddError('Ville requise'); return false }
    if (!code_postal || !/^\d{5}$/.test(code_postal)) { setAddError('Code postal invalide (5 chiffres)'); return false }
    if (!surface || Number(surface) <= 0) { setAddError('Surface requise'); return false }
    if (!prix_fai || Number(prix_fai) <= 0) { setAddError('Prix FAI requis'); return false }
    setAddError(''); return true
  }

  async function submitAddBien() {
    if (!userToken) return
    setAddLoading(true)
    setAddError('')
    try {
      const res = await fetch('/api/biens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgrade) setAddError(`Limite watchlist atteinte (${data.limit} biens). Passez au plan sup\u00E9rieur.`)
        else setAddError(data.error || 'Erreur lors de la cr\u00E9ation')
        setAddLoading(false)
        return
      }
      const wRes = await fetch('/api/watchlist', { headers: { Authorization: `Bearer ${userToken}` } })
      const wData = await wRes.json()
      const items = wData.watchlist || []
      setWatchlistIds(new Set(items.map((w: any) => w.bien_id)))
      const suiviInit: Record<string, string> = {}
      items.forEach((w: any) => { suiviInit[w.bien_id] = w.suivi || 'a_analyser' })
      setSuiviMap(suiviInit)
      if (items.length > 0) {
        const biensIds2 = items.filter((w: any) => w.source_table !== 'encheres').map((w: any) => w.bien_id)
        const encheresIds2 = items.filter((w: any) => w.source_table === 'encheres').map((w: any) => w.bien_id)
        const authHeaders2 = { headers: { Authorization: `Bearer ${userToken}` } }
        const [biensRes2, encheresRes2] = await Promise.all([
          biensIds2.length > 0 ? fetch('/api/biens?ids=' + biensIds2.join(','), authHeaders2) : Promise.resolve(null),
          encheresIds2.length > 0 ? fetch('/api/encheres?ids=' + encheresIds2.join(','), authHeaders2) : Promise.resolve(null),
        ])
        const biensData2 = biensRes2 && biensRes2.ok ? await biensRes2.json() : { biens: [] }
        const encheresData2 = encheresRes2 && encheresRes2.ok ? await encheresRes2.json() : { encheres: [] }
        const encheresAvecStrategie2 = (encheresData2.encheres || []).map((e: any) => ({ ...e, strategie_mdb: 'Enchères' }))
        const allBiens2 = [...(biensData2.biens || []), ...encheresAvecStrategie2]
        setBiens(allBiens2)
        const strats = [...new Set(allBiens2.map((x: any) => x.strategie_mdb).filter(Boolean))]
        if (strats.length > 0 && !strats.includes(activeTab)) setActiveTab(strats[0] as string)
      }
      setShowAddModal(false)
    } catch {
      setAddError('Erreur r\u00E9seau')
    } finally {
      setAddLoading(false)
    }
  }

  const STEP_TITLES = ['', 'Caract\u00E9ristiques du bien', 'Donn\u00E9es locatives', 'Travaux']
  const SCORE_LABELS: Record<number, string> = { 1: '\u00C9tat correct', 2: 'Rafra\u00EEchissement', 3: 'Travaux moyens', 4: 'Travaux lourds', 5: 'Tr\u00E8s lourds / ruine' }

  function AddBienModal() {
    if (!showAddModal) return null

    const _ls: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' }
    const _lt: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#7a6a60', letterSpacing: '0.04em' }
    const _in: React.CSSProperties = { padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e8e2d8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', background: '#faf8f5', outline: 'none', width: '100%', boxSizing: 'border-box' }
    const _btnPrimary: React.CSSProperties = { padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#c0392b', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }
    const _btnSecondary: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #e8e2d8', background: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: '#7a6a60' }

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAddModal(false)}>
        <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '560px', width: '92%', maxHeight: '88vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>

          {/* Header + progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 700, color: '#1a1210', margin: 0 }}>Ajouter un bien</h2>
            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7a6a60', lineHeight: 1 }}>{'\u00D7'}</button>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: s <= addStep ? '#c0392b' : '#e8e2d8', transition: 'background 200ms ease' }} />
            ))}
          </div>
          <p style={{ fontSize: '13px', color: '#7a6a60', marginBottom: '20px', fontWeight: 500 }}>
            {`\u00C9tape ${addStep}/3 \u2014 ${STEP_TITLES[addStep]}`}
          </p>

          {addError && <div style={{ background: '#fdedec', color: '#e74c3c', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>{addError}</div>}

          {/* ÉTAPE 1 — Caractéristiques + Adresse */}
          {addStep === 1 && (
            <div>
              <p style={{ fontSize: '12px', color: '#b0a898', marginBottom: '16px' }}>Les champs marqu{'\u00E9'}s * sont obligatoires</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={_ls}>
                  <span style={_lt}>Type de bien *</span>
                  <select value={addForm.type_bien || 'Appartement'} onChange={e => updateAddForm({ type_bien: e.target.value })} style={_in}>
                    <option value="Appartement">Appartement</option>
                    <option value="Maison">Maison</option>
                    <option value="Immeuble">Immeuble</option>
                    <option value="Local commercial">Local commercial</option>
                    <option value="Terrain">Terrain</option>
                    <option value="Parking">Parking</option>
                    <option value="Autre">Autre</option>
                  </select>
                </label>
                <label style={_ls}>
                  <span style={_lt}>{"Pi\u00E8ces"}</span>
                  <select value={addForm.nb_pieces || ''} onChange={e => updateAddForm({ nb_pieces: e.target.value })} style={_in}>
                    <option value="">-</option>
                    {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10+'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
                <label style={_ls}>
                  <span style={_lt}>{"Surface (m\u00B2) *"}</span>
                  <input type="number" value={addForm.surface || ''} onChange={e => updateAddForm({ surface: e.target.value })} min="1" step="0.1" placeholder="45" style={_in} />
                </label>
                <label style={_ls}>
                  <span style={_lt}>Prix FAI ({'\u20AC'}) *</span>
                  <input type="number" value={addForm.prix_fai || ''} onChange={e => updateAddForm({ prix_fai: e.target.value })} min="1" step="1" placeholder="150 000" style={_in} />
                </label>
                <div style={{ ..._ls, position: 'relative' }}>
                  <span style={_lt}>{"\u00C9tage"}</span>
                  <input
                    value={addForm.etage || ''}
                    onChange={e => updateAddForm({ etage: e.target.value })}
                    onFocus={() => setEtageFocus(true)}
                    onBlur={() => setTimeout(() => setEtageFocus(false), 150)}
                    placeholder="RDC, 1er, 5e..."
                    autoComplete="off"
                    style={_in}
                  />
                  {etageFocus && (() => {
                    const ALL_ETAGES = ['RDC', ...Array.from({ length: 30 }, (_, i) => i === 0 ? '1er' : `${i + 1}e`), 'Dernier']
                    const q = (addForm.etage || '').toLowerCase()
                    const filtered = q ? ALL_ETAGES.filter(e => e.toLowerCase().includes(q)) : ALL_ETAGES
                    if (filtered.length === 0 || (filtered.length === 1 && filtered[0] === addForm.etage)) return null
                    return (
                      <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', borderRadius: '8px', border: '1px solid #e8e2d8', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', listStyle: 'none', margin: '2px 0 0', padding: '4px 0', maxHeight: '160px', overflowY: 'auto' }}>
                        {filtered.map(v => (
                          <li key={v} onMouseDown={() => { updateAddForm({ etage: v }); setEtageFocus(false) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", color: '#1a1210' }} onMouseEnter={e => (e.currentTarget.style.background = '#f7f4f0')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>{v}</li>
                        ))}
                      </ul>
                    )
                  })()}
                </div>
                <label style={_ls}>
                  <span style={_lt}>DPE</span>
                  <select value={addForm.dpe || ''} onChange={e => updateAddForm({ dpe: e.target.value })} style={_in}>
                    <option value="">-</option>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
                <label style={_ls}>
                  <span style={_lt}>Chambres</span>
                  <input type="number" value={addForm.nb_chambres || ''} onChange={e => updateAddForm({ nb_chambres: e.target.value })} min="0" max="50" step="1" placeholder="2" style={_in} />
                </label>
                <label style={_ls}>
                  <span style={_lt}>Salles de bain</span>
                  <input type="number" value={addForm.nb_sdb || ''} onChange={e => updateAddForm({ nb_sdb: e.target.value })} min="0" max="20" step="1" placeholder="1" style={_in} />
                </label>
                <label style={_ls}>
                  <span style={_lt}>{"Ann\u00E9e construction"}</span>
                  <input type="number" value={addForm.annee_construction || ''} onChange={e => updateAddForm({ annee_construction: e.target.value })} min="1800" max="2030" placeholder="1985" style={_in} />
                </label>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f0ede8' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1210', marginBottom: '12px' }}>Adresse</p>
                <div style={{ marginBottom: '12px' }}>
                  <AddressAutocomplete
                    label="Rechercher une adresse"
                    value={addForm._adresseQuery || ''}
                    placeholder={"12 rue de la Paix, Paris"}
                    onChange={val => updateAddForm({ _adresseQuery: val })}
                    onSelect={addr => updateAddForm({
                      adresse: addr.adresse,
                      ville: addr.ville,
                      code_postal: addr.code_postal,
                      latitude: addr.latitude,
                      longitude: addr.longitude,
                      _adresseQuery: `${addr.adresse}, ${addr.code_postal} ${addr.ville}`,
                    })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ ..._ls, gridColumn: '1 / -1' }}>
                    <span style={_lt}>Adresse</span>
                    <input value={addForm.adresse || ''} onChange={e => updateAddForm({ adresse: e.target.value })} placeholder="12 rue de la Paix" style={_in} />
                  </label>
                  <label style={_ls}>
                    <span style={_lt}>Ville *</span>
                    <input value={addForm.ville || ''} onChange={e => updateAddForm({ ville: e.target.value })} placeholder="Lyon" style={_in} />
                  </label>
                  <label style={_ls}>
                    <span style={_lt}>Code postal *</span>
                    <input value={addForm.code_postal || ''} onChange={e => updateAddForm({ code_postal: e.target.value })} placeholder="69001" maxLength={5} style={_in} />
                  </label>
                </div>
              </div>

              <label style={{ ..._ls, marginTop: '12px' }}>
                <span style={_lt}>URL de l'annonce</span>
                <input type="url" value={addForm.url || ''} onChange={e => updateAddForm({ url: e.target.value })} placeholder="https://www.leboncoin.fr/..." style={_in} />
              </label>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={_btnSecondary}>Annuler</button>
                <button type="button" onClick={() => { if (validateStep1()) setAddStep(2) }} style={_btnPrimary}>{"Suivant \u2192"}</button>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 — Données locatives */}
          {addStep === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '14px 16px', background: '#faf8f5', borderRadius: '10px', border: '1.5px solid #e8e2d8' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1210' }}>Le bien est-il lou{'\u00E9'} ?</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  <button type="button" onClick={() => setHasLocatif(false)} style={{ padding: '6px 16px', borderRadius: '6px', border: '1.5px solid #e8e2d8', background: !hasLocatif ? '#1a1210' : '#fff', color: !hasLocatif ? '#fff' : '#7a6a60', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Non</button>
                  <button type="button" onClick={() => setHasLocatif(true)} style={{ padding: '6px 16px', borderRadius: '6px', border: '1.5px solid #e8e2d8', background: hasLocatif ? '#1a1210' : '#fff', color: hasLocatif ? '#fff' : '#7a6a60', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Oui</button>
                </div>
              </div>

              {hasLocatif ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={_ls}>
                    <span style={_lt}>Loyer ({'\u20AC'}/mois) *</span>
                    <input type="number" value={addForm.loyer || ''} onChange={e => updateAddForm({ loyer: e.target.value })} min="1" step="1" placeholder="650" style={_in} />
                  </label>
                  <label style={_ls}>
                    <span style={_lt}>Type de loyer</span>
                    <select value={addForm.type_loyer || 'HC'} onChange={e => updateAddForm({ type_loyer: e.target.value })} style={_in}>
                      <option value="HC">Hors charges (HC)</option>
                      <option value="CC">Charges comprises (CC)</option>
                    </select>
                  </label>
                  <label style={_ls}>
                    <span style={_lt}>{"Charges r\u00E9cup\u00E9rables (\u20AC/mois)"}</span>
                    <input type="number" value={addForm.charges_rec || ''} onChange={e => updateAddForm({ charges_rec: e.target.value })} min="0" step="1" placeholder="50" style={_in} />
                  </label>
                  <label style={_ls}>
                    <span style={_lt}>{"Charges copro (\u20AC/mois)"}</span>
                    <input type="number" value={addForm.charges_copro || ''} onChange={e => updateAddForm({ charges_copro: e.target.value })} min="0" step="1" placeholder="120" style={_in} />
                  </label>
                  <label style={_ls}>
                    <span style={_lt}>{"Taxe fonci\u00E8re (\u20AC/an)"}</span>
                    <input type="number" value={addForm.taxe_fonc_ann || ''} onChange={e => updateAddForm({ taxe_fonc_ann: e.target.value })} min="0" step="1" placeholder="800" style={_in} />
                  </label>
                  <label style={_ls}>
                    <span style={_lt}>Fin de bail</span>
                    <input type="date" value={addForm.fin_bail || ''} onChange={e => updateAddForm({ fin_bail: e.target.value })} style={_in} />
                  </label>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#b0a898' }}>
                  <p style={{ fontSize: '14px' }}>Pas de donn{'\u00E9'}es locatives {'\u00E0'} renseigner.</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>Vous pourrez les ajouter plus tard depuis la fiche du bien.</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => { setAddError(''); setAddStep(1) }} style={_btnSecondary}>{"\u2190 Retour"}</button>
                <button type="button" onClick={() => { setAddError(''); setAddStep(3) }} style={_btnPrimary}>{"Suivant \u2192"}</button>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — Travaux */}
          {addStep === 3 && (
            <div>
              <p style={{ fontSize: '13px', color: '#7a6a60', marginBottom: '20px' }}>
                {"Estimez l'\u00E9tat du bien pour calibrer le budget travaux."}
              </p>

              <div style={{ marginBottom: '20px' }}>
                <span style={_lt}>{"Score travaux"}</span>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  {[1, 2, 3, 4, 5].map(s => {
                    const selected = Number(addForm.score_travaux) === s
                    const colors = ['#27ae60', '#f0e034', '#f0a830', '#eb6a2a', '#e42a1e']
                    return (
                      <button key={s} type="button" onClick={() => updateAddForm({ score_travaux: s })} style={{
                        flex: 1, padding: '10px 4px', borderRadius: '8px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'center',
                        border: selected ? `2px solid ${colors[s - 1]}` : '1.5px solid #e8e2d8',
                        background: selected ? `${colors[s - 1]}15` : '#faf8f5',
                        transition: 'all 150ms ease',
                      }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: selected ? colors[s - 1] : '#b0a898' }}>{s}</div>
                        <div style={{ fontSize: '10px', color: selected ? colors[s - 1] : '#b0a898', marginTop: '2px', lineHeight: 1.2 }}>{SCORE_LABELS[s]}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <label style={_ls}>
                <span style={_lt}>Commentaire sur les travaux</span>
                <textarea value={addForm.score_commentaire || ''} onChange={e => updateAddForm({ score_commentaire: e.target.value })} placeholder={"Toiture \u00E0 refaire, fen\u00EAtres simple vitrage, cuisine \u00E0 r\u00E9nover..."} maxLength={500} rows={3} style={{ ..._in, resize: 'vertical', minHeight: '72px' }} />
                <span style={{ fontSize: '11px', color: '#b0a898', textAlign: 'right' }}>{(addForm.score_commentaire || '').length}/500</span>
              </label>

              {/* Récap */}
              <div style={{ marginTop: '20px', padding: '14px 16px', background: '#faf8f5', borderRadius: '10px', border: '1px solid #e8e2d8' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{"R\u00E9capitulatif"}</p>
                <div style={{ fontSize: '13px', color: '#1a1210', lineHeight: 1.8 }}>
                  <span style={{ fontWeight: 600 }}>{addForm.type_bien || 'Appartement'}</span>
                  {addForm.nb_pieces ? ` ${addForm.nb_pieces}` : ''}
                  {addForm.surface ? ` \u2014 ${addForm.surface} m\u00B2` : ''}
                  <br />
                  {addForm.adresse ? `${addForm.adresse}, ` : ''}{addForm.ville} {addForm.code_postal}
                  <br />
                  <span style={{ fontWeight: 600 }}>{addForm.prix_fai ? `${Number(addForm.prix_fai).toLocaleString('fr-FR')} \u20AC` : ''}</span>
                  {hasLocatif && addForm.loyer ? ` \u2014 Loyer ${Number(addForm.loyer).toLocaleString('fr-FR')} \u20AC/mois` : ''}
                  {addForm.score_travaux ? ` \u2014 Travaux ${addForm.score_travaux}/5` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => { setAddError(''); setAddStep(2) }} style={_btnSecondary}>{"\u2190 Retour"}</button>
                <button type="button" disabled={addLoading} onClick={submitAddBien} style={{ ..._btnPrimary, opacity: addLoading ? 0.7 : 1, cursor: addLoading ? 'wait' : 'pointer' }}>
                  {addLoading ? 'Ajout en cours...' : 'Ajouter le bien'}
                </button>
              </div>
            </div>
          )}

        </div>
        </div>
      </div>
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
        .suivi-select { font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 6px; border: 1px solid #e8e2d8; cursor: pointer; outline: none; min-width: 155px; }
        .suivi-select:focus { border-color: #c0392b; box-shadow: 0 0 0 2px rgba(192,57,43,0.1); }
        .commentaire-area { width: 100%; box-sizing: border-box; margin-top: 8px; padding: 8px 12px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #7a6a60; background: transparent; resize: vertical; outline: none; line-height: 1.4; }
        .commentaire-area:focus { border-color: #c0392b; background: #faf8f5; }
        .commentaire-area::placeholder { color: #c0b0a0; font-style: italic; }
        .expired-badge { display: inline-block; padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; color: #95a5a6; background: #f0f0f0; border: 1px solid #d0ccc8; box-shadow: 0 1px 3px rgba(0,0,0,0.06); pointer-events: none; }
        @media (max-width: 768px) {
          .mes-biens-wrap { padding: 24px 16px; }
          .mes-biens-title { font-size: 24px; }
          .mes-biens-header { flex-direction: column; align-items: flex-start; }
          .grid { grid-template-columns: 1fr; gap: 16px; }
          .view-btn-list { display: none; }
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
                {isExpert ? `${activeBiens.length} biens` : `${activeBiens.length} / ${watchlistLimit}`}
              </span>
            </h1>
            <p className="mes-biens-sub">{activeBiens.length} bien{activeBiens.length > 1 ? 's' : ''} sauvegard{'\u00E9'}{activeBiens.length > 1 ? 's' : ''}{archivedBiens.length > 0 ? ` \u00B7 ${archivedBiens.length} archiv\u00E9${archivedBiens.length > 1 ? 's' : ''}` : ''}</p>
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
            <button
              onClick={openAddModal}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #c0392b', background: '#c0392b', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'opacity 150ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              + Ajouter un bien
            </button>
            {biens.length > 0 && isExpert && (
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
            {archivedBiens.length > 0 && (
              <button
                onClick={() => setShowArchived(prev => !prev)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e8e2d8', background: showArchived ? '#f0f0f0' : '#fff', fontSize: '12px', fontWeight: 600, color: showArchived ? '#95a5a6' : '#7a6a60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
              >
                {showArchived ? `\u2190 Retour` : `Archiv\u00E9s (${archivedBiens.length})`}
              </button>
            )}
            <div className="view-toggle" role="group" aria-label="Mode d'affichage">
              <button className={`view-btn ${effectiveView === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>Grille</button>
              <button className={`view-btn view-btn-list ${effectiveView === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>Liste</button>
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
              {showArchived ? (
                <><strong style={{ color: '#95a5a6' }}>{filteredBiens.length}</strong> bien{filteredBiens.length > 1 ? 's' : ''} archiv{'\u00E9'}{filteredBiens.length > 1 ? 's' : ''}</>
              ) : (
                <><strong style={{ color: '#1a1210' }}>{filteredBiens.length}</strong> bien{filteredBiens.length > 1 ? 's' : ''} {activeTab && `\u2014 ${activeTab}`}</>
              )}
            </p>

            {effectiveView === 'grid' ? (
              <div className="grid">
                {filteredBiens.map(bien => {
                  const opts = getSuiviOptions(bien.strategie_mdb); const opt = opts.find(o => o.value === (suiviMap[bien.id] || 'a_analyser')) || opts[0]
                  if (activeTab === 'Enchères') {
                    return showArchived ? (
                      <div key={bien.id} style={{ position: 'relative', opacity: 0.7 }}>
                        <EnchereCard enchere={bien as any} />
                        <button onClick={() => handleRestore(bien.id)} style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', padding: '10px', borderRadius: '8px', border: 'none', background: '#27ae60', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{"\u21A9 Restaurer"}</button>
                      </div>
                    ) : (
                      <EnchereCard key={bien.id} enchere={bien as any} inWatchlist={true} userToken={userToken} onWatchlistChange={(id, added) => { if (!added) handleRemove(String(id)) }} />
                    )
                  }
                  return showArchived ? (
                    <div key={bien.id} style={{ position: 'relative', opacity: 0.7 }}>
                      <BienCard bien={bien} inWatchlist={false} userToken={userToken} />
                      <button
                        onClick={() => handleRestore(bien.id)}
                        style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', padding: '10px', borderRadius: '8px', border: 'none', background: '#27ae60', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {"\u21A9 Restaurer dans ma watchlist"}
                      </button>
                    </div>
                  ) : (
                  <div key={bien.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                        display: 'inline-block', padding: '3px 8px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 700, letterSpacing: '0.01em',
                        color: opt.color, background: opt.bg,
                        border: `1px solid ${opt.color}33`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        pointerEvents: 'none',
                      }}>{opt.label}</span>
                      {bien._fromSnapshot && (
                        <span className="expired-badge" style={{ position: 'absolute', top: '36px', left: '10px', zIndex: 10 }}>
                          Annonce expir{'\u00E9'}e
                        </span>
                      )}
                      <BienCard
                        bien={bien}
                        inWatchlist={true}
                        userToken={userToken}
                        onWatchlistChange={(bienId, added) => { if (!added) handleRemove(bienId) }}
                        extraTitleRight={
                          <select className="suivi-select" value={suiviMap[bien.id] || 'a_analyser'} onChange={e => handleSuiviChange(bien.id, e.target.value)} style={{ color: opt.color, background: opt.bg, flexShrink: 0 }}>
                            {opts.map(o => o.value !== 'archive' && <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        }
                      />
                    </div>
                    <textarea
                      className="commentaire-area"
                      defaultValue={commentaireMap[String(bien.id)] || ''}
                      onBlur={e => handleCommentaireBlur(bien, e.target.value)}
                      placeholder="Ajouter un commentaire..."
                      rows={2}
                    />
                  </div>
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
                      {activeTab === 'Enchères' ? (
                        <>
                          <th>Sources<span></span></th>
                          <th>Tribunal<span></span></th>
                          <th>Date visite<span></span></th>
                          <th>Date audience<span></span></th>
                          <th>Statut<span></span></th>
                          <th>Mise à prix<span></span></th>
                          <th>Occupation<span></span></th>
                          <th>Date surench.<span></span></th>
                          <th>Prix adjugé<span></span></th>
                          <th>Avocat<span></span></th>
                        </>
                      ) : (
                        <>
                          <th className="col-optional">{"M\u00E9tropole"}<span></span></th>
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
                              <th className="col-optional">Type loyer<span></span></th>
                              <th className="col-optional">{"Charges r\u00E9cup."}<span>/mois</span></th>
                              <th>Charges copro<span>/mois</span></th>
                              <th>{"Taxe fonci\u00E8re"}<span>/an</span></th>
                              <th>Rendement brut<span></span></th>
                              <th>+/- Value<span></span></th>
                              <th>Cashflow brut<span>/mois</span></th>
                              <th>Locataire<span></span></th>
                            </>
                          )}
                        </>
                      )}
                      <th>Commentaire<span></span></th>
                      <th>Actions<span></span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBiens.map(bien => (
                      <tr key={bien.id}>
                        <td className="sticky-col" style={{ left: 0, width: '40px', minWidth: '40px' }}>
                          {showArchived ? (
                            <button className="td-heart" style={{ color: '#27ae60' }} onClick={() => handleRestore(bien.id)} title="Restaurer">{'\u21A9'}</button>
                          ) : (
                            <button className="td-heart" onClick={() => handleArchive(bien.id)}>{'\u2665'}</button>
                          )}
                        </td>
                        <td className="sticky-col" style={{ left: '40px', width: '130px', minWidth: '130px' }}>
                          <SuiviSelect bienId={bien.id} strategie={bien.strategie_mdb} />
                        </td>
                        <td className="sticky-col" style={{ left: '170px', width: '80px', minWidth: '80px' }}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            {bien.photo_url ? <Image src={bien.photo_url} alt="" width={80} height={60} className="list-thumb" style={{ objectFit: 'cover' }} /> : <div className="list-thumb-empty"><TypeBienIllustration type={bien.type_bien} size={36} /></div>}
                            {bien.url?.startsWith('manual://') && <span style={{ position: 'absolute', bottom: '2px', left: '2px', fontSize: '7px', fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '1px 4px', borderRadius: '3px', lineHeight: 1.3 }}>MON BIEN</span>}
                          </div>
                        </td>
                        <td className="sticky-col" style={{ left: '250px', minWidth: '220px', borderRight: '2px solid #f0ede8' }}>
                          <span className="td-bien-title">
                            {bien.type_bien || 'Bien'} {bien.nb_pieces}{bien.surface ? ` - ${bien.surface} m\u00B2` : ''}
                          </span>
                          {bien._fromSnapshot && <span className="expired-badge" style={{ marginTop: '2px' }}>Annonce expir{'\u00E9'}e</span>}
                          {bien.quartier && <span className="td-bien-quartier">{bien.quartier}</span>}
                        </td>
                        <td style={{ fontWeight: 500, minWidth: '180px' }}>{bien.ville}{bien.code_postal ? ` - ${bien.code_postal}` : ''}</td>
                        {activeTab === 'Enchères' ? (() => {
                          const e = bien as any
                          const statutLabels: Record<string, { label: string; bg: string; color: string }> = {
                            a_venir: { label: 'À venir', bg: '#e8f4fd', color: '#1a6aa0' },
                            surenchere: { label: 'Surenchère', bg: '#fff3e0', color: '#e65100' },
                            adjuge: { label: 'Adjugé', bg: '#d4f5e0', color: '#1a7a40' },
                            vendu: { label: 'Vendu', bg: '#d4f5e0', color: '#1a7a40' },
                            expire: { label: 'Expiré', bg: '#f0ede8', color: '#7a6a60' },
                          }
                          const s = statutLabels[e.statut] || { label: e.statut || '-', bg: '#f0ede8', color: '#7a6a60' }
                          const occupationLabels: Record<string, { label: string; color: string }> = {
                            libre: { label: 'Libre', color: '#1a7a40' },
                            occupe: { label: 'Occupé', color: '#8a5a00' },
                            loue: { label: 'Loué', color: '#2a4a8a' },
                          }
                          const occ = occupationLabels[e.occupation] || { label: e.occupation || '-', color: '#7a6a60' }
                          const dateAudience = e.date_audience ? new Date(e.date_audience).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'
                          const dateVisite = e.date_visite ? new Date(e.date_visite).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'
                          const dateSurenchere = e.date_surenchere ? new Date(e.date_surenchere).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'
                          const sourceLabels: Record<string, string> = { licitor: 'Licitor', avoventes: 'Avoventes', vench: 'Vench' }
                          const sourceBgColors: Record<string, string> = { licitor: '#e8f0fd', avoventes: '#fdf0e8', vench: '#f0fde8' }
                          const sourceTextColors: Record<string, string> = { licitor: '#1a4a9a', avoventes: '#9a4a1a', vench: '#1a7a40' }
                          const srcLabel = sourceLabels[e.source] || e.source || '-'
                          const srcBg = sourceBgColors[e.source] || '#f0ede8'
                          const srcColor = sourceTextColors[e.source] || '#7a6a60'
                          return <>
                            <td><span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '5px', background: srcBg, color: srcColor, whiteSpace: 'nowrap' }}>{srcLabel}</span></td>
                            <td style={{ fontSize: '12px', color: '#7a6a60', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.tribunal || '-'}</td>
                            <td style={{ whiteSpace: 'nowrap', fontSize: '13px', color: e.date_visite ? undefined : '#c0b0a0' }}>{dateVisite}</td>
                            <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>{dateAudience}</td>
                            <td><span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span></td>
                            <td className="td-prix">{e.mise_a_prix ? formatPrix(e.mise_a_prix) : '-'}</td>
                            <td><span style={{ fontSize: '12px', fontWeight: 500, color: occ.color }}>{occ.label}</span></td>
                            <td style={{ whiteSpace: 'nowrap', fontSize: '13px', color: e.date_surenchere ? undefined : '#c0b0a0' }}>{dateSurenchere}</td>
                            <td className="td-prix">{e.prix_adjuge ? formatPrix(e.prix_adjuge) : <span style={{ color: '#c0b0a0', fontStyle: 'italic' }}>-</span>}</td>
                            <td style={{ fontSize: '12px', color: '#7a6a60', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.avocat_nom || '-'}</td>
                          </>
                        })() : (
                        <>
                        <td className="col-optional"><MetroBadge metropole={bien.metropole} /></td>
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
                                <td className="col-optional"><CellTypeLoyer bien={bien} /></td>
                                <td className="col-optional"><CellEditable bien={bien} champ="charges_rec" suffix={` \u20AC`} /></td>
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
                        </>
                        )}
                        <td style={{ minWidth: '180px', maxWidth: '260px' }}>
                          <textarea
                            className="commentaire-area"
                            defaultValue={commentaireMap[String(bien.id)] || ''}
                            onBlur={e => handleCommentaireBlur(bien, e.target.value)}
                            placeholder="Ajouter un commentaire..."
                            rows={2}
                            style={{ marginTop: 0 }}
                          />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <a href={activeTab === 'Enchères' ? `/biens/${bien.id}?source=encheres` : `/biens/${bien.id}`} className="td-btn">{"Voir l\u2019analyse"}</a>
                          {activeTab !== 'Enchères' && <>{' '}<a href={`/biens/${bien.id}#contact`} className="td-btn-contact">{"R\u00E9cup\u00E9rer les donn\u00E9es"}</a></>}
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
        {AddBienModal()}
      </div>
    </Layout>
  )
}
