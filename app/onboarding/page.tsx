'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import EarlyAdopterBadge from '@/components/EarlyAdopterBadge'

const STRATEGIES = [
  { value: 'Locataire en place', label: 'Locataire en place', desc: 'Biens avec locataire, rendement locatif immédiat' },
  { value: 'Travaux lourds', label: 'Travaux lourds', desc: 'Biens à rénover, plus-value à la revente' },
  { value: 'Immeuble de rapport', label: 'Immeuble de rapport', desc: 'Immeubles multi-lots, stratégie patrimoniale' },
  { value: 'Division', label: 'Division', desc: 'Division de biens, création de valeur' },
]

const TMI_OPTIONS = [
  { value: 0, label: '0 %' },
  { value: 11, label: '11 %' },
  { value: 30, label: '30 %' },
  { value: 41, label: '41 %' },
  { value: 45, label: '45 %' },
]

const REGIMES = [
  { value: 'lmnp_reel_bic', label: 'LMNP Réel BIC' },
  { value: 'lmnp_micro_bic', label: 'LMNP Micro-BIC' },
  { value: 'nu_reel_foncier', label: 'Nu Réel foncier' },
  { value: 'nu_micro_foncier', label: 'Nu Micro-foncier' },
  { value: 'sci_is', label: "SCI à l'IS" },
  { value: 'lmp_reel_bic', label: 'LMP Réel BIC' },
  { value: 'marchand_de_biens', label: 'Marchand de biens' },
]

