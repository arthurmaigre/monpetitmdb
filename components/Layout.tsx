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
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

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
          font-size: 13px;
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
          font-size: 13px;
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
          font-size: 13px;
          font-weight: 500;
          color: ${theme.colors.ink};
          background: transparent;
          cursor: pointer;
          text-decoration: none;
          transition: all 150ms ease;
        }
        .btn-login:hover { border-color: ${theme.colors.ink}; background: rgba(0,0,0,0.03); /* theme.colors.ink 3% */ }

        .user-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px 4px 12px;
          border-radius: 20px;
          background: rgba(0,0,0,0.04); /* theme.colors.ink 4% */
          text-decoration: none;
          transition: background 150ms ease;
        }
        .user-pill:hover { background: rgba(0,0,0,0.07); /* theme.colors.ink 7% */ }
        .user-email { font-size: 12px; color: ${theme.colors.muted}; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .user-avatar {
          width: 24px; height: 24px; border-radius: 50%;
          background: ${theme.colors.primary};
          color: #fff; font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }

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
          padding: 12px 16px;
          font-size: 15px;
          border-radius: 8px;
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
          font-size: 13px;
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
        <header className="mdb-header" role="banner">
          <a href="/" className="mdb-logo" aria-label="Mon Petit MDB - Accueil">Mon Petit <span>MDB</span></a>

          {/* Desktop nav */}
          <nav className="mdb-nav" role="navigation" aria-label="Navigation principale">
            <a
              href="/biens"
              className="mdb-nav-link"
              aria-current={isActive('/biens') ? 'page' : undefined}
              aria-label="Voir tous les biens"
            >
              Biens
            </a>
            <a
              href="/mes-biens"
              className="nav-watchlist"
              aria-current={isActive('/mes-biens') ? 'page' : undefined}
              aria-label="Ma watchlist de biens favoris"
            >
              <svg className="nav-heart" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Watchlist
            </a>
            <div className="mdb-nav-sep" role="separator" aria-hidden="true" />
            {user ? (
              <>
                <a href="/mon-profil" className="user-pill" aria-label="Mon profil">
                  <span className="user-email">{user.email}</span>
                  <span className="user-avatar" aria-hidden="true">{(user.email || '?')[0].toUpperCase()}</span>
                </a>
                <button className="btn-logout" onClick={handleLogout} aria-label="Se déconnecter">Déconnexion</button>
              </>
            ) : (
              <a href="/login" className="btn-login" aria-label="Se connecter à votre compte">Se connecter</a>
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
            Biens
          </a>
          <a
            href="/mes-biens"
            className="nav-watchlist"
            aria-current={isActive('/mes-biens') ? 'page' : undefined}
            aria-label="Ma watchlist de biens favoris"
          >
            <svg className="nav-heart" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Watchlist
          </a>
          <div className="mdb-nav-sep" role="separator" aria-hidden="true" />
          {user ? (
            <>
              <a href="/mon-profil" className="user-pill" aria-label="Mon profil">
                <span className="user-email">{user.email}</span>
                <span className="user-avatar" aria-hidden="true">{(user.email || '?')[0].toUpperCase()}</span>
              </a>
              <button className="btn-logout" onClick={handleLogout} aria-label="Se déconnecter">Déconnexion</button>
            </>
          ) : (
            <a href="/login" className="btn-login" aria-label="Se connecter à votre compte">Se connecter</a>
          )}
        </nav>

        <main role="main">{children}</main>

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
                <a href="/tarifs" className="mdb-footer-link" aria-label="Voir les tarifs">Tarifs</a>
                <a href="/blog" className="mdb-footer-link" aria-label="Lire le blog">Blog</a>
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
      </div>
    </>
  )
}
