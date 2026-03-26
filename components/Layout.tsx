'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

const ChatWidget = dynamic(() => import('@/components/ChatWidget'), { ssr: false })

interface Props {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [watchlistCount, setWatchlistCount] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        fetch('/api/profile', { headers: { Authorization: `Bearer ${data.user.id}` } })
          .catch(() => {})
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.access_token) {
        fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(r => r.json())
          .then(d => { if (d.profile?.role) setUserRole(d.profile.role); if (d.profile?.plan) setUserPlan(d.profile.plan) })
          .catch(() => {})
      } else {
        setUserRole(null)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Charger le role au mount
  useEffect(() => {
    if (!user) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(d => { if (d.profile?.role) setUserRole(d.profile.role); if (d.profile?.plan) setUserPlan(d.profile.plan) })
        .catch(() => {})
    })
  }, [user])

  // Load watchlist count
  useEffect(() => {
    if (!user) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/watchlist', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(d => { if (d.watchlist) setWatchlistCount(d.watchlist.length) })
        .catch(() => {})
    })
  }, [user, pathname])

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false)
    setUserMenuOpen(false)
  }, [pathname])

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('.user-pill-wrap')) setUserMenuOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [userMenuOpen])

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

        /* ---- Header ---- */
        .mdb-header {
          background: rgba(242,236,228,0.97); /* theme.colors.bg with opacity */
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
          gap: 4px;
        }
        .mdb-logo span { color: ${theme.colors.primary}; }

        /* ---- Hamburger button ---- */
        .mdb-hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 150ms ease;
        }
        .mdb-hamburger:hover { background: rgba(0,0,0,0.04); /* theme.colors.ink with low opacity */ }
        .mdb-hamburger-bar {
          display: block;
          width: 20px;
          height: 2px;
          background: ${theme.colors.ink};
          margin: 4px 0;
          border-radius: 1px;
          transition: all 150ms ease;
        }

        /* ---- Desktop nav ---- */
        .mdb-nav {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .mdb-nav-link {
          font-size: 14px;
          font-weight: 500;
          color: ${theme.colors.muted};
          text-decoration: none;
          transition: all 150ms ease;
          padding: 8px 16px;
          border-radius: 8px;
        }
        .mdb-nav-link:hover { color: ${theme.colors.ink}; background: rgba(0,0,0,0.04); /* theme.colors.ink 4% */ }
        .mdb-nav-link[aria-current="page"] { color: ${theme.colors.ink}; background: rgba(0,0,0,0.06); /* theme.colors.ink 6% */ font-weight: 600; }

        .nav-watchlist {
          font-size: 14px;
          font-weight: 500;
          color: ${theme.colors.muted};
          text-decoration: none;
          transition: all 150ms ease;
          padding: 8px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-watchlist:hover { color: ${theme.colors.primary}; background: rgba(192,57,43,0.06); /* theme.colors.primary 6% */ }
        .nav-watchlist[aria-current="page"] { color: ${theme.colors.primary}; background: rgba(192,57,43,0.08); /* theme.colors.primary 8% */ font-weight: 600; }
        .nav-heart { color: ${theme.colors.primary}; font-size: 16px; line-height: 1; }

        .mdb-nav-sep { width: 1px; height: 20px; background: ${theme.colors.sand}; margin: 0 8px; }

        .btn-login {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1.5px solid ${theme.colors.sand};
          font-family: ${theme.fonts.body};
          font-size: 14px;
          font-weight: 500;
          color: ${theme.colors.ink};
          background: transparent;
          cursor: pointer;
          text-decoration: none;
          transition: all 150ms ease;
        }
        .btn-login:hover { border-color: ${theme.colors.ink}; background: rgba(0,0,0,0.03); /* theme.colors.ink 3% */ }

        .user-pill-wrap { position: relative; }
        .user-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px 4px 12px;
          border-radius: 20px;
          background: rgba(0,0,0,0.04);
          text-decoration: none;
          transition: background 150ms ease;
          cursor: pointer;
          border: none;
          font-family: ${theme.fonts.body};
        }
        .user-pill:hover { background: rgba(0,0,0,0.07); }
        .user-email { font-size: 12px; color: ${theme.colors.muted}; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .user-avatar {
          width: 24px; height: 24px; border-radius: 50%;
          background: ${theme.colors.primary};
          color: #fff; font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .user-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: #fff; border: 1.5px solid ${theme.colors.sand}; border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          min-width: 200px; padding: 8px 0; z-index: 110;
          opacity: 0; pointer-events: none; transform: translateY(-4px);
          transition: all 150ms ease;
        }
        .user-dropdown.open { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .user-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; font-size: 14px; font-weight: 500; min-height: 44px;
          color: ${theme.colors.ink}; text-decoration: none;
          transition: background 150ms ease; border: none;
          background: none; width: 100%; cursor: pointer;
          font-family: ${theme.fonts.body}; text-align: left;
        }
        .user-dropdown-item:hover { background: ${theme.colors.sandLight}; }
        .user-dropdown-item svg { color: ${theme.colors.muted}; flex-shrink: 0; }
        .user-dropdown-sep { height: 1px; background: ${theme.colors.sand}; margin: 6px 0; }
        .user-dropdown-item.logout { color: ${theme.colors.primary}; }

        .btn-logout {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          font-family: ${theme.fonts.body};
          font-size: 12px;
          font-weight: 500;
          color: ${theme.colors.muted};
          background: transparent;
          cursor: pointer;
          transition: color 150ms ease;
        }
        .btn-logout:hover { color: ${theme.colors.primary}; }

        /* ---- Mobile drawer overlay ---- */
        .mdb-drawer-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.3);
          z-index: 199;
        }
        .mdb-drawer-overlay.open { display: block; }

        /* ---- Mobile drawer ---- */
        .mdb-drawer {
          display: none;
          position: fixed;
          top: 0;
          right: 0;
          width: 280px;
          max-width: 80vw;
          height: 100vh;
          background: ${theme.colors.bg};
          border-left: 1px solid ${theme.colors.sand};
          z-index: 200;
          flex-direction: column;
          padding: 16px;
          gap: 4px;
          transform: translateX(100%);
          transition: transform 150ms ease;
        }
        .mdb-drawer.open {
          display: flex;
          transform: translateX(0);
        }
        .mdb-drawer-close {
          align-self: flex-end;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          font-size: 20px;
          color: ${theme.colors.ink};
          transition: background 150ms ease;
          line-height: 1;
        }
        .mdb-drawer-close:hover { background: rgba(0,0,0,0.04); }
        .mdb-drawer .mdb-nav-link,
        .mdb-drawer .nav-watchlist {
          padding: 14px 16px;
          font-size: 15px;
          border-radius: 8px;
          min-height: 44px;
        }
        .mdb-drawer .mdb-nav-sep {
          width: 100%;
          height: 1px;
          margin: 8px 0;
        }
        .mdb-drawer .btn-login {
          margin-top: 8px;
          text-align: center;
          display: block;
          padding: 12px 16px;
        }
        .mdb-drawer .user-pill {
          padding: 8px 12px;
        }
        .mdb-drawer .btn-logout {
          padding: 12px 16px;
          text-align: left;
          width: 100%;
        }

        /* ---- Footer ---- */
        .mdb-footer {
          margin-top: 80px;
          border-top: 1px solid ${theme.colors.sand};
          padding: 40px 48px 32px;
          background: rgba(0,0,0,0.02); /* slightly darker than theme.colors.bg */
        }
        .mdb-footer-inner {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 32px;
        }
        .mdb-footer-brand {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mdb-footer-logo {
          font-family: ${theme.fonts.display};
          font-size: 16px;
          font-weight: 800;
          color: ${theme.colors.ink};
        }
        .mdb-footer-logo span { color: ${theme.colors.primary}; }
        .mdb-footer-tagline {
          font-size: 12px;
          color: ${theme.colors.muted};
          max-width: 240px;
          line-height: 1.5;
        }

        .mdb-footer-links {
          display: flex;
          gap: 32px;
        }
        .mdb-footer-col {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mdb-footer-col-title {
          font-size: 12px;
          font-weight: 700;
          color: ${theme.colors.ink};
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }
        .mdb-footer-link {
          font-size: 14px;
          color: ${theme.colors.muted};
          text-decoration: none;
          transition: color 150ms ease;
        }
        .mdb-footer-link:hover { color: ${theme.colors.ink}; }

        .mdb-footer-social {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .mdb-footer-social-link {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(0,0,0,0.04); /* theme.colors.ink 4% */
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: ${theme.colors.muted};
          font-size: 14px;
          transition: all 150ms ease;
        }
        .mdb-footer-social-link:hover {
          background: rgba(0,0,0,0.08); /* theme.colors.ink 8% */
          color: ${theme.colors.ink};
        }

        .mdb-footer-bottom {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid ${theme.colors.sand};
          font-size: 12px;
          color: ${theme.colors.muted};
          text-align: center;
        }

        /* ---- Mobile (< 768px) ---- */
        @media (max-width: 767px) {
          .mdb-header {
            padding: 0 16px;
          }
          .mdb-hamburger {
            display: block;
          }
          .mdb-nav {
            display: none;
          }
          .mdb-footer {
            padding: 32px 16px 24px;
          }
          .mdb-footer-inner {
            flex-direction: column;
            gap: 24px;
          }
          .mdb-footer-links {
            flex-direction: column;
            gap: 24px;
          }
        }
      `}</style>

      <div style={{ fontFamily: theme.fonts.body, background: theme.colors.bg, minHeight: '100vh' }}>
        {/* Skip to content */}
        <a href="#main-content" style={{
          position: 'absolute', top: '-100px', left: '16px', zIndex: 9999,
          background: theme.colors.primary, color: '#fff', padding: '8px 16px',
          borderRadius: theme.radii.sm, fontSize: theme.fontSizes.base, fontWeight: 600,
          textDecoration: 'none', transition: 'top 150ms ease',
        }} onFocus={e => { (e.currentTarget as HTMLElement).style.top = '8px' }}
           onBlur={e => { (e.currentTarget as HTMLElement).style.top = '-100px' }}
        >
          Aller au contenu
        </a>
        <header className="mdb-header" role="banner">
          <a href="/" className="mdb-logo" aria-label="Mon Petit MDB - Accueil">Mon Petit <span>MDB</span></a>

          {/* Desktop nav */}
          <nav className="mdb-nav" role="navigation" aria-label="Navigation principale">
            <a
              href="/biens"
              className="mdb-nav-link"
              aria-current={isActive('/biens') ? 'page' : undefined}
            >
              Biens Immobiliers
            </a>
            <a
              href="/strategies"
              className="mdb-nav-link"
              aria-current={isActive('/strategies') ? 'page' : undefined}
            >
              {"Strat\u00E9gies MDB"}
            </a>
            <a
              href="/blog"
              className="mdb-nav-link"
              aria-current={isActive('/blog') ? 'page' : undefined}
            >
              Conseils
            </a>
            <div className="mdb-nav-sep" role="separator" aria-hidden="true" />
            {user ? (
              <>
                <a
                  href="/mes-biens"
                  className="nav-watchlist"
                  aria-current={isActive('/mes-biens') ? 'page' : undefined}
                >
                  <svg className="nav-heart" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  Watchlist
                  {watchlistCount > 0 && (
                    <span style={{
                      background: theme.colors.primary, color: '#fff', borderRadius: '10px',
                      padding: '1px 6px', fontSize: '10px', fontWeight: 700, minWidth: '18px',
                      textAlign: 'center', lineHeight: '16px',
                    }}>
                      {watchlistCount}
                    </span>
                  )}
                </a>
                <div className="user-pill-wrap">
                  <button className="user-pill" onClick={() => setUserMenuOpen(!userMenuOpen)} aria-expanded={userMenuOpen} aria-haspopup="true">
                    <span className="user-email">{user.email}</span>
                    <span className="user-avatar" aria-hidden="true">{(user.email || '?')[0].toUpperCase()}</span>
                  </button>
                  <div className={`user-dropdown ${userMenuOpen ? 'open' : ''}`} role="menu">
                    <a href="/mon-profil" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Mon Profil
                    </a>
                    <a href="/parametres" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      {"Mes param\u00E8tres"}
                    </a>
                    <a href="/mes-biens" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      Ma Watchlist
                    </a>
                    {userRole === 'admin' && (
                      <>
                        <div className="user-dropdown-sep" />
                        <a href="/admin" className="user-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                          Administration
                        </a>
                      </>
                    )}
                    <div className="user-dropdown-sep" />
                    <button className="user-dropdown-item logout" onClick={() => { setUserMenuOpen(false); handleLogout() }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      {"D\u00E9connexion"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <a href="/login" className="btn-login" aria-label="Se connecter">Se connecter</a>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="mdb-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu de navigation"
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
          >
            <span className="mdb-hamburger-bar" aria-hidden="true" />
            <span className="mdb-hamburger-bar" aria-hidden="true" />
            <span className="mdb-hamburger-bar" aria-hidden="true" />
          </button>
        </header>

        {/* Mobile drawer overlay */}
        <div
          className={`mdb-drawer-overlay ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Mobile drawer */}
        <nav
          id="mobile-drawer"
          className={`mdb-drawer ${menuOpen ? 'open' : ''}`}
          role="navigation"
          aria-label="Menu mobile"
        >
          <button
            className="mdb-drawer-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Fermer le menu de navigation"
          >
            &#x2715;
          </button>
          <a
            href="/biens"
            className="mdb-nav-link"
            aria-current={isActive('/biens') ? 'page' : undefined}
            aria-label="Voir tous les biens"
          >
            Biens Immobiliers
          </a>
          <a
            href="/strategies"
            className="mdb-nav-link"
            aria-current={isActive('/strategies') ? 'page' : undefined}
          >
            {"Strat\u00E9gies MDB"}
          </a>
          <a
            href="/blog"
            className="mdb-nav-link"
            aria-current={isActive('/blog') ? 'page' : undefined}
          >
            Conseils
          </a>
          <div className="mdb-nav-sep" role="separator" aria-hidden="true" />
          {user ? (
            <>
              <a
                href="/mes-biens"
                className="nav-watchlist"
                aria-current={isActive('/mes-biens') ? 'page' : undefined}
              >
                <svg className="nav-heart" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                Watchlist
              </a>
              <a href="/mon-profil" className="mdb-nav-link" aria-current={isActive('/mon-profil') ? 'page' : undefined}>Mon Profil</a>
              <a href="/parametres" className="mdb-nav-link" aria-current={isActive('/parametres') ? 'page' : undefined}>{"Mes param\u00E8tres"}</a>
              <button className="btn-logout" onClick={handleLogout} aria-label="Se d\u00E9connecter">{"D\u00E9connexion"}</button>
            </>
          ) : (
            <a href="/login" className="btn-login" aria-label="Se connecter">Se connecter</a>
          )}
        </nav>

        <main id="main-content" role="main">{children}</main>

        <footer className="mdb-footer" role="contentinfo">
          <div className="mdb-footer-inner">
            <div className="mdb-footer-brand">
              <div className="mdb-footer-logo">Mon Petit <span>MDB</span></div>
              <p className="mdb-footer-tagline">
                Sourcing immobilier pour investisseurs particuliers. Méthodologie marchand de biens.
              </p>
              <div className="mdb-footer-social" aria-label="Réseaux sociaux">
                <a href="#" className="mdb-footer-social-link" aria-label="LinkedIn">in</a>
                <a href="#" className="mdb-footer-social-link" aria-label="Twitter / X">X</a>
                <a href="#" className="mdb-footer-social-link" aria-label="YouTube">YT</a>
              </div>
            </div>
            <div className="mdb-footer-links">
              <div className="mdb-footer-col">
                <div className="mdb-footer-col-title">Plateforme</div>
                <a href="/biens" className="mdb-footer-link" aria-label="Voir les biens">Biens</a>
                <a href="/strategies" className="mdb-footer-link" aria-label="Les strat\u00E9gies">{"Strat\u00E9gies"}</a>
                <a href="/blog" className="mdb-footer-link" aria-label="Conseils et guides">Conseils</a>
                <a href="/#pricing" className="mdb-footer-link" aria-label="Voir les tarifs">Tarifs</a>
              </div>
              <div className="mdb-footer-col">
                <div className="mdb-footer-col-title">Support</div>
                <a href="/contact" className="mdb-footer-link" aria-label="Nous contacter">Contact</a>
                <a href="/mentions-legales" className="mdb-footer-link" aria-label="Mentions légales">Mentions légales</a>
                <a href="/cgu" className="mdb-footer-link" aria-label="Conditions générales">CGU</a>
              </div>
            </div>
          </div>
          <div className="mdb-footer-bottom">
            &copy; 2026 Mon Petit MDB. Tous droits réservés.
          </div>
        </footer>

        <ChatWidget plan={userPlan as any} />

        {/* Scroll to top */}
        <button
          id="scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Retour en haut"
          style={{
            position: 'fixed', bottom: 90, right: 24,
            width: 40, height: 40, borderRadius: '50%',
            background: theme.colors.ink, color: '#fff', border: 'none',
            cursor: 'pointer', display: 'none', alignItems: 'center', justifyContent: 'center',
            boxShadow: theme.shadows.card, zIndex: 99, transition: `opacity ${theme.transitions.fast}`,
            fontSize: 18,
          }}
        >
          {'\u2191'}
        </button>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){var b=document.getElementById('scroll-top');if(!b)return;window.addEventListener('scroll',function(){b.style.display=window.scrollY>600?'flex':'none'})})()
        `}} />
      </div>
    </>
  )
}
