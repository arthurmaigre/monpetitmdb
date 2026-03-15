'use client'

import { useState } from 'react'
import { Bien } from '@/lib/types'
import MetroBadge from './MetroBadge'
import RendementBadge from './RendementBadge'

interface Props {
  bien: Bien
  inWatchlist?: boolean
  userToken?: string | null
  onWatchlistChange?: (bienId: string, added: boolean) => void
}

function formatPrix(n: number) {
  return n ? n.toLocaleString('fr-FR') + ' €' : '-'
}

export default function BienCard({ bien, inWatchlist = false, userToken, onWatchlistChange }: Props) {
  const [isInWatchlist, setIsInWatchlist] = useState(inWatchlist)
  const [loading, setLoading] = useState(false)
  const lienTitre = bien.url ? bien.url : '/biens/' + bien.id

  async function toggleWatchlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!userToken) { window.location.href = '/login'; return }
    setLoading(true)
    const method = isInWatchlist ? 'DELETE' : 'POST'
    const res = await fetch('/api/watchlist', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ bien_id: bien.id })
    })
    if (res.ok) {
      setIsInWatchlist(!isInWatchlist)
      onWatchlistChange?.(bien.id, !isInWatchlist)
    }
    setLoading(false)
  }

  return (
    <div
      style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
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
       <button onClick={toggleWatchlist} disabled={loading} style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'all 0.15s', opacity: loading ? 0.6 : 1, color: isInWatchlist ? '#c0392b' : '#c0b0a0' }} title={isInWatchlist ? 'Retirer de la watchlist' : 'Ajouter a la watchlist'}>
          {isInWatchlist ? '♥' : '♡'}
        </button>
      </div>
      <div style={{ padding: '18px' }}>
        <a href={lienTitre} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 700, color: '#1a1210', textDecoration: 'none', display: 'block' }}>
          {bien.type_bien} {bien.nb_pieces} - {bien.surface} m2
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{bien.ville}</span>
          {bien.quartier && <span style={{ fontSize: '12px', color: '#9a8a80' }}>- {bien.quartier}</span>}
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, margin: '12px 0 8px', letterSpacing: '-0.02em' }}>
          {formatPrix(bien.prix_fai)}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {bien.loyer
            ? <span style={{ fontSize: '12px', color: '#9a8a80', background: '#f7f4f0', padding: '4px 9px', borderRadius: '6px' }}>{bien.loyer} €/mois</span>
            : <span style={{ fontSize: '12px', color: '#c0b0a0', background: '#f7f4f0', padding: '4px 9px', borderRadius: '6px', fontStyle: 'italic' }}>Loyer NC</span>
          }
          {bien.prix_m2 && <span style={{ fontSize: '12px', color: '#9a8a80', background: '#f7f4f0', padding: '4px 9px', borderRadius: '6px' }}>{Number(bien.prix_m2).toLocaleString('fr-FR')} €/m2</span>}
          {bien.profil_locataire && <span style={{ fontSize: '12px', color: '#9a8a80', background: '#f7f4f0', padding: '4px 9px', borderRadius: '6px' }}>{bien.profil_locataire}</span>}
        </div>
        <a href={'/biens/' + bien.id} style={{ display: 'block', textAlign: 'center', padding: '11px', background: '#f7f4f0', color: '#1a1210', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, border: '1.5px solid #ede8e0' }}>
          Voir l'analyse
        </a>
      </div>
    </div>
  )
}