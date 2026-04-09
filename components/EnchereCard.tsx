'use client'

import { useState } from 'react'
import { Enchere } from '@/lib/types'
import { theme } from '@/lib/theme'
import TypeBienIllustration from './TypeBienIllustration'

interface Props {
  enchere: Enchere
  compact?: boolean
}

function formatPrix(n: number) {
  return n ? n.toLocaleString('fr-FR') + ' \u20AC' : '-'
}

function getCountdown(dateAudience: string | null, dateSurenchere?: string | null): { label: string; color: string; bg: string } | null {
  if (!dateAudience) return null
  const now = new Date()
  const audience = new Date(dateAudience)
  const diffMs = audience.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > 0) {
    // Avant l'audience
    if (diffDays === 0) return { label: "Aujourd'hui", color: '#fff', bg: '#c0392b' }
    if (diffDays <= 7) return { label: `J-${diffDays}`, color: '#fff', bg: '#c0392b' }
    if (diffDays <= 14) return { label: `J-${diffDays}`, color: '#fff', bg: '#e67e22' }
    return { label: `J-${diffDays}`, color: '#fff', bg: '#6c757d' }
  }

  // Audience passée — période de surenchère
  // Utiliser date_surenchere si disponible, sinon audience + 10j
  const deadlineSurenchere = dateSurenchere
    ? new Date(dateSurenchere)
    : new Date(audience.getTime() + 10 * 24 * 3600 * 1000)
  const surenchereRemaining = Math.ceil((deadlineSurenchere.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (surenchereRemaining > 0) {
    return { label: `Surenchère J-${surenchereRemaining}`, color: '#fff', bg: '#e67e22' }
  }

  // Surenchère expirée → adjugé définitif
  return { label: 'Adjugé', color: '#fff', bg: '#2a4a8a' }
}

function formatTribunal(tribunal: string | null): string {
  if (!tribunal) return ''
  // Déjà formaté "TJ Ville" en base, mais au cas où
  if (tribunal.startsWith('TJ ')) return tribunal
  return tribunal
    .replace(/Tribunal Judiciaire de\s*/i, 'TJ ')
    .replace(/Tribunal judiciaire de\s*/i, 'TJ ')
    .trim()
}

const OCCUPATION_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  libre: { bg: '#d4f5e0', color: '#1a7a40', label: 'Bien Libre' },
  occupe: { bg: '#ffecd2', color: '#8a5a00', label: 'Bien Occupé' },
  loue: { bg: '#d4ddf5', color: '#2a4a8a', label: 'Bien Loué' },
}

const STATUT_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  a_venir: { bg: '#d4f5e0', color: '#1a7a40', label: 'À venir' },
  surenchere: { bg: '#ffecd2', color: '#8a5a00', label: 'Surenchère' },
  adjuge: { bg: '#d4ddf5', color: '#2a4a8a', label: 'Adjugé' },
  vendu: { bg: '#6c757d', color: '#fff', label: 'Vendu' },
  retire: { bg: '#f5d4d4', color: '#8a2a2a', label: 'Retiré' },
  expire: { bg: '#e9ecef', color: '#6c757d', label: 'Expiré' },
}

