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

export default function ParametresPage() {
  const [profile, setProfile] = useState<any>(null)
  const [plan, setPlan] = useState<string>('free')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

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
        .profil-sub { font-size: 16px; color: #9a8a80; margin-bottom: 40px; line-height: 1.5; }
        .profil-section { background: #fff; border-radius: 16px; padding: 32px; margin-bottom: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .profil-section-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; color: #1a1210; margin-bottom: 8px; padding-bottom: 12px; border-bottom: 2px solid #e8e2d8; }
        .profil-section-desc { font-size: 14px; color: #9a8a80; margin-bottom: 20px; }
        .profil-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .profil-field { display: flex; flex-direction: column; gap: 4px; }
        .profil-label { font-size: 12px; font-weight: 600; color: #9a8a80; letter-spacing: 0.06em; text-transform: uppercase; }
        .profil-input, .profil-select { padding: 12px 16px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1a1210; background: #faf8f5; outline: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
        .profil-input:focus, .profil-select:focus { border-color: #c0392b; box-shadow: 0 0 0 3px rgba(192,57,43,0.1); }
        .profil-hint { font-size: 12px; color: #bfb2a6; margin-top: 4px; }
        .tmi-options { display: flex; gap: 8px; flex-wrap: wrap; }
        .tmi-btn { padding: 8px 16px; border-radius: 8px; border: 2px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 150ms ease; background: #faf8f5; color: #9a8a80; }
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
              <div style={{ fontSize: 13, color: '#9a8a80' }}>
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
              <label className="profil-label" id="tmi-label">Tranche marginale d'imposition (TMI)</label>
              <div className="tmi-options" role="group" aria-labelledby="tmi-label">
                {TMI_OPTIONS.map(t => (
                  <button key={t} type="button" className={`tmi-btn ${profile?.tmi === t ? 'active' : ''}`} onClick={() => update('tmi', t)} aria-pressed={profile?.tmi === t} aria-label={`TMI ${t} pourcent`}>{t} %</button>
                ))}
              </div>
            </div>
            <div className="profil-field">
              <label className="profil-label" htmlFor="regime-select">{"R\u00E9gime fiscal pr\u00E9f\u00E9r\u00E9"}</label>
              <select id="regime-select" className="profil-select" value={profile?.regime || 'nu_micro_foncier'} onChange={e => update('regime', e.target.value)} aria-label="Régime fiscal">
                {REGIME_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div className="profil-section">
            <h2 className="profil-section-title">Financement</h2>
            <p className="profil-section-desc">{"Param\u00E8tres de cr\u00E9dit utilis\u00E9s pour calculer la mensualit\u00E9 et le cashflow."}</p>
            <div className="profil-grid">
              <div className="profil-field">
                <label className="profil-label" htmlFor="apport-input">Apport ({'\u20AC'})</label>
                <input id="apport-input" className="profil-input" type="number" value={profile?.apport ?? ''} onChange={e => updateNum('apport', e.target.value)} aria-label="Montant de l'apport" />
                <span className="profil-hint">Montant que vous pouvez investir</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="taux-credit-input">{"Taux cr\u00E9dit (%)"}</label>
                <input id="taux-credit-input" className="profil-input" type="number" step="0.01" value={profile?.taux_credit ?? ''} onChange={e => updateNum('taux_credit', e.target.value)} aria-label="Taux du cr\u00E9dit en pourcentage" />
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="taux-assurance-input">Taux assurance (%)</label>
                <input id="taux-assurance-input" className="profil-input" type="number" step="0.01" value={profile?.taux_assurance ?? ''} onChange={e => updateNum('taux_assurance', e.target.value)} aria-label="Taux de l'assurance en pourcentage" />
                <span className="profil-hint">{"Taux moyen ADI d\u00E9c\u00E8s-PTIA"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="duree-input">{"Dur\u00E9e (ans)"}</label>
                <input id="duree-input" className="profil-input" type="number" value={profile?.duree_ans ?? ''} onChange={e => updateNum('duree_ans', e.target.value)} aria-label={"Dur\u00E9e du cr\u00E9dit en ann\u00E9es"} />
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="frais-notaire-input">Frais de notaire (%)</label>
                <input id="frais-notaire-input" className="profil-input" type="number" step="0.1" value={profile?.frais_notaire ?? ''} onChange={e => updateNum('frais_notaire', e.target.value)} aria-label="Frais de notaire en pourcentage" />
                <span className="profil-hint">~7.5% ancien, ~2.5% neuf</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="objectif-cashflow-input">Objectif cashflow brut (% du FAI)</label>
                <input id="objectif-cashflow-input" className="profil-input" type="number" step="0.1" value={profile?.objectif_cashflow ?? ''} onChange={e => updateNum('objectif_cashflow', e.target.value)} aria-label="Objectif de cashflow en pourcentage du prix FAI" />
                <span className="profil-hint">0 = {"équilibre"} | 5 = +5% du prix FAI/an</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="objectif-pv-input">{"Objectif plus-value brute (%)"}</label>
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
                <label className="profil-label" htmlFor="pno-input">{"Assurance PNO (\u20AC/an)"}</label>
                <input id="pno-input" className="profil-input" type="number" placeholder={"200"} value={profile?.assurance_pno ?? ''} onChange={e => updateNum('assurance_pno', e.target.value)} aria-label="Assurance PNO en euros par an" />
                <span className="profil-hint">{"Propri\u00e9taire Non Occupant \u2014 ~150 \u00e0 300 \u20AC/an"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="gestion-input">{"Frais de gestion locative (% des loyers)"}</label>
                <input id="gestion-input" className="profil-input" type="number" step="0.5" placeholder={"8"} value={profile?.frais_gestion_pct ?? ''} onChange={e => updateNum('frais_gestion_pct', e.target.value)} aria-label="Frais de gestion locative en pourcentage des loyers" />
                <span className="profil-hint">{"Agence ou gestionnaire \u2014 0% si gestion directe"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="comptable-input">{"Honoraires expert-comptable (\u20AC/an)"}</label>
                <input id="comptable-input" className="profil-input" type="number" placeholder={"600"} value={profile?.honoraires_comptable ?? ''} onChange={e => updateNum('honoraires_comptable', e.target.value)} aria-label="Honoraires expert-comptable en euros par an" />
                <span className="profil-hint">{"Obligatoire en LMNP r\u00e9el et SCI IS"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="cfe-input">{"CFE (\u20AC/an)"}</label>
                <input id="cfe-input" className="profil-input" type="number" placeholder={"300"} value={profile?.cfe ?? ''} onChange={e => updateNum('cfe', e.target.value)} aria-label="CFE en euros par an" />
                <span className="profil-hint">{"Cotisation Fonci\u00e8re des Entreprises \u2014 varie par commune"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="oga-input">{"Frais OGA/CGA (\u20AC/an)"}</label>
                <input id="oga-input" className="profil-input" type="number" placeholder={"150"} value={profile?.frais_oga ?? ''} onChange={e => updateNum('frais_oga', e.target.value)} aria-label="Frais OGA CGA en euros par an" />
                <span className="profil-hint">{"R\u00e9duction d\u2019imp\u00f4t 2/3 plafonn\u00e9 \u00e0 915 \u20AC/an"}</span>
              </div>
              <div className="profil-field">
                <label className="profil-label" htmlFor="frais-bancaires-input">{"Frais bancaires (\u20AC)"}</label>
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
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>Score</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>{"Niveau de travaux"}</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>{"Exemples"}</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8e2d8' }}>{`Budget \u20AC/m\u00B2`}</th>
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
                      <td style={{ padding: '12px', borderBottom: '1px solid #e8e2d8', fontSize: '12px', color: '#9a8a80' }}>{row.desc}</td>
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
      </div>
    </Layout>
  )
}