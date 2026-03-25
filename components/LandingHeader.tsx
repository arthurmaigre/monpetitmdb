'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LandingHeader() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      {user ? (
        <a href="/biens" className="btn-p">{"Acc\u00E9der \u00E0 mes biens"}</a>
      ) : (
        <>
          <a href="/login" className="btn-o">Se connecter</a>
          <a href="/register" className="btn-p">Commencer gratuitement</a>
        </>
      )}
    </div>
  )
}
