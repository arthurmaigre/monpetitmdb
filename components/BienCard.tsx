'use client'

import { useState } from 'react'
import { Bien } from '@/lib/types'
import { theme } from '@/lib/theme'
import MetroBadge from './MetroBadge'
import RendementBadge from './RendementBadge'
import PlusValueBadge from './PlusValueBadge'

interface Props {
  bien: Bien
  inWatchlist?: boolean
  userToken?: string | null
  onWatchlistChange?: (bienId: string, added: boolean) => void
}

function formatPrix(n: number) {
  return n ? n.toLocaleString('fr-FR') + ' \u20AC' : '-'
}

function getPhotos(bien: any): string[] {
  if (bien.pictureUrls?.length > 0) return bien.pictureUrls
  if (bien.photo_url) return [bien.photo_url]
  return []
}

const DPE_COLORS: Record<string, string> = {
  A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0e034',
  E: '#f0a830', F: '#eb6a2a', G: '#e42a1e',
}

/* SVG arrow icons for carousel */
function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  )
}

export default function BienCard({ bien, inWatchlist = false, userToken, onWatchlistChange }: Props) {
  const [isInWatchlist, setIsInWatchlist] = useState(inWatchlist)
  const [loading, setLoading] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const photos = getPhotos(bien)
  const lienTitre = bien.url ? bien.url : '/biens/' + bien.id
  const scoreTravaux = bien.score_travaux
  const isTravaux = bien.strategie_mdb === 'Travaux lourds'
  const imageAlt = `${bien.type_bien || 'Bien'} ${bien.nb_pieces || ''} - ${bien.ville || ''}`

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

  function handlePrevPhoto(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setImgLoaded(false)
    setImgError(false)
    setPhotoIdx(i => i > 0 ? i - 1 : photos.length - 1)
  }

  function handleNextPhoto(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setImgLoaded(false)
    setImgError(false)
    setPhotoIdx(i => i < photos.length - 1 ? i + 1 : 0)
  }

  /* Shared badge style for info pills */
  const pillStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    fontSize: theme.fontSizes.sm,
    color: theme.colors.muted,
    background: theme.colors.sandLight,
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.radii.sm,
    ...extra,
  })

  return (
    <div
      style={{
        background: theme.colors.card,
        borderRadius: theme.radii.lg,
        overflow: 'hidden',
        boxShadow: theme.shadows.card,
        transition: `transform ${theme.transitions.fast}, box-shadow ${theme.transitions.fast}`,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
    >
      {/* Photo area */}
      <div style={{ height: '196px', background: theme.colors.bgHover, overflow: 'hidden', position: 'relative' }}>
        {photos.length > 0 ? (
          <>
            {/* Shimmer skeleton while loading */}
            {!imgLoaded && !imgError && (
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(90deg, ${theme.colors.bgHover} 25%, ${theme.colors.sandLight} 50%, ${theme.colors.bgHover} 75%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
            )}
            {/* Error state */}
            {imgError ? (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: theme.colors.textTertiary, fontSize: theme.fontSizes.sm, gap: theme.spacing[1],
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="3" x2="21" y2="21" />
                </svg>
                Photo indisponible
              </div>
            ) : (
              <img
                src={photos[photoIdx]}
                alt={imageAlt}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  opacity: imgLoaded ? 1 : 0,
                  transition: `opacity ${theme.transitions.fast}`,
                }}
              />
            )}
          </>
        ) : (
          /* Skeleton placeholder when no photos at all */
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: theme.colors.textTertiary, fontSize: theme.fontSizes.sm, gap: theme.spacing[1],
            background: `linear-gradient(90deg, ${theme.colors.bgHover} 25%, ${theme.colors.sandLight} 50%, ${theme.colors.bgHover} 75%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ opacity: 0.5 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        {/* Carousel arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={handlePrevPhoto}
              aria-label="Photo precedente"
              style={{
                position: 'absolute', left: theme.spacing[2], top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.4)', color: theme.colors.card, border: 'none', borderRadius: '50%',
                width: '28px', height: '28px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0.7, transition: `opacity ${theme.transitions.fast}`,
              }}
            >
              <ChevronLeft />
            </button>
            <button
              onClick={handleNextPhoto}
              aria-label="Photo suivante"
              style={{
                position: 'absolute', right: theme.spacing[2], top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.4)', color: theme.colors.card, border: 'none', borderRadius: '50%',
                width: '28px', height: '28px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0.7, transition: `opacity ${theme.transitions.fast}`,
              }}
            >
              <ChevronRight />
            </button>
            {/* Dots */}
            <div style={{
              position: 'absolute', bottom: theme.spacing[2], left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: theme.spacing[1],
            }}>
              {photos.slice(0, 6).map((_, i) => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: i === photoIdx ? theme.colors.card : 'rgba(255,255,255,0.4)',
                  transition: `background ${theme.transitions.fast}`,
                }} />
              ))}
              {photos.length > 6 && (
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
              )}
            </div>
          </>
        )}

        {/* Badges overlay */}
        <span style={{ position: 'absolute', top: theme.spacing[3], left: theme.spacing[3] }}>
          <MetroBadge metropole={bien.metropole} />
        </span>
        <span style={{
          position: 'absolute', top: theme.spacing[3], right: theme.spacing[3],
          display: 'flex', flexDirection: 'column', gap: theme.spacing[1], alignItems: 'flex-end',
        }}>
          {!isTravaux && <RendementBadge rendement={bien.rendement_brut} />}
          <PlusValueBadge prixFai={bien.prix_fai} estimationPrix={bien.estimation_prix_total} scoreTravaux={scoreTravaux} surface={bien.surface} />
        </span>

        {/* Watchlist button */}
        <button
          onClick={toggleWatchlist}
          disabled={loading}
          aria-label={isInWatchlist ? 'Retirer de la watchlist' : 'Ajouter a la watchlist'}
          style={{
            position: 'absolute', bottom: theme.spacing[3], right: theme.spacing[3],
            background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: `all ${theme.transitions.fast}`,
            opacity: loading ? 0.6 : 1,
            color: isInWatchlist ? theme.colors.primary : theme.colors.textTertiary,
          }}
        >
          {isInWatchlist ? '\u2665' : '\u2661'}
        </button>
      </div>

      {/* Content area */}
      <div style={{ padding: theme.spacing[4] }}>
        <a
          href={lienTitre}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: theme.fonts.display,
            fontSize: theme.fontSizes.md,
            fontWeight: 700,
            color: theme.colors.ink,
            textDecoration: 'none',
            display: 'block',
          }}
        >
          {bien.type_bien} {bien.nb_pieces} - {bien.surface} m2
        </a>

        <div style={{
          display: 'flex', alignItems: 'center', gap: theme.spacing[2],
          marginTop: theme.spacing[1], flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: theme.fontSizes.sm, fontWeight: 500 }}>
            {bien.ville}{(bien as any).code_postal ? ` - ${(bien as any).code_postal}` : ''}
          </span>
          {bien.quartier && (
            <span style={{ fontSize: theme.fontSizes.sm, color: theme.colors.muted }}>
              - {bien.quartier}
            </span>
          )}
        </div>

        <div style={{
          fontSize: theme.fontSizes.xl, fontWeight: 700,
          margin: `${theme.spacing[3]} 0 ${theme.spacing[2]}`,
          letterSpacing: '-0.02em',
        }}>
          {formatPrix(bien.prix_fai)}
        </div>

        <div style={{
          display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap',
          marginBottom: theme.spacing[4],
        }}>
          {isTravaux ? (
            <>
              {scoreTravaux ? (
                <span style={pillStyle({
                  fontWeight: 600,
                  background: theme.colors.warningLight,
                  color: '#856404',
                })}>
                  Score travaux : {scoreTravaux}/5
                </span>
              ) : (
                <span style={pillStyle({ fontStyle: 'italic', color: theme.colors.textTertiary })}>
                  Score NC
                </span>
              )}
              {bien.prix_m2 && (
                <span style={pillStyle()}>
                  {Number(bien.prix_m2).toLocaleString('fr-FR')} {'\u20AC'}/m2
                </span>
              )}
              {(bien as any).dpe && (
                <span style={pillStyle({
                  fontWeight: 700,
                  color: theme.colors.card,
                  background: DPE_COLORS[(bien as any).dpe] || theme.colors.muted,
                })}>
                  DPE {(bien as any).dpe}
                </span>
              )}
            </>
          ) : (
            <>
              {bien.loyer
                ? <span style={pillStyle()}>{bien.loyer} {'\u20AC'}/mois</span>
                : <span style={pillStyle({ fontStyle: 'italic', color: theme.colors.textTertiary })}>Loyer NC</span>
              }
              {bien.prix_m2 && (
                <span style={pillStyle()}>
                  {Number(bien.prix_m2).toLocaleString('fr-FR')} {'\u20AC'}/m2
                </span>
              )}
              {(bien as any).dpe && (
                <span style={pillStyle({
                  fontWeight: 700,
                  color: theme.colors.card,
                  background: DPE_COLORS[(bien as any).dpe] || theme.colors.muted,
                })}>
                  DPE {(bien as any).dpe}
                </span>
              )}
              {scoreTravaux ? (
                <span style={pillStyle({
                  fontWeight: 600,
                  background: theme.colors.warningLight,
                  color: '#856404',
                })}>
                  Travaux : {scoreTravaux}/5
                </span>
              ) : null}
              {bien.profil_locataire && bien.profil_locataire !== 'NC' && <span style={pillStyle()}>{bien.profil_locataire}</span>}
            </>
          )}
        </div>

        <a
          href={'/biens/' + bien.id}
          style={{
            display: 'block', textAlign: 'center',
            padding: `${theme.spacing[3]}`,
            background: theme.colors.sandLight,
            color: theme.colors.ink,
            borderRadius: theme.radii.md,
            textDecoration: 'none',
            fontSize: theme.fontSizes.sm,
            fontWeight: 600,
            border: `1.5px solid ${theme.colors.sand}`,
            transition: `background ${theme.transitions.fast}`,
          }}
        >
          Voir l'analyse
        </a>
      </div>

      {/* Shimmer keyframe - injected once via style tag */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
