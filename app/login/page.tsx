'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      window.location.href = '/biens'
    }
  }

  return (
    <Layout>
      <style>{`
        .auth-wrap { min-height: 70vh; display: flex; align-items: center; justify-content: center; }
        .auth-box { background: #fff; border-radius: 20px; padding: 48px; width: 100%; max-width: 440px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
        .auth-title { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 800; margin-bottom: 8px; }
        .auth-sub { font-size: 14px; color: #9a8a80; margin-bottom: 32px; }
        .auth-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .auth-label { font-size: 12px; font-weight: 600; color: #9a8a80; letter-spacing: 0.06em; text-transform: uppercase; }
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
        .auth-footer { text-align: center; margin-top: 24px; font-size: 13px; color: #9a8a80; }
        .auth-footer a { color: #c0392b; font-weight: 600; text-decoration: none; }
        .auth-divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
        .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: #e8e2d8; }
        .auth-divider span { font-size: 12px; color: #9a8a80; text-transform: uppercase; letter-spacing: 0.06em; }
        .oauth-btn {
          width: 100%; padding: 12px 16px; border-radius: 10px; border: 1.5px solid #e8e2d8;
          background: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
          color: #1a1210; cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 10px; transition: background 0.15s, border-color 0.15s; margin-bottom: 10px;
        }
        .oauth-btn:hover { background: #faf8f5; border-color: #c0392b; }
        .oauth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .oauth-btn svg { width: 20px; height: 20px; flex-shrink: 0; }
      `}</style>

      <div className="auth-wrap">
        <div className="auth-box">
          <h1 className="auth-title">Connexion</h1>
          <p className="auth-sub">Accédez à votre espace investisseur</p>

          {error && <div className="auth-error">{error}</div>}

          <button className="oauth-btn" onClick={() => handleOAuth('google')} disabled={loading}>
            <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continuer avec Google
          </button>

          <div className="auth-divider"><span>ou</span></div>

          <form onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="vous@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Mot de passe</label>
              <input
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>

          <div className="auth-footer">
            Pas encore de compte ? <a href="/register">Créer un compte</a>
          </div>
        </div>
      </div>
    </Layout>
  )
}