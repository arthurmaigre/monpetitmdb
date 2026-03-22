'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

const STRATEGIES = [
  { value: '', label: 'Toutes' },
  { value: 'Locataire en place', label: 'Locataire en place' },
  { value: 'Travaux lourds', label: 'Travaux lourds' },
  { value: 'Division', label: 'Division' },
  { value: 'Decoupe', label: 'D\u00e9coupe' },
]

interface DashStats {
  total: number
  locataire: number
  travaux: number
  division: number
  decoupe: number
  faux_positifs: number
  extraction_pending: number
  score_pending: number
}

const defaultStats: DashStats = {
  total: 0, locataire: 0, travaux: 0, division: 0, decoupe: 0,
  faux_positifs: 0, extraction_pending: 0, score_pending: 0,
}

function fmt(n: number | undefined | null) { return (n ?? 0).toLocaleString('fr-FR') }

function ProgressBar({ value, max, color = '#c0392b' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ background: '#f0ede8', borderRadius: 6, height: 10, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.3s' }} />
    </div>
  )
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: active ? '#1a7a40' : '#c0392b', marginRight: 6, verticalAlign: 'middle',
    }} />
  )
}

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #e8e2d8', borderTopColor: '#c0392b', borderRadius: '50%', animation: 'spin 0.6s linear infinite', verticalAlign: 'middle', marginRight: 8 }} />
  )
}