export default function EnchereCard({ enchere, compact = false }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const photo = enchere.photo_url || null
  const countdown = getCountdown(enchere.date_audience, (enchere as any).date_surenchere)
  const tribunalShort = formatTribunal(enchere.tribunal)
  const occupationStyle = OCCUPATION_STYLES[enchere.occupation] || null
  const statutStyle = STATUT_STYLES[enchere.statut] || null

  const pillStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    fontSize: theme.fontSizes.sm,
    color: theme.colors.muted,
    background: theme.colors.sandLight,
    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
    borderRadius: theme.radii.sm,
    whiteSpace: 'nowrap',
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
      <div className="enchere-card-photo" style={{ height: '196px', background: theme.colors.bgHover, overflow: 'hidden', position: 'relative' }}>
        {photo && !imgError ? (
          <>
            {!imgLoaded && (
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(90deg, ${theme.colors.bgHover} 25%, ${theme.colors.sandLight} 50%, ${theme.colors.bgHover} 75%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
            )}
            <img
              src={photo}
              alt={`${enchere.type_bien || 'Bien'} - ${enchere.ville || ''}`}
              width={400}
              height={196}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                opacity: imgLoaded ? 1 : 0,
                transition: `opacity ${theme.transitions.fast}, transform 0.4s ease`,
              }}
            />
          </>
        ) : (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: theme.colors.sandLight,
          }}>
            <TypeBienIllustration type={enchere.type_bien} size={72} />
          </div>
        )}

        {/* Countdown badge (top right) */}
        {countdown && (
          <span style={{
            position: 'absolute', top: theme.spacing[3], right: theme.spacing[3],
            background: countdown.bg, color: countdown.color,
            fontSize: '12px', fontWeight: 700, padding: '4px 10px',
            borderRadius: '8px', letterSpacing: '0.02em',
          }}>
            {countdown.label}
          </span>
        )}

        {/* Statut badge (top left) — only if vendu/retiré/expiré (pas surenchère ni adjugé car déjà dans countdown) */}
        {statutStyle && !['a_venir', 'surenchere', 'adjuge'].includes(enchere.statut) && (
          <span style={{
            position: 'absolute', top: theme.spacing[3], left: theme.spacing[3],
            background: statutStyle.bg, color: statutStyle.color,
            fontSize: '10px', fontWeight: 700, padding: '3px 8px',
            borderRadius: '6px', letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {statutStyle.label}
          </span>
        )}
      </div>

      {/* Content area */}
      <div style={{ padding: theme.spacing[4] }}>
        {/* Title */}
        <a
          href={'/biens/' + enchere.id + '?source=encheres'}
          style={{
            fontFamily: theme.fonts.display,
            fontSize: theme.fontSizes.md,
            fontWeight: 700,
            color: theme.colors.ink,
            textDecoration: 'none',
            display: 'block',
          }}
        >
          {enchere.type_bien || 'Bien'}{enchere.nb_pieces ? ` ${String(enchere.nb_pieces).startsWith('T') ? enchere.nb_pieces : `T${enchere.nb_pieces}`}` : ''}{enchere.surface ? ` - ${Math.round(enchere.surface)} m\u00B2` : ''}
        </a>

        {/* Location */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: theme.spacing[2],
          marginTop: theme.spacing[1], flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: theme.fontSizes.sm, fontWeight: 500 }}>
            {enchere.ville}{enchere.code_postal ? ` - ${enchere.code_postal}` : ''}
          </span>
        </div>

        {/* Prix — même style que BienCard + label */}
        <div style={{ margin: `${theme.spacing[3]} 0 ${theme.spacing[2]}` }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.muted, marginBottom: '-2px' }}>
            {enchere.prix_adjuge && enchere.prix_adjuge > 0 ? 'Prix adjugé' : 'Mise à prix'}
          </div>
          <div style={{
            fontSize: theme.fontSizes.xl, fontWeight: 700,
            letterSpacing: '-0.02em',
          }}>
            {formatPrix(enchere.prix_adjuge && enchere.prix_adjuge > 0 ? enchere.prix_adjuge : enchere.mise_a_prix)}
          </div>
          {enchere.prix_adjuge && enchere.prix_adjuge > 0 && (
            <div style={{ fontSize: theme.fontSizes.sm, color: theme.colors.muted }}>
              Mise à prix : {formatPrix(enchere.mise_a_prix)}
            </div>
          )}
        </div>

        {/* Pills */}
        <div style={{
          display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap',
          marginBottom: theme.spacing[4], marginTop: theme.spacing[2],
        }}>
          {(() => {
            const prix = (enchere.prix_adjuge && enchere.prix_adjuge > 0) ? enchere.prix_adjuge : enchere.mise_a_prix
            return prix && enchere.surface && enchere.surface > 0 ? (
              <span style={pillStyle()}>
                {Math.round(prix / enchere.surface).toLocaleString('fr-FR')} {'\u20AC'}/m{'\u00B2'}
              </span>
            ) : null
          })()}
          {occupationStyle && (
            <span style={pillStyle({ fontWeight: 600, background: occupationStyle.bg, color: occupationStyle.color })}>
              {occupationStyle.label}
            </span>
          )}
          {tribunalShort && (
            <span style={pillStyle()}>{tribunalShort}</span>
          )}
          {enchere.nb_lots && enchere.nb_lots > 1 && (
            <span style={pillStyle({ fontWeight: 700, background: '#d4ddf5', color: '#2a4a8a' })}>
              {enchere.nb_lots} lots
            </span>
          )}
        </div>

        {/* CTA */}
        <a
          href={'/biens/' + enchere.id + '?source=encheres'}
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

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .enchere-card-photo:hover img { transform: scale(1.08); }
      `}</style>
    </div>
  )
}
