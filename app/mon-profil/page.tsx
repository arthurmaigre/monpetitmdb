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

          <div className="profil-section">
            <div className="profil-section-title">Budget travaux au m2</div>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', marginBottom: '16px' }}>
              {"Chaque bien en strat\u00e9gie Travaux lourds re\u00e7oit un score de 1 \u00e0 5 par notre IA, bas\u00e9 sur l'analyse des photos et de la description de l'annonce. Ce score refl\u00e8te l'ampleur des travaux \u00e0 pr\u00e9voir."}
            </p>
            <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', marginBottom: '20px' }}>
              {"Les valeurs pr\u00e9-remplies sont nos estimations actuelles du co\u00fbt moyen des travaux au m\u00b2 pour chaque niveau. Elles nous paraissent r\u00e9alistes, mais restent indicatives. N'h\u00e9sitez pas \u00e0 les ajuster selon votre exp\u00e9rience, votre r\u00e9gion ou vos artisans. Ces valeurs seront utilis\u00e9es pour estimer le budget total de r\u00e9novation sur les fiches biens."}
            </p>
            <div style={{ background: '#faf8f5', borderRadius: '12px', padding: '20px 24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>Score</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>{"Niveau de travaux"}</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>{"Exemples"}</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>{"Budget \u20AC/m\u00b2"}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { score: '1', label: 'Rafra\u00eechissement', desc: 'Peinture, sol, petites finitions', color: '#1a7a40', bg: '#d4f5e0' },
                    { score: '2', label: 'Travaux l\u00e9gers', desc: 'Cuisine, salle de bain, \u00e9lectricit\u00e9 partielle', color: '#3a8a20', bg: '#e0f5d4' },
                    { score: '3', label: 'Travaux moyens', desc: 'R\u00e9novation compl\u00e8te int\u00e9rieure, plomberie, \u00e9lectricit\u00e9', color: '#a06010', bg: '#fff8f0' },
                    { score: '4', label: 'Travaux lourds', desc: 'Reprise structure partielle, toiture, fa\u00e7ade, redistribution', color: '#c0392b', bg: '#fde8e8' },
                    { score: '5', label: 'R\u00e9habilitation compl\u00e8te', desc: 'Ruine, tout \u00e0 refaire : structure, charpente, planchers, r\u00e9seaux', color: '#8b0000', bg: '#fde0e0' },
                  ].map(row => (
                    <tr key={row.score}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8e2d8' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', color: row.color, background: row.bg }}>{row.score}</span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8e2d8', fontWeight: 600, fontSize: '13px', color: '#1a1210' }}>{row.label}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8e2d8', fontSize: '12px', color: '#9a8a80' }}>{row.desc}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #e8e2d8', textAlign: 'right' }}>
                        <input
                          className="profil-input"
                          type="number"
                          step="50"
                          style={{ width: '100px', textAlign: 'right' }}
                          value={(profile?.budget_travaux_m2 || { '1': 200, '2': 500, '3': 800, '4': 1200, '5': 1800 })[row.score] ?? ''}
                          onChange={e => {
                            const current = profile?.budget_travaux_m2 || { '1': 200, '2': 500, '3': 800, '4': 1200, '5': 1800 }
                            update('budget_travaux_m2', { ...current, [row.score]: Number(e.target.value) })
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '11px', color: '#b0a898', marginTop: '10px', fontStyle: 'italic' }}>
              {"Ces montants sont indicatifs et varient selon la r\u00e9gion, l'\u00e9tat r\u00e9el du bien et la qualit\u00e9 des finitions souhait\u00e9es."}
            </p>
          </div>

          <button className="save-btn" type="submit" disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder mon profil'}
          </button>
        </form>
      </div>
    </Layout>
  )
}