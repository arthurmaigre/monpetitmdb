'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
    // Afficher erreur OAuth si redirigé depuis /auth/callback
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'oauth_failed') {
      setError('La connexion Google/Facebook a échoué. Réessayez ou utilisez email + mot de passe.')
    }
  }, [])

  async function handleOAuth(provider: 'google' | 'facebook') {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      // Verifier si onboarding fait
      try {
        const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
        const profile = await res.json()
        if (!profile.profile?.strategie_mdb) {
          window.location.href = '/onboarding'
          return
        }
      } catch { /* fallback /biens */ }
      window.location.href = '/biens'
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
        .auth-footer { text-align: center; margin-top: 24px; font-size: 13px; color: #7a6a60; }
        .auth-footer a { color: #c0392b; font-weight: 600; text-decoration: none; }
        .auth-divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: #e8e2d8; }
        .auth-divider span { font-size: 12px; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; }
        .oauth-btn {
          width: 100%; padding: 12px 16px; border-radius: 10px; border: 1.5px solid #e8e2d8;
          background: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          color: #1a1210; cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 10px; transition: background 0.15s, border-color 0.15s; margin-bottom: 10px;
        }
        .oauth-btn svg { position: absolute; left: 16px; }
        .oauth-btn { position: relative; }
        .oauth-btn:hover { background: #faf8f5; border-color: #c0392b; }
        .oauth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .oauth-btn svg { width: 20px; height: 20px; flex-shrink: 0; }
        .pwd-wrap { position: relative; }
        .pwd-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #7a6a60; padding: 4px; display: flex; align-items: center; }
        .pwd-toggle:hover { color: #1a1210; }
      `}</style>

      <div className="auth-wrap">
        <div className="auth-box">
          <h1 className="auth-title">Connexion</h1>
          <p className="auth-sub">{"Acc\u00E9dez \u00E0 votre espace"}</p>

          {error && <div className="auth-error">{error}</div>}

          <button className="oauth-btn" onClick={() => handleOAuth('google')} disabled={loading}>
            <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continuer avec Google
          </button>

          <button className="oauth-btn" onClick={() => handleOAuth('facebook')} disabled={loading}>
            <svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/></svg>
            Continuer avec Facebook
          </button>

          <div className="auth-divider"><span>ou</span></div>

          <form onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                ref={emailRef}
                className="auth-input"
                type="email"
                placeholder="vous@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">Mot de passe</label>
              <div className="pwd-wrap">
                <input
                  id="login-password"
                  className="auth-input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder={"••••••••"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  {showPwd ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Connexion...' : "Se connecter \u2192"}
            </button>
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <a href="#" onClick={e => { e.preventDefault(); setShowForgot(v => !v); setForgotSent(false) }}
                style={{ fontSize: '13px', color: '#c0392b', textDecoration: 'none' }}>
                {"Mot de passe oubli\u00E9 ?"}
              </a>
            </div>

            {showForgot && (
              <div style={{ marginTop: '16px', padding: '16px', background: '#faf8f5', borderRadius: '10px', border: '1.5px solid #e8e2d8' }}>
                {forgotSent ? (
                  <p style={{ fontSize: '14px', color: '#2e7d32', margin: 0, textAlign: 'center', fontWeight: 600 }}>Email envoy\u00E9 \u2713</p>
                ) : (
                  <>
                    <label className="auth-label" style={{ display: 'block', marginBottom: '6px' }}>Votre email</label>
                    <input
                      className="auth-input"
                      type="email"
                      placeholder="vous@email.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      style={{ width: '100%', marginBottom: '10px' }}
                    />
                    <button
                      type="button"
                      className="auth-btn"
                      disabled={forgotLoading || !forgotEmail}
                      onClick={async () => {
                        setForgotLoading(true)
                        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                          redirectTo: window.location.origin + '/reset-password'
                        })
                        setForgotLoading(false)
                        if (error) setError(error.message)
                        else setForgotSent(true)
                      }}
                    >
                      {forgotLoading ? 'Envoi...' : 'Envoyer le lien'}
                    </button>
                  </>
                )}
              </div>
            )}
          </form>

          <div className="auth-footer">
            {"Pas encore de compte ? "}<a href="/register">{"Cr\u00E9er un compte"}</a>
          </div>
        </div>
      </div>
    </Layout>
  )
}