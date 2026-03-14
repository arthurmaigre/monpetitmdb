'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

const TMI_OPTIONS = [0, 11, 30, 41, 45]
const REGIME_OPTIONS = [
  { value: 'micro_foncier', label: 'Micro foncier' },
  { value: 'reel', label: 'Reel' },
  { value: 'lmnp', label: 'LMNP' },
  { value: 'sci_is', label: 'SCI IS' },
]

export default function MonProfilPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const data = await res.json()
      setProfile(data.profile)
      setLoading(false)
    }
    loadProfile()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(profile)
    })
    const data = await res.json()
    if (data.error) { setError('Erreur lors de la sauvegarde') } else { setProfile(data.profile); setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
    setSaving(false)
  }

  function update(key: string, value: any) { setProfile((p: any) => ({ ...p, [key]: value })) }

  if (loading) return <Layout><p style={{ textAlign: 'center', padding: '80px', color: '#9a8a80' }}>Chargement...</p></Layout>

  return (
    <Layout>
      <style>{`
        .profil-wrap { max-width: 720px; margin: 48px auto; padding: 0 24px; }
        .profil-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .profil-sub { font-size: 14px; color: #9a8a80; margin-bottom: 40px; }
        .profil-section { background: #fff; border-radius: 16px; padding: 28px 32px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .profil-section-title { font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #9a8a80; margin-bottom: 20px; }
        .profil-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .profil-field { display: flex; flex-direction: column; gap: 6px; }
        .profil-label { font-size: 12px; font-weight: 600; color: #9a8a80; letter-spacing: 0.06em; text-transform: uppercase; }
        .profil-input, .profil-select { padding: 11px 14px; border-radius: 10px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1a1210; background: #faf8f5; outline: none; transition: border-color 0.15s; }
        .profil-input:focus, .profil-select:focus { border-color: #c0392b; }
        .profil-hint { font-size: 11px; color: #b0a898; margin-top: 2px; }
        .tmi-options { display: flex; gap: 8px; flex-wrap: wrap; }
        .tmi-btn { padding: 8px 16px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; background: #faf8f5; color: #1a1210; }
        .tmi-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .save-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; background: #c0392b; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: opacity 0.15s; }
        .save-btn:hover { opacity: 0.85; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .profil-success { background: #d4f5e0; color: #1a7a40; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; text-align: center; }
        .profil-error { background: #fde8e8; color: #a33; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
      `}</style>

      <div className="profil-wrap">
        <h1 className="profil-title">Mon profil</h1>
        <p className="profil-sub">Vos parametres sont utilises automatiquement dans le simulateur fiscal.</p>

        {success && <div className="profil-success">Profil sauvegarde !</div>}
        {error && <div className="profil-error">{error}</div>}

        <form onSubmit={handleSave}>

          <div className="profil-section">
            <div className="profil-section-title">Fiscalite</div>
            <div className="profil-field" style={{ marginBottom: '20px' }}>
              <label className="profil-label">Tranche marginale d'imposition (TMI)</label>
              <div className="tmi-options">
                {TMI_OPTIONS.map(t => (
                  <button key={t} type="button" className={`tmi-btn ${profile?.tmi === t ? 'active' : ''}`} onClick={() => update('tmi', t)}>{t} %</button>
                ))}
              </div>
            </div>
            <div className="profil-field">
              <label className="profil-label">Regime fiscal prefere</label>
              <select className="profil-select" value={profile?.regime || 'micro_foncier'} onChange={e => update('regime', e.target.value)}>
                {REGIME_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div className="profil-section">
            <div className="profil-section-title">Financement</div>
            <div className="profil-grid">
              <div className="profil-field">
                <label className="profil-label">Apport (euros)</label>
                <input className="profil-input" type="number" value={profile?.apport ?? ''} onChange={e => update('apport', Number(e.target.value))} />
                <span className="profil-hint">Montant que vous pouvez investir</span>
              </div>
              <div className="profil-field">
                <label className="profil-label">Taux credit (%)</label>
                <input className="profil-input" type="number" step="0.01" value={profile?.taux_credit || ''} onChange={e => update('taux_credit', Number(e.target.value))} />
              </div>
              <div className="profil-field">
                <label className="profil-label">Taux assurance (%)</label>
                <input className="profil-input" type="number" step="0.01" value={profile?.taux_assurance ?? 0.3} onChange={e => update('taux_assurance', Number(e.target.value))} />
                <span className="profil-hint">Taux moyen ADI deces-PTIA</span>
              </div>
              <div className="profil-field">
                <label className="profil-label">Duree (ans)</label>
                <input className="profil-input" type="number" value={profile?.duree_ans || ''} onChange={e => update('duree_ans', Number(e.target.value))} />
              </div>
              <div className="profil-field">
                <label className="profil-label">Frais de notaire (%)</label>
                <input className="profil-input" type="number" step="0.1" value={profile?.frais_notaire || ''} onChange={e => update('frais_notaire', Number(e.target.value))} />
                <span className="profil-hint">~7.5% ancien, ~2.5% neuf</span>
              </div>
              <div className="profil-field">
                <label className="profil-label">Objectif cashflow (% du FAI)</label>
                <input className="profil-input" type="number" step="0.1" value={profile?.objectif_cashflow ?? 0} onChange={e => update('objectif_cashflow', Number(e.target.value))} />
                <span className="profil-hint">0 = equilibre | 5 = +5% du prix FAI/an</span>
              </div>
            </div>
          </div>

          <button className="save-btn" type="submit" disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder mon profil'}
          </button>
        </form>
      </div>
    </Layout>
  )
}