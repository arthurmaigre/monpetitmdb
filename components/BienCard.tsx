import { Bien } from '@/lib/types'
import MetroBadge from './MetroBadge'
import RendementBadge from './RendementBadge'

interface Props {
  bien: Bien
}

function formatPrix(n: number) {
  return n ? n.toLocaleString('fr-FR') + ' €' : '—'
}

export default function BienCard({ bien }: Props) {
  return (
    <div style={{
      background: '#fff', borderRadius: '16px', overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = ''
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'
      }}
    >
      <div style={{ height: '195px', background: '#ede8e0', overflow: 'hidden', position: 'relative' }}>
        {bien.photo_url
          ? <img src={bien.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0b8b0', fontSize: '13px' }}>Pas de photo</div>
        }
        <span style={{ position: 'absolute', top: '12px', left: '12px' }}>
          <MetroBadge metropole={bien.metropole} />
        </span>
        <span style={{ position: 'absolute', top: '12px', right: '12px' }}>
          <RendementBadge rendement={bien.rendement_brut} />
        </span>
      </div>

      <div style={{ padding: '18px' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 700 }}>
          {bien.type_bien} {bien.nb_pieces} · {bien.surface} m²
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{bien.ville}</span>
          {bien.quartier && <span style={{ fontSize: '12px', color: '#9a8a80' }}>· {bien.quartier}</span>}
        </div>

        <div style={{ fontSize: '24px', fontWeight: 700, margin: '12px 0 8px', letterSpacing: '-0.02em' }}>
          {formatPrix(bien.prix_fai)}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {bien.loyer
            ? <span style={{ fontSize: '12px', color: '#9a8a80', background: '#f7f4f0', padding: '4px 9px', borderRadius: '6px' }}>💶 {bien.loyer} €/mois</span>
            : <span style={{ fontSize: '12px', color: '#c0b0a0', background: '#f7f4f0', padding: '4px 9px', borderRadius: '6px', fontStyle: 'italic' }}>Loyer NC</span>
          }
          {bien.prix_m2 && <span style={{ fontSize: '12px', color: '#9a8a80', background: '#f7f4f0', padding: '4px 9px', borderRadius: '6px' }}>📐 {bien.prix_m2} €/m²</span>}
          {bien.profil_locataire && <span style={{ fontSize: '12px', color: '#9a8a80', background: '#f7f4f0', padding: '4px 9px', borderRadius: '6px' }}>👤 {bien.profil_locataire}</span>}
        </div>

        <a href={`/biens/${bien.id}`} style={{
          display: 'block', textAlign: 'center', padding: '11px',
          background: '#f7f4f0', color: '#1a1210', borderRadius: '10px',
          textDecoration: 'none', fontSize: '13px', fontWeight: 600,
          border: '1.5px solid #ede8e0', transition: 'all 0.15s',
        }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#1a1210'
            ;(e.currentTarget as HTMLElement).style.color = '#fff'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = '#f7f4f0'
            ;(e.currentTarget as HTMLElement).style.color = '#1a1210'
          }}
        >
          Voir l'analyse →
        </a>
      </div>
    </div>
  )
}