'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

const STRATEGIES = [
  { value: '', label: 'Toutes' },
  { value: 'Locataire en place', label: 'Locataire en place' },
  { value: 'Travaux lourds', label: 'Travaux lourds' },
  { value: 'Division', label: 'Division' },
  { value: 'Immeuble de rapport', label: 'Immeuble de rapport' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DashStats = Record<string, any>

const defaultStats: DashStats = {}

function fmt(n: number | undefined | null) { return (n ?? 0).toLocaleString('fr-FR') }

function ProgressBar({ value, max, color = '#c0392b', label }: { value: number; max: number; color?: string; label?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ background: '#f0ede8', borderRadius: 6, height: 8, overflow: 'hidden', width: '100%', flex: 1 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.4s ease' }} />
      </div>
      {label !== false && <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1210', minWidth: 40, textAlign: 'right', fontFamily: "'Fraunces', serif" }}>{Math.round(pct)}%</span>}
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

function PulsingDot() {
  return (
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#1a7a40', animation: 'pulse 1.4s ease-in-out infinite', marginRight: 8, verticalAlign: 'middle' }} />
  )
}

function StepNumber({ num, color }: { num: number; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: '50%', background: color, color: '#fff',
      fontSize: 13, fontWeight: 700, fontFamily: "'Fraunces', serif", marginRight: 12,
      flexShrink: 0,
    }}>{num}</span>
  )
}

function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: bg, color,
    }}>{children}</span>
  )
}

