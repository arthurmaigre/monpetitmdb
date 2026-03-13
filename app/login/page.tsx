'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      `}</style>

      <div className="auth-wrap">
        <div className="auth-box">
          <h1 className="auth-title">Connexion</h1>
          <p className="auth-sub">Accédez à votre espace investisseur</p>

          {error && <div className="auth-error">{error}</div>}

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