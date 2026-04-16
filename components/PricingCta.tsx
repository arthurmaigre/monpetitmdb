'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface PricingCtaProps {
  plan: 'pro' | 'expert'
  label: string
  className?: string
}

const REGIMES = [
  { value: 'nu_micro_foncier', label: 'Nu Micro-foncier' },
  { value: 'nu_reel_foncier', label: 'Nu Réel foncier' },
  { value: 'lmnp_micro_bic', label: 'LMNP Micro-BIC' },
  { value: 'lmnp_reel_bic', label: 'LMNP Réel BIC' },
  { value: 'lmp_reel_bic', label: 'LMP Réel BIC' },
  { value: 'sci_is', label: "SCI à l'IS" },
  { value: 'marchand_de_biens', label: 'Marchand de biens (IS)' },
]

const STRATEGIES_PRO = [
  { value: 'Locataire en place', label: 'Locataire en place' },
  { value: 'Travaux lourds', label: 'Travaux lourds' },
  { value: 'Division', label: 'Division' },
]

export default function PricingCta({ plan, label, className }: PricingCtaProps) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [selectedRegime, setSelectedRegime] = useState('lmnp_reel_bic')
  const [selectedRegime2, setSelectedRegime2] = useState('nu_reel_foncier')
  const [selectedStrategie, setSelectedStrategie] = useState('Locataire en place')
  const [selectedStrategie2, setSelectedStrategie2] = useState('Travaux lourds')

  async function goToCheckout() {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/register'
        return
      }

      // Sauvegarder les choix dans le profil
      if (plan === 'pro') {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ regime: selectedRegime, regime2: selectedRegime2, strategie_mdb: selectedStrategie, strategie_mdb_2: selectedStrategie2 }),
        })
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Erreur lors de la redirection. Réessayez ou contactez le support.')
      }
    } catch {
      setError('Erreur de connexion. Vérifiez votre réseau et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  async function handleClick() {
    setError('')
    if (plan === 'pro') {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/register'; return }
      setShowModal(true)
    } else {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { window.location.href = '/register'; return }
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ plan }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          setError(data.error || 'Erreur lors de la redirection. Réessayez ou contactez le support.')
        }
      } catch {
        setError('Erreur de connexion. Vérifiez votre réseau et réessayez.')
      } finally {
        setLoading(false)
      }
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e8e2d8', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', background: '#faf8f5', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#7a6a60', letterSpacing: '0.04em', marginBottom: '4px', display: 'block' }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className}
        style={{ display: 'block', textAlign: 'center', width: '100%' }}
      >
        {loading ? 'Redirection...' : label}
      </button>

      {error && (
        <div style={{ marginTop: '8px', padding: '10px 14px', background: '#fdedec', color: '#c0392b', borderRadius: '8px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>
          {error}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '92%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '28px 28px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, color: '#1a1210', margin: 0 }}>Configurez votre plan Pro</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#7a6a60', lineHeight: 1 }}>{'\u00D7'}</button>
              </div>
              <p style={{ fontSize: '13px', color: '#7a6a60', margin: '0 0 20px' }}>{"Choisissez votre stratégie et vos régimes fiscaux. Vous pourrez les modifier à tout moment dans vos paramètres."}</p>
            </div>

            <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>{"Stratégie MDB principale"}</label>
                <select value={selectedStrategie} onChange={e => { setSelectedStrategie(e.target.value); if (e.target.value === selectedStrategie2) { const alt = STRATEGIES_PRO.find(s => s.value !== e.target.value); if (alt) setSelectedStrategie2(alt.value) } }} style={inputStyle}>
                  {STRATEGIES_PRO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>{"Stratégie MDB secondaire"}</label>
                <select value={selectedStrategie2} onChange={e => setSelectedStrategie2(e.target.value)} style={inputStyle}>
                  {STRATEGIES_PRO.filter(s => s.value !== selectedStrategie).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <span style={{ fontSize: '11px', color: '#b0a898', marginTop: '4px', display: 'block' }}>{"Détermine les biens visibles dans le listing"}</span>
              </div>

              <div>
                <label style={labelStyle}>{"Régime fiscal principal"}</label>
                <select value={selectedRegime} onChange={e => { setSelectedRegime(e.target.value); if (e.target.value === selectedRegime2) { const alt = REGIMES.find(r => r.value !== e.target.value); if (alt) setSelectedRegime2(alt.value) } }} style={inputStyle}>
                  {REGIMES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>{"Régime de comparaison"}</label>
                <select value={selectedRegime2} onChange={e => setSelectedRegime2(e.target.value)} style={inputStyle}>
                  {REGIMES.filter(r => r.value !== selectedRegime).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <span style={{ fontSize: '11px', color: '#b0a898', marginTop: '4px', display: 'block' }}>{"Comparez 2 régimes côte à côte sur chaque fiche bien"}</span>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fdedec', color: '#c0392b', borderRadius: '8px', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              <button
                onClick={goToCheckout}
                disabled={loading}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#c0392b', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.7 : 1, marginTop: '4px' }}
              >
                {loading ? 'Redirection vers le paiement...' : 'Continuer vers le paiement \u2192'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
