'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

const TMI_OPTIONS = [0, 11, 30, 41, 45]
const REGIME_OPTIONS = [
  { value: 'nu_micro_foncier', label: 'Nu Micro-foncier' },
  { value: 'nu_reel_foncier', label: 'Nu R\u00e9el foncier' },
  { value: 'lmnp_micro_bic', label: 'LMNP Micro-BIC' },
  { value: 'lmnp_reel_bic', label: 'LMNP R\u00e9el BIC' },
  { value: 'lmp_reel_bic', label: 'LMP R\u00e9el BIC' },
  { value: 'sci_is', label: "SCI \u00e0 l'IS" },
  { value: 'marchand_de_biens', label: 'Marchand de biens (IS)' },
]

function Tooltip({ text }: { text: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', marginLeft: 6, cursor: 'help' }} className="tooltip-wrap">
      <span className="tooltip-icon">?</span>
      <span className="tooltip-bubble">{text}</span>
    </span>
  )
}

export default function ParametresPage() {
  const [profile, setProfile] = useState<any>(null)
  const [plan, setPlan] = useState<string>('free')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [alertes, setAlertes] = useState<any[]>([])
  const [maxAlertes, setMaxAlertes] = useState(5)
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [alertForm, setAlertForm] = useState<Record<string, any>>({ nom: '', strategie_mdb: 'Locataire en place', frequence: 'quotidien' })
  const [alertSaving, setAlertSaving] = useState(false)
  const [alertError, setAlertError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { window.location.href = '/login'; return }
        const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!res.ok) throw new Error('Impossible de charger le profil')
        const data = await res.json()
        setProfile(data.profile)
        setPlan(data.profile?.plan || 'free')
        if (data.profile?.plan === 'pro' || data.profile?.plan === 'expert') {
          const aRes = await fetch('/api/alertes', { headers: { Authorization: `Bearer ${session.access_token}` } })
          if (aRes.ok) { const aData = await aRes.json(); setAlertes(aData.alertes || []); setMaxAlertes(aData.maxAlertes || 1) }
        }
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement du profil')
      } finally {
        setLoading(false)
      }
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
    if (data.error) { console.error('Erreur sauvegarde profil:', data.error); setError(`Erreur : ${data.error}`) } else { setProfile(data.profile); setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
    setSaving(false)
  }

  function update(key: string, value: any) { setProfile((p: any) => ({ ...p, [key]: value })) }
  function updateNum(key: string, raw: string) { update(key, raw === '' ? null : Number(raw)) }

  async function createAlerte() {
    setAlertSaving(true); setAlertError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/alertes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(alertForm),
    })
    const data = await res.json()
    if (!res.ok) { setAlertError(data.error || 'Erreur'); setAlertSaving(false); return }
    setAlertes(prev => [data.alerte, ...prev])
    setShowAlertForm(false)
    setAlertForm({ nom: '', strategie_mdb: 'Locataire en place', frequence: 'quotidien' })
    setAlertSaving(false)
  }

  async function toggleAlerte(id: string, enabled: boolean) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/alertes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id, enabled }),
    })
    setAlertes(prev => prev.map(a => a.id === id ? { ...a, enabled } : a))
  }

  async function deleteAlerte(id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/alertes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id }),
    })
    setAlertes(prev => prev.filter(a => a.id !== id))
  }

  if (loading) return (
    <Layout>
      <div style={{ maxWidth: '720px', margin: '48px auto', padding: '0 24px' }}>
        <div style={{ width: '200px', height: '32px', background: '#e8e2d8', borderRadius: '8px', marginBottom: '8px', animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ width: '320px', height: '16px', background: '#e8e2d8', borderRadius: '8px', marginBottom: '40px', animation: 'pulse 1.5s ease infinite', animationDelay: '0.1s' }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: '16px', padding: '32px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ width: '120px', height: '12px', background: '#e8e2d8', borderRadius: '8px', marginBottom: '20px', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.15}s` }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ height: '44px', background: '#f7f4f0', borderRadius: '8px', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.15 + 0.1}s` }} />
              <div style={{ height: '44px', background: '#f7f4f0', borderRadius: '8px', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.15 + 0.2}s` }} />
            </div>
          </div>
        ))}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    </Layout>
  )

  const isFree = plan === 'free'

  return (
    <Layout>
      <style>{`
        .profil-wrap { max-width: 720px; margin: 48px auto; padding: 0 24px; }
        .profil-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; color: #1a1210; }
        .profil-sub { font-size: 16px; color: #7a6a60; margin-bottom: 40px; line-height: 1.5; }
        .profil-section { background: #fff; border-radius: 16px; padding: 32px; margin-bottom: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .profil-section-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; color: #1a1210; margin-bottom: 8px; padding-bottom: 12px; border-bottom: 2px solid #e8e2d8; }
        .profil-section-desc { font-size: 14px; color: #7a6a60; margin-bottom: 20px; }
        .profil-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .profil-field { display: flex; flex-direction: column; gap: 4px; }
        .profil-label { font-size: 12px; font-weight: 600; color: #7a6a60; letter-spacing: 0.06em; text-transform: uppercase; }
        .profil-input, .profil-select { padding: 12px 16px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1a1210; background: #faf8f5; outline: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
        .profil-input:focus, .profil-select:focus { border-color: #c0392b; box-shadow: 0 0 0 3px rgba(192,57,43,0.1); }
        .profil-hint { font-size: 12px; color: #bfb2a6; margin-top: 4px; }
        .tmi-options { display: flex; gap: 8px; flex-wrap: wrap; }
        .tmi-btn { padding: 8px 16px; border-radius: 8px; border: 2px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 150ms ease; background: #faf8f5; color: #7a6a60; }
        .tmi-btn:hover { border-color: #1a1210; color: #1a1210; background: #fff; }
        .tmi-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; box-shadow: 0 2px 8px rgba(26,18,16,0.2); }
        .save-btn { width: 100%; padding: 16px; border-radius: 12px; border: none; background: #c0392b; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: opacity 150ms ease, transform 150ms ease; }
        .save-btn:hover { opacity: 0.85; }
        .save-btn:active { transform: scale(0.99); }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .profil-toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); z-index: 100; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 20px rgba(0,0,0,0.15); animation: toastSlideUp 300ms ease; }
        .profil-toast-success { background: #1a7a40; color: #fff; }
        .profil-toast-error { background: #e74c3c; color: #fff; }
        @keyframes toastSlideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .profil-error { background: #fdedec; color: #e74c3c; border-radius: 8px; padding: 12px 16px; font-size: 14px; margin-bottom: 16px; }
        .tooltip-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 16px; height: 16px; border-radius: 50%; background: #e8e2d8;
          font-size: 10px; font-weight: 700; color: #7a6a60; line-height: 1;
          transition: background 150ms ease, color 150ms ease;
        }
        .tooltip-wrap:hover .tooltip-icon { background: #c0392b; color: #fff; }
        .tooltip-bubble {
          display: none; position: absolute; bottom: calc(100% + 8px); left: 50%;
          transform: translateX(-50%); background: #1a1210; color: #fff;
          font-size: 12px; font-weight: 400; line-height: 1.5; padding: 10px 14px;
          border-radius: 10px; width: 260px; z-index: 50;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2); text-transform: none; letter-spacing: 0;
        }
        .tooltip-bubble::after {
          content: ''; position: absolute; top: 100%; left: 50%;
          transform: translateX(-50%); border: 6px solid transparent;
          border-top-color: #1a1210;
        }
        .tooltip-wrap:hover .tooltip-bubble { display: block; }
        @media (max-width: 768px) {
          .profil-wrap { padding: 0 16px; margin: 24px auto; }
          .profil-title { font-size: 24px; }
          .profil-section { padding: 24px 16px; }
          .profil-grid { grid-template-columns: 1fr; }
          .tmi-options { gap: 4px; }
          .tmi-btn { padding: 8px 12px; font-size: 12px; }
        }
      `}</style>

      <div className="profil-wrap">
        <h1 className="profil-title">{"Mes param\u00E8tres"}</h1>
        <p className="profil-sub">{"Vos param\u00E8tres sont utilis\u00E9s automatiquement dans le simulateur fiscal et les analyses de rentabilit\u00E9."}</p>

        {error && <div className="profil-error" role="alert">{error}</div>}
        {success && <div className="profil-toast profil-toast-success" role="status">{"Profil sauvegard\u00E9 avec succ\u00E8s"}</div>}

        {isFree && (
          <div style={{
            background: 'rgba(192,57,43,0.06)', border: '1.5px solid rgba(192,57,43,0.15)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1210', marginBottom: 4 }}>
                {"Fonctionnalit\u00E9 r\u00E9serv\u00E9e au plan Pro"}
              </div>
              <div style={{ fontSize: 13, color: '#7a6a60' }}>
                {"Personnalisez vos param\u00E8tres fiscaux et de financement pour des analyses sur-mesure."}
              </div>
            </div>
            <a href="/mon-profil" style={{
              display: 'inline-block', padding: '10px 24px', borderRadius: 10,
              background: '#c0392b', color: '#fff', fontWeight: 600, fontSize: 14,
              textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap'
            }}>
              {"Passer au Pro \u2014 19 \u20AC/mois"}
            </a>
          </div>
        )}

        <form onSubmit={handleSave} style={isFree ? { filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' as const } : {}}>

          <div className="profil-section">
            <h2 className="profil-section-title">{"Fiscalit\u00E9"}</h2>
            <p className="profil-section-desc">{"Votre situation fiscale pour les simulations de rendement net."}</p>
            <div className="profil-field" style={{ marginBottom: '20px' }}>
              <label className="profil-label" id="tmi-label">Tranche marginale d'imposition (TMI)<Tooltip text={"Votre taux d\u2019imposition le plus \u00E9lev\u00E9 sur vos revenus. Il d\u00E9termine combien d\u2019imp\u00F4t vous paierez sur vos loyers. Consultez votre dernier avis d\u2019imposition pour le conna\u00EEtre."} /></label>
              <div className="tmi-options" role="group" aria-labelledby="tmi-label">
                {TMI_OPTIONS.map(t => (
                  <button key={t} type="button" className={`tmi-btn ${profile?.tmi === t ? 'active' : ''}`} onClick={() => update('tmi', t)} aria-pressed={profile?.tmi === t} aria-label={`TMI ${t} pourcent`}>{t} %</button>
                ))}
              </div>
            </div>
            <div className="profil-field">
              <label className="profil-label" htmlFor="regime-select">{"R\u00E9gime fiscal principal"}<Tooltip text={"Le r\u00E9gime fiscal d\u00E9termine comment vos revenus locatifs sont impos\u00E9s. Micro = forfait simple, R\u00E9el = d\u00E9duction des charges r\u00E9elles. LMNP = location meubl\u00E9e, Nu = location vide."} /></label>
              <select id="regime-select" className="profil-select" value={profile?.regime || 'nu_micro_foncier'} onChange={e => update('regime', e.target.value)} aria-label="R\u00E9gime fiscal">
                {REGIME_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {profile?.plan === 'pro' && (
              <>
                <div className="profil-field">
                  <label className="profil-label" htmlFor="regime2-select">{"R\u00E9gime de comparaison"}<Tooltip text={"Le second r\u00E9gime affich\u00E9 dans l\u2019analyse fiscale pour comparer c\u00F4te \u00E0 c\u00F4te. En plan Pro, vous comparez 2 r\u00E9gimes. En Expert, tous les r\u00E9gimes sont accessibles."} /></label>
                  <select id="regime2-select" className="profil-select" value={profile?.regime2 || 'nu_reel_foncier'} onChange={e => update('regime2', e.target.value)} aria-label="R\u00E9gime de comparaison">
                    {REGIME_OPTIONS.filter(r => r.value !== profile?.regime).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="profil-field">
                  <label className="profil-label" htmlFor="strategie-select">{"Strat\u00E9gie MDB principale"}<Tooltip text={"Les strat\u00E9gies d\u00E9terminent quels biens sont visibles dans le listing. En plan Pro, vous acc\u00E9dez \u00E0 2 strat\u00E9gies. En Expert, toutes les strat\u00E9gies sont accessibles."} /></label>
                  <select id="strategie-select" className="profil-select" value={profile?.strategie_mdb || 'Locataire en place'} onChange={e => update('strategie_mdb', e.target.value)} aria-label={"Strat\u00E9gie MDB principale"}>
                    <option value="Locataire en place">Locataire en place</option>
                    <option value="Travaux lourds">Travaux lourds</option>
                    <option value="Division">Division</option>
                  </select>
                </div>
                <div className="profil-field">
                  <label className="profil-label" htmlFor="strategie2-select">{"Strat\u00E9gie MDB secondaire"}<Tooltip text={"Votre seconde strat\u00E9gie. Immeuble de rapport est r\u00E9serv\u00E9 au plan Expert."} /></label>
                  <select id="strategie2-select" className="profil-select" value={profile?.strategie_mdb_2 || 'Travaux lourds'} onChange={e => update('strategie_mdb_2', e.target.value)} aria-label={"Strat\u00E9gie MDB secondaire"}>
                    {['Locataire en place', 'Travaux lourds', 'Division'].filter(s => s !== profile?.strategie_mdb).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {profile?.pro_config_updated_at && (() => {
                  const last = new Date(profile.pro_config_updated_at)
                  const next = new Date(last.getTime() + 7 * 24 * 60 * 60 * 1000)
                  const canChange = Date.now() >= next.getTime()
                  return !canChange ? (
                    <p style={{ fontSize: '11px', color: '#7a6a60', fontStyle: 'italic', margin: '0' }}>
                      {`Prochain changement de strat\u00E9gies et r\u00E9gime de comparaison possible le ${next.toLocaleDateString('fr-FR')}.`}
                    </p>
                  ) : null
                })()}
              </>
            )}
          </div>

          <div className="profil-section">
            <h2 className="profil-section-title">Financement</h2>
            <p className="profil-section-desc">{"Param\u00E8tres de cr\u00E9dit utilis\u00E9s pour calculer la mensualit\u00E9 et le cashflow."}</p>
            <div className="profil-grid">
              <div className="profil-field" style={{ gridColumn: '1 / -1' }}>
                <label className="profil-label">{"Type de cr\u00E9dit"}<Tooltip text={"Amortissable : vous remboursez capital + int\u00E9r\u00EAts chaque mois. In fine : vous ne payez que les int\u00E9r\u00EAts, le capital est rembours\u00E9 en une fois \u00E0 la revente."} /></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => update('type_credit', 'amortissable')} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: `2px solid ${(profile?.type_credit || 'amortissable') === 'amortissable' ? '#c0392b' : '#e8e2d8'}`, background: (profile?.type_credit || 'amortissable') === 'amortissable' ? '#fdf5f4' : '#fff', color: (profile?.type_credit || 'amortissable') === 'amortissable' ? '#c0392b' : '#7a6a60', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Amortissable</button>
                  <button type="button" onClick={() => update('type_credit', 'in_fine')} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: `2px solid ${profile?.type_credit === 'in_fine' ? '#c0392b' : '#e8e2d8'}`, background: profile?.type_credit === 'in_fine' ? '#fdf5f4' : '#fff', color: profile?.type_credit === 'in_fine' ? '#c0392b' : '#7a6a60', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>In fine</button>
                </div>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="apport-input">Apport ({'\u20AC'})<Tooltip text={"La somme que vous investissez de votre poche, sans emprunt. Plus l\u2019apport est \u00E9lev\u00E9, moins vous empruntez et plus le cashflow est favorable."} /></label>
                <input id="apport-input" className="profil-input" type="number" value={profile?.apport ?? ''} onChange={e => updateNum('apport', e.target.value)} aria-label="Montant de l'apport" />
                <span className="profil-hint">Montant que vous pouvez investir</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="taux-credit-input">{"Taux cr\u00E9dit (%)"}<Tooltip text={"Le taux d\u2019int\u00E9r\u00EAt annuel de votre emprunt immobilier. En 2025-2026, les taux sont g\u00E9n\u00E9ralement entre 3% et 4% sur 20-25 ans."} /></label>
                <input id="taux-credit-input" className="profil-input" type="number" step="0.01" value={profile?.taux_credit ?? ''} onChange={e => updateNum('taux_credit', e.target.value)} aria-label="Taux du cr\u00E9dit en pourcentage" />
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="taux-assurance-input">Taux assurance (%)<Tooltip text={"L\u2019assurance emprunteur (ADI) couvre le remboursement du cr\u00E9dit en cas de d\u00E9c\u00E8s ou d\u2019invalidit\u00E9. Taux habituel : 0.10% \u00E0 0.50% selon votre \u00E2ge."} /></label>
                <input id="taux-assurance-input" className="profil-input" type="number" step="0.01" value={profile?.taux_assurance ?? ''} onChange={e => updateNum('taux_assurance', e.target.value)} aria-label="Taux de l'assurance en pourcentage" />
                <span className="profil-hint">{"Taux moyen ADI d\u00E9c\u00E8s-PTIA"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="duree-input">{"Dur\u00E9e (ans)"}<Tooltip text={"La dur\u00E9e de votre cr\u00E9dit immobilier. Plus c\u2019est long, plus les mensualit\u00E9s sont basses (meilleur cashflow) mais plus vous payez d\u2019int\u00E9r\u00EAts au total."} /></label>
                <input id="duree-input" className="profil-input" type="number" value={profile?.duree_ans ?? ''} onChange={e => updateNum('duree_ans', e.target.value)} aria-label={"Dur\u00E9e du cr\u00E9dit en ann\u00E9es"} />
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="frais-notaire-input">Frais de notaire (%)<Tooltip text={"Les frais d\u2019acquisition (improprement appel\u00E9s \u00AB frais de notaire \u00BB). ~7.5% dans l\u2019ancien, ~2.5% dans le neuf. Ils s\u2019ajoutent au prix d\u2019achat."} /></label>
                <input id="frais-notaire-input" className="profil-input" type="number" step="0.1" value={profile?.frais_notaire ?? ''} onChange={e => updateNum('frais_notaire', e.target.value)} aria-label="Frais de notaire en pourcentage" />
                <span className="profil-hint">~7.5% ancien, ~2.5% neuf</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="objectif-cashflow-input">Objectif cashflow brut (% du FAI)<Tooltip text={"Le cashflow est la diff\u00E9rence entre le loyer re\u00E7u et les charges (cr\u00E9dit, charges, imp\u00F4ts). 0% = \u00E9quilibre (le loyer couvre tout). 5% = vous gagnez 5% du prix du bien par an en plus."} /></label>
                <input id="objectif-cashflow-input" className="profil-input" type="number" step="0.1" value={profile?.objectif_cashflow ?? ''} onChange={e => updateNum('objectif_cashflow', e.target.value)} aria-label="Objectif de cashflow en pourcentage du prix FAI" />
                <span className="profil-hint">0 = {"équilibre"} | 5 = +5% du prix FAI/an</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="objectif-pv-input">{"Objectif plus-value brute (%)"}<Tooltip text={"La plus-value vis\u00E9e \u00E0 la revente, en pourcentage du co\u00FBt total (achat + notaire + travaux). Ex : 20% sur un bien \u00E0 100k\u20AC = objectif de revente \u00E0 120k\u20AC."} /></label>
                <input id="objectif-pv-input" className="profil-input" type="number" step="1" value={profile?.objectif_pv ?? ''} onChange={e => updateNum('objectif_pv', e.target.value)} aria-label="Objectif de plus-value brute en pourcentage" />
                <span className="profil-hint">{"PV brute vis\u00E9e sur le co\u00FBt total (achat + notaire + travaux)"}</span>
              </div>
            </div>
          </div>

          <div className="profil-section">
            <h2 className="profil-section-title">{"Charges r\u00e9currentes"}</h2>
            <p className="profil-section-desc">{"Ces charges sont int\u00e9gr\u00e9es automatiquement dans le calcul du cashflow net et la simulation fiscale."}</p>
            <div className="profil-grid">
              <div className="profil-field">
                <label className="profil-label" htmlFor="pno-input">{"Assurance PNO (\u20AC/an)"}<Tooltip text={"Assurance Propri\u00E9taire Non Occupant. Obligatoire en copropri\u00E9t\u00E9, elle couvre les dommages au bien (d\u00E9g\u00E2t des eaux, incendie, etc.) quand vous n\u2019y habitez pas."} /></label>
                <input id="pno-input" className="profil-input" type="number" placeholder={"200"} value={profile?.assurance_pno ?? ''} onChange={e => updateNum('assurance_pno', e.target.value)} aria-label="Assurance PNO en euros par an" />
                <span className="profil-hint">{"Propri\u00e9taire Non Occupant \u2014 ~150 \u00e0 300 \u20AC/an"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="gestion-input">{"Frais de gestion locative (% des loyers)"}<Tooltip text={"Si vous d\u00E9l\u00E9guez la gestion \u00E0 une agence (recherche de locataire, quittances, \u00E9tats des lieux), comptez 6 \u00E0 10% des loyers. 0% si vous g\u00E9rez vous-m\u00EAme."} /></label>
                <input id="gestion-input" className="profil-input" type="number" step="0.5" placeholder={"8"} value={profile?.frais_gestion_pct ?? ''} onChange={e => updateNum('frais_gestion_pct', e.target.value)} aria-label="Frais de gestion locative en pourcentage des loyers" />
                <span className="profil-hint">{"Agence ou gestionnaire \u2014 0% si gestion directe"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="comptable-input">{"Honoraires expert-comptable (\u20AC/an)"}<Tooltip text={"N\u00E9cessaire en LMNP r\u00E9el et SCI IS pour la d\u00E9claration fiscale et le bilan comptable. Comptez 400 \u00E0 800\u20AC/an selon la complexit\u00E9."} /></label>
                <input id="comptable-input" className="profil-input" type="number" placeholder={"600"} value={profile?.honoraires_comptable ?? ''} onChange={e => updateNum('honoraires_comptable', e.target.value)} aria-label="Honoraires expert-comptable en euros par an" />
                <span className="profil-hint">{"Obligatoire en LMNP r\u00e9el et SCI IS"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="cfe-input">{"CFE (\u20AC/an)"}<Tooltip text={"Cotisation Fonci\u00E8re des Entreprises. Un imp\u00F4t local d\u00FB par les loueurs meubl\u00E9s (LMNP/LMP). Le montant varie selon la commune, g\u00E9n\u00E9ralement 200 \u00E0 500\u20AC/an."} /></label>
                <input id="cfe-input" className="profil-input" type="number" placeholder={"300"} value={profile?.cfe ?? ''} onChange={e => updateNum('cfe', e.target.value)} aria-label="CFE en euros par an" />
                <span className="profil-hint">{"Cotisation Fonci\u00e8re des Entreprises \u2014 varie par commune"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="oga-input">{"Frais OGA/CGA (\u20AC/an)"}<Tooltip text={"Organisme de Gestion Agr\u00E9\u00E9. Adh\u00E9rer \u00E0 un OGA \u00E9vite une majoration de 20% de vos revenus imposables en r\u00E9gime r\u00E9el. Co\u00FBt : ~130 \u00E0 200\u20AC/an."} /></label>
                <input id="oga-input" className="profil-input" type="number" placeholder={"150"} value={profile?.frais_oga ?? ''} onChange={e => updateNum('frais_oga', e.target.value)} aria-label="Frais OGA CGA en euros par an" />
                <span className="profil-hint">{"R\u00e9duction d\u2019imp\u00f4t 2/3 plafonn\u00e9 \u00e0 915 \u20AC/an"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="frais-bancaires-input">{"Frais bancaires (\u20AC)"}<Tooltip text={"Frais de dossier bancaire + garantie (hypoth\u00E8que ou caution). Pay\u00E9s une seule fois \u00E0 l\u2019achat, ils sont r\u00E9partis sur la dur\u00E9e du cr\u00E9dit dans nos calculs."} /></label>
                <input id="frais-bancaires-input" className="profil-input" type="number" placeholder={"2000"} value={profile?.frais_bancaires ?? ''} onChange={e => updateNum('frais_bancaires', e.target.value)} aria-label="Frais bancaires en euros" />
                <span className="profil-hint">{"Frais de dossier + garantie \u2014 annualis\u00E9s sur la dur\u00E9e du cr\u00E9dit"}</span>
              </div>
            </div>
          </div>

          <div className="profil-section">
            <h2 className="profil-section-title">Budget travaux au m2</h2>
            <p className="profil-section-desc">{"Ajustez le co\u00FBt estim\u00E9 par m2 pour chaque niveau de travaux."}</p>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '16px' }}>
              {"Chaque bien en stratégie Travaux lourds reçoit un score de 1 à 5 par notre IA, basé sur l'analyse des photos et de la description de l'annonce. Ce score reflète l'ampleur des travaux à prévoir."}
            </p>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '20px' }}>
              {"Les valeurs pré-remplies sont nos estimations actuelles du coût moyen des travaux au m² pour chaque niveau. Elles nous paraissent réalistes, mais restent indicatives. N'hésitez pas à les ajuster selon votre expérience, votre région ou vos artisans. Ces valeurs seront utilisées pour estimer le budget total de rénovation sur les fiches biens."}
            </p>
            <div style={{ background: '#faf8f5', borderRadius: '12px', padding: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>Score</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>{"Niveau de travaux"}</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>{"Exemples"}</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>{`Budget \u20AC/m\u00B2`}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { score: '1', label: 'Rafra\u00EEchissement', desc: 'Peinture, sol, petites finitions', color: '#1a7a40', bg: '#d4f5e0' },
                    { score: '2', label: 'Travaux l\u00E9gers', desc: 'Cuisine, salle de bain, \u00E9lectricit\u00E9 partielle', color: '#3a8a20', bg: '#e0f5d4' },
                    { score: '3', label: 'Travaux moyens', desc: 'R\u00E9novation compl\u00E8te int\u00E9rieure, plomberie, \u00E9lectricit\u00E9', color: '#a06010', bg: '#fff8f0' },
                    { score: '4', label: 'Travaux lourds', desc: 'Reprise structure partielle, toiture, fa\u00E7ade, redistribution', color: '#c0392b', bg: '#fde8e8' },
                    { score: '5', label: 'R\u00E9habilitation compl\u00E8te', desc: 'Ruine, tout \u00E0 refaire : structure, charpente, planchers, r\u00E9seaux', color: '#8b0000', bg: '#fde0e0' },
                  ].map(row => (
                    <tr key={row.score}>
                      <td style={{ padding: '12px', borderBottom: '1px solid #e8e2d8' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', color: row.color, background: row.bg }}>{row.score}</span>
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #e8e2d8', fontWeight: 600, fontSize: '13px', color: '#1a1210' }}>{row.label}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #e8e2d8', fontSize: '12px', color: '#7a6a60' }}>{row.desc}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #e8e2d8', textAlign: 'right' }}>
                        <input
                          className="profil-input"
                          type="number"
                          step="50"
                          style={{ width: '100px', textAlign: 'right' }}
                          aria-label={`Budget \u20AC/m\u00B2 pour score ${row.score} - ${row.label}`}
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
            <p style={{ fontSize: '12px', color: '#bfb2a6', marginTop: '12px', fontStyle: 'italic' }}>
              {"Ces montants sont indicatifs et varient selon la région, l'état réel du bien et la qualité des finitions souhaitées."}
            </p>
          </div>

          <button className="save-btn" type="submit" disabled={saving} aria-label="Sauvegarder mon profil">
            {saving ? 'Sauvegarde en cours...' : 'Sauvegarder mes param\u00E8tres'}
          </button>
        </form>

        {/* Section Alertes — Pro (1 alerte) et Expert (5 alertes) */}
        {(plan === 'pro' || plan === 'expert') && (
          <div style={{ marginTop: '32px' }}>
            <div className="profil-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 className="profil-section-title" style={{ margin: 0 }}>Mes alertes</h2>
                  <p className="profil-section-desc" style={{ margin: '4px 0 0' }}>{"Recevez par email les nouveaux biens correspondant \u00E0 vos crit\u00E8res."}</p>
                </div>
                {alertes.length < maxAlertes && (
                  <button onClick={() => setShowAlertForm(true)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#c0392b', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                    + Nouvelle alerte
                  </button>
                )}
              </div>

              {/* Formulaire de création */}
              {showAlertForm && (
                <div style={{ background: '#faf8f5', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1.5px solid #e8e2d8' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', marginBottom: '4px', display: 'block' }}>Nom de l'alerte *</label>
                      <input className="profil-input" value={alertForm.nom || ''} onChange={e => setAlertForm(f => ({ ...f, nom: e.target.value }))} placeholder={"Locataire Lyon < 200k\u20AC"} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', marginBottom: '4px', display: 'block' }}>{"Strat\u00E9gie *"}</label>
                      <select className="profil-select" value={alertForm.strategie_mdb} onChange={e => setAlertForm(f => ({ ...f, strategie_mdb: e.target.value }))}>
                        <option value="Locataire en place">Locataire en place</option>
                        <option value="Travaux lourds">Travaux lourds</option>
                        <option value="Immeuble de rapport">Immeuble de rapport</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', marginBottom: '4px', display: 'block' }}>{"M\u00E9tropole"}</label>
                      <input className="profil-input" value={alertForm.metropole || ''} onChange={e => setAlertForm(f => ({ ...f, metropole: e.target.value }))} placeholder="Lyon" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', marginBottom: '4px', display: 'block' }}>{"Prix min (\u20AC)"}</label>
                      <input className="profil-input" type="number" value={alertForm.prix_min || ''} onChange={e => setAlertForm(f => ({ ...f, prix_min: e.target.value }))} placeholder="50 000" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', marginBottom: '4px', display: 'block' }}>{"Prix max (\u20AC)"}</label>
                      <input className="profil-input" type="number" value={alertForm.prix_max || ''} onChange={e => setAlertForm(f => ({ ...f, prix_max: e.target.value }))} placeholder="200 000" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', marginBottom: '4px', display: 'block' }}>{"Surface min (m\u00B2)"}</label>
                      <input className="profil-input" type="number" value={alertForm.surface_min || ''} onChange={e => setAlertForm(f => ({ ...f, surface_min: e.target.value }))} placeholder="30" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', marginBottom: '4px', display: 'block' }}>{"Surface max (m\u00B2)"}</label>
                      <input className="profil-input" type="number" value={alertForm.surface_max || ''} onChange={e => setAlertForm(f => ({ ...f, surface_max: e.target.value }))} placeholder="80" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', marginBottom: '4px', display: 'block' }}>Rendement min (%)</label>
                      <input className="profil-input" type="number" step="0.1" value={alertForm.rendement_min || ''} onChange={e => setAlertForm(f => ({ ...f, rendement_min: e.target.value }))} placeholder="5" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', marginBottom: '4px', display: 'block' }}>{"Fr\u00E9quence"}</label>
                      <select className="profil-select" value={alertForm.frequence} onChange={e => setAlertForm(f => ({ ...f, frequence: e.target.value }))}>
                        <option value="quotidien">Quotidien</option>
                        <option value="hebdomadaire">Hebdomadaire</option>
                      </select>
                    </div>
                  </div>
                  {alertError && <p style={{ color: '#c0392b', fontSize: '13px', marginTop: '8px' }}>{alertError}</p>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setShowAlertForm(false); setAlertError('') }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid #e8e2d8', background: '#fff', fontSize: '13px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Annuler</button>
                    <button onClick={createAlerte} disabled={alertSaving} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#c0392b', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: alertSaving ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: alertSaving ? 0.7 : 1 }}>
                      {alertSaving ? 'Cr\u00E9ation...' : 'Cr\u00E9er l\'alerte'}
                    </button>
                  </div>
                </div>
              )}

              {/* Liste des alertes */}
              {alertes.length === 0 && !showAlertForm ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#b0a898' }}>
                  <p style={{ fontSize: '14px' }}>Aucune alerte configur{'\u00E9'}e</p>
                  <p style={{ fontSize: '12px' }}>{"Cr\u00E9ez votre premi\u00E8re alerte pour recevoir les nouveaux biens par email."}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {alertes.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', borderRadius: '10px', border: '1.5px solid #e8e2d8' }}>
                      <button onClick={() => toggleAlerte(a.id, !a.enabled)} style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', background: a.enabled ? '#27ae60' : '#e8e2d8', cursor: 'pointer', position: 'relative', transition: 'background 150ms ease', flexShrink: 0 }}>
                        <span style={{ position: 'absolute', top: '2px', left: a.enabled ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 150ms ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: a.enabled ? '#1a1210' : '#b0a898' }}>{a.nom}</div>
                        <div style={{ fontSize: '12px', color: '#7a6a60', marginTop: '2px' }}>
                          {a.filtres?.strategie_mdb}
                          {a.filtres?.metropole ? ` \u2014 ${a.filtres.metropole}` : ''}
                          {a.filtres?.prix_max ? ` \u2014 < ${Number(a.filtres.prix_max).toLocaleString('fr-FR')}\u00A0\u20AC` : ''}
                          {` \u2014 ${a.frequence === 'hebdomadaire' ? 'Hebdo' : 'Quotidien'}`}
                        </div>
                      </div>
                      <button onClick={() => deleteAlerte(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: '18px', padding: '4px', flexShrink: 0 }} title="Supprimer">{'\u2715'}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}