import Layout from '@/components/Layout'

export default function NotFound() {
  return (
    <Layout>
      <div style={{
        maxWidth: '600px', margin: '0 auto', padding: '120px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Fraunces', serif", fontSize: '96px', fontWeight: 800,
          color: '#e8e2d8', lineHeight: 1, marginBottom: '16px',
        }}>
          404
        </div>
        <h1 style={{
          fontFamily: "'Fraunces', serif", fontSize: '28px', fontWeight: 700,
          color: '#1a1210', marginBottom: '12px',
        }}>
          Page introuvable
        </h1>
        <p style={{
          fontSize: '15px', color: '#9a8a80', lineHeight: 1.6,
          marginBottom: '32px',
        }}>
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a href="/biens" style={{
            padding: '12px 24px', borderRadius: '8px',
            background: '#c0392b', color: '#fff',
            textDecoration: 'none', fontSize: '14px', fontWeight: 600,
            transition: 'opacity 150ms ease',
          }}>
            Voir les biens
          </a>
          <a href="/" style={{
            padding: '12px 24px', borderRadius: '8px',
            border: '1.5px solid #e8e2d8', color: '#1a1210',
            textDecoration: 'none', fontSize: '14px', fontWeight: 500,
            transition: 'all 150ms ease',
          }}>
            Retour à l'accueil
          </a>
        </div>
      </div>
    </Layout>
  )
}
