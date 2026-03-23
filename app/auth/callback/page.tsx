'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')

      if (code) {
        // PKCE flow (OAuth Google, email confirmation)
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setError('Erreur de connexion. Veuillez réessayer.')
          return
        }
        window.location.href = '/biens'
      } else if (accessToken) {
        // Implicit flow (fallback)
        // Supabase JS client detects hash tokens automatically
        supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN') {
            window.location.href = '/biens'
          }
        })
      } else {
        // No code or token — redirect to login
        window.location.href = '/login'
      }
    }

    handleCallback()
  }, [])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        gap: '16px'
      }}>
        <div style={{ color: '#a33', background: '#fde8e8', padding: '12px 20px', borderRadius: '8px', fontSize: '14px' }}>
          {error}
        </div>
        <a href="/login" style={{ color: '#c0392b', fontSize: '14px' }}>Retour à la connexion</a>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      color: '#9a8a80'
    }}>
      Connexion en cours...
    </div>
  )
}