export default function AdminSourcingPage() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashStats>(defaultStats)

  // Ingestion state
  const [ingestStrategy, setIngestStrategy] = useState('')
  const [ingestSince, setIngestSince] = useState('2024-01-01')
  const [ingestUntil, setIngestUntil] = useState(new Date().toISOString().slice(0, 10))
  const [ingestRunning, setIngestRunning] = useState(false)
  const [ingestStats, setIngestStats] = useState({ new: 0, updated: 0, errors: 0, processed: 0, total: 0 })
  const [webhookActive, setWebhookActive] = useState(false)
  const ingestStopRef = useRef(false)

  // Regex state
  const [regexRunning, setRegexRunning] = useState(false)
  const [regexStrategy, setRegexStrategy] = useState('')
  const [regexStats, setRegexStats] = useState({ faux_positifs: 0, processed: 0, total: 0, last_run: '' })
  const [regexShowKeywords, setRegexShowKeywords] = useState(false)
  const regexStopRef = useRef(false)

  // Extraction state
  const [extractRunning, setExtractRunning] = useState(false)
  const [extractAuto, setExtractAuto] = useState(false)
  const [extractStats, setExtractStats] = useState({ processed: 0, total: 0, loyer_found: 0, profil_found: 0, errors: 0 })
  const extractStopRef = useRef(false)

  // Score travaux state
  const [scoreRunning, setScoreRunning] = useState(false)
  const [scoreWithPhotos, setScoreWithPhotos] = useState(false)
  const [scoreStats, setScoreStats] = useState({ processed: 0, total: 0, scored: 0, errors: 0 })
  const scoreStopRef = useRef(false)

  // Statut annonces state
  const [statutRunning, setStatutRunning] = useState(false)
  const [statutStats, setStatutStats] = useState({ expired: 0, checked: 0, last_check: '' })

  // Cron config state
  const [cronConfigs, setCronConfigs] = useState<Array<{ id: string; enabled: boolean; schedule: string; last_run: string | null; last_result: Record<string, unknown> | null; params: Record<string, unknown> }>>([])
  const [cronSaving, setCronSaving] = useState<string | null>(null)

  // Any batch running flag for auto-refresh
  const anyRunning = ingestRunning || regexRunning || extractRunning || scoreRunning || statutRunning

  // Auth check
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setToken(session.access_token)
      setLoading(false)
    }
    init()
  }, [])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return
    try {
      const res: Response = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch { /* ignore */ }
  }, [token])

  const fetchCronConfig = useCallback(async () => {
    if (!token) return
    try {
      const res: Response = await fetch('/api/admin/cron-config', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setCronConfigs(await res.json())
    } catch { /* ignore */ }
  }, [token])

  useEffect(() => {
    if (token) { fetchStats(); fetchCronConfig() }
  }, [token, fetchStats, fetchCronConfig])

  // Auto-refresh stats every 30s when a batch is running
  useEffect(() => {
    if (!anyRunning || !token) return
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [anyRunning, token, fetchStats])

  // ---------- Ingestion ----------
  async function startIngestion() {
    if (!token) return
    setIngestRunning(true)
    ingestStopRef.current = false
    setIngestStats({ new: 0, updated: 0, errors: 0, processed: 0, total: 0 })

    const since = new Date(ingestSince)
    const until = new Date(ingestUntil)
    let sliceStart = new Date(since)

    while (!ingestStopRef.current && sliceStart < until) {
      const sliceEnd = new Date(sliceStart)
      sliceEnd.setDate(sliceEnd.getDate() + 30)
      if (sliceEnd > until) sliceEnd.setTime(until.getTime())

      try {
        const res: Response = await fetch('/api/admin/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            strategie: ingestStrategy || undefined,
            dateAfter: sliceStart.toISOString().slice(0, 10),
            dateBefore: sliceEnd.toISOString().slice(0, 10),
          }),
        })
        const data = await res.json()
        setIngestStats(prev => ({
          new: prev.new + (data.new || 0),
          updated: prev.updated + (data.updated || 0),
          errors: prev.errors + (data.errors || 0),
          processed: prev.processed + (data.processed || 0),
          total: data.total || prev.total,
        }))
        if (data.webhook_active !== undefined) setWebhookActive(data.webhook_active)
      } catch {
        setIngestStats(prev => ({ ...prev, errors: prev.errors + 1 }))
      }

      sliceStart = new Date(sliceEnd)
      if (!ingestStopRef.current && sliceStart < until) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    setIngestRunning(false)
    fetchStats()
  }

  // ---------- Regex Validation ----------
  async function startRegex() {
    if (!token) return
    setRegexRunning(true)
    regexStopRef.current = false
    setRegexStats({ faux_positifs: 0, processed: 0, total: 0, last_run: '' })

    const strats = regexStrategy ? [regexStrategy] : ['Locataire en place', 'Travaux lourds', 'Division', 'Découpe']
    for (const strat of strats) {
      if (regexStopRef.current) break
      let cursor: string | null = null

      while (!regexStopRef.current) {
        try {
          const regexRes: Response = await fetch('/api/admin/regex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ strategie: strat, cursor }),
          })
          const data = await regexRes.json()
          setRegexStats(prev => ({
            faux_positifs: prev.faux_positifs + (data.faux_positifs || 0),
            processed: prev.processed + (data.processed || 0),
            total: data.total || prev.total,
            last_run: new Date().toLocaleString('fr-FR'),
          }))
          cursor = data.next_cursor || null
          if (!cursor) break
        } catch {
          break
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    setRegexRunning(false)
    fetchStats()
  }

  // ---------- Extraction IA ----------
  async function startExtraction() {
    if (!token) return
    setExtractRunning(true)
    extractStopRef.current = false
    setExtractStats({ processed: 0, total: 0, loyer_found: 0, profil_found: 0, errors: 0 })

    let cursor: string | null = null
    while (!extractStopRef.current) {
      try {
        const res: Response = await fetch('/api/admin/extraction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cursor }),
        })
        const data = await res.json()
        setExtractStats(prev => ({
          processed: prev.processed + (data.processed || 0),
          total: data.total || prev.total,
          loyer_found: prev.loyer_found + (data.loyer_found || 0),
          profil_found: prev.profil_found + (data.profil_found || 0),
          errors: prev.errors + (data.errors || 0),
        }))
        cursor = data.next_cursor || null
        if (!cursor || data.remaining === 0) break
      } catch {
        setExtractStats(prev => ({ ...prev, errors: prev.errors + 1 }))
        break
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    setExtractRunning(false)
    fetchStats()
  }

  // ---------- Score Travaux ----------
  async function startScore() {
    if (!token) return
    setScoreRunning(true)
    scoreStopRef.current = false
    setScoreStats({ processed: 0, total: 0, scored: 0, errors: 0 })

    let cursor: string | null = null
    while (!scoreStopRef.current) {
      try {
        const res: Response = await fetch('/api/admin/score-travaux', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cursor, withPhotos: scoreWithPhotos }),
        })
        const data = await res.json()
        setScoreStats(prev => ({
          processed: prev.processed + (data.processed || 0),
          total: data.total || prev.total,
          scored: prev.scored + (data.scored || 0),
          errors: prev.errors + (data.errors || 0),
        }))
        cursor = data.next_cursor || null
        if (!cursor || data.remaining === 0) break
      } catch {
        setScoreStats(prev => ({ ...prev, errors: prev.errors + 1 }))
        break
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    setScoreRunning(false)
    fetchStats()
  }

  // ---------- Statut Annonces ----------
  async function startStatut() {
    if (!token) return
    setStatutRunning(true)
    try {
      const res: Response = await fetch('/api/admin/statut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setStatutStats({
        expired: data.expired || 0,
        checked: data.checked || 0,
        last_check: new Date().toLocaleString('fr-FR'),
      })
    } catch { /* ignore */ }
    setStatutRunning(false)
    fetchStats()
  }

  async function updateCron(id: string, update: Record<string, unknown>) {
    if (!token) return
    setCronSaving(id)
    try {
      await fetch('/api/admin/cron-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, ...update }),
      })
      await fetchCronConfig()
    } catch { /* ignore */ }
    setCronSaving(null)
  }

  const CRON_LABELS: Record<string, string> = {
    ingest: 'Ingestion Moteur Immo',
    regex: 'Validation regex',
    extraction: 'Extraction donn\u00e9es locatives',
    score_travaux: 'Score travaux IA',
    statut: 'V\u00e9rification statut annonces',
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: 80, color: '#9a8a80' }}>Chargement...</div>
      </Layout>
    )
  }

  const extractCost = (extractStats.processed * 0.00025).toFixed(2)

  return (
    <Layout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .src-wrap { max-width: 1200px; margin: 48px auto; padding: 0 48px; }
        .src-back { display: inline-block; margin-bottom: 24px; font-size: 13px; color: #9a8a80; text-decoration: none; }
        .src-back:hover { color: #1a1210; }
        .src-title { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 800; color: #1a1210; margin-bottom: 32px; }
        .src-section { background: #fff; border-radius: 16px; padding: 28px 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 24px; }
        .src-section-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; color: #1a1210; margin-bottom: 16px; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .stat-card { background: #faf8f5; border-radius: 12px; padding: 18px 20px; text-align: center; border: 1px solid #e8e2d8; }
        .stat-value { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 800; color: #1a1210; }
        .stat-label { font-size: 12px; color: #9a8a80; margin-top: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }
        .stat-sub-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
        .stat-sub { background: #faf8f5; border-radius: 8px; padding: 10px 8px; text-align: center; border: 1px solid #e8e2d8; }
        .stat-sub .stat-value { font-size: 18px; }
        .stat-sub .stat-label { font-size: 10px; }
        .src-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
        .src-select, .src-input { padding: 8px 12px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; background: #faf8f5; outline: none; color: #1a1210; }
        .src-select:focus, .src-input:focus { border-color: #c0392b; }
        .src-btn { padding: 9px 20px; border-radius: 10px; border: none; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s, transform 0.1s; }
        .src-btn:active { transform: scale(0.97); }
        .src-btn-red { background: #c0392b; color: #fff; }
        .src-btn-red:hover { opacity: 0.9; }
        .src-btn-red:disabled { opacity: 0.5; cursor: not-allowed; }
        .src-btn-outline { background: transparent; border: 1.5px solid #e8e2d8; color: #1a1210; }
        .src-btn-outline:hover { border-color: #c0392b; color: #c0392b; }
        .src-btn-stop { background: #1a1210; color: #fff; }
        .src-btn-stop:hover { opacity: 0.85; }
        .src-stats-row { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 12px; font-size: 13px; color: #1a1210; }
        .src-stat-item { display: flex; align-items: center; gap: 4px; }
        .src-stat-item strong { font-weight: 700; }
        .src-stat-item .label { color: #9a8a80; }
        .src-muted { font-size: 12px; color: #9a8a80; }
        .src-toggle { position: relative; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: #1a1210; }
        .src-toggle input { display: none; }
        .src-toggle-track { width: 36px; height: 20px; border-radius: 10px; background: #e8e2d8; transition: background 0.2s; position: relative; }
        .src-toggle input:checked + .src-toggle-track { background: #1a7a40; }
        .src-toggle-knob { width: 16px; height: 16px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: left 0.2s; }
        .src-toggle input:checked + .src-toggle-track .src-toggle-knob { left: 18px; }
        .src-webhook { display: flex; align-items: center; font-size: 13px; gap: 4px; }
        .progress-wrap { margin-top: 10px; }
        @media (max-width: 900px) {
          .src-wrap { padding: 0 16px; margin: 24px auto; }
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .stat-sub-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .stat-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="src-wrap">
        <a href="/admin" className="src-back">{'\u2190'} Retour au dashboard</a>
        <h1 className="src-title">Sourcing & Batches</h1>

        {/* ===== 1. Stats Dashboard ===== */}
        <div className="src-section">
          <div className="src-section-title">Vue d{"'"}ensemble</div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-value">{fmt(stats.total)}</div>
              <div className="stat-label">Total biens</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{fmt(stats.faux_positifs)}</div>
              <div className="stat-label">Faux positifs</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{fmt(stats.extraction_pending)}</div>
              <div className="stat-label">Extraction pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{fmt(stats.score_pending)}</div>
              <div className="stat-label">Score pending</div>
            </div>
          </div>
          <div className="stat-sub-grid">
            <div className="stat-sub">
              <div className="stat-value">{fmt(stats.locataire)}</div>
              <div className="stat-label">Locataire</div>
            </div>
            <div className="stat-sub">
              <div className="stat-value">{fmt(stats.travaux)}</div>
              <div className="stat-label">Travaux</div>
            </div>
            <div className="stat-sub">
              <div className="stat-value">{fmt(stats.division)}</div>
              <div className="stat-label">Division</div>
            </div>
            <div className="stat-sub">
              <div className="stat-value">{fmt(stats.decoupe)}</div>
              <div className="stat-label">D{'\u00e9'}coupe</div>
            </div>
          </div>
        </div>

        {/* ===== 2. Ingestion Moteur Immo ===== */}
        <div className="src-section">
          <div className="src-section-title">Ingestion Moteur Immo</div>
          <div className="src-row">
            <select className="src-select" value={ingestStrategy} onChange={e => setIngestStrategy(e.target.value)} disabled={ingestRunning}>
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <label style={{ fontSize: 13, color: '#9a8a80' }}>
              Depuis
              <input type="date" className="src-input" style={{ marginLeft: 6 }} value={ingestSince} onChange={e => setIngestSince(e.target.value)} disabled={ingestRunning} />
            </label>
            <label style={{ fontSize: 13, color: '#9a8a80' }}>
              {"Jusqu'\u00e0"}
              <input type="date" className="src-input" style={{ marginLeft: 6 }} value={ingestUntil} onChange={e => setIngestUntil(e.target.value)} disabled={ingestRunning} />
            </label>
            {!ingestRunning ? (
              <button className="src-btn src-btn-red" onClick={startIngestion}>Lancer l{"'"}ingestion</button>
            ) : (
              <button className="src-btn src-btn-stop" onClick={() => { ingestStopRef.current = true }}>Stop</button>
            )}
          </div>
          <div className="src-webhook">
            <StatusDot active={webhookActive} />
            <span>{webhookActive ? 'Webhook actif' : 'Webhook inactif'}</span>
          </div>
          {(ingestRunning || ingestStats.processed > 0) && (
            <div className="progress-wrap">
              {ingestRunning && <div style={{ marginBottom: 6 }}><Spinner /> Ingestion en cours...</div>}
              {ingestStats.total > 0 && <ProgressBar value={ingestStats.processed} max={ingestStats.total} />}
              <div className="src-stats-row">
                <div className="src-stat-item"><strong>{fmt(ingestStats.new)}</strong> <span className="label">nouveaux</span></div>
                <div className="src-stat-item"><strong>{fmt(ingestStats.updated)}</strong> <span className="label">mis {'\u00e0'} jour</span></div>
                <div className="src-stat-item"><strong>{fmt(ingestStats.errors)}</strong> <span className="label">erreurs</span></div>
              </div>
            </div>
          )}
        </div>

        {/* ===== 3. Regex Validation ===== */}
        <div className="src-section">
          <div className="src-section-title">Validation regex</div>
          <p className="src-muted" style={{ marginBottom: 12 }}>Filtre les faux positifs en analysant titre + description avec des regex par strat{'\u00e9'}gie. Les biens non valides sont marqu{'\u00e9'}s "Faux positif".</p>
          <div className="src-row">
            <select className="src-select" value={regexStrategy} onChange={e => setRegexStrategy(e.target.value)} disabled={regexRunning}>
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {!regexRunning ? (
              <button className="src-btn src-btn-red" onClick={startRegex}>Lancer la validation</button>
            ) : (
              <button className="src-btn src-btn-stop" onClick={() => { regexStopRef.current = true }}>Stop</button>
            )}
            {regexStats.last_run && <span className="src-muted">Dernier run : {regexStats.last_run}</span>}
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="src-btn src-btn-outline" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setRegexShowKeywords(!regexShowKeywords)}>
              {regexShowKeywords ? 'Masquer' : 'Voir'} les mots-cl{'\u00e9'}s par strat{'\u00e9'}gie
            </button>
          </div>
          {regexShowKeywords && (
            <div style={{ marginTop: 12, background: '#faf8f5', borderRadius: 10, padding: '16px 20px', fontSize: 12, lineHeight: 1.8, border: '1px solid #e8e2d8' }}>
              <div style={{ marginBottom: 10 }}><strong style={{ color: '#2a4a8a' }}>Locataire en place</strong> <span style={{ color: '#9a8a80' }}>(valid{'\u00e9'} + exclu)</span><br/>
                <span style={{ color: '#1a7a40' }}>{"✓"}</span> locataire en place, vendu lou{'\u00e9'}, bail en cours, loyer en place, occup{'\u00e9'} par locataire, lou{'\u00e9'} et occup{'\u00e9'}, vente occup{'\u00e9'}e, revenus locatifs, rendement locatif/brut/net, investissement locatif...<br/>
                <span style={{ color: '#c0392b' }}>{"✗"}</span> pas/sans locataire, libre de toute occupation, non lou{'\u00e9'}, r{'\u00e9'}sidence g{'\u00e9'}r{'\u00e9'}e/services/senior
              </div>
              <div style={{ marginBottom: 10 }}><strong style={{ color: '#2a4a8a' }}>Travaux lourds</strong><br/>
                <span style={{ color: '#1a7a40' }}>{"✓"}</span> {'\u00e0'} r{'\u00e9'}nover, r{'\u00e9'}novation compl{'\u00e8'}te/totale, gros travaux, tout {'\u00e0'} refaire, {'\u00e0'} r{'\u00e9'}habiliter, travaux importants, vendu en l{'\u2019'}{'\u00e9'}tat, toiture {'\u00e0'} refaire, mise aux normes, inhabitable, {'\u00e0'} restaurer...<br/>
                <span style={{ color: '#c0392b' }}>{"✗"}</span> pas/sans travaux, travaux r{'\u00e9'}alis{'\u00e9'}s/termin{'\u00e9'}s, enti{'\u00e8'}rement r{'\u00e9'}nov{'\u00e9'}, r{'\u00e9'}cemment r{'\u00e9'}nov{'\u00e9'}, refait {'\u00e0'} neuf
              </div>
              <div style={{ marginBottom: 10 }}><strong style={{ color: '#2a4a8a' }}>Division</strong><br/>
                <span style={{ color: '#1a7a40' }}>{"✓"}</span> divisible, division possible, cr{'\u00e9'}er des lots, cr{'\u00e9'}er plusieurs logements<br/>
                <span style={{ color: '#c0392b' }}>{"✗"}</span> non divisible, issu d{"'"}une division, chambre/pi{'\u00e8'}ce/salon/jardin divisible
              </div>
              <div><strong style={{ color: '#2a4a8a' }}>D{'\u00e9'}coupe</strong><br/>
                <span style={{ color: '#1a7a40' }}>{"✓"}</span> immeuble de rapport, monopropri{'\u00e9'}t{'\u00e9'}, copropri{'\u00e9'}t{'\u00e9'} {'\u00e0'} cr{'\u00e9'}er, vente en bloc, plusieurs appartements/logements/lots
              </div>
            </div>
          )}
          {(regexRunning || regexStats.processed > 0) && (
            <div className="progress-wrap">
              {regexRunning && <div style={{ marginBottom: 6 }}><Spinner /> Validation en cours...</div>}
              {regexStats.total > 0 && <ProgressBar value={regexStats.processed} max={regexStats.total} />}
              <div className="src-stats-row">
                <div className="src-stat-item"><strong>{fmt(regexStats.processed)}</strong> <span className="label">analys{'\u00e9'}s</span></div>
                <div className="src-stat-item"><strong>{fmt(regexStats.faux_positifs)}</strong> <span className="label">faux positifs</span></div>
              </div>
            </div>
          )}
        </div>

        {/* ===== 4. Extraction données locatives ===== */}
        <div className="src-section">
          <div className="src-section-title">{"Extraction donn\u00e9es locatives (Haiku)"}</div>
          <p className="src-muted" style={{ marginBottom: 8 }}>Strat{'\u00e9'}gie : <strong>Locataire en place</strong> uniquement. Claude Haiku analyse la description de l{"'"}annonce pour extraire :</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {['Loyer (HC/CC)', 'Charges r\u00e9cup.', 'Charges copro', 'Taxe fonci\u00e8re', 'Fin de bail', 'Type de bail', 'Profil locataire'].map(f => (
              <span key={f} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#d4ddf5', color: '#2a4a8a' }}>{f}</span>
            ))}
          </div>
          <div className="src-row">
            {!extractRunning ? (
              <button className="src-btn src-btn-red" onClick={startExtraction}>Lancer</button>
            ) : (
              <button className="src-btn src-btn-stop" onClick={() => { extractStopRef.current = true }}>Stop</button>
            )}
            <label className="src-toggle">
              <input type="checkbox" checked={extractAuto} onChange={e => setExtractAuto(e.target.checked)} />
              <span className="src-toggle-track"><span className="src-toggle-knob" /></span>
              Auto (cron)
            </label>
          </div>
          {(extractRunning || extractStats.processed > 0) && (
            <div className="progress-wrap">
              {extractRunning && <div style={{ marginBottom: 6 }}><Spinner /> Extraction en cours...</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1210', minWidth: 100 }}>
                  {fmt(extractStats.processed)} / {fmt(extractStats.total)}
                </span>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={extractStats.processed} max={extractStats.total} color="#1a7a40" />
                </div>
              </div>
              <div className="src-stats-row">
                <div className="src-stat-item"><strong>{fmt(extractStats.loyer_found)}</strong> <span className="label">loyers</span></div>
                <div className="src-stat-item"><strong>{fmt(extractStats.profil_found)}</strong> <span className="label">profils</span></div>
                <div className="src-stat-item"><strong>{fmt(extractStats.errors)}</strong> <span className="label">erreurs</span></div>
                <div className="src-stat-item" style={{ color: '#f0c040' }}>
                  <strong>~{extractCost} {'\u20AC'}</strong> <span className="label">co{'\u00fb'}t estim{'\u00e9'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== 5. Score Travaux IA ===== */}
        <div className="src-section">
          <div className="src-section-title">Score Travaux IA (Haiku)</div>
          <p className="src-muted" style={{ marginBottom: 8 }}>Strat{'\u00e9'}gie : <strong>Travaux lourds</strong> uniquement. Score de 1 (rafra{'\u00ee'}chissement) {'\u00e0'} 5 (r{'\u00e9'}habilitation totale). Signaux analys{'\u00e9'}s :</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {['Description', 'DPE', 'Ann\u00e9e construction', 'Prix/surface'].map(f => (
              <span key={f} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fff8f0', color: '#a06010' }}>{f}</span>
            ))}
            {scoreWithPhotos && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#d4f5e0', color: '#1a7a40' }}>Photos (max 3)</span>
            )}
          </div>
          <div className="src-row">
            {!scoreRunning ? (
              <button className="src-btn src-btn-red" onClick={startScore}>Lancer</button>
            ) : (
              <button className="src-btn src-btn-stop" onClick={() => { scoreStopRef.current = true }}>Stop</button>
            )}
            <label className="src-toggle">
              <input type="checkbox" checked={scoreWithPhotos} onChange={e => setScoreWithPhotos(e.target.checked)} disabled={scoreRunning} />
              <span className="src-toggle-track"><span className="src-toggle-knob" /></span>
              Analyser les photos
            </label>
            {scoreWithPhotos && <span className="src-muted" style={{ fontSize: 11 }}>(co{'\u00fb'}t ~3x plus {'\u00e9'}lev{'\u00e9'})</span>}
          </div>
          {(scoreRunning || scoreStats.processed > 0) && (
            <div className="progress-wrap">
              {scoreRunning && <div style={{ marginBottom: 6 }}><Spinner /> Scoring en cours...</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1210', minWidth: 100 }}>
                  {fmt(scoreStats.processed)} / {fmt(scoreStats.total)}
                </span>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={scoreStats.processed} max={scoreStats.total} color="#1a7a40" />
                </div>
              </div>
              <div className="src-stats-row">
                <div className="src-stat-item"><strong>{fmt(scoreStats.scored)}</strong> <span className="label">scor{'\u00e9'}s</span></div>
                <div className="src-stat-item"><strong>{fmt(scoreStats.errors)}</strong> <span className="label">erreurs</span></div>
              </div>
            </div>
          )}
        </div>

        {/* ===== 6. Statut Annonces ===== */}
        <div className="src-section">
          <div className="src-section-title">Statut Annonces</div>
          <div className="src-row">
            <button className="src-btn src-btn-red" onClick={startStatut} disabled={statutRunning}>
              {statutRunning ? <><Spinner /> V{'\u00e9'}rification...</> : 'V\u00e9rifier maintenant'}
            </button>
            {statutStats.last_check && <span className="src-muted">Derni{'\u00e8'}re v{'\u00e9'}rification : {statutStats.last_check}</span>}
          </div>
          {statutStats.checked > 0 && (
            <div className="src-stats-row">
              <div className="src-stat-item"><strong>{fmt(statutStats.checked)}</strong> <span className="label">v{'\u00e9'}rifi{'\u00e9'}s</span></div>
              <div className="src-stat-item"><strong>{fmt(statutStats.expired)}</strong> <span className="label">expir{'\u00e9'}s</span></div>
            </div>
          )}
        </div>

        {/* ===== 7. Configuration Cron ===== */}
        <div className="src-section">
          <div className="src-section-title">{"Planification automatique (Vercel Cron)"}</div>
          <p className="src-muted" style={{ marginBottom: 16 }}>Les crons Vercel appellent ces routes automatiquement. Activez/d{'\u00e9'}sactivez chaque t{'\u00e2'}che sans red{'\u00e9'}ployer.</p>
          {cronConfigs.length === 0 ? (
            <p className="src-muted">Chargement de la config...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cronConfigs.map(cron => (
                <div key={cron.id} style={{ background: '#faf8f5', borderRadius: 12, padding: '16px 20px', border: '1px solid #e8e2d8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1210', marginBottom: 2 }}>
                        {CRON_LABELS[cron.id] || cron.id}
                      </div>
                      <div style={{ fontSize: 12, color: '#9a8a80', fontFamily: "'DM Sans', monospace" }}>
                        {cron.schedule}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {cron.last_run && (
                        <span className="src-muted" style={{ fontSize: 11 }}>
                          Dernier run : {new Date(cron.last_run).toLocaleString('fr-FR')}
                        </span>
                      )}
                      <label className="src-toggle">
                        <input
                          type="checkbox"
                          checked={cron.enabled}
                          onChange={() => updateCron(cron.id, { enabled: !cron.enabled })}
                          disabled={cronSaving === cron.id}
                        />
                        <span className="src-toggle-track"><span className="src-toggle-knob" /></span>
                        {cron.enabled ? 'Actif' : 'Inactif'}
                      </label>
                    </div>
                  </div>
                  {cron.last_result && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#9a8a80', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {Object.entries(cron.last_result).filter(([k]) => !['next_cursor', 'skipped', 'reason', 'error'].includes(k)).map(([k, v]) => (
                        <span key={k}><strong>{String(v)}</strong> {k.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  )}
                  {cron.id === 'score_travaux' && (
                    <div style={{ marginTop: 8 }}>
                      <label className="src-toggle" style={{ fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(cron.params?.withPhotos)}
                          onChange={() => updateCron(cron.id, { params: { ...cron.params, withPhotos: !cron.params?.withPhotos } })}
                          disabled={cronSaving === cron.id}
                        />
                        <span className="src-toggle-track"><span className="src-toggle-knob" /></span>
                        Analyser les photos (cron)
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