// 3 étapes : Profil (info+fiscal) | Financement | Abonnement+Stratégie
const STEPS = [
  { num: 1, label: 'Profil investisseur' },
  { num: 2, label: 'Financement' },
  { num: 3, label: 'Abonnement' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [chosenPlan, setChosenPlan] = useState<'free' | 'pro' | 'expert'>('free')
  const [planChosen, setPlanChosen] = useState(false)

  // Étape 1 — Informations
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [isPro, setIsPro] = useState(false)
  const [entreprise, setEntreprise] = useState('')

  // Étape 1 — Fiscalité
  const [tmi, setTmi] = useState<number | null>(null)
  const [regime, setRegime] = useState('')

  // Étape 2 — Financement
  const [typeCredit, setTypeCredit] = useState<'amortissable' | 'in_fine'>('amortissable')
  const [modeApport, setModeApport] = useState<'montant' | 'pct'>('montant')
  const [apport, setApport] = useState('')
  const [apportPct, setApportPct] = useState('')
  const [tauxCredit, setTauxCredit] = useState('')
  const [tauxAssurance, setTauxAssurance] = useState('')
  const [dureeAns, setDureeAns] = useState('')

  // Étape 3 — Stratégie
  const [strategie, setStrategie] = useState('')
  const [strategie2, setStrategie2] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      const meta = user.user_metadata || {}
      const fullName = meta.full_name || meta.name || ''
      if (fullName) {
        const parts = fullName.split(' ')
        if (parts.length >= 2) {
          setPrenom(parts[0])
          setNom(parts.slice(1).join(' '))
        } else {
          setPrenom(fullName)
        }
      }
      if (meta.first_name) setPrenom(meta.first_name)
      if (meta.last_name) setNom(meta.last_name)
    })
  }, [])

  // Retour depuis Stripe — restaurer step=3 + plan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stepParam = params.get('step')
    const planParam = params.get('plan')
    if (stepParam) setStep(parseInt(stepParam))
    if (planParam === 'pro' || planParam === 'expert') {
      setChosenPlan(planParam)
      setPlanChosen(true)
    }
  }, [])

  async function saveProfile(updates: Record<string, any>) {
    if (!user) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(updates),
    })
  }

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  async function goToCheckout(plan: 'pro' | 'expert') {
    setCheckoutLoading(plan)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { window.location.href = '/login'; return }
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan, success_url: `/onboarding?step=3&plan=${plan}`, cancel_url: '/onboarding?step=3' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch { /* fallback */ }
    setCheckoutLoading(null)
  }

  function handleChooseFree() {
    setChosenPlan('free')
    setPlanChosen(true)
  }

  async function handleNext() {
    setSaving(true)
    if (step === 1) {
      const updates: Record<string, any> = { prenom, nom, tmi, regime }
      if (entreprise) updates.entreprise = entreprise
      await saveProfile(updates)
      setStep(2)
    } else if (step === 2) {
      const updates: Record<string, any> = { type_credit: typeCredit }
      if (modeApport === 'montant' && apport) updates.apport = parseFloat(apport)
      if (modeApport === 'pct' && apportPct) updates.apport_pct = parseFloat(apportPct)
      if (tauxCredit) updates.taux_credit = parseFloat(tauxCredit)
      if (tauxAssurance) updates.taux_assurance = parseFloat(tauxAssurance)
      if (dureeAns) updates.duree_ans = parseInt(dureeAns)
      await saveProfile(updates)
      setStep(3)
    } else if (step === 3 && planChosen) {
      const updates: Record<string, any> = { strategie_mdb: strategie }
      if (strategie2) updates.strategie_mdb_2 = strategie2
      await saveProfile(updates)
      window.location.href = '/biens'
    }
    setSaving(false)
  }

  const maxStrategies = chosenPlan === 'expert' ? 4 : chosenPlan === 'pro' ? 2 : 1
  const strategiesDisponibles = chosenPlan === 'expert'
    ? STRATEGIES
    : STRATEGIES.filter(s => s.value !== 'Immeuble de rapport')

  const canNext = step === 1
    ? prenom.trim() !== '' && nom.trim() !== '' && tmi !== null && !!regime
    : step === 2
    ? true
    : step === 3
    ? planChosen && !!strategie
    : true

  return (
    <>
      <style>{`
        :root { --red: ${theme.colors.primary}; --ink: ${theme.colors.ink}; --bg: ${theme.colors.bg}; --card: ${theme.colors.card}; --muted: ${theme.colors.muted}; --sand: ${theme.colors.sand}; --red-dark: ${theme.colors.buttonPrimaryHover}; }
        .ob-page { min-height: 100vh; background: ${theme.colors.bg}; display: flex; flex-direction: column; align-items: center; padding: 40px 24px; font-family: ${theme.fonts.body}; }
        .ob-logo { font-family: ${theme.fonts.display}; font-size: 22px; font-weight: 800; color: ${theme.colors.ink}; margin-bottom: 40px; }
        .ob-logo span { color: ${theme.colors.primary}; }

        .ob-stepper { display: flex; align-items: center; gap: 0; margin-bottom: 48px; }
        .ob-step { display: flex; align-items: center; gap: 10px; }
        .ob-step-num { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; border: 2px solid ${theme.colors.sand}; color: ${theme.colors.muted}; background: transparent; transition: all 0.2s; }
        .ob-step.active .ob-step-num { background: ${theme.colors.primary}; color: #fff; border-color: ${theme.colors.primary}; }
        .ob-step.done .ob-step-num { background: ${theme.colors.success}; color: #fff; border-color: ${theme.colors.success}; }
        .ob-step-label { font-size: 13px; font-weight: 500; color: ${theme.colors.muted}; }
        .ob-step.active .ob-step-label { color: ${theme.colors.ink}; font-weight: 600; }
        .ob-step.done .ob-step-label { color: ${theme.colors.success}; }
        .ob-step-line { width: 32px; height: 2px; background: ${theme.colors.sand}; margin: 0 8px; }
        .ob-step-line.done { background: ${theme.colors.success}; }

        .ob-card { background: ${theme.colors.card}; border-radius: ${theme.radii.lg}; box-shadow: ${theme.shadows.card}; padding: 40px; width: 100%; max-width: 560px; }
        .ob-card.wide { max-width: 1060px; padding: 48px; }
        .ob-title { font-family: ${theme.fonts.display}; font-size: 24px; font-weight: 800; color: ${theme.colors.ink}; margin: 0 0 8px; }
        .ob-sub { font-size: 14px; color: ${theme.colors.muted}; margin: 0 0 32px; line-height: 1.5; }

        .ob-section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${theme.colors.muted}; margin: 0 0 20px; padding-bottom: 8px; border-bottom: 1.5px solid ${theme.colors.sand}; }
        .ob-section { margin-bottom: 32px; }

        .ob-field { margin-bottom: 24px; }
        .ob-label { display: block; font-size: 12px; font-weight: 600; color: ${theme.colors.muted}; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }
        .ob-select, .ob-input { width: 100%; padding: 12px 14px; border-radius: ${theme.radii.sm}; border: 1.5px solid ${theme.colors.sand}; font-family: ${theme.fonts.body}; font-size: 14px; background: ${theme.colors.sandLight}; color: ${theme.colors.ink}; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
        .ob-select:focus, .ob-input:focus { border-color: ${theme.colors.primary}; }
        .ob-input::placeholder { color: ${theme.colors.textTertiary}; }

        .ob-toggle { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; cursor: pointer; }
        .ob-toggle-track { width: 40px; height: 22px; border-radius: 11px; background: ${theme.colors.sand}; position: relative; transition: background 0.2s; flex-shrink: 0; }
        .ob-toggle-track.on { background: ${theme.colors.primary}; }
        .ob-toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
        .ob-toggle-track.on .ob-toggle-knob { transform: translateX(18px); }
        .ob-toggle-label { font-size: 14px; color: ${theme.colors.ink}; }

        .ob-strats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ob-strat { padding: 16px; border-radius: ${theme.radii.md}; border: 2px solid ${theme.colors.sand}; cursor: pointer; transition: all 0.15s; background: ${theme.colors.card}; }
        .ob-strat:hover { border-color: ${theme.colors.muted}; }
        .ob-strat.sel { border-color: ${theme.colors.primary}; background: #fdf5f4; }
        .ob-strat.disabled { opacity: 0.4; cursor: not-allowed; }
        .ob-strat-name { font-size: 14px; font-weight: 600; color: ${theme.colors.ink}; margin-bottom: 4px; }
        .ob-strat-desc { font-size: 12px; color: ${theme.colors.muted}; line-height: 1.4; }
        .ob-strat-badge { display: inline-block; font-size: 10px; font-weight: 700; color: ${theme.colors.primary}; background: #fdf5f4; padding: 2px 8px; border-radius: 10px; margin-top: 6px; }

        .ob-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; }
        .ob-btn { padding: 12px 28px; border-radius: ${theme.radii.sm}; font-family: ${theme.fonts.body}; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: none; }
        .ob-btn-primary { background: ${theme.colors.primary}; color: #fff; }
        .ob-btn-primary:hover { background: ${theme.colors.buttonPrimaryHover}; }
        .ob-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .ob-btn-ghost { background: transparent; color: ${theme.colors.muted}; border: none; padding: 12px 16px; }
        .ob-btn-ghost:hover { color: ${theme.colors.ink}; }
        .ob-btn-skip { background: transparent; color: ${theme.colors.muted}; border: 1.5px solid ${theme.colors.sand}; }
        .ob-btn-skip:hover { border-color: ${theme.colors.muted}; color: ${theme.colors.ink}; }

        .ob-credit-toggle { display: flex; gap: 8px; }
        .ob-credit-btn { flex: 1; padding: 10px 14px; border-radius: ${theme.radii.sm}; font-size: 14px; font-weight: 600; cursor: pointer; font-family: ${theme.fonts.body}; transition: all 0.15s; }

        .ob-plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 8px; }
        .plan { background: var(--card); border-radius: 20px; padding: 36px 32px; border: 1.5px solid var(--sand); position: relative; transition: transform .2s, box-shadow .2s; }
        .plan:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(26,18,16,.08); }
        .plan.ft { border-color: var(--red); background: var(--ink); color: #fff; }
        .plan-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--red); color: #fff; padding: 4px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
        .plan-name { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
        .plan.ft .plan-name { color: rgba(255,255,255,.5); }
        .plan-price { font-family: 'Fraunces', serif; font-size: 52px; font-weight: 800; letter-spacing: -.03em; margin-bottom: 4px; line-height: 1; }
        .plan.ft .plan-price { color: #fff; }
        .plan-period { font-size: 14px; color: var(--muted); margin-bottom: 28px; }
        .plan.ft .plan-period { color: rgba(255,255,255,.4); }
        .plan-div { height: 1px; background: var(--sand); margin-bottom: 24px; }
        .plan.ft .plan-div { background: rgba(255,255,255,.1); }
        .plan-feats { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; padding: 0; }
        .plan-feats li { display: flex; align-items: center; gap: 10px; font-size: 14px; }
        .plan.ft .plan-feats li { color: rgba(255,255,255,.85); }
        .pck { width: 18px; height: 18px; border-radius: 50%; background: #d4f5e0; color: #1a7a40; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
        .plan.ft .pck { background: rgba(212,245,224,.2); color: #6de8a0; }
        .pcx { width: 18px; height: 18px; border-radius: 50%; background: #f0ede8; color: var(--muted); display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
        .plan-cta { display: block; text-align: center; text-decoration: none; width: 100%; padding: 13px; border-radius: 10px; border: 1.5px solid var(--sand); font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: var(--ink); background: transparent; cursor: pointer; transition: all .15s; box-sizing: border-box; }
        .plan-cta:hover { background: var(--ink); color: #fff; border-color: var(--ink); }
        .plan.ft .plan-cta { background: var(--red); border-color: var(--red); color: #fff; }
        .plan.ft .plan-cta:hover { background: var(--red-dark); }

        .ob-strategy-section { margin-top: 40px; padding-top: 32px; border-top: 1.5px solid ${theme.colors.sand}; }

        @media (max-width: 768px) {
          .ob-page { padding: 24px 16px; }
          .ob-stepper { display: none; }
          .ob-card { padding: 28px 20px; }
          .ob-card.wide { padding: 28px 20px; }
          .ob-strats { grid-template-columns: 1fr; }
          .ob-plans { grid-template-columns: 1fr; max-width: 400px; margin-left: auto; margin-right: auto; }
          .ob-actions { flex-direction: column-reverse; gap: 12px; }
          .ob-actions > * { width: 100%; text-align: center; }
        }
      `}</style>

      <div className="ob-page">
        <div className="ob-logo">Mon Petit <span>MDB</span></div>

        {/* Stepper — 3 étapes */}
        <div className="ob-stepper">
          {STEPS.map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
              <div className={`ob-step ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}>
                <div className="ob-step-num">{step > s.num ? '✓' : s.num}</div>
                <div className="ob-step-label">{s.label}</div>
              </div>
              {i < STEPS.length - 1 && <div className={`ob-step-line ${step > s.num ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Étape 1 — Profil investisseur (info + fiscal) */}
        {step === 1 && (
          <div className="ob-card">
            <h1 className="ob-title">Bienvenue sur Mon Petit MDB</h1>
            <p className="ob-sub">Quelques informations pour personnaliser votre expérience.</p>

            {/* Section info */}
            <div className="ob-section">
              <div className="ob-section-title">Vos informations</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="ob-field">
                  <label className="ob-label">Prénom *</label>
                  <input className="ob-input" type="text" placeholder="Prénom" value={prenom} onChange={e => setPrenom(e.target.value)} autoFocus />
                </div>
                <div className="ob-field">
                  <label className="ob-label">Nom *</label>
                  <input className="ob-input" type="text" placeholder="Nom" value={nom} onChange={e => setNom(e.target.value)} />
                </div>
              </div>
              <div className="ob-toggle" onClick={() => setIsPro(!isPro)}>
                <div className={`ob-toggle-track ${isPro ? 'on' : ''}`}><div className="ob-toggle-knob" /></div>
                <div className="ob-toggle-label">Je suis professionnel</div>
              </div>
              {isPro && (
                <div className="ob-field">
                  <label className="ob-label">{"Nom de l'entreprise"}</label>
                  <input className="ob-input" type="text" placeholder="Nom de votre entreprise" value={entreprise} onChange={e => setEntreprise(e.target.value)} />
                </div>
              )}
            </div>

            {/* Section fiscalité */}
            <div className="ob-section">
              <div className="ob-section-title">Votre fiscalité</div>
              <div className="ob-field">
                <label className="ob-label">Tranche marginale d'imposition (TMI) *</label>
                <select className="ob-select" value={tmi ?? ''} onChange={e => setTmi(e.target.value ? parseInt(e.target.value) : null)}>
                  <option value="">Sélectionnez votre TMI</option>
                  {TMI_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="ob-field">
                <label className="ob-label">Régime fiscal principal *</label>
                <select className="ob-select" value={regime} onChange={e => setRegime(e.target.value)}>
                  <option value="">Sélectionnez un régime</option>
                  {REGIMES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div className="ob-actions">
              <div />
              <button className="ob-btn ob-btn-primary" disabled={!canNext || saving} onClick={handleNext}>
                {saving ? 'Enregistrement...' : 'Continuer'}
              </button>
            </div>
          </div>
        )}

        {/* Étape 2 — Financement */}
        {step === 2 && (
          <div className="ob-card">
            <h1 className="ob-title">Votre financement</h1>
            <p className="ob-sub">Optionnel — vous pourrez compléter ou modifier ces informations plus tard dans vos paramètres.</p>
            <div className="ob-field">
              <label className="ob-label">Type de crédit</label>
              <div className="ob-credit-toggle">
                <button type="button" className="ob-credit-btn" onClick={() => setTypeCredit('amortissable')} style={{ border: `2px solid ${typeCredit === 'amortissable' ? theme.colors.primary : theme.colors.sand}`, background: typeCredit === 'amortissable' ? '#fdf5f4' : theme.colors.card, color: typeCredit === 'amortissable' ? theme.colors.primary : theme.colors.muted }}>Amortissable</button>
                <button type="button" className="ob-credit-btn" onClick={() => setTypeCredit('in_fine')} style={{ border: `2px solid ${typeCredit === 'in_fine' ? theme.colors.primary : theme.colors.sand}`, background: typeCredit === 'in_fine' ? '#fdf5f4' : theme.colors.card, color: typeCredit === 'in_fine' ? theme.colors.primary : theme.colors.muted }}>In fine</button>
              </div>
            </div>
            <div className="ob-field">
              <label className="ob-label">Apport</label>
              <div className="ob-credit-toggle" style={{ marginBottom: '10px' }}>
                <button type="button" className="ob-credit-btn" onClick={() => setModeApport('montant')} style={{ border: `2px solid ${modeApport === 'montant' ? theme.colors.primary : theme.colors.sand}`, background: modeApport === 'montant' ? '#fdf5f4' : theme.colors.card, color: modeApport === 'montant' ? theme.colors.primary : theme.colors.muted }}>Montant (€)</button>
                <button type="button" className="ob-credit-btn" onClick={() => setModeApport('pct')} style={{ border: `2px solid ${modeApport === 'pct' ? theme.colors.primary : theme.colors.sand}`, background: modeApport === 'pct' ? '#fdf5f4' : theme.colors.card, color: modeApport === 'pct' ? theme.colors.primary : theme.colors.muted }}>Autofinancement (%)</button>
              </div>
              {modeApport === 'montant' ? (
                <input className="ob-input" type="number" placeholder="50 000" value={apport} onChange={e => setApport(e.target.value)} />
              ) : (
                <input className="ob-input" type="number" step="1" min="0" max="100" placeholder="20" value={apportPct} onChange={e => setApportPct(e.target.value)} />
              )}
              <div style={{ fontSize: '12px', color: theme.colors.muted, marginTop: '6px' }}>
                {modeApport === 'montant' ? "Montant fixe que vous investissez de votre poche" : "Pourcentage du prix d'achat financé sur fonds propres"}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="ob-field">
                <label className="ob-label">Taux de crédit (%)</label>
                <input className="ob-input" type="number" step="0.1" placeholder="3.5" value={tauxCredit} onChange={e => setTauxCredit(e.target.value)} />
              </div>
              <div className="ob-field">
                <label className="ob-label">Taux assurance (%)</label>
                <input className="ob-input" type="number" step="0.01" placeholder="0.34" value={tauxAssurance} onChange={e => setTauxAssurance(e.target.value)} />
              </div>
              <div className="ob-field">
                <label className="ob-label">Durée (années)</label>
                <input className="ob-input" type="number" placeholder="20" value={dureeAns} onChange={e => setDureeAns(e.target.value)} />
              </div>
            </div>
            <div className="ob-actions">
              <button className="ob-btn ob-btn-ghost" onClick={() => setStep(1)}>Retour</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="ob-btn ob-btn-skip" onClick={() => setStep(3)}>Compléter plus tard</button>
                <button className="ob-btn ob-btn-primary" disabled={saving} onClick={handleNext}>
                  {saving ? 'Enregistrement...' : 'Continuer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Étape 3 — Abonnement + Stratégie */}
        {step === 3 && (
          <div className="ob-card wide">
            {!planChosen ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h1 className="ob-title">Choisissez votre abonnement</h1>
                  <p className="ob-sub" style={{ marginBottom: 16 }}>Commencez gratuitement. Passez au Pro quand vous êtes prêt à passer à l'action.</p>
                  <EarlyAdopterBadge />
                </div>
                <div className="ob-plans">
                  {/* FREE */}
                  <div className="plan">
                    <div className="plan-name">Free</div>
                    <div className="plan-price">0 €</div>
                    <div className="plan-period">Pour toujours</div>
                    <div className="plan-div" />
                    <ul className="plan-feats">
                      <li><span className="pck">✓</span>Listing de tous les biens</li>
                      <li><span className="pck">✓</span>Fiches biens complètes</li>
                      <li><span className="pck">✓</span>Enrichissement communautaire</li>
                      <li><span className="pck">✓</span>Watchlist (10 biens max)</li>
                      <li><span className="pck">✓</span>1 stratégie MDB</li>
                      <li><span className="pck">✓</span>Memo — assistant IA (5 msg/jour)</li>
                      <li><span className="pcx">✗</span><span style={{ color: '#c0b0a0' }}>Simulateur fiscal</span></li>
                      <li><span className="pcx">✗</span><span style={{ color: '#c0b0a0' }}>Estimation marché DVF</span></li>
                    </ul>
                    <button className="plan-cta" onClick={handleChooseFree}>Commencer gratuitement</button>
                  </div>
                  {/* PRO */}
                  <div className="plan ft">
                    <div className="plan-badge">Le plus populaire</div>
                    <div className="plan-name">Pro</div>
                    <div className="plan-price">19 €</div>
                    <div className="plan-period">par mois — sans engagement</div>
                    <div className="plan-div" />
                    <ul className="plan-feats">
                      <li><span className="pck">✓</span>Tout le plan Free</li>
                      <li><span className="pck">✓</span>2 stratégies MDB au choix</li>
                      <li><span className="pck">✓</span>Watchlist (50 biens max)</li>
                      <li><span className="pck">✓</span>Simulateur fiscal complet</li>
                      <li><span className="pck">✓</span>Estimation marché DVF</li>
                      <li><span className="pck">✓</span>Scénario de revente</li>
                      <li><span className="pck">✓</span>Comparaison 2 régimes</li>
                      <li><span className="pck">✓</span>1 alerte email</li>
                      <li><span className="pck">✓</span>Memo — assistant IA (50 msg/jour)</li>
                    </ul>
                    <button className="plan-cta" disabled={checkoutLoading === 'pro'} onClick={() => goToCheckout('pro')}>{checkoutLoading === 'pro' ? 'Redirection...' : 'Passer au Pro'}</button>
                  </div>
                  {/* EXPERT */}
                  <div className="plan">
                    <div className="plan-name">Expert</div>
                    <div className="plan-price">49 €</div>
                    <div className="plan-period">par mois — sans engagement</div>
                    <div className="plan-div" />
                    <ul className="plan-feats">
                      <li><span className="pck">✓</span>Tout le plan Pro</li>
                      <li><span className="pck">✓</span>Toutes les stratégies MDB (dont IDR)</li>
                      <li><span className="pck">✓</span>Watchlist illimitée</li>
                      <li><span className="pck">✓</span>Comparaison tous les régimes</li>
                      <li><span className="pck">✓</span>5 alertes email</li>
                      <li><span className="pck">✓</span>Memo — assistant IA illimité</li>
                      <li><span className="pck">✓</span>Export Excel</li>
                      <li><span className="pck">✓</span>Support prioritaire</li>
                    </ul>
                    <button className="plan-cta" disabled={checkoutLoading === 'expert'} onClick={() => goToCheckout('expert')}>{checkoutLoading === 'expert' ? 'Redirection...' : 'Commencer avec Expert'}</button>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                  <button className="ob-btn ob-btn-ghost" onClick={() => setStep(2)}>Retour</button>
                </div>
              </>
            ) : (
              /* Plan choisi → sélection stratégie */
              <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                <h1 className="ob-title">Votre stratégie MDB</h1>
                {chosenPlan === 'expert' ? (
                  <p className="ob-sub">Avec le plan Expert, vous avez accès à toutes les stratégies. Choisissez votre stratégie principale.</p>
                ) : chosenPlan === 'pro' ? (
                  <p className="ob-sub">Avec le plan Pro, vous pouvez choisir 2 stratégies (hors Immeuble de rapport, réservé au plan Expert).</p>
                ) : (
                  <p className="ob-sub">Avec le plan Free, vous pouvez choisir 1 stratégie. Passez au Pro pour en débloquer davantage.</p>
                )}

                <div className="ob-field">
                  <label className="ob-label">Stratégie principale *</label>
                  <div className="ob-strats">
                    {STRATEGIES.map(s => {
                      const disabled = chosenPlan !== 'expert' && s.value === 'Immeuble de rapport'
                      return (
                        <div
                          key={s.value}
                          className={`ob-strat ${strategie === s.value ? 'sel' : ''} ${disabled ? 'disabled' : ''}`}
                          onClick={() => { if (!disabled) { setStrategie(s.value); if (strategie2 === s.value) setStrategie2('') } }}
                        >
                          <div className="ob-strat-name">{s.label}</div>
                          <div className="ob-strat-desc">{s.desc}</div>
                          {disabled && <div className="ob-strat-badge">Expert uniquement</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {maxStrategies >= 2 && (
                  <div className="ob-field">
                    <label className="ob-label">Stratégie secondaire{chosenPlan === 'pro' ? '' : ' (optionnel)'}</label>
                    <div className="ob-strats">
                      {strategiesDisponibles.filter(s => s.value !== strategie).map(s => (
                        <div
                          key={s.value}
                          className={`ob-strat ${strategie2 === s.value ? 'sel' : ''}`}
                          onClick={() => setStrategie2(strategie2 === s.value ? '' : s.value)}
                        >
                          <div className="ob-strat-name">{s.label}</div>
                          <div className="ob-strat-desc">{s.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ob-actions">
                  <button className="ob-btn ob-btn-ghost" onClick={() => setPlanChosen(false)}>Retour</button>
                  <button className="ob-btn ob-btn-primary" disabled={!canNext || saving} onClick={handleNext}>
                    {saving ? 'Enregistrement...' : "C'est parti !"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
