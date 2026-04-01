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
  extraTitleRight?: React.ReactNode
  compact?: boolean
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

export default function BienCard({ bien, inWatchlist = false, userToken, onWatchlistChange, extraTitleRight, compact = false }: Props) {
  const [isInWatchlist, setIsInWatchlist] = useState(inWatchlist)
  const [loading, setLoading] = useState(false)
  const [upgradeMsg, setUpgradeMsg] = useState<{ limit: number; plan: string } | null>(null)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const photos = getPhotos(bien)
  const lienTitre = bien.url ? bien.url : '/biens/' + bien.id
  const scoreTravaux = bien.score_travaux
  const isTravaux = bien.strategie_mdb === 'Travaux lourds'
  const isIDR = bien.strategie_mdb === 'Immeuble de rapport'
  const imageAlt = `${bien.type_bien || 'Bien'} ${bien.nb_pieces || ''} - ${bien.ville || ''}`

  async function toggleWatchlist(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!userToken) { window.location.href = '/login'; return }
    setLoading(true)
    const prevState = isInWatchlist
    // Optimistic update: toggle immediately
    setIsInWatchlist(!prevState)
    const method = prevState ? 'DELETE' : 'POST'
    try {
      const res = await fetch('/api/watchlist', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ bien_id: bien.id })
      })
      if (res.ok) {
        onWatchlistChange?.(bien.id, !prevState)
      } else if (res.status === 403) {
        // Rollback on limit reached
        setIsInWatchlist(prevState)
        const data = await res.json()
        if (data.upgrade) setUpgradeMsg({ limit: data.limit, plan: data.plan })
      } else {
        // Rollback on any other error
        setIsInWatchlist(prevState)
      }
    } catch {
      // Rollback on network error
      setIsInWatchlist(prevState)
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
      <div
        tabIndex={photos.length > 1 ? 0 : undefined}
        onKeyDown={photos.length > 1 ? (e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrevPhoto(e as any) }
          if (e.key === 'ArrowRight') { e.preventDefault(); handleNextPhoto(e as any) }
        } : undefined}
        aria-label={photos.length > 1 ? `Photo ${photoIdx + 1} sur ${photos.length}` : undefined}
        style={{ height: '196px', background: theme.colors.bgHover, overflow: 'hidden', position: 'relative' }}>
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
                width={400}
                height={196}
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
              aria-label={"Photo pr\u00E9c\u00E9dente"}
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
            {/* Photo counter */}
            <div style={{
              position: 'absolute', bottom: theme.spacing[2], left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '10px',
              padding: '2px 8px', fontSize: '11px', fontWeight: 600,
            }}>
              {photoIdx + 1}/{photos.length}
            </div>
          </>
        )}

        {/* Badges overlay */}
        <span style={{ position: 'absolute', top: theme.spacing[3], left: theme.spacing[3] }}>
          <MetroBadge metropole={bien.metropole} />
        </span>
        <span style={{
          position: 'absolute',
          ...(compact
            ? { bottom: theme.spacing[3], left: theme.spacing[3] }
            : { top: theme.spacing[3], right: theme.spacing[3] }),
          display: 'flex', flexDirection: 'column', gap: theme.spacing[1], alignItems: compact ? 'flex-start' : 'flex-end',
        }}>
          {!isTravaux && <RendementBadge rendement={bien.rendement_brut} />}
        </span>

        {/* Watchlist button */}
        <button
          onClick={toggleWatchlist}
          disabled={loading}
          aria-label={isInWatchlist ? 'Retirer de la watchlist' : "Ajouter \u00E0 la watchlist"}
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
            animation: isInWatchlist ? 'heart-bounce 0.4s ease' : 'none',
          }}
        >
          {isInWatchlist ? '\u2665' : '\u2661'}
        </button>
      </div>

      {/* Content area */}
      <div style={{ padding: theme.spacing[4] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
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
            {bien.type_bien || 'Bien'} {bien.nb_pieces}{bien.surface ? ` - ${bien.surface} m\u00B2` : ''}
          </a>
          {extraTitleRight}
        </div>

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
          {isIDR ? (
            <>
              {(bien as any).nb_lots && (
                <span style={pillStyle({ fontWeight: 700, background: '#d4ddf5', color: '#2a4a8a' })}>
                  {(bien as any).nb_lots} lots
                </span>
              )}
              {bien.loyer && (
                <span style={pillStyle()}>{bien.loyer.toLocaleString('fr-FR')} {'\u20AC'}/mois</span>
              )}
              {bien.prix_m2 && (
                <span style={pillStyle()}>
                  {Math.round(Number(bien.prix_m2)).toLocaleString('fr-FR')} {'\u20AC'}/m{'\u00B2'}
                </span>
              )}
              {(bien as any).monopropriete && (
                <span style={pillStyle({ background: '#d4f5e0', color: '#1a7a40' })}>{"Monopropri\u00E9t\u00E9"}</span>
              )}
            </>
          ) : isTravaux ? (
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
                  {Math.round(Number(bien.prix_m2)).toLocaleString('fr-FR')} {'\u20AC'}/m{'\u00B2'}
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
                  {Math.round(Number(bien.prix_m2)).toLocaleString('fr-FR')} {'\u20AC'}/m{'\u00B2'}
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
        @keyframes heart-bounce { 0% { transform: scale(1); } 30% { transform: scale(1.3); } 60% { transform: scale(0.9); } 100% { transform: scale(1); } }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Modal upgrade watchlist */}
      {upgradeMsg && (
        <div
          onClick={() => setUpgradeMsg(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(26,18,16,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 20, padding: '40px 32px',
              maxWidth: 380, width: '90%', textAlign: 'center',
              boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
              fontFamily: theme.fonts.body,
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: 'rgba(192,57,43,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <h3 style={{
              fontFamily: theme.fonts.display, fontSize: 20, fontWeight: 700,
              marginBottom: 12, color: theme.colors.ink,
            }}>
              Watchlist compl{'\u00E8'}te
            </h3>
            <p style={{ fontSize: 14, color: theme.colors.muted, lineHeight: 1.6, marginBottom: 28 }}>
              Vous avez atteint la limite de <strong style={{ color: theme.colors.ink }}>{upgradeMsg.limit} biens</strong> pour le plan {upgradeMsg.plan}.
              Passez au plan {upgradeMsg.plan === 'free' ? 'Pro' : 'Expert'} pour sauvegarder plus de biens.
            </p>
            <a
              href="/#pricing"
              style={{
                display: 'block', padding: '14px 24px', borderRadius: 10,
                background: '#c0392b', color: '#fff', textDecoration: 'none',
                fontSize: 15, fontWeight: 600, marginBottom: 12,
                transition: 'opacity 150ms',
              }}
            >
              Passez {upgradeMsg.plan === 'free' ? 'Pro' : 'Expert'}
            </a>
            <button
              onClick={() => setUpgradeMsg(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: theme.colors.muted, fontFamily: theme.fonts.body,
                padding: '8px 16px',
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
