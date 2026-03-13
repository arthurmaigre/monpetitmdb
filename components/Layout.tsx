import { theme } from '@/lib/theme'

interface Props {
  children: React.ReactNode
  bienCount?: number
}

export default function Layout({ children, bienCount }: Props) {
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
        .mdb-nav a.active { color: ${theme.colors.ink}; font-weight: 600; }

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