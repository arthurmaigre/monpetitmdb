'use client'

export default function BiensError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '50vh', padding: '40px 16px', fontFamily: "'DM Sans', sans-serif",
    }}>
      <h2 style={{ fontSize: '20px', color: '#1a1210', marginBottom: '8px' }}>
        Erreur de chargement des biens
      </h2>
      <p style={{ fontSize: '14px', color: '#7a6a60', marginBottom: '24px' }}>
        Une erreur inattendue est survenue. Veuillez r{'\u00E9'}essayer.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px', fontSize: '14px', fontWeight: 600,
          color: '#ffffff', backgroundColor: '#c0392b', border: 'none',
          borderRadius: '8px', cursor: 'pointer',
        }}
      >
        R{'\u00E9'}essayer
      </button>
    </div>
  )
}