function MiniGauge({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * pct / 100)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#f0ede8" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <text x="28" y="32" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="'Fraunces', serif" fill={color}>{pct}%</text>
      </svg>
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'il y a quelques secondes'
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h${mins % 60 > 0 ? String(mins % 60).padStart(2, '0') : ''}`
  const days = Math.floor(hrs / 24)
  return `il y a ${days}j`
}

function cronScheduleToFrench(schedule: string): string {
  const parts = schedule.split(' ')
  if (parts.length !== 5) return schedule
  const [min, hour, dom, month, dow] = parts
  const JOURS: Record<string, string> = { '0': 'dimanche', '1': 'lundi', '2': 'mardi', '3': 'mercredi', '4': 'jeudi', '5': 'vendredi', '6': 'samedi', '7': 'dimanche' }

  // Frequence
  let freq = ''
  if (min.startsWith('*/')) {
    const interval = min.replace('*/', '')
    freq = `Toutes les ${interval} min`
  } else {
    freq = `\u00C0 ${min} min`
  }

  // Heure
  let heureStr = ''
  if (hour === '*') {
    heureStr = ''
  } else if (hour.includes('-')) {
    const [from, to] = hour.split('-')
    heureStr = ` de ${from}h \u00E0 ${to}h`
  } else if (!min.startsWith('*/')) {
    freq = ''
    heureStr = `\u00C0 ${hour}h${min !== '0' ? min.padStart(2, '0') : ''}`
  }

  // Jour
  let jourStr = ''
  if (dow !== '*') {
    jourStr = ` le ${JOURS[dow] || dow}`
  } else if (dom !== '*') {
    jourStr = ` le ${dom} du mois`
  } else {
    jourStr = freq ? '' : ', tous les jours'
  }

  const result = (freq + heureStr + jourStr).trim()
  return result.charAt(0).toUpperCase() + result.slice(1)
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
  const [ingestHistory, setIngestHistory] = useState<Array<{
    startDate: string; endDate: string; strategies: string; dateRange: string;
    totalNew: number; totalUpdated: number; totalErrors: number; totalApi: number;
    calls: number; status: 'ok' | 'erreur' | 'arret'
  }>>([])
  const ingestSessionRef = useRef({ calls: 0, totalNew: 0, totalUpdated: 0, totalErrors: 0, totalApi: 0, strategies: new Set<string>(), startDate: '' })
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

  // Extraction IDR state
  const [idrRunning, setIdrRunning] = useState(false)
  const [idrStats, setIdrStats] = useState({ processed: 0, total: 0, lots_found: 0, errors: 0 })
  const idrStopRef = useRef(false)
  const [idrPending, setIdrPending] = useState(0)

  // Score travaux state
  const [scoreRunning, setScoreRunning] = useState(false)
  const [scoreWithPhotos, setScoreWithPhotos] = useState(false)
  const [scoreStats, setScoreStats] = useState({ processed: 0, total: 0, scored: 0, errors: 0 })
  const scoreStopRef = useRef(false)

  // Estimation DVF state
  const [estimRunning, setEstimRunning] = useState(false)
  const [estimStats, setEstimStats] = useState({ total: 0, done: 0, errors: 0, skipped: 0 })

  // Statut annonces state
  const [statutRunning, setStatutRunning] = useState(false)
  const [statutStats, setStatutStats] = useState({ expired: 0, checked: 0, last_check: '' })
  const [statutSince, setStatutSince] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const [statutHistory, setStatutHistory] = useState<Array<{
    startDate: string; endDate: string; period: string;
    checked: number; expired: number; errors: number; status: 'ok' | 'erreur'
  }>>([])

  // Cron config state
  const [cronConfigs, setCronConfigs] = useState<Array<{ id: string; enabled: boolean; schedule: string; last_run: string | null; last_result: Record<string, unknown> | null; params: Record<string, unknown> }>>([])
  const [cronSaving, setCronSaving] = useState<string | null>(null)


  // Load histories from localStorage
  useEffect(() => {
    try { const h = localStorage.getItem('mdb_ingest_history'); if (h) setIngestHistory(JSON.parse(h)) } catch {}
    try { const h = localStorage.getItem('mdb_statut_history'); if (h) setStatutHistory(JSON.parse(h)) } catch {}
  }, [])

  // Any batch running flag for auto-refresh
  const anyRunning = ingestRunning || regexRunning || extractRunning || scoreRunning || statutRunning

  // Auth check
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session) { window.location.href = '/login'; return }
      setToken(session.access_token)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return
    try {
      const res: Response = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      } else {
        console.error('Stats API error:', res.status, await res.text())
      }
    } catch (e) { console.error('Stats fetch error:', e) }
  }, [token])

  const fetchCronConfig = useCallback(async () => {
    if (!token) return
    try {
      const res: Response = await fetch('/api/admin/cron-config', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setCronConfigs(await res.json())
      else console.error('Cron config API error:', res.status, await res.text())
    } catch (e) { console.error('Cron config fetch error:', e) }
  }, [token])

  useEffect(() => {
    if (token) { fetchStats().then(() => fetchCronConfig()) }
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

    const session = ingestSessionRef.current
    session.calls = 0; session.totalNew = 0; session.totalUpdated = 0; session.totalErrors = 0; session.totalApi = 0
    session.strategies = new Set()
    session.startDate = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const since = new Date(ingestSince)
    const until = new Date(ingestUntil)
    const strategiesToRun = ingestStrategy
      ? [ingestStrategy]
      : STRATEGIES.filter(s => s.value).map(s => s.value)
    let stopped = false

    for (const strat of strategiesToRun) {
      if (ingestStopRef.current) { stopped = true; break }
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
              strategie: strat,
              dateAfter: sliceStart.toISOString().slice(0, 10),
              dateBefore: sliceEnd.toISOString().slice(0, 10),
            }),
          })
          const data = await res.json()
          session.calls++
          session.totalNew += data.new || 0
          session.totalUpdated += data.updated || 0
          session.totalErrors += data.errors || 0
          session.totalApi += data.total_api || data.new || 0
          session.strategies.add(strat)
          setIngestStats(prev => ({
            new: prev.new + (data.new || 0),
            updated: prev.updated + (data.updated || 0),
            errors: prev.errors + (data.errors || 0),
            processed: prev.processed + (data.processed || 0),
            total: data.total || prev.total,
          }))
          if (data.webhook_active !== undefined) setWebhookActive(data.webhook_active)
        } catch {
          session.calls++
          session.totalErrors++
          setIngestStats(prev => ({ ...prev, errors: prev.errors + 1 }))
        }

        sliceStart = new Date(sliceEnd)
        if (!ingestStopRef.current && sliceStart < until) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      if (ingestStopRef.current) { stopped = true; break }
    }

    // Save session summary
    const endDate = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const status: 'ok' | 'erreur' | 'arret' = stopped ? 'arret' : session.totalErrors > 0 ? 'erreur' : 'ok'
    const entry = {
      startDate: session.startDate, endDate,
      strategies: [...session.strategies].join(', ') || 'Aucune',
      dateRange: `${ingestSince} \u2192 ${ingestUntil}`,
      totalNew: session.totalNew, totalUpdated: session.totalUpdated,
      totalErrors: session.totalErrors, totalApi: session.totalApi,
      calls: session.calls, status,
    }
    setIngestHistory(prev => {
      const updated = [entry, ...prev].slice(0, 10)
      try { localStorage.setItem('mdb_ingest_history', JSON.stringify(updated)) } catch {}
      return updated
    })

    setIngestRunning(false)
    fetchStats()
  }

  // ---------- Regex Validation ----------
  async function startRegex() {
    if (!token) return
    setRegexRunning(true)
    regexStopRef.current = false
    setRegexStats({ faux_positifs: 0, processed: 0, total: 0, last_run: '' })

    const strats = regexStrategy ? [regexStrategy] : ['Locataire en place', 'Travaux lourds', 'Division', 'Immeuble de rapport']
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

  // ---------- Extraction IDR (Immeuble de rapport) ----------
  async function startExtractionIDR() {
    if (!token) return
    setIdrRunning(true)
    idrStopRef.current = false
    setIdrStats({ processed: 0, total: 0, lots_found: 0, errors: 0 })

    let cursor: string | null = null
    while (!idrStopRef.current) {
      try {
        const res: Response = await fetch('/api/admin/extraction-idr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cursor }),
        })
        const data = await res.json()
        setIdrStats(prev => ({
          processed: prev.processed + (data.processed || 0),
          total: data.remaining ? prev.processed + (data.processed || 0) + data.remaining : prev.total,
          lots_found: prev.lots_found + (data.lots_found || 0),
          errors: prev.errors + (data.errors || 0),
        }))
        cursor = data.next_cursor || null
        if (!cursor || data.remaining === 0) break
      } catch {
        setIdrStats(prev => ({ ...prev, errors: prev.errors + 1 }))
        break
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    setIdrRunning(false)
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
  async function startEstimation() {
    setEstimRunning(true)
    setEstimStats({ total: 0, done: 0, errors: 0, skipped: 0 })
    try {
      const res = await fetch('/api/admin/estimation-batch?limit=50')
      const data = await res.json()
      setEstimStats({ total: data.total || 0, done: data.done || 0, errors: data.errors || 0, skipped: data.skipped || 0 })
    } catch {
      setEstimStats(prev => ({ ...prev, errors: prev.errors + 1 }))
    }
    setEstimRunning(false)
  }

  async function startStatut() {
    if (!token) return
    setStatutRunning(true)
    const startDate = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    let checked = 0, expired = 0, errors = 0
    try {
      const res: Response = await fetch('/api/admin/statut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ since: statutSince }),
      })
      const data = await res.json()
      checked = data.checked || 0
      expired = data.expired || 0
      errors = data.errors || 0
      setStatutStats({
        expired,
        checked,
        last_check: new Date().toLocaleString('fr-FR'),
      })
    } catch {
      errors = 1
    }
    const endDate = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const entry = { startDate, endDate, period: `depuis ${statutSince}`, checked, expired, errors, status: (errors > 0 ? 'erreur' : 'ok') as 'ok' | 'erreur' }
    setStatutHistory(prev => {
      const updated = [entry, ...prev].slice(0, 10)
      try { localStorage.setItem('mdb_statut_history', JSON.stringify(updated)) } catch {}
      return updated
    })
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

  const CRON_COLORS: Record<string, string> = {
    ingest: '#2a4a8a',
    regex: '#f0a830',
    extraction: '#1a7a40',
    score_travaux: '#a06010',
    statut: '#7a6a60',
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: 80, color: '#7a6a60' }}>Chargement...</div>
      </Layout>
    )
  }

  // Haiku 4.5: $0.80/MTok input + $4/MTok output — ~$0.001/bien extraction, ~$0.0007/bien score, ~$0.003/bien score+photos
  const COST_EXTRACTION = 0.001
  const COST_SCORE = scoreWithPhotos ? 0.003 : 0.0007
  const extractCost = (extractStats.processed * COST_EXTRACTION).toFixed(2)
  const extractEstimatedTotal = (stats.extraction_pending || 0) * COST_EXTRACTION
  const scorePendingCount = stats.score_pending || stats.trav_sans_score || 0
  const scoreEstimatedTotal = scorePendingCount * COST_SCORE
  const scoreCost = (scoreStats.processed * COST_SCORE).toFixed(2)

  // Strategy bar chart data
  const stratValues = [
    { label: 'Locataire', value: stats.locataire || 0, color: '#2a4a8a' },
    { label: 'Travaux', value: stats.travaux || 0, color: '#a06010' },
    { label: 'Division', value: stats.division || 0, color: '#1a7a40' },
    { label: 'Imm. rapport', value: stats.decoupe || 0, color: '#c0392b' },
  ]
  const stratTotal = stratValues.reduce((s, v) => s + v.value, 0) || 1

  return (
    <Layout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
        .src-wrap { max-width: 1200px; margin: 48px auto; padding: 0 48px; font-family: 'DM Sans', sans-serif; }
        .src-back { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 24px; font-size: 13px; color: #7a6a60; text-decoration: none; transition: color 0.15s; }
        .src-back:hover { color: #1a1210; }
        .src-title { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 800; color: #1a1210; margin-bottom: 8px; }
        .src-subtitle { font-size: 14px; color: #7a6a60; margin-bottom: 32px; }

        .src-section {
          background: #fff; border-radius: 16px; padding: 28px 32px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
          margin-bottom: 20px; transition: box-shadow 0.2s;
          border-left: 4px solid transparent;
        }
        .src-section:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06); }
        .src-section-header { display: flex; align-items: center; margin-bottom: 20px; }
        .src-section-title {
          font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; color: #1a1210;
        }
        .src-section-desc {
          background: #faf8f5; border: 1px solid #e8e2d8; border-radius: 10px;
          padding: 10px 16px; font-size: 13px; color: #6b5e55; line-height: 1.5;
          margin-bottom: 16px;
        }

        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .stat-card {
          background: #fff; border-radius: 14px; padding: 22px 20px; text-align: left;
          border: 1px solid #e8e2d8; border-left: 4px solid #e8e2d8;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .stat-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .stat-value { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 800; color: #1a1210; }
        .stat-label {
          font-size: 11px; color: #7a6a60; margin-top: 4px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
        }

        .pipeline-card {
          background: #faf8f5; border-radius: 12px; padding: 16px 18px;
          border: 1px solid #e8e2d8; transition: box-shadow 0.2s;
        }
        .pipeline-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

        .quality-row {
          display: flex; align-items: center; gap: 20px; padding: 12px 0;
        }
        .quality-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .quality-value { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; }
        .quality-label { font-size: 10px; color: #7a6a60; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; text-align: center; }

        .divider { height: 1px; background: #e8e2d8; margin: 20px 0; }

        .src-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
        .src-select, .src-input {
          padding: 10px 14px; border-radius: 10px; border: 1.5px solid #e8e2d8;
          font-family: 'DM Sans', sans-serif; font-size: 13px; background: #faf8f5;
          outline: none; color: #1a1210; transition: border-color 0.15s;
          min-height: 44px; box-sizing: border-box;
        }
        .src-select:focus, .src-input:focus { border-color: #c0392b; }

        .src-btn {
          padding: 11px 24px; border-radius: 10px; border: none;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; display: inline-flex;
          align-items: center; gap: 6px;
        }
        .src-btn:active { transform: scale(0.97); }
        .src-btn-red { background: #c0392b; color: #fff; }
        .src-btn-red:hover { background: #a52f23; }
        .src-btn-red:disabled { opacity: 0.5; cursor: not-allowed; }
        .src-btn-outline { background: transparent; border: 1.5px solid #e8e2d8; color: #1a1210; }
        .src-btn-outline:hover { border-color: #c0392b; color: #c0392b; }
        .src-btn-stop { background: #1a1210; color: #fff; }
        .src-btn-stop:hover { opacity: 0.85; }

        .src-stats-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
        .src-muted { font-size: 12px; color: #7a6a60; }
        .src-toggle { position: relative; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: #1a1210; }
        .src-toggle input { display: none; }
        .src-toggle-track { width: 40px; height: 22px; border-radius: 11px; background: #e8e2d8; transition: background 0.2s; position: relative; }
        .src-toggle input:checked + .src-toggle-track { background: #1a7a40; }
        .src-toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
        .src-toggle input:checked + .src-toggle-track .src-toggle-knob { left: 20px; }

        .src-webhook { display: flex; align-items: center; font-size: 13px; gap: 4px; }
        .progress-wrap { margin-top: 14px; }
        .running-indicator { display: flex; align-items: center; margin-bottom: 10px; font-size: 13px; font-weight: 600; color: #1a1210; }

        .strat-bar { display: flex; height: 28px; border-radius: 8px; overflow: hidden; }
        .strat-bar-segment { transition: width 0.4s ease; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; min-width: 0; overflow: hidden; white-space: nowrap; }
        .strat-legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; }
        .strat-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #1a1210; }
        .strat-legend-dot { width: 10px; height: 10px; border-radius: 3px; }

        .cron-card {
          background: #fff; border-radius: 14px; padding: 18px 22px;
          border: 1px solid #e8e2d8; transition: box-shadow 0.2s;
          border-left: 4px solid #e8e2d8;
        }
        .cron-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.05); }

        @media (max-width: 900px) {
          .src-wrap { padding: 0 16px; margin: 24px auto; }
          .stat-grid { grid-template-columns: repeat(2, 1fr); }
          .quality-row { flex-wrap: wrap; }
        }
        @media (max-width: 600px) {
          .stat-grid { grid-template-columns: 1fr; }
          .strat-legend { gap: 8px; }
        }
      `}</style>

      <div className="src-wrap">
        <a href="/admin" className="src-back">{'\u2190'} Retour au dashboard</a>
        <h1 className="src-title">Sourcing & Batches</h1>
        <p className="src-subtitle">Pipeline de traitement des annonces immobili{'\u00e8'}res</p>

        {/* ===== STATS DASHBOARD ===== */}
        <div className="src-section" style={{ borderLeftColor: '#e8e2d8' }}>
          <div className="src-section-header">
            <div className="src-section-title">Vue d{"'"}ensemble</div>
          </div>

          {/* Top stat cards with colored left borders */}
          <div className="stat-grid">
            <div className="stat-card" style={{ borderLeftColor: '#7a6a60' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="10" width="4" height="8" rx="1" fill="#7a6a60"/><rect x="8" y="6" width="4" height="12" rx="1" fill="#7a6a60"/><rect x="14" y="2" width="4" height="16" rx="1" fill="#7a6a60"/></svg>
                <span className="stat-label" style={{ margin: 0 }}>Total biens</span>
              </div>
              <div className="stat-value">{fmt(stats.total)}</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: '#1a7a40' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#1a7a40" strokeWidth="2"/><path d="M6 10l3 3 5-6" stroke="#1a7a40" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="stat-label" style={{ margin: 0 }}>Disponibles</span>
              </div>
              <div className="stat-value" style={{ color: '#1a7a40' }}>{fmt(stats.disponible)}</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: '#f0a830' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#f0a830" strokeWidth="2"/><path d="M10 6v5" stroke="#f0a830" strokeWidth="2" strokeLinecap="round"/><circle cx="10" cy="14" r="1" fill="#f0a830"/></svg>
                <span className="stat-label" style={{ margin: 0 }}>{"Expir\u00e9es"}</span>
              </div>
              <div className="stat-value" style={{ color: '#f0a830' }}>{fmt(stats.expiree)}</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: '#c0392b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#c0392b" strokeWidth="2"/><path d="M7 7l6 6M13 7l-6 6" stroke="#c0392b" strokeWidth="2" strokeLinecap="round"/></svg>
                <span className="stat-label" style={{ margin: 0 }}>Faux positifs</span>
              </div>
              <div className="stat-value" style={{ color: '#c0392b' }}>{fmt(stats.faux_positifs)}</div>
            </div>
          </div>

          <div className="divider" />

          {/* Strategy horizontal bar chart */}
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>R{'\u00e9'}partition par strat{'\u00e9'}gie</div>
          <div className="strat-bar">
            {stratValues.map(s => (
              <div key={s.label} className="strat-bar-segment" style={{ width: `${(s.value / stratTotal) * 100}%`, background: s.color }}>
                {(s.value / stratTotal) > 0.08 ? fmt(s.value) : ''}
              </div>
            ))}
          </div>
          <div className="strat-legend">
            {stratValues.map(s => (
              <div key={s.label} className="strat-legend-item">
                <span className="strat-legend-dot" style={{ background: s.color }} />
                <span style={{ fontWeight: 600 }}>{fmt(s.value)}</span>
                <span style={{ color: '#7a6a60' }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="divider" />

          {/* Pipeline progress */}
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Pipeline de traitement</div>
          <div className="stat-grid">
            {[
              { label: 'Regex', done: stats.regex_done || 0, pending: stats.regex_pending || 0, color: '#f0a830' },
              { label: 'Extraction IA', done: stats.extraction_done || 0, pending: stats.extraction_pending || 0, color: '#1a7a40' },
              { label: 'Score travaux', done: stats.score_done || 0, pending: stats.score_pending || 0, color: '#a06010' },
              { label: 'Estimation DVF', done: stats.estimation_done || 0, pending: stats.estimation_pending || 0, color: '#2a4a8a' },
            ].map(p => (
              <div key={p.label} className="pipeline-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1210' }}>{p.label}</span>
                  <Pill color="#1a7a40" bg="#d4f5e0">{fmt(p.done)} fait{p.done !== 1 ? 's' : ''}</Pill>
                </div>
                <ProgressBar value={p.done} max={p.done + p.pending} color={p.color} />
                <div style={{ fontSize: 11, color: '#c0392b', marginTop: 6, fontWeight: 500 }}>{fmt(p.pending)} en attente</div>
              </div>
            ))}
          </div>

          <div className="divider" />

          {/* Quality — Locataire en place */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {"Qualit\u00e9 donn\u00e9es — Locataire en place"}
            </span>
            {stats.loc_completude != null && (
              <MiniGauge value={stats.loc_completude || 0} total={100} color={(stats.loc_completude || 0) > 70 ? '#1a7a40' : '#c0392b'} />
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {[
              { label: 'Sans loyer', value: stats.loc_sans_loyer, color: '#c0392b' },
              { label: 'Sans charges copro', value: stats.loc_sans_charges, color: '#f0a830' },
              { label: 'Sans taxe fonc.', value: stats.loc_sans_taxe, color: '#f0a830' },
              { label: 'Sans profil', value: stats.loc_sans_profil, color: '#7a6a60' },
              { label: 'Sans fin bail', value: stats.loc_sans_bail, color: '#7a6a60' },
            ].map(s => (
              <div key={s.label} className="quality-item">
                <div className="quality-value" style={{ color: s.color }}>{fmt(s.value)}</div>
                <div className="quality-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="divider" />

          {/* Quality — Travaux lourds */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {"Qualit\u00e9 donn\u00e9es — Travaux lourds"}
            </span>
            {stats.trav_completude != null && (
              <MiniGauge value={stats.trav_completude || 0} total={100} color={(stats.trav_completude || 0) > 70 ? '#1a7a40' : '#c0392b'} />
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Sans score IA', value: stats.trav_sans_score, color: '#c0392b' },
              { label: 'Sans DPE', value: stats.trav_sans_dpe, color: '#f0a830' },
              { label: 'Actifs', value: stats.trav_actif, color: '#1a7a40' },
            ].map(s => (
              <div key={s.label} className="quality-item">
                <div className="quality-value" style={{ color: s.color }}>{fmt(s.value)}</div>
                <div className="quality-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="divider" />

          {/* General data quality */}
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{"Donn\u00e9es g\u00e9n\u00e9rales (biens disponibles)"}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Sans prix', value: stats.sans_prix, color: '#c0392b' },
              { label: 'Sans surface', value: stats.sans_surface, color: '#c0392b' },
              { label: 'Avec photo', value: stats.avec_photo, color: '#1a7a40' },
              { label: 'Sans photo', value: stats.sans_photo, color: '#f0a830' },
            ].map(s => (
              <div key={s.label} className="quality-item">
                <div className="quality-value" style={{ color: s.color }}>{fmt(s.value)}</div>
                <div className="quality-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ==================== GROUPE: MOTEUR IMMO ==================== */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2a4a8a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          {'\uD83C\uDFE0'} Moteur Immo
        </div>

        {/* ===== Ingestion Moteur Immo ===== */}
        <div className="src-section" style={{ borderLeftColor: '#2a4a8a' }}>
          <div className="src-section-header">
            <StepNumber num={1} color="#2a4a8a" />
            <div className="src-section-title">Ingestion Moteur Immo</div>
          </div>
          {(stats.added_24h !== undefined || stats.added_7d !== undefined) && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ background: '#d4ddf5', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: '#2a4a8a', fontSize: 16 }}>{fmt(stats.added_24h)}</span>
                <span style={{ color: '#2a4a8a', marginLeft: 6 }}>{"nouveaux biens (24h)"}</span>
              </div>
              <div style={{ background: '#d4ddf5', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: '#2a4a8a', fontSize: 16 }}>{fmt(stats.added_7d)}</span>
                <span style={{ color: '#2a4a8a', marginLeft: 6 }}>{"nouveaux biens (7j)"}</span>
              </div>
              {stats.added_7d > 0 && (
                <div style={{ background: '#d4ddf5', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#2a4a8a', fontSize: 16 }}>~{fmt(Math.round(stats.added_7d / 7))}</span>
                  <span style={{ color: '#2a4a8a', marginLeft: 6 }}>/jour en moyenne</span>
                </div>
              )}
              {stats.added_24h === 0 && (
                <div style={{ background: '#fde0dc', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#c0392b' }}>{'\u26A0'} Aucun bien ajout{'\u00E9'} depuis 24h</span>
                </div>
              )}
            </div>
          )}
          <div className="src-row">
            <select className="src-select" value={ingestStrategy} onChange={e => setIngestStrategy(e.target.value)} disabled={ingestRunning}>
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <label style={{ fontSize: 13, color: '#7a6a60', display: 'flex', alignItems: 'center', gap: 6 }}>
              Depuis
              <input type="date" className="src-input" value={ingestSince} onChange={e => setIngestSince(e.target.value)} disabled={ingestRunning} />
            </label>
            <label style={{ fontSize: 13, color: '#7a6a60', display: 'flex', alignItems: 'center', gap: 6 }}>
              {"Jusqu'\u00e0"}
              <input type="date" className="src-input" value={ingestUntil} onChange={e => setIngestUntil(e.target.value)} disabled={ingestRunning} />
            </label>
            {!ingestRunning ? (
              <button className="src-btn src-btn-red" onClick={startIngestion}>{'\u25B6'} Lancer l{"'"}ingestion</button>
            ) : (
              <button className="src-btn src-btn-stop" onClick={() => { ingestStopRef.current = true }}>{'\u25A0'} Stop</button>
            )}
          </div>
          <div className="src-webhook" style={{ display: 'none' }}>
            <StatusDot active={webhookActive} />
            <span>{webhookActive ? 'Webhook actif' : 'Webhook inactif'}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
            {/* Stats en cours */}
            {(ingestRunning || ingestStats.processed > 0) && (
              <div className="progress-wrap" style={{ flex: '1 1 300px' }}>
                {ingestRunning && <div className="running-indicator"><PulsingDot /><Spinner /> Ingestion en cours...</div>}
                {ingestStats.total > 0 && <ProgressBar value={ingestStats.processed} max={ingestStats.total} />}
                <div className="src-stats-row">
                  <Pill color="#1a7a40" bg="#d4f5e0"><strong>{fmt(ingestStats.new)}</strong> nouveaux</Pill>
                  <Pill color="#7a6a60" bg="#f0ede8"><strong>{fmt(ingestStats.updated)}</strong> {"d\u00E9j\u00E0 en base"}</Pill>
                  {ingestStats.errors > 0 && <Pill color="#c0392b" bg="#fde0dc"><strong>{fmt(ingestStats.errors)}</strong> erreurs</Pill>}
                </div>
              </div>
            )}

            {/* Historique des dernieres ingestions manuelles */}
            {ingestHistory.length > 0 && (
              <div style={{ flex: '1 1 100%', background: '#fff', border: '1.5px solid #ede8e0', borderRadius: 10, padding: '12px 16px', fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>Historique des ingestions manuelles</span>
                  <button onClick={() => { setIngestHistory([]); try { localStorage.removeItem('mdb_ingest_history') } catch {} }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#c0b8ae' }}>Effacer</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #ede8e0' }}>
                      <th style={{ textAlign: 'left', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>{"D\u00E9but"}</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>Fin</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>{"P\u00E9riode"}</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>{"Strat\u00E9gies"}</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>Appels</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>{"Re\u00E7us"}</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>Nouv.</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>{"D\u00E9dup."}</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>Err.</th>
                      <th style={{ textAlign: 'center', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingestHistory.map((h, i) => (
                      <tr key={i} style={{ borderBottom: i < ingestHistory.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                        <td style={{ padding: '5px 6px', color: '#7a6a60', whiteSpace: 'nowrap' }}>{h.startDate}</td>
                        <td style={{ padding: '5px 6px', color: '#7a6a60', whiteSpace: 'nowrap' }}>{h.endDate}</td>
                        <td style={{ padding: '5px 6px', color: '#1a1210', fontSize: 10 }}>{h.dateRange}</td>
                        <td style={{ padding: '5px 6px', fontWeight: 600, color: '#1a1210', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.strategies}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: '#2a4a8a' }}>{h.calls}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: '#2a4a8a' }}>{fmt(h.totalApi)}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: '#1a7a40', fontWeight: 700 }}>{h.totalNew > 0 ? `+${fmt(h.totalNew)}` : '0'}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: '#7a6a60' }}>{fmt(h.totalUpdated)}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: h.totalErrors > 0 ? '#c0392b' : '#7a6a60', fontWeight: h.totalErrors > 0 ? 700 : 400 }}>{h.totalErrors}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                          {h.status === 'ok' && <span style={{ color: '#1a7a40', fontWeight: 700, background: '#d4f5e0', padding: '2px 8px', borderRadius: 6 }}>{'\u2713'} Termin{'\u00E9'}</span>}
                          {h.status === 'erreur' && <span style={{ color: '#c0392b', fontWeight: 700, background: '#fde0dc', padding: '2px 8px', borderRadius: 6 }}>{'\u2717'} Erreurs</span>}
                          {h.status === 'arret' && <span style={{ color: '#a06010', fontWeight: 700, background: '#fff8f0', padding: '2px 8px', borderRadius: 6 }}>{'\u25A0'} {"Arr\u00EAt\u00E9"}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ===== Statut Annonces ===== */}
        <div className="src-section" style={{ borderLeftColor: '#7a6a60' }}>
          <div className="src-section-header">
            <StepNumber num={2} color="#7a6a60" />
            <div className="src-section-title">{"V\u00E9rification statut annonces"}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ background: '#d4ddf5', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: '#2a4a8a', fontSize: 16 }}>{fmt(stats.verified_24h)}</span>
              <span style={{ color: '#2a4a8a', marginLeft: 6 }}>{"v\u00E9rifi\u00E9s (24h)"}</span>
            </div>
            <div style={{ background: '#d4ddf5', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: '#2a4a8a', fontSize: 16 }}>{fmt(stats.verified_7d)}</span>
              <span style={{ color: '#2a4a8a', marginLeft: 6 }}>{"v\u00E9rifi\u00E9s (7j)"}</span>
            </div>
            <div style={{ background: '#fde0dc', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: '#c0392b', fontSize: 16 }}>{fmt(stats.expired_24h)}</span>
              <span style={{ color: '#c0392b', marginLeft: 6 }}>{"expir\u00E9s (24h)"}</span>
            </div>
            <div style={{ background: '#fde0dc', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: '#c0392b', fontSize: 16 }}>{fmt(stats.expired_7d)}</span>
              <span style={{ color: '#c0392b', marginLeft: 6 }}>{"expir\u00E9s (7j)"}</span>
            </div>
            <div style={{ background: '#f0ede8', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: '#1a1210', fontSize: 16 }}>{fmt(stats.expiree)}</span>
              <span style={{ color: '#7a6a60', marginLeft: 6 }}>{"expir\u00E9s total"}</span>
            </div>
          </div>
          <div className="src-row">
            <label style={{ fontSize: 13, color: '#7a6a60', display: 'flex', alignItems: 'center', gap: 6 }}>
              Depuis
              <input type="date" className="src-input" value={statutSince} onChange={e => setStatutSince(e.target.value)} disabled={statutRunning} />
            </label>
            {!statutRunning ? (
              <button className="src-btn src-btn-red" onClick={startStatut}>{'\u25B6'} {"V\u00E9rifier maintenant"}</button>
            ) : (
              <button className="src-btn src-btn-stop" disabled><PulsingDot /><Spinner /> {"V\u00E9rification..."}</button>
            )}
            {statutStats.last_check && <span className="src-muted">{"Derni\u00E8re v\u00E9rification : "}{statutStats.last_check}</span>}
          </div>
          {statutStats.checked > 0 && (
            <div className="src-stats-row" style={{ marginTop: 8 }}>
              <Pill color="#2a4a8a" bg="#d4ddf5"><strong>{fmt(statutStats.checked)}</strong> {"v\u00E9rifi\u00E9s"}</Pill>
              <Pill color="#c0392b" bg="#fde0dc"><strong>{fmt(statutStats.expired)}</strong> {"expir\u00E9s"}</Pill>
            </div>
          )}
          {statutHistory.length > 0 && (
            <div style={{ marginTop: 12, background: '#fff', border: '1.5px solid #ede8e0', borderRadius: 10, padding: '12px 16px', fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>{"Historique des v\u00E9rifications"}</span>
                <button onClick={() => { setStatutHistory([]); try { localStorage.removeItem('mdb_statut_history') } catch {} }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#c0b8ae' }}>Effacer</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #ede8e0' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>{"D\u00E9but"}</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>Fin</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>{"P\u00E9riode"}</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>{"V\u00E9rifi\u00E9s"}</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>{"Expir\u00E9s"}</th>
                    <th style={{ textAlign: 'right', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>Err.</th>
                    <th style={{ textAlign: 'center', padding: '4px 6px', color: '#7a6a60', fontSize: 10, fontWeight: 600 }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {statutHistory.map((h, i) => (
                    <tr key={i} style={{ borderBottom: i < statutHistory.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                      <td style={{ padding: '5px 6px', color: '#7a6a60', whiteSpace: 'nowrap' }}>{h.startDate}</td>
                      <td style={{ padding: '5px 6px', color: '#7a6a60', whiteSpace: 'nowrap' }}>{h.endDate}</td>
                      <td style={{ padding: '5px 6px', color: '#1a1210', fontSize: 10 }}>{h.period}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: '#2a4a8a', fontWeight: 600 }}>{fmt(h.checked)}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: '#c0392b', fontWeight: 700 }}>{fmt(h.expired)}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: h.errors > 0 ? '#c0392b' : '#7a6a60' }}>{h.errors}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                        {h.status === 'ok' && <span style={{ color: '#1a7a40', fontWeight: 700, background: '#d4f5e0', padding: '2px 8px', borderRadius: 6 }}>{'\u2713'} OK</span>}
                        {h.status === 'erreur' && <span style={{ color: '#c0392b', fontWeight: 700, background: '#fde0dc', padding: '2px 8px', borderRadius: 6 }}>{'\u2717'} Erreur</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ==================== GROUPE: VALIDATION REGEX ==================== */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f0a830', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, marginTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          {'\uD83D\uDD0D'} Validation (Regex)
        </div>

        {/* ===== Regex Validation ===== */}
        <div className="src-section" style={{ borderLeftColor: '#f0a830' }}>
          <div className="src-section-header">
            <StepNumber num={2} color="#f0a830" />
            <div className="src-section-title">Validation regex</div>
          </div>
          <div className="src-section-desc">
            Filtre les faux positifs en analysant titre + description avec des regex par strat{'\u00e9'}gie. Les biens non valides sont marqu{'\u00e9'}s {'"'}Faux positif{'"'}.
          </div>
          <div className="src-row">
            <select className="src-select" value={regexStrategy} onChange={e => setRegexStrategy(e.target.value)} disabled={regexRunning}>
              {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {!regexRunning ? (
              <button className="src-btn src-btn-red" onClick={startRegex}>{'\u25B6'} Lancer la validation</button>
            ) : (
              <button className="src-btn src-btn-stop" onClick={() => { regexStopRef.current = true }}>{'\u25A0'} Stop</button>
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
              <div style={{ marginBottom: 10 }}><strong style={{ color: '#2a4a8a' }}>Locataire en place</strong> <span style={{ color: '#7a6a60' }}>(valid{'\u00e9'} + exclu)</span><br/>
                <span style={{ color: '#1a7a40' }}>{'\u2713'}</span> locataire en place, vendu lou{'\u00e9'}, bail en cours, loyer en place, occup{'\u00e9'} par locataire, lou{'\u00e9'} et occup{'\u00e9'}, vente occup{'\u00e9'}e, revenus locatifs, rendement locatif/brut/net, investissement locatif...<br/>
                <span style={{ color: '#c0392b' }}>{'\u2717'}</span> pas/sans locataire, libre de toute occupation, non lou{'\u00e9'}, r{'\u00e9'}sidence g{'\u00e9'}r{'\u00e9'}e/services/senior
              </div>
              <div style={{ marginBottom: 10 }}><strong style={{ color: '#2a4a8a' }}>Travaux lourds</strong><br/>
                <span style={{ color: '#1a7a40' }}>{'\u2713'}</span> {'\u00e0'} r{'\u00e9'}nover, r{'\u00e9'}novation compl{'\u00e8'}te/totale, gros travaux, tout {'\u00e0'} refaire, {'\u00e0'} r{'\u00e9'}habiliter, travaux importants, vendu en l{'\u2019'}{'\u00e9'}tat, toiture {'\u00e0'} refaire, mise aux normes, inhabitable, {'\u00e0'} restaurer...<br/>
                <span style={{ color: '#c0392b' }}>{'\u2717'}</span> pas/sans travaux, travaux r{'\u00e9'}alis{'\u00e9'}s/termin{'\u00e9'}s, enti{'\u00e8'}rement r{'\u00e9'}nov{'\u00e9'}, r{'\u00e9'}cemment r{'\u00e9'}nov{'\u00e9'}, refait {'\u00e0'} neuf
              </div>
              <div style={{ marginBottom: 10 }}><strong style={{ color: '#2a4a8a' }}>Division</strong><br/>
                <span style={{ color: '#1a7a40' }}>{'\u2713'}</span> divisible, division possible, cr{'\u00e9'}er des lots, cr{'\u00e9'}er plusieurs logements<br/>
                <span style={{ color: '#c0392b' }}>{'\u2717'}</span> non divisible, issu d{"'"}une division, chambre/pi{'\u00e8'}ce/salon/jardin divisible
              </div>
              <div><strong style={{ color: '#2a4a8a' }}>Immeuble de rapport</strong><br/>
                <span style={{ color: '#1a7a40' }}>{'\u2713'}</span> immeuble de rapport, monopropri{'\u00e9'}t{'\u00e9'}, copropri{'\u00e9'}t{'\u00e9'} {'\u00e0'} cr{'\u00e9'}er, vente en bloc, plusieurs appartements/logements/lots
              </div>
            </div>
          )}
          {(regexRunning || regexStats.processed > 0) && (
            <div className="progress-wrap">
              {regexRunning && <div className="running-indicator"><PulsingDot /><Spinner /> Validation en cours...</div>}
              {regexStats.total > 0 && <ProgressBar value={regexStats.processed} max={regexStats.total} color="#f0a830" />}
              <div className="src-stats-row">
                <Pill color="#2a4a8a" bg="#d4ddf5"><strong>{fmt(regexStats.processed)}</strong> analys{'\u00e9'}s</Pill>
                <Pill color="#c0392b" bg="#fde0dc"><strong>{fmt(regexStats.faux_positifs)}</strong> faux positifs</Pill>
              </div>
            </div>
          )}
        </div>

        {/* ==================== GROUPE: IA (CLAUDE HAIKU) ==================== */}
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a7a40', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, marginTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          {'\uD83E\uDDE0'} IA (Claude Haiku)
        </div>

        {/* ===== Extraction données locatives ===== */}
        <div className="src-section" style={{ borderLeftColor: '#1a7a40' }}>
          <div className="src-section-header">
            <StepNumber num={3} color="#1a7a40" />
            <div className="src-section-title">{"Extraction donn\u00e9es locatives (Haiku)"}</div>
          </div>
          <div className="src-section-desc">
            Strat{'\u00e9'}gie : <strong>Locataire en place</strong> uniquement. Claude Haiku analyse la description de l{"'"}annonce pour extraire les donn{'\u00e9'}es cl{'\u00e9'}s.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {['Loyer (HC/CC)', 'Charges r\u00e9cup.', 'Charges copro', 'Taxe fonci\u00e8re', 'Fin de bail', 'Type de bail', 'Profil locataire'].map(f => (
              <span key={f} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#d4f5e0', color: '#1a7a40' }}>{f}</span>
            ))}
          </div>
          {(stats.extraction_pending || 0) > 0 && !extractRunning && (
            <div style={{ background: '#faf8f5', border: '1px solid #e8e2d8', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#1a1210' }}>
                <strong>{fmt(stats.extraction_pending)}</strong> biens {'\u00e0'} traiter
              </span>
              <span style={{ fontSize: 13, color: '#a06010', fontWeight: 600 }}>
                {"Co\u00fbt estim\u00e9 : ~"}{extractEstimatedTotal < 1 ? extractEstimatedTotal.toFixed(2) : Math.round(extractEstimatedTotal)} {'\u20ac'} (Haiku)
              </span>
            </div>
          )}
          <div className="src-row">
            {!extractRunning ? (
              <button className="src-btn src-btn-red" onClick={startExtraction}>{'\u25B6'} Lancer</button>
            ) : (
              <button className="src-btn src-btn-stop" onClick={() => { extractStopRef.current = true }}>{'\u25A0'} Stop</button>
            )}
            <label className="src-toggle" role="switch">
              <input type="checkbox" checked={extractAuto} onChange={e => setExtractAuto(e.target.checked)} />
              <span className="src-toggle-track"><span className="src-toggle-knob" /></span>
              Auto (cron)
            </label>
          </div>
          {(extractRunning || extractStats.processed > 0) && (
            <div className="progress-wrap">
              {extractRunning && <div className="running-indicator"><PulsingDot /><Spinner /> Extraction en cours...</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1210', minWidth: 100, fontFamily: "'Fraunces', serif" }}>
                  {fmt(extractStats.processed)} / {fmt(extractStats.total)}
                </span>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={extractStats.processed} max={extractStats.total} color="#1a7a40" />
                </div>
              </div>
              <div className="src-stats-row">
                <Pill color="#1a7a40" bg="#d4f5e0"><strong>{fmt(extractStats.loyer_found)}</strong> loyers</Pill>
                <Pill color="#2a4a8a" bg="#d4ddf5"><strong>{fmt(extractStats.profil_found)}</strong> profils</Pill>
                {extractStats.errors > 0 && <Pill color="#c0392b" bg="#fde0dc"><strong>{fmt(extractStats.errors)}</strong> erreurs</Pill>}
                <Pill color="#a06010" bg="#fff8f0"><strong>~{extractCost} {'\u20AC'}</strong> co{'\u00fb'}t estim{'\u00e9'}</Pill>
              </div>
            </div>
          )}
        </div>

        {/* ===== STEP 3bis: Extraction IDR ===== */}
        <div className="src-section" style={{ borderLeftColor: '#2a4a8a' }}>
          <div className="src-section-header">
            <StepNumber num={3.5} color="#2a4a8a" />
            <div className="src-section-title">Extraction Immeuble de rapport (Haiku)</div>
          </div>
          <div className="src-section-desc">
            {"Strat\u00E9gie : "}<strong>Immeuble de rapport</strong>{" uniquement. Extrait le d\u00E9tail des lots (type, surface, loyer, \u00E9tat locatif, DPE)."}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {['Nb lots', 'Type/surface par lot', 'Loyer par lot', 'Etat locatif', 'Loyer total', 'Taxe fonci\u00E8re', 'Monopropri\u00E9t\u00E9'].map(f => (
              <span key={f} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#d4ddf5', color: '#2a4a8a' }}>{f}</span>
            ))}
          </div>
          {(stats.idr_pending || 0) > 0 && !idrRunning && (
            <div style={{ background: '#faf8f5', border: '1px solid #e8e2d8', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#1a1210' }}>
                <strong>{fmt(stats.idr_pending)}</strong> biens {'\u00e0'} traiter
              </span>
              <span style={{ fontSize: 13, color: '#a06010', fontWeight: 600 }}>
                {"Co\u00fbt estim\u00e9 : ~"}{((stats.idr_pending || 0) * 0.002) < 1 ? ((stats.idr_pending || 0) * 0.002).toFixed(2) : Math.round((stats.idr_pending || 0) * 0.002)} {'\u20ac'} (Haiku)
              </span>
            </div>
          )}
          <div className="src-row">
            {!idrRunning ? (
              <button className="src-btn src-btn-red" onClick={startExtractionIDR}>{'\u25B6'} Lancer</button>
            ) : (
              <button className="src-btn src-btn-stop" onClick={() => { idrStopRef.current = true }}>{'\u25A0'} Stop</button>
            )}
          </div>
          {(idrRunning || idrStats.processed > 0) && (
            <div className="progress-wrap">
              {idrRunning && <div className="running-indicator"><PulsingDot /><Spinner /> Extraction IDR en cours...</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1210', minWidth: 100, fontFamily: "'Fraunces', serif" }}>
                  {fmt(idrStats.processed)} / {fmt(idrStats.total || idrStats.processed)}
                </span>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={idrStats.processed} max={idrStats.total || idrStats.processed || 1} color="#2a4a8a" />
                </div>
              </div>
              <div className="src-stats-row">
                <Pill color="#2a4a8a" bg="#d4ddf5"><strong>{fmt(idrStats.lots_found)}</strong> lots extraits</Pill>
                {idrStats.errors > 0 && <Pill color="#c0392b" bg="#fde0dc"><strong>{fmt(idrStats.errors)}</strong> erreurs</Pill>}
              </div>
            </div>
          )}
        </div>

        {/* ===== STEP 4: Score Travaux IA ===== */}
        <div className="src-section" style={{ borderLeftColor: '#a06010' }}>
          <div className="src-section-header">
            <StepNumber num={4} color="#a06010" />
            <div className="src-section-title">Score Travaux IA (Haiku)</div>
          </div>
          <div className="src-section-desc">
            Strat{'\u00e9'}gie : <strong>Travaux lourds</strong> uniquement. Score de 1 (rafra{'\u00ee'}chissement) {'\u00e0'} 5 (r{'\u00e9'}habilitation totale).
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {['Description', 'DPE', 'Ann\u00e9e construction', 'Prix/surface'].map(f => (
              <span key={f} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fff8f0', color: '#a06010' }}>{f}</span>
            ))}
            {scoreWithPhotos && (
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#d4f5e0', color: '#1a7a40' }}>Photos (max 3)</span>
            )}
          </div>
          {scorePendingCount > 0 && !scoreRunning && (
            <div style={{ background: '#faf8f5', border: '1px solid #e8e2d8', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#1a1210' }}>
                <strong>{fmt(scorePendingCount)}</strong> biens {'\u00e0'} scorer
              </span>
              <span style={{ fontSize: 13, color: '#a06010', fontWeight: 600 }}>
                {"Co\u00fbt estim\u00e9 : ~"}{scoreEstimatedTotal < 1 ? scoreEstimatedTotal.toFixed(2) : Math.round(scoreEstimatedTotal)} {'\u20ac'} (Haiku{scoreWithPhotos ? ' + photos' : ''})
              </span>
            </div>
          )}
          <div className="src-row">
            {!scoreRunning ? (
              <button className="src-btn src-btn-red" onClick={startScore}>{'\u25B6'} Lancer</button>
            ) : (
              <button className="src-btn src-btn-stop" onClick={() => { scoreStopRef.current = true }}>{'\u25A0'} Stop</button>
            )}
            <label className="src-toggle" role="switch">
              <input type="checkbox" checked={scoreWithPhotos} onChange={e => setScoreWithPhotos(e.target.checked)} disabled={scoreRunning} />
              <span className="src-toggle-track"><span className="src-toggle-knob" /></span>
              Analyser les photos
            </label>
            {scoreWithPhotos && <span className="src-muted" style={{ fontSize: 11 }}>(co{'\u00fb'}t ~3x plus {'\u00e9'}lev{'\u00e9'})</span>}
          </div>
          {(scoreRunning || scoreStats.processed > 0) && (
            <div className="progress-wrap">
              {scoreRunning && <div className="running-indicator"><PulsingDot /><Spinner /> Scoring en cours...</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1210', minWidth: 100, fontFamily: "'Fraunces', serif" }}>
                  {fmt(scoreStats.processed)} / {fmt(scoreStats.total)}
                </span>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={scoreStats.processed} max={scoreStats.total} color="#a06010" />
                </div>
              </div>
              <div className="src-stats-row">
                <Pill color="#1a7a40" bg="#d4f5e0"><strong>{fmt(scoreStats.scored)}</strong> scor{'\u00e9'}s</Pill>
                {scoreStats.errors > 0 && <Pill color="#c0392b" bg="#fde0dc"><strong>{fmt(scoreStats.errors)}</strong> erreurs</Pill>}
                <Pill color="#a06010" bg="#fff8f0"><strong>~{scoreCost} {'\u20AC'}</strong> co{'\u00fb'}t</Pill>
              </div>
            </div>
          )}
        </div>

        {/* ===== STEP 5: Estimation DVF ===== */}
        <div className="src-section" style={{ borderLeftColor: '#2a4a8a' }}>
          <div className="src-section-header">
            <StepNumber num={5} color="#2a4a8a" />
            <div className="src-section-title">Estimation DVF (batch)</div>
          </div>
          <div className="src-section-desc">
            Estime le prix de revente de chaque bien via les donn{'\u00e9'}es DVF (transactions notariales). Biens sans estimation ou estimation {"> "}30 jours.
          </div>
          <div style={{ background: '#faf8f5', border: '1px solid #e8e2d8', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#1a1210' }}>
              <strong>{fmt(stats.estimation_pending || 0)}</strong> biens sans estimation
            </span>
            <span style={{ fontSize: 13, color: '#2a4a8a', fontWeight: 600 }}>
              <strong>{fmt(stats.estimation_done || 0)}</strong> estim{'\u00e9'}s
            </span>
          </div>
          <div className="src-row">
            {!estimRunning ? (
              <button className="src-btn src-btn-red" onClick={startEstimation}>{'\u25B6'} Lancer le batch estimation</button>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Spinner />
                <span style={{ fontSize: 13, color: '#1a1210' }}>Estimation en cours... (peut prendre plusieurs minutes)</span>
              </span>
            )}
          </div>
          {estimStats.total > 0 && (
            <div className="progress-wrap">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1210', minWidth: 100, fontFamily: "'Fraunces', serif" }}>
                  {fmt(estimStats.done)} / {fmt(estimStats.total)}
                </span>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={estimStats.done} max={estimStats.total} color="#2a4a8a" />
                </div>
              </div>
              <div className="src-stats-row">
                <Pill color="#1a7a40" bg="#d4f5e0"><strong>{fmt(estimStats.done)}</strong> estim{'\u00e9'}s</Pill>
                {estimStats.skipped > 0 && <Pill color="#7a6a60" bg="#f0ede8"><strong>{fmt(estimStats.skipped)}</strong> ignor{'\u00e9'}s</Pill>}
                {estimStats.errors > 0 && <Pill color="#c0392b" bg="#fde0dc"><strong>{fmt(estimStats.errors)}</strong> erreurs</Pill>}
              </div>
            </div>
          )}
        </div>

        {/* ===== STEP 6: Configuration Cron ===== */}
        <div className="src-section" style={{ borderLeftColor: '#c0392b' }}>
          <div className="src-section-header">
            <StepNumber num={6} color="#c0392b" />
            <div className="src-section-title">{"Planification automatique"}</div>
          </div>
          <div className="src-section-desc">
            Crons externes (cron-job.org) {'\u2014'} activez/d{'\u00e9'}sactivez chaque t{'\u00e2'}che depuis la base.
          </div>
          {cronConfigs.length === 0 ? (
            <p className="src-muted">Chargement de la config...</p>
          ) : (() => {
            const groups = [
              { title: 'Moteur Immo', icon: '\uD83C\uDFE0', color: '#2a4a8a', ids: ['ingest', 'statut'] },
              { title: 'Validation (Regex)', icon: '\uD83D\uDD0D', color: '#f0a830', ids: ['regex'] },
              { title: 'IA (Claude Haiku)', icon: '\uD83E\uDDE0', color: '#1a7a40', ids: ['extraction', 'score_travaux'] },
              { title: 'Estimation DVF', icon: '\uD83D\uDCCA', color: '#2a4a8a', ids: ['estimation'] },
            ]

            const progressMap: Record<string, { done: number; total: number }> = {
              regex: { done: stats.regex_done || 0, total: (stats.regex_done || 0) + (stats.regex_pending || 0) },
              extraction: { done: stats.extraction_done || 0, total: (stats.extraction_done || 0) + (stats.extraction_pending || 0) },
              score_travaux: { done: stats.score_done || 0, total: (stats.score_done || 0) + (stats.score_pending || 0) },
              statut: { done: stats.disponible || 0, total: (stats.disponible || 0) + (stats.expiree || 0) },
            }

            function CronRow({ cron }: { cron: any }) {
              const pctDone = (() => { const p = progressMap[cron.id]; return p && p.total > 0 ? Math.round((p.done / p.total) * 100) : null })()
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1210', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {CRON_LABELS[cron.id] || cron.id}
                      {pctDone !== null && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: pctDone === 100 ? '#d5f5e3' : '#fef9e7', color: pctDone === 100 ? '#1e8449' : '#a06010' }}>
                          {pctDone}%
                        </span>
                      )}
                    </div>
                    <label className="src-toggle" style={{ fontSize: 11 }}>
                      <input type="checkbox" checked={cron.enabled} onChange={() => updateCron(cron.id, { enabled: !cron.enabled })} disabled={cronSaving === cron.id} />
                      <span className="src-toggle-track"><span className="src-toggle-knob" /></span>
                      <span style={{ fontWeight: 600, color: cron.enabled ? '#1a7a40' : '#c0392b', fontSize: 11 }}>{cron.enabled ? 'Actif' : 'Off'}</span>
                    </label>
                  </div>
                  <div style={{ fontSize: 11, color: '#7a6a60' }}>
                    {cronScheduleToFrench(cron.schedule)}
                  </div>
                  {cron.id === 'score_travaux' && (
                    <label className="src-toggle" style={{ fontSize: 11, marginTop: 6 }}>
                      <input type="checkbox" checked={Boolean(cron.params?.withPhotos)} onChange={() => updateCron(cron.id, { params: { ...cron.params, withPhotos: !cron.params?.withPhotos } })} disabled={cronSaving === cron.id} />
                      <span className="src-toggle-track"><span className="src-toggle-knob" /></span>
                      <span style={{ fontSize: 11 }}>Photos</span>
                    </label>
                  )}
                </>
              )
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {groups.map(group => {
                  const groupCrons = cronConfigs.filter((c: any) => group.ids.includes(c.id))
                  if (groupCrons.length === 0) return null
                  return (
                    <div key={group.title}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: group.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{group.icon}</span> {group.title}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {groupCrons.map((cron: any) => {
                          const cronColor = CRON_COLORS[cron.id] || '#7a6a60'
                          const lr = cron.last_result || {} as any
                          const hasError = lr.error || lr.errors > 0
                          const progress = progressMap[cron.id]
                          const pctDone = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null
                          return (
                            <div key={cron.id} style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
                              <div className="cron-card" style={{ borderLeftColor: cron.enabled ? cronColor : '#e8e2d8', padding: '12px 16px', flex: '1 1 220px', minWidth: 200 }}>
                                <CronRow cron={cron} />
                              </div>
                              <div style={{
                                flex: '0 0 280px', minWidth: 240, background: '#fff', border: '1.5px solid #ede8e0',
                                borderRadius: 10, padding: '10px 14px', fontSize: 11,
                                borderLeft: `3px solid ${cron.last_run ? (hasError ? '#e74c3c' : '#1a7a40') : '#e8e2d8'}`,
                              }}>
                                {cron.last_run ? (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                      <span style={{ fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>Dernier run</span>
                                      {!hasError && <span style={{ color: '#1a7a40', fontWeight: 700, fontSize: 13 }}>{'\u2713'}</span>}
                                      {hasError && <span style={{ color: '#c0392b', fontWeight: 700, fontSize: 13 }}>{'\u2717'}</span>}
                                    </div>
                                    <div style={{ color: '#1a1210', marginBottom: 5 }}>
                                      <span style={{ fontWeight: 600 }}>{new Date(cron.last_run).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                                      {' \u00E0 '}
                                      <span>{new Date(cron.last_run).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                      <span style={{ color: '#c0b8ae', marginLeft: 6 }}>({timeAgo(cron.last_run)})</span>
                                    </div>
                                    {cron.id === 'statut' && stats.verif_cycle_total > 0 ? (() => {
                                      const cd = stats.verif_cycle_done || 0
                                      const ct = stats.verif_cycle_total || 1
                                      const ce = stats.verif_cycle_expired || 0
                                      const cp = Math.min(100, Math.round(cd / ct * 100))
                                      const rem = Math.max(0, ct - cd)
                                      const perHour = (stats.verified_24h || 0) / 24
                                      const dLeft = perHour > 0 ? Math.ceil(rem / perHour) : '?'
                                      return (
                                        <>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7a6a60', marginBottom: 3 }}>
                                            <span>Cycle {stats.verif_cycle || 1} : {fmt(cd)}/{fmt(ct)}</span>
                                            <span style={{ fontWeight: 700, color: cp >= 100 ? '#1e8449' : '#2a4a8a' }}>{cp}%</span>
                                          </div>
                                          <div style={{ height: 4, borderRadius: 2, background: '#f0ede8', overflow: 'hidden', marginBottom: 4 }}>
                                            <div style={{ height: '100%', borderRadius: 2, background: cp >= 100 ? '#1e8449' : '#7a6a60', width: `${cp}%`, transition: 'width 0.6s ease' }} />
                                          </div>
                                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <Pill color="#c0392b" bg="#fde0dc"><strong>{ce}</strong> {"expir\u00E9s"}</Pill>
                                            <Pill color="#2a4a8a" bg="#d4ddf5"><strong>{fmt(stats.verified_24h || 0)}</strong> /24h</Pill>
                                            {rem > 0 && <Pill color="#7a6a60" bg="#f0ede8">~{dLeft}h</Pill>}
                                            {cp >= 100 && <Pill color="#1e8449" bg="#d5f5e3">{'\u2713'} {"termin\u00E9"}</Pill>}
                                          </div>
                                        </>
                                      )
                                    })() : (
                                      <>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                          {(lr.processed || lr.total || lr.checked || 0) > 0 && <Pill color="#2a4a8a" bg="#d4ddf5"><strong>{lr.processed || lr.total || lr.checked}</strong> {"trait\u00E9s"}</Pill>}
                                          {lr.new > 0 && <Pill color="#1a7a40" bg="#d4f5e0"><strong>{lr.new}</strong> nouv.</Pill>}
                                          {lr.expired > 0 && <Pill color="#c0392b" bg="#fde0dc"><strong>{lr.expired}</strong> {"expir\u00E9s"}</Pill>}
                                          {lr.loyer_found > 0 && <Pill color="#1a7a40" bg="#d4f5e0"><strong>{lr.loyer_found}</strong> loyers</Pill>}
                                          {lr.profil_found > 0 && <Pill color="#2a4a8a" bg="#d4ddf5"><strong>{lr.profil_found}</strong> profils</Pill>}
                                          {lr.scored > 0 && <Pill color="#a06010" bg="#fff8f0"><strong>{lr.scored}</strong> {"scor\u00E9s"}</Pill>}
                                          {(lr.errors || 0) > 0 && <Pill color="#c0392b" bg="#fde0dc"><strong>{lr.errors}</strong> err.</Pill>}
                                          {lr.skipped && <Pill color="#7a6a60" bg="#f0ede8">off</Pill>}
                                        </div>
                                        {progress && progress.total > 0 && (
                                          <div style={{ marginTop: 6 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7a6a60', marginBottom: 2 }}>
                                              <span>{fmt(progress.done)}/{fmt(progress.total)}</span>
                                              <span style={{ fontWeight: 700, color: pctDone === 100 ? '#1e8449' : '#a06010' }}>{pctDone}%</span>
                                            </div>
                                            <div style={{ height: 4, borderRadius: 2, background: '#f0ede8', overflow: 'hidden' }}>
                                              <div style={{ height: '100%', borderRadius: 2, background: pctDone === 100 ? '#1e8449' : cronColor, width: `${pctDone}%`, transition: 'width 0.6s ease' }} />
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <span style={{ color: '#c0b8ae', fontStyle: 'italic' }}>{"Jamais ex\u00E9cut\u00E9"}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>
    </Layout>
  )
}
