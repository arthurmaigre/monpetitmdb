'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

interface Props {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function isActive(path: string) {
    return pathname === path || pathname?.startsWith(path + '/')
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${theme.colors.bg}; font-family: ${theme.fonts.body}; color: ${theme.colors.ink}; }

        .mdb-header {
          background: rgba(242,236,228,0.97);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid ${theme.colors.sand};
          padding: 0 48px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .mdb-logo {
          font-family: ${theme.fonts.display};
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-decoration: none;
          color: ${theme.colors.ink};
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .mdb-logo span { color: ${theme.colors.primary}; }

        .mdb-nav {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .mdb-nav-link {
          font-size: 13px;
          font-weight: 500;
          color: ${theme.colors.muted};
          text-decoration: none;
          transition: all 0.15s;
          padding: 8px 14px;
          border-radius: 8px;
        }
        .mdb-nav-link:hover { color: ${theme.colors.ink}; background: rgba(0,0,0,0.04); }
        .mdb-nav-link.active { color: ${theme.colors.ink}; background: rgba(0,0,0,0.06); font-weight: 600; }

        .nav-watchlist {
          font-size: 13px;
          font-weight: 500;
          color: ${theme.colors.muted};
          text-decoration: none;
          transition: all 0.15s;
          padding: 8px 14px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .nav-watchlist:hover { color: ${theme.colors.primary}; background: rgba(192,57,43,0.06); }
        .nav-watchlist.active { color: ${theme.colors.primary}; background: rgba(192,57,43,0.08); font-weight: 600; }
        .nav-heart { color: ${theme.colors.primary}; font-size: 14px; }

        .mdb-nav-sep { width: 1px; height: 20px; background: ${theme.colors.sand}; margin: 0 8px; }

        .btn-login {
          padding: 7px 18px;
          border-radius: 8px;
          border: 1.5px solid ${theme.colors.sand};
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: ${theme.colors.ink};
          background: transparent;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.15s;
        }
        .btn-login:hover { border-color: ${theme.colors.ink}; background: rgba(0,0,0,0.03); }

        .user-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 6px 5px 12px;
          border-radius: 20px;
          background: rgba(0,0,0,0.04);
          text-decoration: none;
          transition: background 0.15s;
        }
        .user-pill:hover { background: rgba(0,0,0,0.07); }
        .user-email { font-size: 12px; color: ${theme.colors.muted}; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .user-avatar {
          width: 26px; height: 26px; border-radius: 50%;
          background: ${theme.colors.primary};
          color: #fff; font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }

        .btn-logout {
          padding: 7px 14px;
          border-radius: 8px;
          border: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: ${theme.colors.muted};
          background: transparent;
          cursor: pointer;
          transition: color 0.15s;
        }
        .btn-logout:hover { color: ${theme.colors.primary}; }

        .mdb-footer {
          margin-top: 80px;
          border-top: 1px solid ${theme.colors.sand};
          padding: 32px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .mdb-footer-logo { font-family: ${theme.fonts.display}; font-size: 16px; font-weight: 800; color: ${theme.colors.ink}; }
        .mdb-footer-logo span { color: ${theme.colors.primary}; }
        .mdb-footer-right { font-size: 12px; color: ${theme.colors.muted}; }
      `}</style>

      <div style={{ fontFamily: theme.fonts.body, background: theme.colors.bg, minHeight: '100vh' }}>
        <header className="mdb-header">
          <a href="/" className="mdb-logo">Mon Petit <span>MDB</span></a>

          <nav className="mdb-nav">
            <a href="/biens" className={`mdb-nav-link ${isActive('/biens') ? 'active' : ''}`}>Biens</a>
            <a href="/mes-biens" className={`nav-watchlist ${isActive('/mes-biens') ? 'active' : ''}`}>
              <span className="nav-heart">{'\u2661'}</span>
              Watchlist
            </a>
            <div className="mdb-nav-sep" />
            {user ? (
              <>
                <a href="/mon-profil" className="user-pill">
                  <span className="user-email">{user.email}</span>
                  <span className="user-avatar">{(user.email || '?')[0].toUpperCase()}</span>
                </a>
                <button className="btn-logout" onClick={handleLogout}>D{'\u00e9'}connexion</button>
              </>
            ) : (
              <a href="/login" className="btn-login">Se connecter</a>
            )}
          </nav>
        </header>

        <main>{children}</main>

        <footer className="mdb-footer">
          <div className="mdb-footer-logo">Mon Petit <span>MDB</span></div>
          <div className="mdb-footer-right">{'\u00a9'} 2026 Mon Petit MDB</div>
        </footer>
      </div>
    </>
  )
}
