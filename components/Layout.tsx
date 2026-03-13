'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

interface Props {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  const [user, setUser] = useState<any>(null)

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${theme.colors.bg}; font-family: ${theme.fonts.body}; color: ${theme.colors.ink}; }

        .mdb-header {
          background: rgba(242,236,228,0.96);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,0,0,0.07);
          padding: 0 48px; height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 100;
        }
        .mdb-logo {
          font-family: ${theme.fonts.display};
          font-size: 22px; font-weight: 800;
          letter-spacing: -0.02em;
          text-decoration: none;
          color: ${theme.colors.ink};
        }
        .mdb-logo span { color: ${theme.colors.primary}; }

        .mdb-nav { display: flex; gap: 28px; align-items: center; }
        .mdb-nav a {
          font-size: 13px; font-weight: 500;
          color: ${theme.colors.muted};
          text-decoration: none;
          transition: color 0.15s;
        }
        .mdb-nav a:hover { color: ${theme.colors.ink}; }

        .mdb-nav-sep { width: 1px; height: 20px; background: #e8e2d8; }

        .btn-login {
          padding: 8px 18px; border-radius: 8px; border: 1.5px solid #e8e2d8;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          color: #1a1210; background: transparent; cursor: pointer;
          text-decoration: none; transition: all 0.15s;
        }
        .btn-login:hover { border-color: #1a1210; }

        .btn-logout {
          padding: 8px 18px; border-radius: 8px; border: none;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          color: #9a8a80; background: transparent; cursor: pointer;
          transition: color 0.15s;
        }
        .btn-logout:hover { color: #c0392b; }

        .user-email {
          font-size: 13px; color: #9a8a80; max-width: 180px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        .mdb-footer {
          margin-top: 80px;
          border-top: 1px solid ${theme.colors.sand};
          padding: 32px 48px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .mdb-footer-logo {
          font-family: ${theme.fonts.display};
          font-size: 16px; font-weight: 800;
          color: ${theme.colors.ink};
        }
        .mdb-footer-logo span { color: ${theme.colors.primary}; }
        .mdb-footer-right { font-size: 12px; color: ${theme.colors.muted}; }
      `}</style>

      <div style={{ fontFamily: theme.fonts.body, background: theme.colors.bg, minHeight: '100vh' }}>
        <header className="mdb-header">
          <a href="/" className="mdb-logo">Mon Petit <span>MDB</span></a>

          <nav className="mdb-nav">
            <a href="/biens">Biens disponibles</a>
            <a href="/comment-ca-marche">Comment ça marche</a>

            <div className="mdb-nav-sep" />

            {user ? (
              <>
                <a href="/mon-profil" className="user-email" style={{ textDecoration: 'none' }}>👤 {user.email}</a>
                <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
              </>
            ) : (
              <>
                <a href="/login" className="btn-login">Se connecter</a>
              </>
            )}
          </nav>
        </header>

        <main>
          {children}
        </main>

        <footer className="mdb-footer">
          <div className="mdb-footer-logo">Mon Petit <span>MDB</span></div>
          <div className="mdb-footer-right">© 2026 · Investissement locatif intelligent</div>
        </footer>
      </div>
    </>
  )
}