'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LandingHeader() {
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) loadProfile()
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.access_token) {
        fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(r => r.json())
          .then(d => { if (d.profile?.role) setUserRole(d.profile.role) })
          .catch(() => {})
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(d => { if (d.profile?.role) setUserRole(d.profile.role) })
      .catch(() => {})
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('.lp-user-wrap')) setMenuOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [menuOpen])

  if (!user) {
    return (
      <div style={{ display: 'flex', gap: '10px' }}>
        <a href="/login" className="btn-o">Se connecter</a>
        <a href="/register" className="btn-p">Commencer gratuitement</a>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .lp-user-wrap { position: relative; }
        .lp-user-pill {
          display: flex; align-items: center; gap: 8px;
          padding: 4px 8px 4px 12px; border-radius: 20px;
          background: rgba(0,0,0,0.04); text-decoration: none;
          transition: background 150ms ease; cursor: pointer;
          border: none; font-family: 'DM Sans', sans-serif;
        }
        .lp-user-pill:hover { background: rgba(0,0,0,0.07); }
        .lp-user-email { font-size: 12px; color: var(--muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lp-user-avatar {
          width: 24px; height: 24px; border-radius: 50%;
          background: var(--red); color: #fff; font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .lp-user-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #fff; border: 1.5px solid var(--sand); border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          min-width: 200px; padding: 8px 0; z-index: 110;
          opacity: 0; pointer-events: none; transform: translateY(-4px);
          transition: all 150ms ease;
        }
        .lp-user-dropdown.open { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .lp-dd-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; font-size: 13px; font-weight: 500;
          color: var(--ink); text-decoration: none;
          transition: background 150ms ease; border: none;
          background: none; width: 100%; cursor: pointer;
          font-family: 'DM Sans', sans-serif; text-align: left;
        }
        .lp-dd-item:hover { background: #faf8f5; }
        .lp-dd-sep { height: 1px; background: var(--sand); margin: 6px 0; }
        .lp-dd-item.logout { color: var(--red); }
      `}</style>

      <div className="lp-user-wrap">
        <button className="lp-user-pill" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="lp-user-email">{user.email}</span>
          <span className="lp-user-avatar">{(user.email || '?')[0].toUpperCase()}</span>
        </button>
        <div className={`lp-user-dropdown ${menuOpen ? 'open' : ''}`}>
          <a href="/biens" className="lp-dd-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
            Biens Immobiliers
          </a>
          <a href="/mes-biens" className="lp-dd-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Ma Watchlist
          </a>
          <a href="/mon-profil" className="lp-dd-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Mon Profil
          </a>
          <a href="/parametres" className="lp-dd-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            {"Mes param\u00E8tres"}
          </a>
          {userRole === 'admin' && (
            <>
              <div className="lp-dd-sep" />
              <a href="/admin" className="lp-dd-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Administration
              </a>
            </>
          )}
          <div className="lp-dd-sep" />
          <button className="lp-dd-item logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {"D\u00E9connexion"}
          </button>
        </div>
      </div>
    </>
  )
}
