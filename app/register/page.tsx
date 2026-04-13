'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)


  useEffect(() => { emailRef.current?.focus() }, [])

  function getPasswordStrength(pwd: string): { label: string; color: string; width: string } {
    if (pwd.length === 0) return { label: '', color: '#e8e2d8', width: '0%' }
    if (pwd.length < 8) return { label: 'Trop court', color: '#e74c3c', width: '25%' }
    const hasUpper = /[A-Z]/.test(pwd)
    const hasNumber = /[0-9]/.test(pwd)
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
    const score = [hasUpper, hasNumber, hasSpecial, pwd.length >= 12].filter(Boolean).length
    if (score <= 1) return { label: 'Faible', color: '#f39c12', width: '50%' }
    if (score <= 2) return { label: 'Moyen', color: '#f39c12', width: '70%' }
    return { label: 'Fort', color: '#27ae60', width: '100%' }
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) {
      setError('Erreur de connexion avec ' + (provider === 'google' ? 'Google' : 'Facebook'))
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })

    if (error) {
      console.error('Signup error:', error.message)
      setError('Erreur lors de la création du compte')
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  return (
    <Layout>
      <style>{`
        .auth-wrap { min-height: 70vh; display: flex; align-items: center; justify-content: center; }
        .auth-box { background: #fff; border-radius: 20px; padding: 48px; width: 100%; max-width: 440px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
        .auth-title { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 800; margin-bottom: 8px; }
        .auth-sub { font-size: 14px; color: #7a6a60; margin-bottom: 32px; }
        .auth-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .auth-label { font-size: 12px; font-weight: 600; color: #7a6a60; letter-spacing: 0.06em; text-transform: uppercase; }
        .auth-input {
          padding: 12px 16px; border-radius: 10px; border: 1.5px solid #e8e2d8;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1a1210;
          background: #faf8f5; outline: none; transition: border-color 0.15s;
        }
        .auth-input:focus { border-color: #c0392b; }
        .auth-btn {
          width: 100%; padding: 14px; border-radius: 10px; border: none;
          background: #1a1210; color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px;
          transition: opacity 0.15s;
        }
        .auth-btn:hover { opacity: 0.8; }
        .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-error { background: #fde8e8; color: #a33; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
        .auth-success { background: #d4f5e0; color: #1a7a40; border-radius: 8px; padding: 16px; font-size: 14px; text-align: center; }
        .auth-footer { text-align: center; margin-top: 24px; font-size: 13px; color: #7a6a60; }
        .auth-footer a { color: #c0392b; font-weight: 600; text-decoration: none; }
        .auth-divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: #e8e2d8; }
        .auth-divider span { font-size: 12px; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; }
        .oauth-btn {
          width: 100%; padding: 12px 16px; border-radius: 10px; border: 1.5px solid #e8e2d8;
          background: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          color: #1a1210; cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 10px; transition: background 0.15s, border-color 0.15s; margin-bottom: 10px; position: relative;
        }
        .oauth-btn:hover { background: #faf8f5; border-color: #c0392b; }
        .oauth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .oauth-btn svg { width: 20px; height: 20px; flex-shrink: 0; position: absolute; left: 16px; }
        .pwd-wrap { position: relative; }
        .pwd-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #7a6a60; padding: 4px; display: flex; align-items: center; }
        .pwd-toggle:hover { color: #1a1210; }
        .pwd-strength { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .pwd-bar { flex: 1; height: 4px; background: #e8e2d8; border-radius: 2px; overflow: hidden; }
        .pwd-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease, background 0.3s ease; }
        .pwd-label { font-size: 11px; font-weight: 600; min-width: 60px; }
      `}</style>

      <div className="auth-wrap">
        <div className="auth-box">
          <h1 className="auth-title">Créer un compte</h1>
          <p className="auth-sub">Rejoignez Mon Petit MDB gratuitement</p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li style={{ fontSize: '14px', color: '#1a7a40', fontWeight: 500 }}>✓ Analysez des biens immobiliers selon la méthode MDB</li>
            <li style={{ fontSize: '14px', color: '#1a7a40', fontWeight: 500 }}>✓ Simulation fiscale sur 7 régimes (LMNP, SCI IS, MdB...)</li>
            <li style={{ fontSize: '14px', color: '#1a7a40', fontWeight: 500 }}>✓ Early Bird : -30% à vie avec le code EARLYBIRD</li>
          </ul>

          <div style={{ background: '#fff8e1', border: '1.5px solid #f39c12', borderRadius: '10px', padding: '10px 14px', marginBottom: '24px', fontSize: '13px', color: '#7a4f00', fontWeight: 600, textAlign: 'center' }}>
            🎯 Offre Early Bird — Code <span style={{ letterSpacing: '0.08em' }}>EARLYBIRD</span> — -30% à vie pour les 100 premiers
          </div>

          {success ? (
            <div className="auth-success" style={{ textAlign: 'left', padding: '24px' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>{'\u2705'}</div>
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: '#1a7a40' }}>{"Compte cr\u00E9\u00E9 avec succ\u00E8s !"}</div>
              <p style={{ marginBottom: '16px' }}>{"V\u00E9rifiez votre bo\u00EEte email et cliquez sur le lien de confirmation pour activer votre compte."}</p>
              <div style={{ fontSize: '13px', color: '#1a7a40', opacity: 0.8 }}>
                {"Prochaines \u00E9tapes : explorez les biens, ajoutez vos favoris en watchlist, et configurez vos param\u00E8tres fiscaux."}
              </div>
            </div>
          ) : (
            <>
              {error && <div className="auth-error">{error}</div>}

              <button className="oauth-btn" onClick={() => handleOAuth('google')} disabled={loading}>
                <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                S'inscrire avec Google
              </button>

              <button className="oauth-btn" onClick={() => handleOAuth('facebook')} disabled={loading}>
                <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/></svg>
                S'inscrire avec Facebook
              </button>

              <div className="auth-divider"><span>ou</span></div>

              <form onSubmit={handleRegister}>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="register-email">Email</label>
                  <input
                    id="register-email"
                    ref={emailRef}
                    className="auth-input"
                    type="email"
                    placeholder="vous@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                    <span style={{ fontSize: '11px', color: '#e74c3c' }}>Format email invalide</span>
                  )}
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="register-password">Mot de passe</label>
                  <div className="pwd-wrap">
                    <input
                      id="register-password"
                      className="auth-input"
                      type={showPwd ? 'text' : 'password'}
                      placeholder={"8 caract\u00E8res minimum"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      style={{ width: '100%', paddingRight: '40px' }}
                    />
                    <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Masquer' : 'Afficher'}>
                      {showPwd ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                  {password && (() => {
                    const s = getPasswordStrength(password)
                    return (
                      <div className="pwd-strength">
                        <div className="pwd-bar"><div className="pwd-bar-fill" style={{ width: s.width, background: s.color }} /></div>
                        <span className="pwd-label" style={{ color: s.color }}>{s.label}</span>
                      </div>
                    )
                  })()}
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="register-confirm">Confirmer le mot de passe</label>
                  <input
                    id="register-confirm"
                    className="auth-input"
                    type={showPwd ? 'text' : 'password'}
                    placeholder={"••••••••"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  {confirm && password !== confirm && (
                    <span style={{ fontSize: '11px', color: '#e74c3c' }}>Les mots de passe ne correspondent pas</span>
                  )}
                </div>

                <button className="auth-btn" type="submit" disabled={loading}>
                  {loading ? "Cr\u00E9ation..." : "Cr\u00E9er mon compte \u2192"}
                </button>
                <p style={{ fontSize: '11px', color: '#7a6a60', marginTop: '12px', lineHeight: 1.5, textAlign: 'center' }}>
                  {"En cr\u00E9ant un compte, vous acceptez nos "}
                  <a href="/cgu" style={{ color: '#c0392b', textDecoration: 'underline' }}>CGU</a>
                  {" et notre "}
                  <a href="/privacy" style={{ color: '#c0392b', textDecoration: 'underline' }}>{"politique de confidentialit\u00E9"}</a>.
                </p>
              </form>

              <div className="auth-footer">
                Déjà un compte ? <a href="/login">Se connecter</a>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}