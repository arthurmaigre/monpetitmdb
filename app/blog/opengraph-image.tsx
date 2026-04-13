import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F5F0E8',
          padding: '80px',
          fontFamily: 'serif',
        }}
      >
        {/* Category badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#c0392b',
            borderRadius: '999px',
            padding: '8px 24px',
            marginBottom: '32px',
          }}
        >
          <span style={{ fontSize: '22px', color: '#F5F0E8', fontFamily: 'sans-serif', fontWeight: 500 }}>
            Blog
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: '68px',
            fontWeight: 700,
            color: '#1a1210',
            letterSpacing: '-1px',
            marginBottom: '16px',
            fontFamily: 'serif',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          <span>Conseils &amp; guides</span>
          <span>immobiliers</span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '64px',
            height: '4px',
            backgroundColor: '#c0392b',
            borderRadius: '2px',
            marginBottom: '24px',
          }}
        />

        {/* Brand */}
        <div
          style={{
            fontSize: '28px',
            color: '#7a6a60',
            fontFamily: 'sans-serif',
            fontWeight: 400,
          }}
        >
          Mon Petit MDB
        </div>
      </div>
    ),
    { ...size }
  )
}
