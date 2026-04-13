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
        {/* Logo mark */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '16px',
            backgroundColor: '#c0392b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              color: '#F5F0E8',
              fontSize: '42px',
              fontWeight: 700,
              fontFamily: 'serif',
              lineHeight: 1,
            }}
          >
            M
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 700,
            color: '#1a1210',
            letterSpacing: '-1px',
            marginBottom: '16px',
            fontFamily: 'serif',
            textAlign: 'center',
          }}
        >
          Mon Petit MDB
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

        {/* Subtitle */}
        <div
          style={{
            fontSize: '32px',
            color: '#7a6a60',
            fontFamily: 'sans-serif',
            fontWeight: 400,
            textAlign: 'center',
          }}
        >
          Le SaaS du marchand de biens
        </div>
      </div>
    ),
    { ...size }
  )
}
