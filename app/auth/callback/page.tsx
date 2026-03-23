'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      // 1. PKCE flow: code in query params
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Auth callback error:', error.message)
          setError('Erreur de connexion. Veuillez réessayer.')
          return
        }
        window.location.href = '/biens'
        return
      }

      // 2. Implicit flow: tokens in URL hash (auto-detected by Supabase client)
      //    Check if session was already set by auto-detection
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.href = '/biens'
        return
      }

      // 3. Wait for auth state change (in case auto-detection is still processing)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          window.location.href = '/biens'
        }
      })

      // 4. Timeout: if nothing happens after 5s, redirect to login
      setTimeout(() => {
        subscription.unsubscribe()
        setError('La connexion a échoué. Veuillez réessayer.')
      }, 5000)
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
