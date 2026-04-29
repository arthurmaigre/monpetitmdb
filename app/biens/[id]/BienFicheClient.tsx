'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { calculerCashflow, calculerMensualite, calculerRevente, calculerCapitalRestantDu, calculerAbattementPV, calculerFraisEnchere } from '@/lib/calculs'
import { isVenteDelocalisee } from '@/lib/utils-encheres'
import TypeBienIllustration from '@/components/TypeBienIllustration'

function getPhotos(bien: any): string[] {
  const photos: string[] = []
  // Photos depuis moteurimmo_data.pictureUrls
  const mi = typeof bien.moteurimmo_data === 'string' ? JSON.parse(bien.moteurimmo_data) : bien.moteurimmo_data
  if (mi?.pictureUrls?.length > 0) {
    photos.push(...mi.pictureUrls)
  } else if (bien.photo_url) {
    photos.push(bien.photo_url)
  }
  return photos
}

function PhotoCarousel({ bien, overlay }: { bien: any, overlay?: React.ReactNode }) {
  const [idx, setIdx] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const photos = getPhotos(bien)

  if (photos.length === 0) return (
    <div className="fiche-photo-empty" style={{ position: 'relative' }}>
      <TypeBienIllustration type={bien.type_bien} size={96} />
      {overlay}
    </div>
  )

  const prev = () => setIdx(i => i > 0 ? i - 1 : photos.length - 1)
  const next = () => setIdx(i => i < photos.length - 1 ? i + 1 : 0)

  return (
    <div
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
        if (e.key === 'ArrowRight') { e.preventDefault(); next() }
      }}
      aria-label={`Photo ${idx + 1} sur ${photos.length}`}
      className="gallery-wrap"
    >
      <Image src={photos[idx]} alt="" width={800} height={450} className="fiche-photo" onClick={() => setFullscreen(true)} style={{ cursor: 'zoom-in', width: '100%', height: '100%', objectFit: 'cover' }} />
      {overlay}
      {/* Fullscreen overlay */}
      {fullscreen && (
        <div onClick={() => setFullscreen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
        }}>
          <Image src={photos[idx]} alt="" width={1920} height={1080} style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: '8px', width: 'auto', height: 'auto' }} />
          <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: '14px', fontWeight: 600 }}>
            {idx + 1} / {photos.length}
          </div>
          <button onClick={e => { e.stopPropagation(); setFullscreen(false) }} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '24px', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{'\u00D7'}</button>
          {photos.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev() }} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '22px', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#8249;</button>
              <button onClick={e => { e.stopPropagation(); next() }} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '22px', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#8250;</button>
            </>
          )}
        </div>
      )}
      {/* Boutons nav */}
      {photos.length > 1 && (
        <>
          <button onClick={prev} className="gallery-nav" style={{ left: '12px' }} aria-label="Photo précédente">&#8249;</button>
          <button onClick={next} className="gallery-nav" style={{ right: '12px' }} aria-label="Photo suivante">&#8250;</button>
        </>
      )}

      {/* Dots (≤ 8 photos) */}
      {photos.length > 1 && photos.length <= 8 && (
        <div className="gallery-dots">
          {photos.map((_, i) => (
            <span key={i} className={`dot${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)} />
          ))}
        </div>
      )}

      {/* Compteur */}
      <div className="gallery-count">{idx + 1} / {photos.length}</div>
    </div>
  )
}

const PLATFORM_LOGOS: Record<string, { name: string, color: string, abbrev: string }> = {
  licitor: { name: 'Licitor', color: '#1565C0', abbrev: 'LIC' },
  avoventes: { name: 'Avoventes', color: '#6A1B9A', abbrev: 'AVO' },
  vench: { name: 'Vench', color: '#2E7D32', abbrev: 'VEN' },
  leboncoin: { name: 'Leboncoin', color: '#F56B2A', abbrev: 'LBC' },
  seloger: { name: 'SeLoger', color: '#E5002B', abbrev: 'SL' },
  bienici: { name: 'Bien\'ici', color: '#00B8D4', abbrev: 'BI' },
  pap: { name: 'PAP', color: '#004A8F', abbrev: 'PAP' },
  orpi: { name: 'Orpi', color: '#003D6B', abbrev: 'OR' },
  century21: { name: 'Century 21', color: '#B8860B', abbrev: 'C21' },
  laforet: { name: 'Laforet', color: '#006633', abbrev: 'LF' },
  figaro: { name: 'Le Figaro', color: '#1A1A1A', abbrev: 'FIG' },
  ouestfrance: { name: 'Ouest-France', color: '#D4213D', abbrev: 'OF' },
  paruvendu: { name: 'ParuVendu', color: '#FF6600', abbrev: 'PV' },
  safti: { name: 'Safti', color: '#00A3E0', abbrev: 'SF' },
  iad: { name: 'IAD', color: '#E30613', abbrev: 'IAD' },
  capifrance: { name: 'Capifrance', color: '#003366', abbrev: 'CF' },
  foncia: { name: 'Foncia', color: '#003D6B', abbrev: 'FO' },
  guyhoquet: { name: 'Guy Hoquet', color: '#E30613', abbrev: 'GH' },
  efficity: { name: 'Efficity', color: '#FF4500', abbrev: 'EF' },
  notaires: { name: 'Notaires', color: '#1A1A1A', abbrev: 'NOT' },
  immonot: { name: 'Immonot', color: '#003366', abbrev: 'IM' },
  properstar: { name: 'Properstar', color: '#FF6600', abbrev: 'PS' },
  lesiteimmo: { name: 'LeSiteImmo', color: '#0066CC', abbrev: 'LSI' },
  immoregion: { name: 'ImmoRegion', color: '#336699', abbrev: 'IR' },
  greenacres: { name: 'Green-Acres', color: '#4CAF50', abbrev: 'GA' },
  megagence: { name: 'Megagence', color: '#E91E63', abbrev: 'MG' },
  nestenn: { name: 'Nestenn', color: '#FF5722', abbrev: 'NE' },
  era: { name: 'ERA', color: '#C62828', abbrev: 'ERA' },
  arthurimmo: { name: 'Arthur Immo', color: '#1565C0', abbrev: 'AI' },
  optimhome: { name: 'OptimHome', color: '#FF9800', abbrev: 'OH' },
  cessionpme: { name: 'CessionPME', color: '#555', abbrev: 'CP' },
  gensdeconfiance: { name: 'Gens de Confiance', color: '#2E7D32', abbrev: 'GC' },
}

function ModalPanel({ open, onClose, title, children, size }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'large' }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose} style={size === 'large' ? { padding: '8px' } : undefined}>
      <div className="modal-panel" onClick={e => e.stopPropagation()} style={size === 'large' ? { maxWidth: '700px' } : undefined}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>{'\u00D7'}</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function getPlatformFromUrl(url: string): string {
  if (!url) return 'autre'
  const u = url.toLowerCase()
  for (const [key] of Object.entries(PLATFORM_LOGOS)) {
    if (u.includes(key)) return key
  }
  if (u.includes('immobilier.notaires')) return 'notaires'
  if (u.includes('lefigaro')) return 'figaro'
  if (u.includes('maisonsetappartements')) return 'lesiteimmo'
  return 'autre'
}

function PlatformLinks({ bien }: { bien: any }) {
  const mi = typeof bien.moteurimmo_data === 'string' ? JSON.parse(bien.moteurimmo_data) : bien.moteurimmo_data
  const links: { origin: string, url: string }[] = []

  // Sources enchères (table sources JSONB)
  if (bien.sources) {
    const sources = typeof bien.sources === 'string' ? JSON.parse(bien.sources) : bien.sources
    if (Array.isArray(sources)) {
      for (const s of sources) {
        if (s.url) links.push({ origin: s.source, url: s.url })
      }
    }
  }

  // Annonce principale (biens classiques)
  if (links.length === 0 && bien.url) {
    const origin = mi?.origin || getPlatformFromUrl(bien.url)
    links.push({ origin, url: bien.url })
  }

  // Duplicates (biens classiques)
  if (mi?.duplicates) {
    for (const d of mi.duplicates) {
      if (d.url && !links.some(l => l.url === d.url)) {
        links.push({ origin: d.origin || getPlatformFromUrl(d.url), url: d.url })
      }
    }
  }

  if (links.length === 0) return null

  // Dedupliquer par plateforme : garder la derniere URL par origin (la plus recente)
  const byOrigin = new Map<string, { origin: string, url: string }>()
  for (const l of links) {
    byOrigin.set(l.origin, l)
  }
  const uniqueLinks = Array.from(byOrigin.values())

  return (
    <div style={{ display: 'contents' }}>
    <span style={{ fontSize: '11px', color: '#7a6a60', alignSelf: 'center' }}>Sources&nbsp;:</span>
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* platform chips below */}
      {uniqueLinks.map((l, i) => {
        const platform = PLATFORM_LOGOS[l.origin]
        const name = platform?.name || l.origin
        const color = platform?.color || '#7a6a60'
        const abbrev = platform?.abbrev || l.origin.slice(0, 3).toUpperCase()
        return (
          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              border: `1.5px solid ${color}20`, background: `${color}08`,
              textDecoration: 'none', transition: 'all 0.15s',
              fontSize: '12px', fontWeight: 600, color,
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = `${color}15`; (e.target as HTMLElement).style.borderColor = color }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = `${color}08`; (e.target as HTMLElement).style.borderColor = `${color}20` }}
            title={`Voir sur ${name}`}
          >
            <span style={{
              width: '22px', height: '22px', borderRadius: '4px',
              background: color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 700, letterSpacing: '-0.02em',
            }}>{abbrev}</span>
            {name}
          </a>
        )
      })}
    </div>
    </div>
  )
}

const REGIMES = [
  { value: 'nu_micro_foncier', label: 'Nu Micro-foncier' },
  { value: 'nu_reel_foncier', label: 'Nu R\u00E9el foncier' },
  { value: 'lmnp_micro_bic', label: 'LMNP Micro-BIC' },
  { value: 'lmnp_reel_bic', label: 'LMNP R\u00E9el BIC' },
  { value: 'lmp_reel_bic', label: 'LMP R\u00E9el BIC' },
  { value: 'sci_is', label: "SCI \u00E0 l'IS" },
  { value: 'marchand_de_biens', label: 'Marchand de biens (IS)' },
]

const REGIMES_IDR = [
  { value: 'nu_reel_foncier', label: 'Nu R\u00E9el foncier' },
  { value: 'lmnp_reel_bic', label: 'LMNP R\u00E9el BIC' },
  { value: 'lmp_reel_bic', label: 'LMP R\u00E9el BIC' },
  { value: 'sci_is', label: "SCI \u00E0 l'IS" },
  { value: 'marchand_de_biens', label: 'Marchand de biens (IS)' },
]

function CellEditable({ bien, champ, suffix = '', userToken, champsStatut, onUpdate, setBien: setBienProp, scale = 1, dirtyChamps, setDirtyChamps, originalVals, setOriginalVals }: any) {
  // scale: 1 = affiche/édite la valeur DB directe
  //        12 = affiche valeur × 12 (annuel), enregistre ÷ 12
  //        1/12 = affiche valeur ÷ 12 (mensuel depuis annuel), enregistre × 12
  const dbVal = bien[champ]
  const displayVal = dbVal != null ? Math.round(dbVal * scale) : null
  const displayFormatted = displayVal != null ? `${displayVal.toLocaleString('fr-FR')}\u00A0\u20AC` : null
  const statut = champsStatut[champ]
  const hasSourceData = dbVal != null && !statut
  const isVert = statut?.statut === 'vert'
  const isJaune = statut?.statut === 'jaune'
  const dirty = dirtyChamps?.[champ] || false
  const [submitting, setSubmitting] = useState(false)

  // Valeur affichée : toujours dérivée de bien[champ] × scale
  const localVal = displayVal != null ? String(displayVal) : ''

  function setDirty(val: boolean) {
    if (setDirtyChamps) setDirtyChamps((prev: any) => ({ ...prev, [champ]: val }))
  }

  function startEdit() {
    if (setOriginalVals) setOriginalVals((prev: any) => ({ ...prev, [champ]: dbVal }))
    setDirty(true)
  }

  function toDbVal(v: string): number | null {
    if (!v) return null
    return Math.round(Number(v) / scale)
  }

  function handleChange(v: string) {
    if (!dirty) startEdit()
    else setDirty(true)
    if (setBienProp) {
      const newDbVal = v ? Math.round(Number(v) / scale) : null
      setBienProp((prev: any) => ({ ...prev, [champ]: newDbVal }))
    }
  }

  async function handleSubmit() {
    if (dbVal == null) return
    setSubmitting(true)
    await onUpdate(champ, dbVal)
    setDirty(false)
    setSubmitting(false)
  }

  function handleCancel() {
    setDirty(false)
    const orig = originalVals?.[champ]
    if (setBienProp) setBienProp((prev: any) => ({ ...prev, [champ]: orig !== undefined ? orig : null }))
  }

  const PencilBtn = () => (
    <button
      onClick={startEdit}
      title={"Modifier pour simulation"}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', opacity: 0.4, transition: 'opacity 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7a6a60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
    </button>
  )

  // Texte formaté pour lecture seule
  const readText = suffix ? `${displayVal != null ? displayVal.toLocaleString('fr-FR') : ''}${suffix.replace(/ /g, '\u00A0')}` : displayFormatted

  const vStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'right', fontSize: '13px', fontWeight: 600 }
  const bStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }

  // --- Pas connecté : lecture seule ---
  if (!userToken) {
    if (displayVal == null) return <><span style={{ ...vStyle, color: '#c0392b', fontStyle: 'italic', fontWeight: 400 }}>NC</span><span /></>
    return <><span style={{ ...vStyle, color: '#1a1210' }}>{readText}</span><span /></>
  }

  // --- Donnée source (IA/scraper) : lecture seule + crayon ---
  if (hasSourceData && !dirty) {
    return (
      <>
        <span style={{ ...vStyle, color: '#1a1210' }}>{readText}</span>
        <div style={bStyle}><PencilBtn /></div>
      </>
    )
  }

  // --- Donnée validée (vert) ---
  if (isVert && !dirty) {
    return (
      <>
        <span style={{ ...vStyle, color: '#1a7a40' }}>{readText}</span>
        <div style={bStyle}>
          <span title={"Valid\u00E9 par la communaut\u00E9"} style={{ fontSize: '10px', color: '#1a7a40' }}>{'\u2713'}</span>
          <PencilBtn />
        </div>
      </>
    )
  }

  // --- Donnée jaune (1 user) ---
  if (isJaune && !dirty) {
    return (
      <>
        <span style={{ ...vStyle, color: '#a06010' }}>{readText}</span>
        <div style={bStyle}><PencilBtn /></div>
      </>
    )
  }

  // --- Éditable (manquante ou en cours de simulation) ---
  const isEmpty = !localVal
  const borderColor = dirty ? '#2a4a8a' : isEmpty ? '#c0392b' : '#e8e2d8'
  const bgColor = dirty ? '#f0f4ff' : isEmpty ? '#fde8e8' : '#faf8f5'

  return (
    <>
      <input
        type="number"
        value={localVal}
        placeholder="NC"
        style={{
          width: '100%', boxSizing: 'border-box', padding: '4px 8px', borderRadius: '6px',
          border: `1.5px solid ${borderColor}`,
          fontFamily: "'DM Sans', sans-serif", fontSize: '13px',
          background: bgColor, textAlign: 'right',
          outline: 'none', color: isEmpty ? '#c0392b' : '#1a1210',
        }}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
      />
      <div style={bStyle}>
        <button
          onClick={handleSubmit}
          disabled={submitting || !localVal}
          title={"Soumettre \u00E0 la communaut\u00E9"}
          style={{
            width: '22px', height: '22px', borderRadius: '6px', border: 'none',
            background: '#1a7a40', color: '#fff', fontSize: '12px', fontWeight: 700,
            cursor: dirty && localVal ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            visibility: dirty && localVal ? 'visible' : 'hidden',
            pointerEvents: dirty && localVal ? 'auto' : 'none',
          }}
        >{'\u2713'}</button>
        <button onClick={handleCancel} title={"Annuler"}
          style={{
            background: 'none', border: 'none', cursor: dirty ? 'pointer' : 'default',
            padding: '1px', display: 'flex', alignItems: 'center', color: '#c0392b', fontSize: '14px',
            visibility: dirty ? 'visible' : 'hidden',
            pointerEvents: dirty ? 'auto' : 'none',
            flexShrink: 0,
          }}
        >{'\u00D7'}</button>
      </div>
    </>
  )
}

function CellTypeLoyer({ bien, userToken, champsStatut, onUpdate }: any) {
  const valeur = bien.type_loyer
  const statut = champsStatut['type_loyer']
  const hasSourceData = valeur && !statut
  const isVert = statut?.statut === 'vert'
  const vStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'right', fontSize: '13px', fontWeight: 600 }

  if (!userToken || hasSourceData) {
    if (!valeur) return <><span style={{ ...vStyle, color: '#c0392b', fontStyle: 'italic', fontWeight: 400 }}>NC</span><span /></>
    return <><span style={{ ...vStyle, color: '#1a1210' }}>{valeur}</span><span /></>
  }

  const borderColor = !valeur ? '#c0392b' : isVert ? '#1a7a40' : '#e8e2d8'
  const bgColor = !valeur ? '#fde8e8' : isVert ? '#eafaf1' : '#faf8f5'

  return (
    <>
      <select
        value={valeur || ''}
        onChange={e => { if (e.target.value) onUpdate('type_loyer', e.target.value) }}
        style={{ width: '100%', boxSizing: 'border-box', padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${borderColor}`, fontFamily: "'DM Sans', sans-serif", fontSize: '13px', background: bgColor, outline: 'none' }}
      >
        <option value="">NC</option>
        <option value="HC">HC</option>
        <option value="CC">CC</option>
      </select>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isVert && <span title={"Valid\u00E9 par la communaut\u00E9"} style={{ fontSize: '10px', color: '#1a7a40' }}>{'\u2713'}</span>}
      </div>
    </>
  )
}

function ExpandableTaxRow({ label, total, isFree, details, info }: { label: string, total: number, isFree: boolean, details: { label: string, value: string, vert?: boolean }[], info?: string }) {
  const [open, setOpen] = useState(false)
  const hasDetails = details.length > 0
  return (
    <div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ede8', cursor: hasDetails ? 'pointer' : 'default' }}
        onClick={() => hasDetails && setOpen(!open)}
      >
        <span style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {hasDetails && (
            <span style={{ fontSize: '10px', color: '#b0a898', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>{'\u25BC'}</span>
          )}
          {info && <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{info}</span></span>}
        </span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: total > 0 ? '#c0392b' : '#1a1210' }} className={isFree ? 'val-blur' : ''}>
          {total > 0 ? `-${total.toLocaleString('fr-FR')}\u00A0\u20AC` : `0\u00A0\u20AC`}
        </span>
      </div>
      {open && hasDetails && (
        <div style={{ padding: '4px 0 4px 16px', background: '#faf8f5', borderBottom: '1px solid #f0ede8' }}>
          {details.map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '12px' }}>
              <span style={{ color: '#7a6a60' }}>{d.label}</span>
              <span style={{ color: d.vert ? '#1a7a40' : '#7a6a60' }}>{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExpandableCharges({ label, total, isReel, isFree, details }: { label: string, total: number, isReel: boolean, isFree: boolean, details: { label: string, value: number, info?: string }[] }) {
  const [open, setOpen] = useState(false)
  const hasCharges = total > 0
  return (
    <div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ede8', cursor: isReel ? 'pointer' : 'default' }}
        onClick={() => isReel && setOpen(!open)}
      >
        <span style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {isReel && (
            <span style={{ fontSize: '10px', color: '#b0a898', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>{'\u25BC'}</span>
          )}
          {!isReel && <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{"D\u00E9ductible uniquement en r\u00E9gime r\u00E9el"}</span></span>}
        </span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: !isReel ? '#c0b0a0' : hasCharges ? '#c0392b' : '#1a1210' }} className={isFree && isReel ? 'val-blur' : ''}>
          {!isReel ? '-' : hasCharges ? `-${total.toLocaleString('fr-FR')}\u00A0\u20AC` : '0\u00A0\u20AC'}
        </span>
      </div>
      {open && isReel && (
        <div style={{ padding: '4px 0 4px 16px', background: '#faf8f5', borderBottom: '1px solid #f0ede8' }}>
          {details.map(d => (
            <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: '12px', color: d.value > 0 ? '#7a6a60' : '#c0b0a0' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {d.label}
                {d.info && <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{d.info}</span></span>}
              </span>
              <span>{d.value > 0 ? `${d.value.toLocaleString('fr-FR')}\u00A0\u20AC` : '0\u00A0\u20AC'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PnlColonne({ titre, bien, financement, tmi, regime, otherRegime = '', highlight = false, dureeRevente, estimation, budgetTravauxM2, scorePerso, fraisNotaire, fraisNotaireBase = 7.5, apport, fraisAgenceRevente = 5, chargesUtilisateur, isFree = false, isEnchere = false, fraisPrealables = 0 }: any) {
  const { prix_fai, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann } = bien
  const { tauxCredit, tauxAssurance, dureeAns, typeCredit: typeCreditSimu } = financement
  const isTravauxLourds = bien.strategie_mdb === 'Travaux lourds'
  const hasLoyer = loyer && loyer > 0
  const isMarchand = regime === 'marchand_de_biens'
  const [optionTVA, setOptionTVA] = useState(true)

  // Frais de notaire propres a cette colonne : 2.5% MdB, sinon valeur profil
  const colFraisNotairePct = isMarchand ? 2.5 : (fraisNotaireBase || 7.5)
  const colFraisNotaireMontant = prix_fai * colFraisNotairePct / 100
  // Pour enchères : frais d'acquisition = frais enchere (pas de frais notaire classiques)
  const fraisEnchere = isEnchere ? calculerFraisEnchere(prix_fai, fraisPrealables as number, { isMDB: isMarchand }) : null
  // Recalculer le montant emprunte et la mensualite pour cette colonne
  const colMontantEmprunte = Math.max(0, prix_fai + (isEnchere ? (fraisEnchere?.total || 0) : colFraisNotaireMontant) - (apport || 0))

  // Visibilite conditionnelle : afficher une ligne si au moins un des 2 regimes l'utilise
  const isMicro = (r: string) => r === 'nu_micro_foncier' || r === 'lmnp_micro_bic'
  const hasAmortRegime = (r: string) => r === 'lmnp_reel_bic' || r === 'lmp_reel_bic' || r === 'sci_is'
  const isLMP = (r: string) => r === 'lmp_reel_bic'
  const showAbattementRow = isMicro(regime) || isMicro(otherRegime)
  const showAmortRow = hasAmortRegime(regime) || hasAmortRegime(otherRegime)
  const showSSIRow = isLMP(regime) || isLMP(otherRegime)
  // Revente : reintegration si au moins un est LMNP reel
  const showReintegrationRow = regime === 'lmnp_reel_bic' || otherRegime === 'lmnp_reel_bic'

  const loyerAnnuel = (loyer || 0) * 12
  const chargesRecAnn = (charges_rec || 0) * 12
  const chargesCoproAnn = (charges_copro || 0) * 12 // charges_copro est mensuel en base
  const taxeFoncAnn = taxe_fonc_ann || 0
  const interetsAnn = colMontantEmprunte * tauxCredit / 100
  const assuranceAnn = colMontantEmprunte * (tauxAssurance / 100)
  const mobilier = 5000
  const amortImmo = prix_fai * 0.85 / 30
  const amortMobilier = mobilier / 10
  const amortLMNP = amortImmo + amortMobilier
  const fraisNotairePctLocatif = colFraisNotairePct
  const fraisNotaireMontantLocatif = Math.round(colFraisNotaireMontant)
  const amortSCI = prix_fai * 0.85 / 30
  const amortNotaireSCI = fraisNotaireMontantLocatif / 5
  const hasAmort = regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is'
  const amort = (regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic') ? amortLMNP : regime === 'sci_is' ? (amortSCI + amortNotaireSCI) : 0

  // Charges utilisateur (deductibles en reel, SCI IS et MdB — pas en micro)
  const isReel = regime === 'nu_reel_foncier' || regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is' || regime === 'marchand_de_biens'
  const assurancePNO = isReel ? (chargesUtilisateur?.assurance_pno || 0) : 0
  const fraisGestionPct = isReel ? (chargesUtilisateur?.frais_gestion_pct || 0) : 0
  const fraisGestion = loyerAnnuel * fraisGestionPct / 100
  const honorairesComptable = isReel ? (chargesUtilisateur?.honoraires_comptable || 0) : 0
  // CFE : due en BIC (LMNP/LMP), SCI IS et MdB (toute societe/activite pro)
  // Frais OGA : uniquement en BIC (LMNP/LMP) pour eviter la majoration 15% du benefice
  const isBICouSCIouMdB = regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is' || regime === 'marchand_de_biens'
  const isBIC = regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic'
  const cfe = isBICouSCIouMdB ? (chargesUtilisateur?.cfe || 0) : 0
  const fraisOGA = isBIC ? (chargesUtilisateur?.frais_oga || 0) : 0
  const fraisBancaires = chargesUtilisateur?.frais_bancaires || 0
  const chargesSupplementaires = assurancePNO + fraisGestion + honorairesComptable + cfe + fraisOGA

  // --- Travaux (toutes strategies) ---
  const scoreUtilise = scorePerso || bien.score_travaux
  const budgetTravaux = scoreUtilise && bien.surface
    ? (budgetTravauxM2?.[String(scoreUtilise)] || 0) * bien.surface : 0
  // MdB + TVA sur marge : le budget parametres est TTC, le MdB recupere la TVA → cout reel HT
  const budgetTravauxEffectif = (isMarchand && optionTVA) ? budgetTravaux / 1.2 : budgetTravaux
  const tvaRecupereeTravaux = (isMarchand && optionTVA) ? budgetTravaux - budgetTravauxEffectif : 0
  const travauxAnnualises = budgetTravaux > 0 ? budgetTravaux / 10 : 0
  const travauxDeductibles = regime === 'nu_reel_foncier' ? budgetTravaux : 0
  const travauxAmortis = (regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is') ? travauxAnnualises : 0

  let revenuImposable = 0
  let impot = 0

  if (regime === 'nu_micro_foncier') {
    revenuImposable = loyerAnnuel * 0.70
    impot = revenuImposable * (tmi / 100 + 0.172)
  } else if (regime === 'nu_reel_foncier') {
    const chargesDeductibles = chargesCoproAnn + taxeFoncAnn + interetsAnn + assuranceAnn + chargesSupplementaires + travauxDeductibles
    const resultatFoncier = loyerAnnuel - chargesDeductibles
    if (resultatFoncier >= 0) {
      revenuImposable = resultatFoncier
      impot = revenuImposable * (tmi / 100 + 0.172)
    } else {
      // Deficit foncier : imputable sur revenu global (hors interets), plafond 10700€/an
      const deficitHorsInterets = Math.max(0, chargesDeductibles - interetsAnn - loyerAnnuel)
      const imputableRevenuGlobal = Math.min(deficitHorsInterets, 10700)
      // Economie d'impot = deficit imputable * TMI
      impot = -(imputableRevenuGlobal * (tmi / 100))
      revenuImposable = resultatFoncier
    }
  } else if (regime === 'lmnp_micro_bic') {
    revenuImposable = loyerAnnuel * 0.50
    impot = revenuImposable * (tmi / 100 + 0.172)
  } else if (regime === 'lmnp_reel_bic') {
    const chargesDeductibles = chargesCoproAnn + taxeFoncAnn + interetsAnn + assuranceAnn + amort + chargesSupplementaires + travauxAmortis
    revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impot = revenuImposable * (tmi / 100 + 0.172)
  } else if (regime === 'lmp_reel_bic') {
    const chargesDeductibles = chargesCoproAnn + taxeFoncAnn + interetsAnn + assuranceAnn + amort + chargesSupplementaires + travauxAmortis
    const benefice = loyerAnnuel - chargesDeductibles
    revenuImposable = benefice
    if (benefice > 0) {
      const cotisationsSSI = benefice * 0.45
      impot = benefice * (tmi / 100) + cotisationsSSI
    } else {
      // Deficit LMP : imputable sans limitation sur revenu global, pas de SSI
      impot = -(Math.abs(benefice) * (tmi / 100))
    }
  } else if (regime === 'sci_is') {
    const chargesDeductibles = chargesCoproAnn + taxeFoncAnn + interetsAnn + assuranceAnn + amort + chargesSupplementaires + travauxAmortis
    revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impot = revenuImposable <= 42500 ? revenuImposable * 0.15 : 42500 * 0.15 + (revenuImposable - 42500) * 0.25
  } else if (regime === 'marchand_de_biens') {
    // MdB : IS sur loyers (biens en stock, pas d'amortissement)
    const chargesDeductibles = chargesCoproAnn + taxeFoncAnn + interetsAnn + assuranceAnn + chargesSupplementaires
    revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impot = revenuImposable <= 42500 ? revenuImposable * 0.15 : 42500 * 0.15 + (revenuImposable - 42500) * 0.25
  }

  const colTypeCredit = typeCreditSimu || 'amortissable'
  const mensualiteCredit = colTypeCredit === 'in_fine'
    ? colMontantEmprunte * (tauxCredit / 100) / 12
    : calculerMensualite(colMontantEmprunte, tauxCredit, dureeAns)
  const mensualiteAss = colMontantEmprunte * (tauxAssurance / 100) / 12
  const mensualiteTotale = mensualiteCredit + mensualiteAss
  const chargesRec = charges_rec || 0
  const chargesCoproMens = chargesCoproAnn / 12
  const taxeFoncMens = taxeFoncAnn / 12
  const loyerNet = type_loyer === 'CC' ? loyer - chargesRec - chargesCoproMens - taxeFoncMens : loyer + chargesRec - chargesCoproMens - taxeFoncMens
  const cashflowBrut = loyerNet - mensualiteTotale
  const cashflowNetMensuel = cashflowBrut - impot / 12
  const cashflowNetAnnuel = cashflowNetMensuel * 12

  // --- Revente ---
  const dur = dureeRevente || 5
  // Estimation DVF = prix net vendeur (transactions notariales, HORS frais agence)
  const prixReventeNetVendeur = estimation?.prix_total || 0
  // Frais agence : % inclus dans le FAI a l'achat. Sert a retrouver le prix net vendeur achat pour la TVA sur marge MdB
  // Pour enchères : pas de frais d'agence, le prix FAI = mise à prix (déjà net vendeur)
  const prixNetVendeurAchat = (!isEnchere && fraisAgenceRevente > 0) ? Math.round(prix_fai / (1 + fraisAgenceRevente / 100)) : prix_fai
  const fraisAgenceAchatMontant = prix_fai - prixNetVendeurAchat
  // Estimation DVF = deja net vendeur, pas de frais agence a deduire a la revente
  const prixReventeApresAgence = prixReventeNetVendeur
  const fraisNotairePct = colFraisNotairePct
  const fraisNotaireMontant = Math.round(colFraisNotaireMontant)
  // Montant total des frais d'acquisition : frais enchere si enchère, frais notaire sinon
  const fraisAcquisitionTotal = isEnchere ? (fraisEnchere?.total || 0) : fraisNotaireMontant

  // PV brute = revente net vendeur - frais agence vendeur - achat FAI - notaire achat - travaux
  // L'estimation DVF est deja le prix net vendeur (pas de frais agence a deduire sauf si charge vendeur)
  // Travaux deja deduits/amortis en locatif ne viennent pas en deduction de la PV
  const hasPhaseLocative = hasLoyer && !isTravauxLourds
  // Travaux dans la PV : toujours deduits du cout d'acquisition (c'est un cout reel)
  // En Nu reel : deduits a 100% en locatif (deficit foncier) → deduits aussi de la PV (pas de double deduction car pas d'amortissement)
  // En LMNP/LMP/SCI : amortis sur 10 ans en locatif → deduits de la PV + reintegration des amortissements cumules
  // En micro/MdB : pas deduits en locatif → deduits de la PV normalement
  const travauxPV = budgetTravauxEffectif
  const pvBruteSimple = prixReventeApresAgence - prixNetVendeurAchat
  const pvBrute = prixReventeApresAgence - prix_fai - fraisAcquisitionTotal - travauxPV

  // Fiscalite PV selon regime
  let irPV = 0, psPV = 0, tvaMarge = 0, isPV = 0
  let reintegrationAmort = 0
  let cotisationsSocialesLMP = 0
  const abattements = calculerAbattementPV(dur)
  // Detail pour affichage depliant
  let pvBaseIR = 0, pvBasePS = 0, pvImposableIR = 0, pvImposablePS = 0

  if (regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier' || regime === 'lmnp_micro_bic') {
    // Particuliers : IR 19% + PS 17.2%, avec abattements detention
    if (pvBrute > 0) {
      pvBaseIR = pvBrute; pvBasePS = pvBrute
      pvImposableIR = pvBrute * (1 - abattements.abattementIR / 100)
      pvImposablePS = pvBrute * (1 - abattements.abattementPS / 100)
      irPV = pvImposableIR * 0.19
      psPV = pvImposablePS * 0.172
    }
  } else if (regime === 'lmnp_reel_bic') {
    // LMNP reel : reintegration des amortissements cumules (reforme LFI 2025) + abattements
    // Inclut amort immo + mobilier + travaux amortis
    reintegrationAmort = (amort + travauxAmortis) * dur
    const pvReintegree = Math.max(0, pvBrute + reintegrationAmort)
    if (pvReintegree > 0) {
      pvBaseIR = pvReintegree; pvBasePS = pvReintegree
      pvImposableIR = pvReintegree * (1 - abattements.abattementIR / 100)
      pvImposablePS = pvReintegree * (1 - abattements.abattementPS / 100)
      irPV = pvImposableIR * 0.19
      psPV = pvImposablePS * 0.172
    }
  } else if (regime === 'lmp_reel_bic') {
    // LMP : exoneration si recettes < 90k ET > 5 ans, sinon PV professionnelle (court terme + long terme)
    if (dur > 5 && loyerAnnuel < 90000) {
      irPV = 0
      psPV = 0
      cotisationsSocialesLMP = 0
    } else if (pvBrute > 0) {
      // Court terme = min(PV brute, amortissements cumules) -> TMI + SSI 45%
      const amortsCumules = (amort + travauxAmortis) * dur
      const pvCourtTerme = Math.min(pvBrute, amortsCumules)
      // Long terme = PV brute - court terme -> 12.8% IR + 17.2% PS
      const pvLongTerme = Math.max(0, pvBrute - pvCourtTerme)
      irPV = pvCourtTerme * (tmi / 100) + pvLongTerme * 0.128
      psPV = pvLongTerme * 0.172
      cotisationsSocialesLMP = pvCourtTerme * 0.45
    }
  } else if (regime === 'sci_is') {
    // SCI IS : PV sur VNC, IS 15/25%, pas d'abattement + PFU 30% sur dividendes
    // Interets deja deduits du resultat courant en phase locative → pas re-deduits ici
    const amortCumuleImmo = (prix_fai * 0.85 / 30) * dur
    const amortCumuleNotaire = (fraisAcquisitionTotal / 5) * Math.min(dur, 5)
    const amortCumuleTravaux = travauxAmortis * Math.min(dur, 10)
    const amortCumule = amortCumuleImmo + amortCumuleNotaire + amortCumuleTravaux
    const vnc = prix_fai + fraisAcquisitionTotal + budgetTravaux - amortCumule
    const pvSCI = Math.max(0, prixReventeApresAgence - vnc)
    isPV = pvSCI <= 42500 ? pvSCI * 0.15 : 42500 * 0.15 + (pvSCI - 42500) * 0.25
    // PFU 30% flat tax sur dividendes distribues (benefice apres IS)
    const beneficeDistribuable = pvSCI - isPV
    psPV = beneficeDistribuable > 0 ? beneficeDistribuable * 0.30 : 0
  } else if (regime === 'marchand_de_biens') {
    // MdB toujours a l'IS : IS sur benefice + TVA sur marge optionnelle (art. 268 CGI)
    // Marge TVA = prix de vente net vendeur - prix d'achat net vendeur (hors frais agence)
    if (optionTVA) {
      const marge = Math.max(0, prixReventeApresAgence - prixNetVendeurAchat)
      tvaMarge = marge * 20 / 120
    }
    const benefice = Math.max(0, prixReventeApresAgence - prix_fai - budgetTravauxEffectif - fraisAcquisitionTotal - tvaMarge)
    isPV = benefice <= 42500 ? benefice * 0.15 : 42500 * 0.15 + (benefice - 42500) * 0.25
  }
  // Surtaxe PV > 50k (regimes des particuliers uniquement)
  let surtaxePV = 0
  const isRegimeParticulier = regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier' || regime === 'lmnp_micro_bic' || regime === 'lmnp_reel_bic'
  if (isRegimeParticulier && pvBrute > 0) {
    const pvImposableIR = regime === 'lmnp_reel_bic'
      ? Math.max(0, pvBrute + reintegrationAmort) * (1 - abattements.abattementIR / 100)
      : pvBrute * (1 - abattements.abattementIR / 100)
    if (pvImposableIR > 150000) {
      surtaxePV = pvImposableIR * 0.06
    } else if (pvImposableIR > 110000) {
      surtaxePV = pvImposableIR * 0.05
    } else if (pvImposableIR > 100000) {
      surtaxePV = pvImposableIR * 0.04
    } else if (pvImposableIR > 60000) {
      surtaxePV = pvImposableIR * 0.03
    } else if (pvImposableIR > 50000) {
      surtaxePV = pvImposableIR * 0.02
    }
  }
  const totalFiscPV = Math.round(irPV + psPV + tvaMarge + isPV + cotisationsSocialesLMP + surtaxePV)
  const pvNette = Math.round(pvBrute - totalFiscPV)

  // Cashflow locatif net cumule (frais bancaires deduits en 1ere annee)
  const cashflowCumule = hasLoyer && !isTravauxLourds ? Math.round(cashflowNetAnnuel * dur - fraisBancaires) : 0
  // Interets d'emprunt cumules pendant la detention (pour Travaux lourds sans loyer)
  const interetsCumules = !hasLoyer || isTravauxLourds ? Math.round((interetsAnn + assuranceAnn) * dur) : 0

  // Capital restant du
  const crd = colTypeCredit === 'in_fine' ? colMontantEmprunte : calculerCapitalRestantDu(colMontantEmprunte, tauxCredit, dureeAns, dur)

  // Bilan : cashflow achat-revente = emprunt + PV nette - CRD (- interets/frais si pas de loyer)
  const produitRevente = prixReventeApresAgence - crd
  const fondsInvestis = apport || 0
  const coutTotal = prix_fai + fraisAcquisitionTotal + budgetTravauxEffectif
  const cashflowAchatRevente = Math.round(colMontantEmprunte + pvNette - crd - interetsCumules - ((!hasLoyer || isTravauxLourds) ? fraisBancaires : 0))
  const profitNet = Math.round(cashflowCumule + cashflowAchatRevente)
  // ROI = rendement sur cout total de l'operation
  const roiTotal = coutTotal > 0 ? Math.round(profitNet / coutTotal * 1000) / 10 : 0
  const ratioROI = coutTotal > 0 ? 1 + profitNet / coutTotal : 0
  const roiAnnualise = coutTotal > 0 && dur > 0 && ratioROI > 0
    ? Math.round((Math.pow(ratioROI, 1 / dur) - 1) * 1000) / 10
    : coutTotal > 0 && dur > 0 ? Math.round(profitNet / coutTotal / dur * 1000) / 10 : 0
  // ROE = rendement sur fonds propres (effet de levier)
  const roeTotal = fondsInvestis > 0 ? Math.round(profitNet / fondsInvestis * 1000) / 10 : 0
  const ratioROE = fondsInvestis > 0 ? 1 + profitNet / fondsInvestis : 0
  const roeAnnualise = fondsInvestis > 0 && dur > 0 && ratioROE > 0
    ? Math.round((Math.pow(ratioROE, 1 / dur) - 1) * 1000) / 10
    : fondsInvestis > 0 && dur > 0 ? Math.round(profitNet / fondsInvestis / dur * 1000) / 10 : 0

  const hasRevente = prixReventeNetVendeur > 0

  function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }

  function Row({ label, value, rouge = false, bold = false, tiret = false, info = '', vert = false }: any) {
    return (
      <div className={`fiscal-line${bold ? ' fl-bold' : ''}`}>
        <span className="fl-k" style={{ fontWeight: bold ? 600 : 400 }}>
          {label}
          {info && !isFree && <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{info}</span></span>}
        </span>
        <span className={`fl-v${tiret ? ' muted' : rouge ? ' neg' : vert ? ' pos' : ''}${isFree && !tiret ? ' val-blur' : ''}`}>
          {tiret ? '-' : value}
        </span>
      </div>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return <div className="fiscal-sl">{label}</div>
  }

  return (
    <div className={`fiscal-card${highlight ? ' your' : ''}`}>
      <div className="fcard-title">{titre}</div>
      {(() => {
        const thisHasNote = colFraisNotairePct !== (fraisNotaire || 7.5)
        const otherNotairePct = otherRegime === 'marchand_de_biens' ? 2.5 : (fraisNotaireBase || 7.5)
        const otherHasNote = otherNotairePct !== (fraisNotaire || 7.5)
        if (thisHasNote) return (
          <div className="fiscal-note">
            {`Mensualit\u00E9s et int\u00E9r\u00EAts calcul\u00E9s avec ${colFraisNotairePct}\u00A0% de frais de notaire${isMarchand ? ' (MdB)' : ''}, soit un emprunt de ${fmt(colMontantEmprunte)}\u00A0\u20AC.`}
          </div>
        )
        if (otherHasNote) return (
          <div className="fiscal-note" style={{ visibility: 'hidden' }} aria-hidden="true">
            {"Mensualit\u00E9s et int\u00E9r\u00EAts calcul\u00E9s avec 0,0\u00A0% de frais de notaire (MdB), soit un emprunt de 000\u00A0000\u00A0\u20AC."}
          </div>
        )
        return null
      })()}

      {/* === PARTIE LOCATIVE (annuelle) === */}
      {hasLoyer && !isTravauxLourds && (
        <>
          <SectionLabel label="Revenus locatifs (annuel)" />
          <Row label={type_loyer === 'CC' ? "Loyer (CC)" : "Loyer (HC)"} value={`${fmt(loyerAnnuel)} \u20AC`}
            info={type_loyer === 'CC'
              ? `Loyer Charges Comprises : le montant inclut les charges r\u00E9cup\u00E9rables (eau, ordures, entretien parties communes).\n\nCalcul : ${fmt(Math.round(loyerAnnuel / 12))}\u00A0\u20AC/mois \u00D7 12 = ${fmt(loyerAnnuel)}\u00A0\u20AC/an\n\nLes charges sont d\u00E9duites sur la ligne suivante car elles ne sont pas un revenu pour le propri\u00E9taire.`
              : `Loyer Hors Charges : le locataire paie ce montant + les charges r\u00E9cup\u00E9rables en plus.\n\nCalcul : ${fmt(Math.round(loyerAnnuel / 12))}\u00A0\u20AC/mois \u00D7 12 = ${fmt(loyerAnnuel)}\u00A0\u20AC/an`} />
          <Row label={"Charges r\u00E9cup."} value={type_loyer === 'CC' ? `-${fmt(chargesRecAnn)} \u20AC` : `+${fmt(chargesRecAnn)} \u20AC`}
            info={type_loyer === 'CC'
              ? "Charges r\u00E9cup\u00E9rables : eau, ordures m\u00E9nag\u00E8res, entretien parties communes.\n\nIncluses dans le loyer CC, elles sont d\u00E9duites ici car ce sont des charges du locataire, pas un revenu du propri\u00E9taire."
              : "Charges r\u00E9cup\u00E9rables : eau, ordures m\u00E9nag\u00E8res, entretien parties communes.\n\nPay\u00E9es par le locataire en plus du loyer HC. Elles transitent par le propri\u00E9taire mais ne sont pas imposables."} />
          {showAbattementRow && (
            regime === 'nu_micro_foncier' ? (
              <Row label="Abattement forfaitaire (30%)" value={`-${fmt(Math.round(loyerAnnuel * 0.30))} \u20AC`} rouge info={`R\u00E9duction automatique de 30\u00A0% appliqu\u00E9e par l\u2019administration sur vos loyers bruts.\n\nCalcul : ${fmt(loyerAnnuel)}\u00A0\u20AC \u00D7 30\u00A0% = ${fmt(Math.round(loyerAnnuel * 0.30))}\u00A0\u20AC\n\nCet abattement est cens\u00E9 couvrir toutes vos charges (copro, taxe fonci\u00E8re, int\u00E9r\u00EAts, travaux\u2026). Vous ne pouvez rien d\u00E9duire en plus.\n\nSi vos charges r\u00E9elles d\u00E9passent 30\u00A0% de vos loyers, le r\u00E9gime r\u00E9el est plus avantageux.`} />
            ) : regime === 'lmnp_micro_bic' ? (
              <Row label="Abattement forfaitaire (50%)" value={`-${fmt(Math.round(loyerAnnuel * 0.50))} \u20AC`} rouge info={`R\u00E9duction automatique de 50\u00A0% appliqu\u00E9e sur vos recettes de location meubl\u00E9e.\n\nCalcul : ${fmt(loyerAnnuel)}\u00A0\u20AC \u00D7 50\u00A0% = ${fmt(Math.round(loyerAnnuel * 0.50))}\u00A0\u20AC\n\nVous ne pouvez rien d\u00E9duire en plus (ni charges, ni amortissement).\n\nLe r\u00E9gime r\u00E9el avec amortissement est souvent plus int\u00E9ressant, surtout si vous avez un cr\u00E9dit.`} />
            ) : (
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>&nbsp;</div>
            )
          )}
          <Row label="Charges copro" value={`-${fmt(chargesCoproAnn)} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'}
            info={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'
              ? "Non d\u00E9ductible en r\u00E9gime micro : d\u00E9j\u00E0 couvert par l\u2019abattement forfaitaire.\n\nD\u00E9ductible uniquement en r\u00E9gime r\u00E9el."
              : `Charges de copropri\u00E9t\u00E9 annuelles : entretien des parties communes, gardien, ascenseur, assurance immeuble\u2026\n\nCalcul : ${fmt(Math.round(chargesCoproAnn / 12))}\u00A0\u20AC/mois \u00D7 12 = ${fmt(chargesCoproAnn)}\u00A0\u20AC/an\n\nEnti\u00E8rement d\u00E9ductibles en r\u00E9gime r\u00E9el.`} />
          <Row label={"Taxe fonci\u00E8re"} value={`-${fmt(taxeFoncAnn)} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'}
            info={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'
              ? "Non d\u00E9ductible en r\u00E9gime micro : d\u00E9j\u00E0 couvert par l\u2019abattement forfaitaire.\n\nD\u00E9ductible uniquement en r\u00E9gime r\u00E9el."
              : "Imp\u00F4t local annuel pay\u00E9 par le propri\u00E9taire.\n\nLa part d\u00E9chets m\u00E9nagers (TEOM) est r\u00E9cup\u00E9rable aupr\u00E8s du locataire.\n\nEnti\u00E8rement d\u00E9ductible en r\u00E9gime r\u00E9el."} />
          <Row label={"Int\u00E9r\u00EAts emprunt"} value={`-${fmt(interetsAnn)} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'}
            info={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'
              ? "Non d\u00E9ductible en r\u00E9gime micro : d\u00E9j\u00E0 couvert par l\u2019abattement forfaitaire.\n\nD\u00E9ductible uniquement en r\u00E9gime r\u00E9el."
              : regime === 'nu_reel_foncier'
                ? `Part des int\u00E9r\u00EAts pay\u00E9s \u00E0 la banque chaque ann\u00E9e sur votre cr\u00E9dit immobilier.\n\nCalcul : ${fmt(colMontantEmprunte)}\u00A0\u20AC emprunt\u00E9s \u00D7 ${tauxCredit}\u00A0% = ${fmt(interetsAnn)}\u00A0\u20AC/an\n\nD\u00E9ductibles sans limite. Si vos charges d\u00E9passent vos loyers, le d\u00E9ficit li\u00E9 aux int\u00E9r\u00EAts est reportable sur les 10\u00A0ann\u00E9es suivantes.`
                : `Part des int\u00E9r\u00EAts pay\u00E9s \u00E0 la banque chaque ann\u00E9e sur votre cr\u00E9dit immobilier.\n\nCalcul : ${fmt(colMontantEmprunte)}\u00A0\u20AC emprunt\u00E9s \u00D7 ${tauxCredit}\u00A0% = ${fmt(interetsAnn)}\u00A0\u20AC/an\n\nEnti\u00E8rement d\u00E9ductibles du r\u00E9sultat imposable. C\u2019est une des principales charges qui r\u00E9duisent l\u2019imp\u00F4t les premi\u00E8res ann\u00E9es.`} />
          <Row label="Assurance emprunteur" value={`-${fmt(assuranceAnn)} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'}
            info={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'
              ? "Non d\u00E9ductible en r\u00E9gime micro : d\u00E9j\u00E0 couvert par l\u2019abattement forfaitaire.\n\nD\u00E9ductible uniquement en r\u00E9gime r\u00E9el."
              : `Assurance d\u00E9c\u00E8s-invalidit\u00E9 exig\u00E9e par la banque lors de l\u2019emprunt.\n\nCalcul : ${fmt(colMontantEmprunte)}\u00A0\u20AC \u00D7 ${tauxAssurance}\u00A0% = ${fmt(assuranceAnn)}\u00A0\u20AC/an\n\nEnti\u00E8rement d\u00E9ductible en r\u00E9gime r\u00E9el, au m\u00EAme titre que les int\u00E9r\u00EAts.`} />
          <ExpandableCharges
            label={"Autres charges d\u00E9ductibles"}
            total={chargesSupplementaires}
            isReel={isReel}
            isFree={isFree}
            details={[
              { label: 'Assurance PNO', value: assurancePNO, info: regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'
                ? "Non d\u00E9ductible en r\u00E9gime micro : d\u00E9j\u00E0 couvert par l\u2019abattement.\n\nD\u00E9ductible en r\u00E9gime r\u00E9el.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes."
                : "Assurance Propri\u00E9taire Non Occupant (PNO) : couvre les risques li\u00E9s \u00E0 la location (d\u00E9g\u00E2ts des eaux, incendie, responsabilit\u00E9 civile).\n\nObligatoire en copropri\u00E9t\u00E9. D\u00E9ductible.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes." },
              { label: `Gestion locative (${fraisGestionPct}%)`, value: Math.round(fraisGestion), info: regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'
                ? "Non d\u00E9ductible en r\u00E9gime micro : d\u00E9j\u00E0 couvert par l\u2019abattement.\n\nD\u00E9ductible en r\u00E9gime r\u00E9el.\n\n\u2699 Taux modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes."
                : `Honoraires de l\u2019agence ou du gestionnaire qui s\u2019occupe de la location (recherche de locataires, \u00E9tat des lieux, quittances\u2026).\n\nCalcul : ${fmt(loyerAnnuel)}\u00A0\u20AC de loyer \u00D7 ${fraisGestionPct}\u00A0% = ${fmt(Math.round(fraisGestion))}\u00A0\u20AC/an\n\nEnti\u00E8rement d\u00E9ductible.\n\n\u2699 Taux modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes.` },
              { label: 'Comptable', value: honorairesComptable, info: regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'
                ? "Non d\u00E9ductible en r\u00E9gime micro : d\u00E9j\u00E0 couvert par l\u2019abattement.\n\nD\u00E9ductible en r\u00E9gime r\u00E9el.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes."
                : regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic'
                  ? "Honoraires d\u2019expert-comptable pour \u00E9tablir votre bilan et liasse fiscale.\n\nObligatoire en location meubl\u00E9e au r\u00E9gime r\u00E9el. D\u00E9ductible.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes."
                  : regime === 'sci_is' || regime === 'marchand_de_biens'
                    ? "Honoraires d\u2019expert-comptable pour le bilan, la liasse fiscale et les assembl\u00E9es g\u00E9n\u00E9rales.\n\nObligatoire pour une soci\u00E9t\u00E9 \u00E0 l\u2019IS. D\u00E9ductible.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes."
                    : "Honoraires d\u2019expert-comptable pour optimiser votre d\u00E9claration de revenus fonciers (formulaire 2044).\n\nRecommand\u00E9 en r\u00E9gime r\u00E9el. D\u00E9ductible.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes." },
              { label: 'CFE', value: cfe, info: !isBICouSCIouMdB
                ? "Non applicable en location nue (pas d\u2019activit\u00E9 commerciale).\n\nLa CFE (Cotisation Fonci\u00E8re des Entreprises) est due uniquement en meubl\u00E9 (LMNP/LMP), SCI \u00E0 l\u2019IS et marchand de biens.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes."
                : "Cotisation Fonci\u00E8re des Entreprises : imp\u00F4t local d\u00FB chaque ann\u00E9e par toute activit\u00E9 professionnelle ou soci\u00E9t\u00E9.\n\nLe montant d\u00E9pend de la commune (g\u00E9n\u00E9ralement quelques centaines d\u2019euros). D\u00E9ductible.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes." },
              { label: 'Frais OGA', value: fraisOGA, info: !isBIC
                ? regime === 'sci_is' || regime === 'marchand_de_biens'
                  ? "Non applicable en soci\u00E9t\u00E9 \u00E0 l\u2019IS.\n\nL\u2019OGA (Organisme de Gestion Agr\u00E9\u00E9) est r\u00E9serv\u00E9 aux loueurs meubl\u00E9s (LMNP / LMP).\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes."
                  : "Non applicable dans votre r\u00E9gime.\n\nL\u2019OGA (Organisme de Gestion Agr\u00E9\u00E9) est r\u00E9serv\u00E9 au LMNP et LMP en r\u00E9gime r\u00E9el.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes."
                : "Organisme de Gestion Agr\u00E9\u00E9 : l\u2019adh\u00E9sion \u00E9vite une majoration de 15\u00A0% de votre b\u00E9n\u00E9fice imposable.\n\nFortement recommand\u00E9 en LMNP/LMP.\nCo\u00FBt : 150 \u00E0 300\u00A0\u20AC/an, d\u00E9ductible.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes." },
              { label: 'Frais bancaires / dossier', value: fraisBancaires, info: regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'
                ? "Non d\u00E9ductible en r\u00E9gime micro : d\u00E9j\u00E0 couvert par l\u2019abattement.\n\nD\u00E9ductible en r\u00E9gime r\u00E9el."
                : `Frais de dossier bancaire + frais de garantie (hypoth\u00E8que ou caution).\n\nPay\u00E9s une seule fois \u00E0 la souscription du pr\u00EAt. Liss\u00E9s ici sur la dur\u00E9e pour simplifier la lecture.\n\nD\u00E9ductibles en totalit\u00E9.\n\n\u2699 Montant modifiable dans Mes param\u00E8tres \u2192 Charges r\u00E9currentes.` },
            ]}
          />
          <Row
            label={"Travaux d\u00E9ductibles"}
            value={regime === 'nu_reel_foncier' && travauxDeductibles > 0 ? `-${fmt(travauxDeductibles)} \u20AC`
              : (regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is') && travauxAmortis > 0 ? `-${fmt(travauxAmortis)} \u20AC`
              : `0 \u20AC`}
            rouge={(regime === 'nu_reel_foncier' && travauxDeductibles > 0) || ((regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is') && travauxAmortis > 0)}
            tiret={!isReel}
            info={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'
              ? "Non d\u00E9ductible en r\u00E9gime micro : d\u00E9j\u00E0 couvert par l\u2019abattement forfaitaire.\n\nEn r\u00E9gime r\u00E9el, les travaux sont d\u00E9ductibles (Nu r\u00E9el) ou amortissables sur 10\u00A0ans (LMNP/LMP/SCI\u00A0IS)."
              : regime === 'marchand_de_biens'
                ? "En marchand de biens, les travaux sont des charges d\u2019exploitation d\u00E9duites du r\u00E9sultat l\u2019ann\u00E9e de la d\u00E9pense.\n\nPas d\u2019amortissement : le bien est consid\u00E9r\u00E9 comme un stock (destin\u00E9 \u00E0 la revente), pas comme une immobilisation."
                : regime === 'nu_reel_foncier'
                  ? (budgetTravaux > 0
                    ? `Travaux d\u2019entretien et d\u2019am\u00E9lioration d\u00E9ductibles en totalit\u00E9 l\u2019ann\u00E9e de la d\u00E9pense.\n\nBudget estim\u00E9 : ${fmt(budgetTravaux)}\u00A0\u20AC (score ${scoreUtilise}/5)\n\nSi les charges d\u00E9passent les loyers, le d\u00E9ficit foncier est imputable sur votre revenu global (max 10\u00A0700\u00A0\u20AC/an).\n\nAttention : les travaux de construction ou d\u2019agrandissement ne sont pas d\u00E9ductibles.\n\n\u2699 Budget travaux/m\u00B2 modifiable dans Mes param\u00E8tres \u2192 Budget travaux.`
                    : "Renseignez un score travaux pour estimer le budget.\n\nEn Nu r\u00E9el, les travaux d\u2019entretien et d\u2019am\u00E9lioration sont d\u00E9ductibles via le d\u00E9ficit foncier (plafonn\u00E9 \u00E0 10\u00A0700\u00A0\u20AC/an sur le revenu global).")
                  : (budgetTravaux > 0
                    ? `Travaux amortis sur 10\u00A0ans : le co\u00FBt est r\u00E9parti et d\u00E9duit chaque ann\u00E9e.\n\nBudget estim\u00E9 : ${fmt(budgetTravaux)}\u00A0\u20AC (score ${scoreUtilise}/5)\nAmortissement annuel : ${fmt(Math.round(budgetTravaux / 10))}\u00A0\u20AC/an\n\nR\u00E9duit le r\u00E9sultat imposable chaque ann\u00E9e.\n\n\u2699 Budget travaux/m\u00B2 modifiable dans Mes param\u00E8tres \u2192 Budget travaux.`
                    : `Renseignez un score travaux pour estimer le budget.\n\nEn ${regime === 'sci_is' ? "SCI \u00E0 l\u2019IS" : "LMNP/LMP r\u00E9el"}, les travaux sont amortissables sur 10\u00A0ans.`)}
          />
          {showAmortRow && (
            <Row label="Amortissement" value={`-${fmt(amort)} \u20AC`} rouge tiret={!hasAmort} info={
              regime === 'nu_micro_foncier'
                ? "Non disponible en micro-foncier.\n\nL\u2019amortissement est r\u00E9serv\u00E9 aux r\u00E9gimes r\u00E9els : LMNP r\u00E9el, LMP et SCI \u00E0 l\u2019IS."
                : regime === 'lmnp_micro_bic'
                  ? "Non disponible en micro-BIC.\n\nL\u2019amortissement est le principal avantage du passage au r\u00E9gime r\u00E9el : il permet de r\u00E9duire fortement le r\u00E9sultat imposable."
                  : regime === 'nu_reel_foncier'
                    ? "Non disponible en location nue.\n\nEn contrepartie, le Nu r\u00E9el offre le m\u00E9canisme du d\u00E9ficit foncier (d\u00E9duction des charges r\u00E9elles et des travaux)."
                    : regime === 'marchand_de_biens'
                      ? "Non disponible en marchand de biens.\n\nLe bien est consid\u00E9r\u00E9 comme un stock (destin\u00E9 \u00E0 la revente), pas comme une immobilisation. Les travaux sont d\u00E9duits directement en charges."
                      : regime === 'sci_is'
                        ? `L\u2019amortissement r\u00E9duit le b\u00E9n\u00E9fice soumis \u00E0 l\u2019imp\u00F4t sur les soci\u00E9t\u00E9s :\n\n\u2022 B\u00E2ti (85\u00A0% du prix) sur 30\u00A0ans : ${fmt(Math.round(prix_fai * 0.85 / 30))}\u00A0\u20AC/an\n\u2022 Frais de notaire sur 5\u00A0ans : ${fmt(Math.round(fraisNotaireMontantLocatif / 5))}\u00A0\u20AC/an`
                        : `L\u2019amortissement permet de d\u00E9duire chaque ann\u00E9e une partie de la valeur du bien :\n\n\u2022 B\u00E2ti (85\u00A0% du prix) sur 30\u00A0ans : ${fmt(Math.round(prix_fai * 0.85 / 30))}\u00A0\u20AC/an\n\u2022 Mobilier (5\u00A0000\u00A0\u20AC) sur 10\u00A0ans : ${fmt(Math.round(5000 / 10))}\u00A0\u20AC/an\n\nR\u00E9duit fortement le r\u00E9sultat imposable, souvent \u00E0 z\u00E9ro.\n\nAttention : depuis 2025, les amortissements d\u00E9duits sont r\u00E9int\u00E9gr\u00E9s dans le calcul de la plus-value \u00E0 la revente.`
            } />
          )}
          {showSSIRow && (
            <Row label="Cotisations SSI (45%)" value={regime === 'lmp_reel_bic' ? `-${fmt(Math.max(0, revenuImposable) * 0.45)} \u20AC` : ''} rouge={regime === 'lmp_reel_bic'} tiret={regime !== 'lmp_reel_bic'}
              info={regime === 'lmp_reel_bic'
                ? "Cotisations sociales des ind\u00E9pendants (S\u00E9curit\u00E9 Sociale des Ind\u00E9pendants) : environ 45\u00A0% du b\u00E9n\u00E9fice.\n\nElles couvrent maladie, retraite et allocations. C\u2019est le principal inconv\u00E9nient du statut LMP par rapport au LMNP."
                : "Non applicable dans votre r\u00E9gime.\n\nLes cotisations SSI (S\u00E9curit\u00E9 Sociale des Ind\u00E9pendants) sont dues uniquement en Loueur Meubl\u00E9 Professionnel (LMP)."} />
          )}
          <Row label={"R\u00E9sultat imposable"} value={`${fmt(revenuImposable)} \u20AC`} bold
            info={regime === 'nu_micro_foncier'
              ? `C\u2019est le montant sur lequel vous serez impos\u00E9.\n\nCalcul : loyers ${fmt(loyerAnnuel)}\u00A0\u20AC - abattement 30\u00A0% = ${fmt(revenuImposable)}\u00A0\u20AC\n\nImpos\u00E9 \u00E0 votre tranche marginale (TMI ${tmi}\u00A0%) + pr\u00E9l\u00E8vements sociaux (17,2\u00A0%).`
              : regime === 'lmnp_micro_bic'
                ? `C\u2019est le montant sur lequel vous serez impos\u00E9.\n\nCalcul : recettes ${fmt(loyerAnnuel)}\u00A0\u20AC - abattement 50\u00A0% = ${fmt(revenuImposable)}\u00A0\u20AC\n\nImpos\u00E9 \u00E0 votre tranche marginale (TMI ${tmi}\u00A0%) + pr\u00E9l\u00E8vements sociaux (17,2\u00A0%).`
                : regime === 'nu_reel_foncier'
                  ? `C\u2019est le montant sur lequel vous serez impos\u00E9 : loyers - toutes les charges d\u00E9ductibles.\n\n${revenuImposable < 0 ? `R\u00E9sultat n\u00E9gatif = d\u00E9ficit foncier imputable sur votre revenu global (max 10\u00A0700\u00A0\u20AC/an). Le solde est reportable 10\u00A0ans.` : `Impos\u00E9 \u00E0 votre tranche marginale (TMI ${tmi}\u00A0%) + pr\u00E9l\u00E8vements sociaux (17,2\u00A0%).`}`
                  : regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic'
                    ? `C\u2019est le montant sur lequel vous serez impos\u00E9 : recettes - charges - amortissement.\n\nGr\u00E2ce \u00E0 l\u2019amortissement, ce r\u00E9sultat est souvent proche de z\u00E9ro.\n\nImpos\u00E9 \u00E0 votre tranche marginale (TMI ${tmi}\u00A0%) + pr\u00E9l\u00E8vements sociaux (17,2\u00A0%).`
                    : regime === 'sci_is' || regime === 'marchand_de_biens'
                      ? `B\u00E9n\u00E9fice de la soci\u00E9t\u00E9 sur lequel sera calcul\u00E9 l\u2019imp\u00F4t sur les soci\u00E9t\u00E9s (IS).\n\n\u2022 15\u00A0% jusqu\u2019\u00E0 42\u00A0500\u00A0\u20AC\n\u2022 25\u00A0% au-del\u00E0\n\nPas d\u2019imp\u00F4t sur le revenu ni de pr\u00E9l\u00E8vements sociaux \u00E0 ce stade. Les associ\u00E9s seront impos\u00E9s uniquement lors de la distribution des dividendes.`
                      : ''} />
          <Row label={"Imp\u00F4t"} value={`-${fmt(impot)} \u20AC`} rouge
            info={regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier' || regime === 'lmnp_micro_bic'
              ? `Votre tranche marginale (${tmi}\u00A0%) + pr\u00E9l\u00E8vements sociaux (17,2\u00A0%) = ${tmi + 17.2}\u00A0% appliqu\u00E9s au r\u00E9sultat imposable.\n\nCalcul : ${fmt(revenuImposable)}\u00A0\u20AC \u00D7 ${tmi + 17.2}\u00A0% = ${fmt(impot)}\u00A0\u20AC\n\n\u2699 TMI modifiable dans Mes param\u00E8tres \u2192 Fiscalit\u00E9.`
              : regime === 'lmnp_reel_bic'
                ? `Votre tranche marginale (${tmi}\u00A0%) + pr\u00E9l\u00E8vements sociaux (17,2\u00A0%) = ${tmi + 17.2}\u00A0% du r\u00E9sultat imposable.\n\nGr\u00E2ce \u00E0 l\u2019amortissement, le r\u00E9sultat est souvent proche de z\u00E9ro.\n\n\u2699 TMI modifiable dans Mes param\u00E8tres \u2192 Fiscalit\u00E9.`
                : regime === 'lmp_reel_bic'
                  ? `Votre tranche marginale (${tmi}\u00A0%) appliqu\u00E9e au r\u00E9sultat imposable.\n\nEn LMP, les cotisations sociales (SSI ~45\u00A0%) remplacent les pr\u00E9l\u00E8vements sociaux de 17,2\u00A0%.\n\n\u2699 TMI modifiable dans Mes param\u00E8tres \u2192 Fiscalit\u00E9.`
                  : `Imp\u00F4t sur les soci\u00E9t\u00E9s (IS) :\n\u2022 15\u00A0% jusqu\u2019\u00E0 42\u00A0500\u00A0\u20AC de b\u00E9n\u00E9fice\n\u2022 25\u00A0% au-del\u00E0\n\nLes dividendes vers\u00E9s aux associ\u00E9s seront ensuite soumis \u00E0 la flat tax (30\u00A0%) lors de la distribution.`} />
        </>
      )}
      {hasLoyer && !isTravauxLourds && (
        <div className={`fiscal-cf${cashflowNetMensuel >= 0 ? ' pos' : ' neg'}`}>
          <div className="cf-lbl">{"Cash Flow Net d\u2019Imp\u00F4t"}</div>
          <div className="cf-row">
            <span className={`cf-main${isFree ? ' val-blur' : ''}`}>
              {cashflowNetMensuel >= 0 ? '+' : ''}{fmt(cashflowNetMensuel)} {'\u20AC'}/mois
            </span>
            <span className={`cf-ann${isFree ? ' val-blur' : ''}`}>
              {cashflowNetAnnuel >= 0 ? '+' : ''}{fmt(cashflowNetAnnuel)} {'\u20AC'}/an
            </span>
          </div>
        </div>
      )}

      {/* === SCENARIO REVENTE === */}
      {hasRevente && (
        <>
          <SectionLabel label={`Sc\u00e9nario revente \u00e0 ${dur} an${dur > 1 ? 's' : ''}`} />
          <Row label="Estimation Prix de Revente (net vendeur)" value={`${fmt(prixReventeNetVendeur)} \u20AC`}
            info={regime === 'marchand_de_biens'
              ? "Prix de revente estim\u00E9 via les donn\u00E9es DVF (transactions notariales r\u00E9elles). C\u2019est le prix \u00AB\u00A0en bon \u00E9tat\u00A0\u00BB apr\u00E8s travaux. En MdB, c\u2019est votre prix de sortie sur lequel se calcule la marge."
              : regime === 'sci_is'
                ? "Prix de revente estim\u00E9 via les donn\u00E9es DVF. En SCI IS, la plus-value se calcule sur la VNC (valeur nette comptable = prix + frais + travaux - amortissements cumul\u00E9s), pas sur le prix d\u2019achat."
                : "Prix de revente estim\u00E9 via les donn\u00E9es DVF (transactions notariales r\u00E9elles). C\u2019est le prix net vendeur dans l\u2019acte. Les frais d\u2019agence sont g\u00E9n\u00E9ralement \u00E0 la charge de l\u2019acqu\u00E9reur."} />
          <Row label="Prix d'achat (net vendeur)" value={`-${fmt(prixNetVendeurAchat)} \u20AC`} rouge
            info={isEnchere
              ? "Mise à prix fixée par le tribunal, ou prix adjugé si le bien a déjà été vendu aux enchères. C'est le montant de référence avant les frais d'adjudication."
              : "Prix payé au vendeur du bien (hors frais d'agence). C'est le prix inscrit dans l'acte notarié d'achat."} />
          <Row label={pvBruteSimple >= 0 ? "Plus-value brute" : "Moins-value brute"} value={`${pvBruteSimple > 0 ? '+' : ''}${fmt(pvBruteSimple)} \u20AC`} bold vert={pvBruteSimple > 0} rouge={pvBruteSimple <= 0}
            info={regime === 'marchand_de_biens'
              ? "Diff\u00E9rence entre le prix de revente net vendeur et le prix d\u2019achat net vendeur. En MdB, c\u2019est aussi la base de calcul de la TVA sur marge."
              : "Diff\u00E9rence entre les deux prix net vendeur (revente et achat). C\u2019est la vraie cr\u00E9ation de valeur sur le bien, avant frais et fiscalit\u00E9."} />
          {!isEnchere && fraisAgenceAchatMontant > 0 && (
            <Row label={`Frais d'agence achat (${fraisAgenceRevente}%)`} value={`-${fmt(fraisAgenceAchatMontant)} \u20AC`} rouge
              info={regime === 'marchand_de_biens'
                ? `Commission de l\u2019agence immobili\u00E8re \u00E0 l\u2019achat. En MdB, ces frais ne font pas partie de la base de la TVA sur marge. Prix FAI total : ${fmt(prix_fai)} \u20AC.`
                : `Commission de l\u2019agence immobili\u00E8re \u00E0 l\u2019achat, g\u00E9n\u00E9ralement \u00E0 la charge de l\u2019acqu\u00E9reur. Prix FAI total : ${fmt(prix_fai)} \u20AC.`} />
          )}
          {isEnchere ? (
            <>
              <Row label={"Frais préalables"} value={fraisEnchere && fraisEnchere.frais_prealables > 0 ? `-${fmt(fraisEnchere.frais_prealables)} ${'\u20AC'}` : `0 ${'\u20AC'}`} rouge={fraisEnchere ? fraisEnchere.frais_prealables > 0 : false}
                info={"Frais préalables engagés par l'avocat poursuivant avant l'audience (diagnostics, huissier, publication…). À demander à l'avocat et saisir dans la fiche une fois obtenus."} />
              <Row label={`Frais de mutation (${fraisEnchere?.pct_sans_prealables ?? 0}\u00A0%)`} value={`-${fmt(fraisEnchere?.total_sans_prealables || 0)} ${'\u20AC'}`} rouge
                info={`Émoluments avocat TTC : ${fmt(fraisEnchere?.emoluments_ttc || 0)}\u00A0${'\u20AC'}\nDroits de mutation (${fraisEnchere?.droits_enregistrement_pct ?? 5.8}\u00A0%) : ${fmt(fraisEnchere?.droits_enregistrement || 0)}\u00A0${'\u20AC'}\nCSI (0,1\u00A0%) : ${fmt(fraisEnchere?.csi || 0)}\u00A0${'\u20AC'}\n\nTotal hors frais préalables : ${fmt(fraisEnchere?.total_sans_prealables || 0)}\u00A0${'\u20AC'}`} />
            </>
          ) : (
            <Row label={`Frais de notaire (${fraisNotairePct}%)`} value={`-${fmt(fraisNotaireMontant)} \u20AC`} rouge
              info={regime === 'marchand_de_biens'
                ? `Frais de notaire r\u00E9duits \u00E0 ~2,5% pour les marchands de biens (droits de mutation r\u00E9duits). C\u2019est un avantage significatif par rapport aux 7-8% d\u2019un particulier.`
                : `Frais de notaire (droits de mutation + \u00E9moluments). En ancien : 7-8% du prix. En neuf : 2-3%. Ces frais augmentent le co\u00FBt total de l\u2019op\u00E9ration et r\u00E9duisent la plus-value nette.`} />
          )}
          <Row
            label={budgetTravaux > 0 ? `Travaux (score ${scoreUtilise})${isMarchand && optionTVA ? ' HT' : ''}` : 'Travaux'}
            value={budgetTravauxEffectif > 0 ? `-${fmt(budgetTravauxEffectif)} \u20AC` : `0 \u20AC`}
            rouge={budgetTravauxEffectif > 0}
            info={regime === 'marchand_de_biens'
                ? (optionTVA
                  ? `Co\u00FBt des travaux HT (TVA r\u00E9cup\u00E9r\u00E9e).\n\nBudget TTC : ${fmt(budgetTravaux)}\u00A0\u20AC\nTVA r\u00E9cup\u00E9r\u00E9e (20\u00A0%) : -${fmt(Math.round(tvaRecupereeTravaux))}\u00A0\u20AC\nCo\u00FBt r\u00E9el HT : ${fmt(Math.round(budgetTravauxEffectif))}\u00A0\u20AC\n\nEn optant pour la TVA sur marge, le MdB r\u00E9cup\u00E8re la TVA sur les travaux, ce qui r\u00E9duit le co\u00FBt effectif de la r\u00E9novation.`
                  : "Co\u00FBt total des travaux de r\u00E9novation TTC.\n\nSans option TVA sur marge, la TVA sur les travaux n\u2019est pas r\u00E9cup\u00E9rable. Les travaux restent une charge d\u2019exploitation qui r\u00E9duit le b\u00E9n\u00E9fice imposable.")
                : regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is'
                  ? `Co\u00FBt total des travaux, d\u00E9duit du prix de revient.\n\nCes travaux sont aussi amortis sur 10\u00A0ans en phase locative (${fmt(travauxAmortis)}\u00A0\u20AC/an). Les amortissements cumul\u00E9s sont r\u00E9int\u00E9gr\u00E9s dans la plus-value imposable.`
                  : regime === 'nu_reel_foncier'
                    ? "Co\u00FBt total des travaux, d\u00E9duit du prix de revient.\n\nCes travaux ont aussi \u00E9t\u00E9 d\u00E9duits en d\u00E9ficit foncier pendant la phase locative. Il n\u2019y a pas de r\u00E9int\u00E9gration \u00E0 la revente en location nue."
                    : "Co\u00FBt total des travaux, d\u00E9duit du prix de revient.\n\nEn r\u00E9gime micro, les travaux ne sont pas d\u00E9ductibles pendant la location, mais ils r\u00E9duisent la plus-value imposable \u00E0 la revente."}
          />
          {interetsCumules > 0 && (
            <Row label={`Int\u00E9r\u00EAts d'emprunt (${dur} an${dur > 1 ? 's' : ''})`} value={`-${fmt(interetsCumules)} \u20AC`} rouge
              info={`Co\u00FBt total du cr\u00E9dit sur ${dur} an${dur > 1 ? 's' : ''} : int\u00E9r\u00EAts ${fmt(interetsAnn)} \u20AC/an + assurance ${fmt(assuranceAnn)} \u20AC/an. Ces frais financiers r\u00E9duisent le b\u00E9n\u00E9fice r\u00E9el de l\u2019op\u00E9ration. En phase locative, ils sont d\u00E9ductibles du r\u00E9sultat imposable (en r\u00E9gime r\u00E9el).`} />
          )}
          {interetsCumules > 0 && fraisBancaires > 0 && (
            <Row label="Frais de dossier bancaire" value={`-${fmt(fraisBancaires)} \u20AC`} rouge
              info={"Frais de dossier et de garantie (hypoth\u00E8que ou caution) pay\u00E9s \u00E0 la souscription du pr\u00EAt. C\u2019est un co\u00FBt ponctuel qui s\u2019ajoute au co\u00FBt total de l\u2019op\u00E9ration."} />
          )}
          <Row label={pvBrute >= 0 ? "Plus-value nette avant imp\u00F4t" : "Moins-value nette avant imp\u00F4t"} value={`${pvBrute > 0 ? '+' : ''}${fmt(pvBrute)} \u20AC`} bold vert={pvBrute > 0} rouge={pvBrute <= 0}
            info={regime === 'marchand_de_biens'
              ? "Diff\u00E9rence entre le prix de revente et tous les co\u00FBts (achat + notaire + travaux + frais). C\u2019est la marge brute de l\u2019op\u00E9ration MdB avant TVA et IS."
              : regime === 'sci_is'
                ? "Diff\u00E9rence entre le prix de revente et le co\u00FBt total de l\u2019op\u00E9ration. En SCI IS, cette plus-value sera calcul\u00E9e sur la VNC (apr\u00E8s d\u00E9duction des amortissements), ce qui augmente la base imposable."
                : "Diff\u00E9rence entre le prix de revente et le co\u00FBt total de l\u2019op\u00E9ration (achat + notaire + travaux + frais financiers). C\u2019est ce qu\u2019il vous reste avant imp\u00F4ts sur la plus-value."} />

          {/* Fiscalite PV — Niveau 1 : Reintegration (LMNP reel) ou ligne vide */}
          {showReintegrationRow && (
            regime === 'lmnp_reel_bic' ? (
              <Row label={"R\u00E9int\u00E9gration amortissements"} value={`+${fmt(Math.round(reintegrationAmort))} \u20AC`} rouge
                info={"Depuis 2025, les amortissements d\u00E9duits pendant la location sont rajout\u00E9s \u00E0 la plus-value imposable lors de la revente.\n\nConcr\u00E8tement : vous avez pay\u00E9 moins d\u2019imp\u00F4t pendant la location, mais vous en payez plus \u00E0 la revente."} />
            ) : (
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>&nbsp;</div>
            )
          )}

          {/* Niveau 2 : IR / TVA marge / IS sur PV / PV pro */}
          {(regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier' || regime === 'lmnp_micro_bic' || regime === 'lmnp_reel_bic') && (
            <ExpandableTaxRow label={"IR sur PV (19%)"} total={Math.round(irPV)} isFree={isFree}
              info={"Imp\u00F4t forfaitaire de 19% sur la plus-value, r\u00E9duit par les abattements pour dur\u00E9e de d\u00E9tention (exon\u00E9ration totale IR apr\u00E8s 22 ans)."}
              details={[
                { label: `IR sur PV (19%) - avant abattements`, value: `${fmt(Math.round(pvBaseIR * 0.19))}\u00A0\u20AC` },
                { label: abattements.abattementIR > 0 ? `Abattement IR (${dur} ans / -${Math.round(abattements.abattementIR)}%)` : `Abattement IR (${dur} an${dur > 1 ? 's' : ''} / 0%)`, value: abattements.abattementIR > 0 ? `-${fmt(Math.round(pvBaseIR * 0.19 - irPV))}\u00A0\u20AC` : '0\u00A0\u20AC', vert: abattements.abattementIR > 0 },
              ]} />
          )}
          {isMarchand && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>
              <span style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
                TVA sur marge
                {!isFree && <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{"Pour un bien ancien achet\u00E9 \u00E0 un particulier, la TVA sur marge est optionnelle (art. 260-5\u00B0 bis CGI).\n\nSans option : pas de TVA collect\u00E9e, pas de TVA r\u00E9cup\u00E9rable sur travaux.\nAvec option : TVA sur marge (20/120), mais TVA r\u00E9cup\u00E9rable sur travaux.\n\nInt\u00E9ressant si TVA r\u00E9cup\u00E9rable sur travaux > TVA sur marge."}</span></span>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'flex', gap: '3px' }}>
                  <button onClick={() => setOptionTVA(false)} style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', border: !optionTVA ? '1.5px solid #c0392b' : '1px solid #e8e2d8', background: !optionTVA ? '#fde8e8' : '#faf8f5', color: !optionTVA ? '#c0392b' : '#7a6a60', fontFamily: "'DM Sans', sans-serif" }}>Non</button>
                  <button onClick={() => setOptionTVA(true)} style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', border: optionTVA ? '1.5px solid #c0392b' : '1px solid #e8e2d8', background: optionTVA ? '#fde8e8' : '#faf8f5', color: optionTVA ? '#c0392b' : '#7a6a60', fontFamily: "'DM Sans', sans-serif" }}>Oui</button>
                </span>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: '13px', fontWeight: 600, color: tvaMarge > 0 ? '#c0392b' : '#555', minWidth: '70px', textAlign: 'right' }} className={isFree ? 'val-blur' : ''}>
                  -{fmt(Math.round(tvaMarge))} {'\u20AC'}
                </span>
              </span>
            </div>
          )}
          {regime === 'sci_is' && (
            <ExpandableTaxRow label={"IS sur PV (15% / 25%)"} total={Math.round(isPV)} isFree={isFree}
              info={"Plus-value calcul\u00E9e sur la Valeur Nette Comptable (VNC) : prix d\u2019achat + frais + travaux - amortissements d\u00E9j\u00E0 d\u00E9duits.\n\nPas d\u2019abattement pour dur\u00E9e de d\u00E9tention en SCI \u00E0 l\u2019IS."}
              details={[
                { label: 'PV sur VNC', value: `${fmt(Math.round(isPV / (isPV <= 42500 * 0.15 ? 0.15 : 0.25) || 0))}\u00A0\u20AC` },
                { label: 'IS (15% / 25%)', value: `-${fmt(Math.round(isPV))}\u00A0\u20AC` },
              ]} />
          )}
          {regime === 'lmp_reel_bic' && (
            <ExpandableTaxRow label={dur > 5 ? "PV professionnelle" : `PV professionnelle (TMI ${tmi}%)`} total={dur > 5 ? 0 : Math.round(irPV)} isFree={isFree}
              info={dur > 5 ? "Exon\u00E9ration totale apr\u00E8s 5 ans d\u2019activit\u00E9 (recettes < 90 000 \u20AC/an)." : `PV impos\u00E9e \u00E0 votre TMI. Exon\u00E9r\u00E9e apr\u00E8s 5 ans.`}
              details={dur > 5 ? [{ label: 'Exon\u00E9r\u00E9e (> 5 ans, recettes < 90k\u20AC)', value: '0\u00A0\u20AC', vert: true }] : [
                { label: `IR (TMI ${tmi}%)`, value: `-${fmt(Math.round(irPV))}\u00A0\u20AC` },
              ]} />
          )}

          {/* Niveau 3 : PS / IS benefice / PFU / SSI */}
          {(regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier' || regime === 'lmnp_micro_bic' || regime === 'lmnp_reel_bic') && (
            <ExpandableTaxRow label={"PS sur PV (17,2%)"} total={Math.round(psPV)} isFree={isFree}
              info={"Pr\u00E9l\u00E8vements sociaux de 17,2%. Abattements diff\u00E9rents de l\u2019IR : exon\u00E9ration totale PS apr\u00E8s 30 ans (vs 22 ans pour l\u2019IR)."}
              details={[
                { label: `PS sur PV (17,2%) - avant abattements`, value: `${fmt(Math.round(pvBasePS * 0.172))}\u00A0\u20AC` },
                { label: abattements.abattementPS > 0 ? `Abattement PS (${dur} ans / -${Math.round(abattements.abattementPS)}%)` : `Abattement PS (${dur} an${dur > 1 ? 's' : ''} / 0%)`, value: abattements.abattementPS > 0 ? `-${fmt(Math.round(pvBasePS * 0.172 - psPV))}\u00A0\u20AC` : '0\u00A0\u20AC', vert: abattements.abattementPS > 0 },
              ]} />
          )}
          {regime === 'marchand_de_biens' && (
            <ExpandableTaxRow label={"IS sur b\u00E9n\u00E9fice (15% / 25%)"} total={Math.round(isPV)} isFree={isFree}
              info={"IS sur le b\u00E9n\u00E9fice net apr\u00E8s TVA sur marge. 15% jusqu\u2019\u00E0 42 500 \u20AC, 25% au-del\u00E0."}
              details={[
                { label: 'B\u00E9n\u00E9fice (marge - TVA - frais)', value: `${fmt(Math.round(isPV <= 42500 * 0.15 ? isPV / 0.15 : (isPV - 42500 * 0.15) / 0.25 + 42500))}\u00A0\u20AC` },
                { label: 'IS (15% / 25%)', value: `-${fmt(Math.round(isPV))}\u00A0\u20AC` },
              ]} />
          )}
          {regime === 'sci_is' && (
            <ExpandableTaxRow label={"PFU dividendes (30%)"} total={Math.round(psPV)} isFree={isFree}
              info={"Pr\u00E9l\u00E8vement Forfaitaire Unique (PFU), aussi appel\u00E9 \u00AB\u00A0flat tax\u00A0\u00BB : 30\u00A0% (12,8\u00A0% d\u2019imp\u00F4t + 17,2\u00A0% de pr\u00E9l\u00E8vements sociaux).\n\nAppliqu\u00E9 uniquement si les b\u00E9n\u00E9fices sont distribu\u00E9s en dividendes aux associ\u00E9s. Si les fonds restent dans la SCI, pas de PFU \u00E0 payer."}
              details={[
                { label: 'B\u00E9n\u00E9fice distribuable (apr\u00E8s IS)', value: `${fmt(Math.round(psPV / 0.3 || 0))}\u00A0\u20AC` },
                { label: 'PFU (30%)', value: `-${fmt(Math.round(psPV))}\u00A0\u20AC` },
              ]} />
          )}
          {regime === 'lmp_reel_bic' && (
            <ExpandableTaxRow label={"Cotisations SSI (45%)"} total={Math.round(cotisationsSocialesLMP)} isFree={isFree}
              info={"Cotisations sociales sur la plus-value court terme (part li\u00E9e aux amortissements d\u00E9duits)."}
              details={cotisationsSocialesLMP > 0 ? [
                { label: 'PV court terme (amortissements)', value: `${fmt(Math.round(cotisationsSocialesLMP / 0.45))}\u00A0\u20AC` },
                { label: 'SSI (45%)', value: `-${fmt(Math.round(cotisationsSocialesLMP))}\u00A0\u20AC` },
              ] : [{ label: 'Pas de PV court terme', value: '0\u00A0\u20AC', vert: true }]} />
          )}
          <Row label={pvNette >= 0 ? "Plus-value nette d\u2019imp\u00F4t" : "Moins-value nette d\u2019imp\u00F4t"} value={`${pvNette >= 0 ? '+' : ''}${fmt(pvNette)} \u20AC`} bold vert={pvNette >= 0} rouge={pvNette < 0}
            info={regime === 'marchand_de_biens'
              ? "B\u00E9n\u00E9fice net de l\u2019op\u00E9ration MdB apr\u00E8s TVA sur marge et IS. C\u2019est ce qui reste dans la soci\u00E9t\u00E9 (avant distribution de dividendes)."
              : regime === 'sci_is'
                ? "Plus-value nette apr\u00E8s IS et PFU. En SCI IS, la double imposition (IS sur le b\u00E9n\u00E9fice + PFU sur les dividendes) p\u00E8se lourd sur les op\u00E9rations de revente."
                : regime === 'lmp_reel_bic' && dur > 5
                  ? "Plus-value nette apr\u00E8s exon\u00E9ration LMP. Apr\u00E8s 5 ans, c\u2019est le r\u00E9gime le plus avantageux pour la revente (z\u00E9ro imp\u00F4t sur la PV)."
                  : "Plus-value nette apr\u00E8s tous les imp\u00F4ts (IR 19% + PS 17,2% avec abattements dur\u00E9e). C\u2019est le gain r\u00E9el sur la revente du bien."} />

          {/* BILAN FINAL */}
          <div className={`fiscal-bilan${profitNet >= 0 ? ' pos' : ' neg'}`}>
            <div className="fb-lbl">{`Bilan sur ${dur} an${dur > 1 ? 's' : ''}`}</div>
            {!isTravauxLourds && (
              <div className="fb-row">
                <span className="pnl-tooltip-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                  {"Cashflow locatif net cumul\u00E9"}
                  <span style={{ fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</span>
                  <span className="pnl-tooltip-text">{`Somme des loyers nets encaiss\u00E9s apr\u00E8s d\u00E9duction des mensualit\u00E9s de cr\u00E9dit et de l\u2019imp\u00F4t, sur ${dur}\u00A0an${dur > 1 ? 's' : ''} de d\u00E9tention.\n\n${fmt(cashflowNetMensuel)}\u00A0\u20AC/mois \u00D7 ${dur * 12}\u00A0mois${fraisBancaires > 0 ? `\n- Frais bancaires : ${fmt(fraisBancaires)}\u00A0\u20AC` : ''}\n= ${fmt(cashflowCumule)}\u00A0\u20AC`}</span>
                </span>
                <span style={{ fontWeight: 600, color: cashflowCumule >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{cashflowCumule >= 0 ? '+' : ''}{fmt(cashflowCumule)} {'\u20AC'}</span>
              </div>
            )}
            <div className="fb-row">
              <span className="pnl-tooltip-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                {"Cashflow achat-revente net"}
                <span style={{ fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</span>
                <span className="pnl-tooltip-text">{`R\u00E9sultat net de l\u2019op\u00E9ration d\u2019achat-revente apr\u00E8s remboursement du cr\u00E9dit et fiscalit\u00E9.\n\n+ Emprunt re\u00E7u : ${fmt(colMontantEmprunte)}\u00A0\u20AC\n+ PV nette d\u2019imp\u00F4t : ${fmt(pvNette)}\u00A0\u20AC\n- Remboursement CRD : ${fmt(Math.round(crd))}\u00A0\u20AC${interetsCumules > 0 ? `\n- Int\u00E9r\u00EAts cumul\u00E9s : ${fmt(interetsCumules)}\u00A0\u20AC` : ''}\n= ${fmt(cashflowAchatRevente)}\u00A0\u20AC\n\n${colTypeCredit === 'in_fine' ? `Cr\u00E9dit in fine : le capital (${fmt(colMontantEmprunte)}\u00A0\u20AC) est int\u00E9gralement rembours\u00E9 \u00E0 la revente.` : `Cr\u00E9dit amortissable : ${fmt(Math.round(colMontantEmprunte - crd))}\u00A0\u20AC de capital d\u00E9j\u00E0 rembours\u00E9 via les mensualit\u00E9s.`}`}</span>
              </span>
              <span style={{ fontWeight: 600, color: cashflowAchatRevente >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>
                {cashflowAchatRevente >= 0 ? '+' : ''}{fmt(cashflowAchatRevente)} {'\u20AC'}
              </span>
            </div>
            <div className={`fb-total${isFree ? ' val-blur' : ''}`} style={{ color: profitNet >= 0 ? '#1a7a40' : '#c0392b' }}>
              {profitNet >= 0 ? '+' : ''}{fmt(profitNet)} {'\u20AC'}
            </div>
            <div className="fb-metrics">
              <div className="fb-metric">
                <span className="pnl-tooltip-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>ROI <span style={{ fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</span><span className="pnl-tooltip-text">{"Return On Investment (retour sur investissement). C\u2019est votre gain total (cashflow + plus-value) divis\u00E9 par le co\u00FBt total de l\u2019op\u00E9ration (achat + notaire + travaux). Un ROI de 20% signifie que vous avez gagn\u00E9 20\u00A0\u20AC pour 100\u00A0\u20AC investis. Le ROI annualis\u00E9 permet de comparer des op\u00E9rations de dur\u00E9es diff\u00E9rentes."}</span></span>
                <span style={{ fontWeight: 600, color: roiTotal >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{roiTotal > 0 ? '+' : ''}{roiTotal}% ({roiAnnualise > 0 ? '+' : ''}{roiAnnualise}%/an)</span>
              </div>
              {fondsInvestis > 0 && (
                <div className="fb-metric">
                  <span className="pnl-tooltip-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>ROE <span style={{ fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</span><span className="pnl-tooltip-text">{"Return On Equity (retour sur fonds propres). C\u2019est votre gain total divis\u00E9 par l\u2019argent que VOUS avez mis de votre poche (apport + frais de notaire). Gr\u00E2ce \u00E0 l\u2019effet de levier du cr\u00E9dit, le ROE est souvent bien sup\u00E9rieur au ROI. Un ROE de 50% signifie que vous avez gagn\u00E9 50\u00A0\u20AC pour 100\u00A0\u20AC sortis de votre poche."}</span></span>
                  <span style={{ fontWeight: 600, color: roeTotal >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{roeTotal > 0 ? '+' : ''}{roeTotal}% ({roeAnnualise > 0 ? '+' : ''}{roeAnnualise}%/an)</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const SCORE_LABELS: Record<number, { label: string, color: string, info: string }> = {
  1: { label: 'Bon \u00E9tat', color: '#1a7a40', info: "Le bien est en bon \u00E9tat g\u00E9n\u00E9ral. Quelques rafra\u00EEchissements l\u00E9gers possibles (peinture, petites r\u00E9parations). Habitable imm\u00E9diatement sans travaux majeurs. Budget : ~200 \u20AC/m\u00B2." },
  2: { label: 'Rafra\u00EEchissement', color: '#1a7a40', info: "Le bien n\u00E9cessite des travaux de rafra\u00EEchissement : peinture, sols, \u00E9lectricit\u00E9 aux normes, petite plomberie. Pas de modification structurelle. Budget : ~500 \u20AC/m\u00B2." },
  3: { label: 'R\u00E9novation moyenne', color: '#f0a830', info: "R\u00E9novation compl\u00E8te d\u2019une ou plusieurs pi\u00E8ces : cuisine, salle de bain, \u00E9lectricit\u00E9 compl\u00E8te, rev\u00EAtements. Pas de gros \u0153uvre. Budget : ~800 \u20AC/m\u00B2." },
  4: { label: 'Travaux lourds', color: '#c0392b', info: "Travaux lourds touchant la structure ou les r\u00E9seaux : reprise de plomberie, \u00E9lectricit\u00E9, cloisons, planchers, isolation, fen\u00EAtres. Peut n\u00E9cessiter un architecte. Budget : ~1 200 \u20AC/m\u00B2." },
  5: { label: 'R\u00E9habilitation compl\u00E8te', color: '#c0392b', info: "R\u00E9habilitation totale du bien : reprise de la structure (charpente, toiture, fa\u00E7ade, murs porteurs), mise aux normes compl\u00E8te, redistribution des espaces. Local commercial ou bien insalubre \u00E0 transformer. Budget : ~1 800 \u20AC/m\u00B2 et plus." },
}

function ScoreLabel({ score }: { score: number | null }) {
  if (!score || !SCORE_LABELS[score]) return null
  const { label, color, info } = SCORE_LABELS[score]
  return (
    <span className="pnl-tooltip-wrap" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontSize: '12px', fontWeight: 600, color, padding: '2px 8px', background: color === '#1a7a40' ? '#d4f5e0' : color === '#f0a830' ? '#fff8f0' : '#fde8e8', borderRadius: '6px' }}>{label}</span>
      <span style={{ cursor: 'help', fontSize: '10px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '13px', height: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{info}</span></span>
    </span>
  )
}

function LotsEditor({ lots, nbLotsEffectif, prixFai, userToken, onSave, onCancel }: { lots: any[], nbLotsEffectif: number, prixFai?: number, userToken: string | null, onSave: (lots: any[]) => Promise<void>, onCancel?: () => void }) {
  const [editLots, setEditLots] = useState(() =>
    Array.from({ length: Math.max(nbLotsEffectif, lots.length, 1) }).map((_, i) => ({
      type: lots[i]?.type || '',
      surface: lots[i]?.surface != null ? String(lots[i].surface) : '',
      loyer: lots[i]?.loyer != null ? String(lots[i].loyer) : '',
      etage: lots[i]?.etage || '',
      dpe: lots[i]?.dpe || '',
      etat: lots[i]?.etat || '',
    }))
  )
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const VISIBLE = 5

  function updateLot(i: number, field: string, value: string) {
    setEditLots(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: value }; return n })
  }
  function addLot() { setEditLots(prev => [...prev, { type: '', surface: '', loyer: '', etage: '', dpe: '', etat: '' }]) }
  function deleteLot(i: number) { setEditLots(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSave() {
    setSaving(true)
    await onSave(editLots.map(l => ({
      type: l.type || undefined,
      surface: l.surface ? Number(l.surface) : undefined,
      loyer: l.loyer ? Number(l.loyer) : undefined,
      etage: l.etage || undefined,
      dpe: l.dpe || undefined,
      etat: l.etat || undefined,
    })))
    setSaving(false)
    onCancel?.()
  }

  const totalSurface = editLots.reduce((s, l) => s + (Number(l.surface) || 0), 0)
  const totalLoyer = editLots.reduce((s, l) => s + (Number(l.loyer) || 0), 0)
  const loues = editLots.filter(l => l.etat === 'loue').length
  const rdtBrut = prixFai && totalLoyer > 0 ? ((totalLoyer * 12) / prixFai * 100).toFixed(1) : null

  const DPE_COLORS: Record<string, string> = { A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0a830', E: '#eb6a2a', F: '#e42a1e', G: '#a00000' }
  const GRID = '44px 90px 90px 100px 56px 60px 100px 28px'

  const inputU: React.CSSProperties = { border: 'none', padding: '5px 2px', minWidth: 0, background: 'transparent', fontFamily: 'inherit', fontSize: '12px', outline: 'none' }
  const sel: React.CSSProperties = { padding: '5px 6px', border: '1px solid #e6dccb', borderRadius: '4px', fontFamily: 'inherit', fontSize: '12px', color: '#1f1b16', background: '#fff', cursor: 'pointer', width: '100%', outline: 'none' }
  const inp: React.CSSProperties = { padding: '5px 8px', border: '1px solid #e6dccb', borderRadius: '4px', fontFamily: 'inherit', fontSize: '12px', color: '#1f1b16', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' }

  const visibleLots = expanded ? editLots : editLots.slice(0, VISIBLE)
  const hiddenLots = editLots.slice(VISIBLE)

  function LotRow({ lot, i }: { lot: any, i: number }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '8px', padding: '9px 12px', alignItems: 'center', borderTop: '1px solid #efe7d7', fontSize: '13px', background: '#fff' }}>
        <span style={{ fontFamily: 'var(--serif, "Fraunces", serif)', fontWeight: 500, color: 'var(--accent, #b4442e)', fontSize: '15px' }}>{i + 1}</span>
        <select value={lot.type} onChange={e => updateLot(i, 'type', e.target.value)} style={sel}>
          <option value="">—</option>
          {['T1','T2','T3','T4','T5','Studio','Commerce','Parking','Cave'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e6dccb', borderRadius: '4px', padding: '0 6px', minWidth: 0 }}>
          <input type="number" placeholder="—" value={lot.surface} onChange={e => updateLot(i, 'surface', e.target.value)} style={{ ...inputU, width: '45px' }} />
          <span style={{ fontSize: '10px', color: '#a39a8c', whiteSpace: 'nowrap' }}>m²</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e6dccb', borderRadius: '4px', padding: '0 6px', minWidth: 0 }}>
          <input type="number" placeholder="—" value={lot.loyer} onChange={e => updateLot(i, 'loyer', e.target.value)} style={{ ...inputU, width: '50px' }} />
          <span style={{ fontSize: '10px', color: '#a39a8c', whiteSpace: 'nowrap' }}>{'\u20AC'}/mois</span>
        </div>
        <input type="text" placeholder="RDC" value={lot.etage} onChange={e => updateLot(i, 'etage', e.target.value)} style={inp} />
        <select value={lot.dpe} onChange={e => updateLot(i, 'dpe', e.target.value)} style={{ ...sel, color: lot.dpe ? (DPE_COLORS[lot.dpe] || '#1f1b16') : '#a39a8c', fontWeight: lot.dpe ? 700 : 400 }}>
          <option value="">—</option>
          {['A','B','C','D','E','F','G'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={lot.etat} onChange={e => updateLot(i, 'etat', e.target.value)} style={{ ...sel, color: lot.etat === 'loue' ? '#1a7a40' : lot.etat === 'vacant' ? '#7a6a60' : '#1f1b16', background: lot.etat === 'loue' ? '#e8f5ef' : lot.etat === 'vacant' ? '#faf8f5' : '#fff' }}>
          <option value="">—</option>
          <option value="loue">{"Occup\u00E9"}</option>
          <option value="vacant">Vacant</option>
          <option value="travaux">Travaux</option>
        </select>
        <button onClick={() => deleteLot(i)} style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', color: '#a39a8c', fontSize: '16px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>{'×'}</button>
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '12px', color: '#7a6a60', marginBottom: '12px' }}>{"Ajoutez ou modifiez les informations de chaque lot de l\u2019immeuble. Les totaux sont mis \u00E0 jour automatiquement."}</p>
      <div style={{ border: '1px solid #efe7d7', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '8px', padding: '10px 12px', background: '#f5ede2', fontSize: '10px', color: '#a39a8c', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, alignItems: 'center' }}>
          <span>Lot</span><span>Type</span><span>Surface</span><span>Loyer</span><span>{"Étage"}</span><span>DPE</span><span>{"État"}</span><span></span>
        </div>
        {/* Rows */}
        {visibleLots.map((lot, i) => <LotRow key={i} lot={lot} i={i} />)}
        {/* Collapsed summary row */}
        {!expanded && hiddenLots.length > 0 && (
          <div onClick={() => setExpanded(true)} style={{ display: 'grid', gridTemplateColumns: GRID, gap: '8px', padding: '9px 12px', alignItems: 'center', borderTop: '1px solid #efe7d7', background: '#f5ede2', cursor: 'pointer', opacity: 0.85 }}>
            <span style={{ fontFamily: 'var(--serif, "Fraunces", serif)', fontWeight: 500, color: 'var(--accent, #b4442e)', fontSize: '13px' }}>{VISIBLE + 1}–{editLots.length}</span>
            <span style={{ color: '#7a6a60', fontSize: '12px' }}>{hiddenLots.length} lots supplémentaires</span>
            <span style={{ color: '#a39a8c', fontSize: '12px' }}>{hiddenLots.reduce((s, l) => s + (Number(l.surface) || 0), 0) > 0 ? `${hiddenLots.reduce((s, l) => s + (Number(l.surface) || 0), 0)} m²` : '—'}</span>
            <span style={{ color: '#a39a8c', fontSize: '12px' }}>{hiddenLots.reduce((s, l) => s + (Number(l.loyer) || 0), 0) > 0 ? `${hiddenLots.reduce((s, l) => s + (Number(l.loyer) || 0), 0).toLocaleString('fr-FR')} €/mois` : '—'}</span>
            <span style={{ color: '#a39a8c', fontSize: '12px' }}>{[...new Set(hiddenLots.map((l: any) => l.etage).filter(Boolean))].slice(0, 2).join('/') || '—'}</span>
            <span style={{ color: '#a39a8c', fontSize: '12px' }}>—</span>
            <span style={{ color: '#7a6a60', fontSize: '11px' }}>{hiddenLots.filter((l: any) => l.etat === 'loue').length} occ. / {hiddenLots.filter((l: any) => l.etat === 'vacant').length} vac.</span>
            <span style={{ color: '#a39a8c', fontSize: '11px' }}>{'›'}</span>
          </div>
        )}
      </div>
      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '14px', border: '1px solid #e6dccb', borderRadius: '8px', background: '#f5ede2', padding: '12px 0' }}>
        {[
          { lbl: 'Total surface', val: totalSurface > 0 ? `${totalSurface} m²` : '—' },
          { lbl: 'Total loyer', val: totalLoyer > 0 ? `${totalLoyer.toLocaleString('fr-FR')} €/mois` : '—' },
          { lbl: 'Occupation', val: `${loues}/${editLots.length}` },
          { lbl: 'Rdt brut', val: rdtBrut ? `${rdtBrut} %` : '—' },
        ].map(({ lbl, val }, k) => (
          <div key={k} style={{ textAlign: 'center', borderRight: k < 3 ? '1px solid #efe7d7' : 'none', padding: '0 10px' }}>
            <span style={{ display: 'block', fontSize: '10px', color: '#a39a8c', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '4px' }}>{lbl}</span>
            <span style={{ fontFamily: 'var(--serif, "Fraunces", serif)', fontSize: '17px', fontWeight: 500, color: '#1f1b16' }}>{val}</span>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
        <button onClick={addLot} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e6dccb', background: 'transparent', fontSize: '12px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', fontFamily: 'inherit' }}>
          <span style={{ fontSize: '14px', marginRight: '2px' }}>+</span> Ajouter un lot
        </button>
        <div style={{ flex: 1 }} />
        {onCancel && <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e6dccb', background: 'transparent', fontSize: '12px', fontWeight: 600, color: '#1f1b16', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>}
        {userToken && <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#1a1210', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>}
      </div>
    </div>
  )
}

function genererMessageContact(bien: any): { message: string, champsManquants: string[] } {
  const manquants: string[] = []
  const typeBien = `${bien.type_bien || 'bien'} ${bien.nb_pieces || ''}`.trim()
  const localisation = bien.quartier ? `${bien.quartier}, ${bien.ville}` : bien.ville
  const prixFmt = Math.round(bien.prix_fai).toLocaleString('fr-FR')
  const isTravaux = bien.strategie_mdb === 'Travaux lourds'

  let msg = `Bonjour,\n\n`

  if (isTravaux) {
    // --- Strat\u00e9gie Travaux lourds ---
    const isMaison = (bien.type_bien || '').toLowerCase().includes('maison')
    const score = bien.score_travaux || 0

    if (!bien.adresse) manquants.push("l'adresse exacte du bien")
    if (!bien.taxe_fonc_ann) manquants.push("la taxe fonci\u00e8re annuelle")

    if (isMaison) {
      manquants.push("la surface du terrain")
      manquants.push("le type d'assainissement (individuel ou collectif)")
    } else {
      if (!bien.charges_copro) manquants.push("les charges de copropri\u00e9t\u00e9")
      manquants.push("les travaux vot\u00e9s ou \u00e0 pr\u00e9voir dans la copropri\u00e9t\u00e9, et si oui le montant chiffr\u00e9")
    }

    if (score >= 4) {
      manquants.push("le d\u00e9tail des travaux \u00e0 r\u00e9aliser (toiture, fa\u00e7ade, \u00e9lectricit\u00e9, plomberie, etc.)")
      manquants.push("si des devis ont d\u00e9j\u00e0 \u00e9t\u00e9 r\u00e9alis\u00e9s")
      manquants.push("l'\u00e9tat de la structure (planchers, murs porteurs, charpente)")
    } else if (score >= 2) {
      manquants.push("la nature des travaux \u00e0 pr\u00e9voir")
      manquants.push("si des devis ont d\u00e9j\u00e0 \u00e9t\u00e9 r\u00e9alis\u00e9s")
    } else {
      manquants.push("les travaux r\u00e9alis\u00e9s r\u00e9cemment ou \u00e0 pr\u00e9voir")
    }

    msg += `Investisseur, je me permets de vous contacter au sujet de votre ${typeBien} \u00e0 ${localisation} affich\u00e9 \u00e0 ${prixFmt} \u20AC.\n\n`
    msg += `J'\u00e9tudie ce bien dans le cadre d'un projet de r\u00e9novation et j'aurais besoin de quelques \u00e9l\u00e9ments pour chiffrer les travaux et finaliser mon analyse.\n\n`
  } else {
    // --- Strat\u00e9gie Locataire en place ---
    if (!bien.loyer) manquants.push("le montant du loyer actuel (hors charges)")
    if (!bien.charges_copro) manquants.push("les charges de copropri\u00e9t\u00e9")
    if (!bien.taxe_fonc_ann) manquants.push("la taxe fonci\u00e8re annuelle")
    if (!bien.charges_rec) manquants.push("les charges r\u00e9cup\u00e9rables")
    if (!bien.fin_bail) manquants.push("la date de fin du bail en cours")
    if (!bien.adresse) manquants.push("l'adresse exacte du bien")
    manquants.push("les travaux vot\u00e9s ou \u00e0 pr\u00e9voir dans la copropri\u00e9t\u00e9, et si oui le montant chiffr\u00e9")

    msg += `Investisseur locatif, je me permets de vous contacter au sujet de votre ${typeBien} \u00e0 ${localisation} affich\u00e9 \u00e0 ${prixFmt} \u20AC.\n\n`
    msg += `J'\u00e9tudie actuellement ce bien dans le cadre d'un projet d'investissement et j'aurais besoin de quelques \u00e9l\u00e9ments pour finaliser mon analyse financi\u00e8re.\n\n`
  }

  if (manquants.length > 0) {
    msg += `Pourriez-vous me transmettre :\n\n`
    manquants.forEach(m => { msg += `- ${m}\n` })
    msg += `\n`
  }

  msg += `Merci par avance pour votre retour.\n\n`
  msg += `Cordialement`

  return { message: msg, champsManquants: manquants }
}

function getReplyUrl(url: string): string {
  if (!url) return ''
  const u = url.toLowerCase()
  // Leboncoin : /reply/ID
  if (u.includes('leboncoin.fr')) {
    const match = url.match(/\/(\d+)\/?$/)
    return match ? `https://www.leboncoin.fr/reply/${match[1]}` : url
  }
  // SeLoger : ajouter #contact-form
  if (u.includes('seloger.com')) return url + (url.includes('#') ? '' : '#contact-form')
  // Bien'ici : ajouter ?contact=true
  if (u.includes('bienici.com')) return url + (url.includes('?') ? '&contact=true' : '?contact=true')
  // PAP : formulaire integre sur la page
  if (u.includes('pap.fr')) return url + '#form-contact'
  // ParuVendu : #formulaire
  if (u.includes('paruvendu.fr')) return url + (url.includes('#') ? '' : '#formulaire')
  // Autres plateformes : formulaire sur la page de l'annonce
  return url
}

function getPlatformName(bien: any): string {
  const mi = typeof bien.moteurimmo_data === 'string' ? JSON.parse(bien.moteurimmo_data) : bien.moteurimmo_data
  const origin = mi?.origin || getPlatformFromUrl(bien.url || '')
  const platform = PLATFORM_LOGOS[origin]
  return platform?.name || origin || 'la plateforme'
}

function ContactVendeur({ bien, userToken, onStatusUpdate }: { bien: any, userToken: string | null, onStatusUpdate: (statut: string, message: string) => void }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { message: messageGenere, champsManquants } = genererMessageContact(bien)
  const [message, setMessage] = useState(bien.message_contact || messageGenere)
  const [statut, setStatut] = useState<string | null>(bien.message_statut || null)

  useEffect(() => {
    if (!bien.message_contact) {
      setMessage(messageGenere)
    }
  }, [bien.loyer, bien.charges_copro, bien.taxe_fonc_ann, bien.charges_rec, bien.adresse])

  useEffect(() => {
    if (window.location.hash === '#contact') {
      setOpen(true)
      setTimeout(() => {
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [])

  async function handleCopyAndOpen() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch { /* fallback */ }

    if (userToken && statut !== 'envoye' && statut !== 'repondu') {
      onStatusUpdate('envoye', message)
      setStatut('envoye')
    }

    if (bien.url) {
      window.open(getReplyUrl(bien.url), '_blank')
    }
  }

  async function handleSaveDraft() {
    if (!userToken) return
    onStatusUpdate('brouillon', message)
    setStatut('brouillon')
  }

  async function handleMarkRepondu() {
    if (!userToken) return
    onStatusUpdate('repondu', message)
    setStatut('repondu')
  }

  const statutColors: Record<string, { bg: string, color: string, label: string }> = {
    brouillon: { bg: '#f0ede8', color: '#7a6a60', label: 'Brouillon' },
    envoye: { bg: '#fff3e0', color: '#e65100', label: 'Envoy\u00e9' },
    repondu: { bg: '#d4f5e0', color: '#1a7a40', label: 'R\u00e9pondu' },
  }

  if (!open) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => setOpen(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px', borderRadius: '10px',
          border: '2px solid #e8e2d8', background: '#fff',
          fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600,
          color: '#1a1210', cursor: 'pointer', transition: 'all 0.15s'
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#c0392b' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e2d8'; e.currentTarget.style.color = '#1a1210' }}>
          Contacter le vendeur
          {champsManquants.length > 0 && <span style={{ background: '#c0392b', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{champsManquants.length}</span>}
        </button>
        {statut && statutColors[statut] && (
          <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: statutColors[statut].bg, color: statutColors[statut].color }}>
            {statutColors[statut].label}
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e8e2d8', borderRadius: '14px', padding: '24px', marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 700, color: '#1a1210', margin: 0 }}>Message au vendeur</h3>
        <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#7a6a60' }}>x</button>
      </div>

      {champsManquants.length > 0 && (
        <div style={{ background: '#fff8f0', border: '1.5px solid #f0d090', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#a06010' }}>
          {champsManquants.length} information{champsManquants.length > 1 ? 's' : ''} manquante{champsManquants.length > 1 ? 's' : ''} {"pour calculer la rentabilit\u00E9 nette"}
        </div>
      )}

      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={12} style={{
        width: '100%', padding: '14px 16px', borderRadius: '10px',
        border: '1.5px solid #e8e2d8', fontFamily: "'DM Sans', sans-serif",
        fontSize: '14px', color: '#1a1210', background: '#faf8f5',
        outline: 'none', resize: 'vertical', lineHeight: '1.6',
        boxSizing: 'border-box'
      }} onFocus={e => e.target.style.borderColor = '#c0392b'}
        onBlur={e => e.target.style.borderColor = '#e8e2d8'} />

      <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
        <button onClick={handleCopyAndOpen} style={{
          padding: '10px 20px', borderRadius: '10px', border: 'none',
          background: '#c0392b', color: '#fff',
          fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', transition: 'background 0.15s'
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#a5311f'}
          onMouseLeave={e => e.currentTarget.style.background = '#c0392b'}>
          {copied ? `Message copié ! Collez-le sur ${getPlatformName(bien)}` : `Copier et contacter sur ${getPlatformName(bien)}`}
        </button>

        {userToken && (
          <>
            <button onClick={handleSaveDraft} style={{
              padding: '10px 20px', borderRadius: '10px',
              border: '1.5px solid #e8e2d8', background: '#fff',
              fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500,
              color: '#7a6a60', cursor: 'pointer'
            }}>
              Sauvegarder brouillon
            </button>
            {statut === 'envoye' && (
              <button onClick={handleMarkRepondu} style={{
                padding: '10px 20px', borderRadius: '10px',
                border: '1.5px solid #d4f5e0', background: '#f0faf4',
                fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500,
                color: '#1a7a40', cursor: 'pointer'
              }}>
                Marquer comme r\u00e9pondu
              </button>
            )}
          </>
        )}

        {statut && statutColors[statut] && (
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: statutColors[statut].bg, color: statutColors[statut].color }}>
            {statutColors[statut].label}
          </span>
        )}
      </div>

      <p style={{ fontSize: '11px', color: '#b0a898', marginTop: '10px' }}>
        {`Le bouton copie le message et ouvre directement l\u2019annonce sur ${getPlatformName(bien)}. Il ne reste plus qu\u2019\u00e0 coller le message et envoyer.`}
      </p>
      {!userToken && <p style={{ fontSize: '12px', color: '#b0a898', marginTop: '6px', fontStyle: 'italic' }}>Connectez-vous pour sauvegarder le message et suivre son statut</p>}
    </div>
  )
}

function EstimationSection({ bienId, prixFai, surface, adresseInitiale, villeInitiale, userToken, onEstimationLoaded, isFree = false, extra, estimationApiBase, labelPrix, estimationInitiale, estimationDateInitiale }: { bienId: string, prixFai: number, surface?: number, adresseInitiale?: string, villeInitiale?: string, userToken?: string | null, onEstimationLoaded?: (est: any) => void, isFree?: boolean, extra?: React.ReactNode, estimationApiBase?: string, labelPrix?: React.ReactNode, estimationInitiale?: any, estimationDateInitiale?: string }) {
  const isCacheValid = estimationInitiale && estimationDateInitiale && (Date.now() - new Date(estimationDateInitiale).getTime()) / 86400000 < 30
  const [estimation, setEstimation] = useState<any>(isCacheValid ? estimationInitiale : null)
  const [estimationDate, setEstimationDate] = useState<string | null>(isCacheValid ? estimationDateInitiale! : null)
  const [loading, setLoading] = useState(!isCacheValid)
  const [error, setError] = useState('')
  const [adresse, setAdresse] = useState(adresseInitiale || '')
  const [adresseEdit, setAdresseEdit] = useState(false)
  const [adresseSaving, setAdresseSaving] = useState(false)
  const [prixAjuste, setPrixAjuste] = useState<number | null>(null)

  const loadEstimation = async (force = false) => {
    setLoading(true)
    setError('')
    try {
      const base = estimationApiBase || '/api/estimation'
      const res = await fetch(`${base}/${bienId}${force ? '?force=true' : ''}`)
      const data = await res.json()
      if (data.estimation) {
        setEstimation(data.estimation)
        setEstimationDate(new Date().toISOString())
        onEstimationLoaded?.(data.estimation)
      }
      else if (data.error) setError(data.error)
    } catch { setError('Erreur de connexion') }
    setLoading(false)
  }

  const saveAdresseAndRecalculate = async () => {
    setAdresseSaving(true)
    try {
      // Sauvegarder l'adresse en DB
      await fetch(`/api/biens/${bienId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}) },
        body: JSON.stringify({ adresse, latitude: null, longitude: null })
      })
      setAdresseEdit(false)
      // Relancer l'estimation avec force pour re-geocoder
      await loadEstimation(true)
    } catch { setError('Erreur lors de la sauvegarde') }
    setAdresseSaving(false)
  }

  useEffect(() => {
    if (isCacheValid) {
      onEstimationLoaded?.(estimationInitiale)
    } else {
      loadEstimation()
    }
  }, [bienId])

  function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }
  const V = ({ children }: { children: React.ReactNode }) => isFree ? <span className="val-blur">{children}</span> : <>{children}</>

  const confianceColors: Record<string, { bg: string, color: string }> = {
    A: { bg: '#d4f5e0', color: '#1a7a40' },
    B: { bg: '#d4ddf5', color: '#2a4a8a' },
    C: { bg: '#fff8f0', color: '#a06010' },
    D: { bg: '#fde8e8', color: '#c0392b' },
  }

  if (loading) {
    return (
      <div className="section">
        <h2 className="section-title">{"Estimation Prix de Revente"}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#7a6a60', fontSize: '13px' }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid #e8e2d8', borderTop: '2px solid #c0392b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          {"Analyse des transactions en cours..."}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !estimation) {
    return (
      <div className="section">
        <h2 className="section-title">{"Estimation Prix de Revente"}</h2>
        <div className="nc-warning">{error || "Estimation impossible — données insuffisantes ou pas de transactions comparables"}</div>
      </div>
    )
  }

  const prixActuel = prixAjuste ?? estimation.prix_total
  const prixM2Actuel = surface ? Math.round(prixActuel / surface) : estimation.prix_m2_corrige
  const ecart = prixFai ? Math.round((prixFai - prixActuel) / prixActuel * 100 * 10) / 10 : 0
  const ecartPositif = ecart > 0
  const conf = confianceColors[estimation.confiance] || confianceColors.D
  const prixFaiPos = prixFai ? Math.max(0, Math.min(100, (prixFai - estimation.prix_bas) / (estimation.prix_haut - estimation.prix_bas) * 100)) : 50
  const prixInitialPos = Math.max(0, Math.min(100, (estimation.prix_total - estimation.prix_bas) / (estimation.prix_haut - estimation.prix_bas) * 100))
  const prixAjustePos = Math.max(0, Math.min(100, (prixActuel - estimation.prix_bas) / (estimation.prix_haut - estimation.prix_bas) * 100))
  const isAjuste = prixAjuste !== null && prixAjuste !== estimation.prix_total

  const handleSliderChange = (val: number) => {
    const prix = Math.round(val)
    setPrixAjuste(prix)
    // Propager l'estimation ajustee au PnlColonne
    onEstimationLoaded?.({ ...estimation, prix_total: prix, prix_m2_corrige: surface ? Math.round(prix / surface) : estimation.prix_m2_corrige })
  }

  const resetEstimation = () => {
    setPrixAjuste(null)
    onEstimationLoaded?.(estimation)
  }

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>{"Estimation Prix de Revente"}</h2>
        {estimationDate && (
          <span style={{ fontSize: '11px', color: '#b0a898' }}>
            {`Estimé le ${new Date(estimationDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
          </span>
        )}
      </div>
      {isFree && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff8f0', border: '1.5px solid #f0d090', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#1a1210', fontWeight: 600 }}>
            {"D\u00E9bloquez l\u2019estimation prix de revente"}
          </span>
          <a href="/mon-profil" style={{
            display: 'inline-block', padding: '7px 18px', borderRadius: 8,
            background: '#c0392b', color: '#fff', fontWeight: 600, fontSize: 12,
            textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap'
          }}>
            {"D\u00E9bloquer \u2192"}
          </a>
        </div>
      )}

      {/* --- Adresse pour affiner le géocodage --- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '10px 16px', background: '#faf8f5', borderRadius: '8px', fontSize: '13px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a6a60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        {adresseEdit ? (
          <>
            <input
              type="text"
              value={adresse}
              onChange={e => setAdresse(e.target.value)}
              placeholder={"12 rue de la Paix"}
              style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
              autoFocus
            />
            <button
              onClick={saveAdresseAndRecalculate}
              disabled={adresseSaving}
              style={{ padding: '6px 12px', borderRadius: '6px', background: '#1a1210', color: '#fff', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {adresseSaving ? 'Recalcul...' : 'Recalculer'}
            </button>
            <button
              onClick={() => { setAdresseEdit(false); setAdresse(adresseInitiale || '') }}
              style={{ padding: '6px 10px', borderRadius: '6px', background: 'none', border: '1px solid #e8e2d8', fontSize: '12px', color: '#7a6a60', cursor: 'pointer' }}
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            <span style={{ color: adresse ? '#1a1210' : '#b0a898', fontStyle: adresse ? 'normal' : 'italic', flex: 1 }}>
              {adresse ? `${adresse}${villeInitiale ? `, ${villeInitiale}` : ''}` : 'Adresse non renseign\u00E9e \u2014 cliquez pour affiner l\u2019estimation'}
            </span>
            <button
              onClick={() => setAdresseEdit(true)}
              style={{ padding: '4px 10px', borderRadius: '6px', background: 'none', border: '1px solid #e8e2d8', fontSize: '11px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Modifier
            </button>
          </>
        )}
      </div>

      {/* --- Bloc principal : 3 colonnes --- */}
      <div className="estimation-price-grid" style={{ marginBottom: '24px' }}>

        {/* Colonne gauche : Prix FAI */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{labelPrix || <>{"\u0050rix demand\u00E9"}<br />{"(FAI)"}</>}</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 800, color: '#1a1210', whiteSpace: 'nowrap' }}>{fmt(prixFai)}{'\u00A0\u20AC'}</div>
          {surface ? <div style={{ fontSize: '12px', color: '#7a6a60', marginTop: '4px', whiteSpace: 'nowrap' }}>{fmt(Math.round(prixFai / surface))}{'\u00A0\u20AC'}/m{'\u00B2'}</div> : null}
        </div>

        {/* Colonne centrale : Ecart */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1.5px solid #f0ede8', borderRight: '1.5px solid #f0ede8' }}>
          <div style={{
            padding: '10px 20px', borderRadius: '12px',
            background: ecartPositif ? '#fde8e8' : '#d4f5e0',
          }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 800, color: ecartPositif ? '#c0392b' : '#1a7a40', textAlign: 'center' }}>
              <V>{ecart > 0 ? '+' : ''}{ecart}%</V>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#7a6a60', marginTop: '6px', textAlign: 'center' }}>
            {ecartPositif ? 'Au-dessus du marché' : 'En dessous du marché'}
          </div>
        </div>

        {/* Colonne droite : Estimation */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            {isAjuste ? "Mon estimation" : "Prix de revente estim\u00E9"}
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 800, color: ecartPositif ? '#1a7a40' : '#1a1210', whiteSpace: 'nowrap' }}><V>{fmt(prixActuel)}{'\u00A0\u20AC'}</V></div>
          <div style={{ fontSize: '12px', color: '#7a6a60', marginTop: '4px', whiteSpace: 'nowrap' }}><V>{fmt(prixM2Actuel)}{'\u00A0\u20AC'}/m{'\u00B2'}</V></div>
          {isAjuste && !isFree && (
            <div style={{ fontSize: '11px', color: '#b0a898', marginTop: '4px' }}>
              DVF : {fmt(estimation.prix_total)} {'\u20AC'}
              <span onClick={resetEstimation} style={{ marginLeft: '6px', color: '#c0392b', cursor: 'pointer', textDecoration: 'underline' }}>{"R\u00E9initialiser"}</span>
            </div>
          )}
        </div>
      </div>

      {/* --- Fourchette de prix + curseur integre --- */}
      <div style={{ background: '#faf8f5', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60' }}>Fourchette</span>
          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: conf.bg, color: conf.color }}>
            Confiance {estimation.confiance} (<V>{"±"}{estimation.marge_pct}%</V>)
          </span>
        </div>
        <div style={{ position: 'relative', height: '10px', marginBottom: '4px' }}>
          {/* Barre degradee */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', borderRadius: '5px', background: 'linear-gradient(90deg, #d4f5e0, #fff8f0, #fde8e8)' }} />
          {/* Marqueur estimation DVF initiale (trait fin) */}
          <div title={`Estimation DVF : ${fmt(estimation.prix_total)} \u20AC`} style={{
            position: 'absolute', top: '-3px', left: `${prixInitialPos}%`, transform: 'translateX(-50%)',
            width: '3px', height: '16px', borderRadius: '2px', background: '#1a1210',
            opacity: isAjuste ? 0.4 : 1, zIndex: 1
          }} />
          {/* Marqueur prix FAI (rond + label) */}
          <div style={{ position: 'absolute', top: '-5px', left: `${prixFaiPos}%`, transform: 'translateX(-50%)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div title={`Prix FAI : ${fmt(prixFai)} \u20AC`} style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: ecartPositif ? '#c0392b' : '#1a7a40',
              border: '3px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: ecartPositif ? '#c0392b' : '#1a7a40', marginTop: '4px', whiteSpace: 'nowrap' }}>{fmt(prixFai)} {'\u20AC'}</span>
          </div>
          {/* Slider transparent superpose sur la barre */}
          {!isFree && <input
            type="range"
            min={estimation.prix_bas}
            max={estimation.prix_haut}
            step={500}
            value={prixActuel}
            onChange={e => handleSliderChange(Number(e.target.value))}
            style={{
              position: 'absolute', top: '-4px', left: 0, width: '100%', height: '18px',
              WebkitAppearance: 'none', appearance: 'none', background: 'transparent',
              cursor: 'pointer', zIndex: 4, margin: 0, padding: 0
            }}
          />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#b0a898', marginTop: '8px' }}>
          <span><V>{fmt(estimation.prix_bas)} {'\u20AC'}</V></span>
          <span style={{ color: '#7a6a60', fontWeight: 500 }}><V>{fmt(estimation.prix_total)} {'\u20AC'}</V></span>
          <span><V>{fmt(estimation.prix_haut)} {'\u20AC'}</V></span>
        </div>
      </div>
      <style>{`
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #1a1210; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.25); cursor: grab; }
        input[type="range"]::-webkit-slider-thumb:active { cursor: grabbing; }
        input[type="range"]::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #1a1210; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.25); cursor: grab; }
      `}</style>

      {/* --- Correcteurs + meta --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        {estimation.corrections && estimation.corrections.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{"Correcteurs appliqués"}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {estimation.corrections.map((c: any, i: number) => (
                <span key={i} style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                  background: c.multiplicateur >= 1 ? '#d4f5e0' : '#fde8e8',
                  color: c.multiplicateur >= 1 ? '#1a7a40' : '#c0392b'
                }} title={c.raison}>
                  {c.facteur} <V>{c.multiplicateur >= 1 ? '+' : ''}{Math.round((c.multiplicateur - 1) * 100)}%</V>
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontSize: '11px', color: '#b0a898', textAlign: 'right', marginLeft: 'auto' }}>
          <div><V>{estimation.nb_comparables}</V> transactions comparables</div>
          <div>Rayon : <V>{estimation.rayon_m}m</V></div>
          <div style={{ marginTop: '4px', fontStyle: 'italic' }}>{"Source : DVF (donn\u00E9es notariales)"}</div>
          <div style={{ marginTop: '2px', fontStyle: 'italic' }}>{"Estimation sur la base d\u2019un bien en bon \u00E9tat g\u00E9n\u00E9ral, sans travaux"}</div>
          <button
            onClick={() => loadEstimation(true)}
            disabled={loading}
            style={{ marginTop: '8px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: '#7a6a60', background: '#f5f2ed', border: '1px solid #e8e2d8', borderRadius: '6px', cursor: 'pointer' }}
          >
            {loading ? 'Recalcul...' : 'Recalculer'}
          </button>
        </div>
      </div>
      {extra}
    </div>
  )
}

export default function BienFicheClient({ initialBien, id, isEnchere }: { initialBien: any, id: string, isEnchere: boolean }) {
  const apiBase = isEnchere ? '/api/encheres' : '/api/biens'
  const estimationBase = isEnchere ? '/api/estimation/encheres' : '/api/estimation'
  const [bien, setBien] = useState<any>(initialBien)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [profil, setProfil] = useState<any>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<string>('free')
  const [freeAnalysesLeft, setFreeAnalysesLeft] = useState<number>(0)
  const [freeAnalysesUsed, setFreeAnalysesUsed] = useState<number>(0)
  const [champsStatut, setChampsStatut] = useState<Record<string, { valeur: string, statut: 'jaune' | 'vert' }>>({})
  const [dirtyChamps, setDirtyChamps] = useState<Record<string, boolean>>({})
  const [originalVals, setOriginalVals] = useState<Record<string, any>>({})
  const [scorePerso, setScorePerso] = useState<number | null>(null)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [showDetailTravaux, setShowDetailTravaux] = useState(false)
  // IDR states
  const [activeNav, setActiveNav] = useState('apercu')
  const [showLotsDetail, setShowLotsDetail] = useState(false)
  const [showLotsLocatif, setShowLotsLocatif] = useState(false)
  const [showCoutsCopro, setShowCoutsCopro] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showCompleterModal, setShowCompleterModal] = useState(false)
  const [modalFieldVals, setModalFieldVals] = useState<Record<string, any>>({})
  const [showAvocatModal, setShowAvocatModal] = useState(false)
  const [avocatEmailInput, setAvocatEmailInput] = useState('')
  const [avocatEmailSaving, setAvocatEmailSaving] = useState(false)
  const [avocatEmailSaved, setAvocatEmailSaved] = useState<string | null>(null)
  const [showFraisModal, setShowFraisModal] = useState(false)
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [showReventeLots, setShowReventeLots] = useState(false)
  const [coutGeometreParLot, setCoutGeometreParLot] = useState(1500)
  const [coutReglementCoproParLot, setCoutReglementCoproParLot] = useState(2500)
  const [coutCompteursParLot, setCoutCompteursParLot] = useState(1500)
  const [coutTravauxGlobal, setCoutTravauxGlobal] = useState(0)
  const [prixReventeLots, setPrixReventeLots] = useState<Record<number, number>>({})
  const POSTES_TRAVAUX: { id: string, label: string, prixM2: number, mode: 'surface' | 'forfait', qteDefaut: number, type: 'entretien' | 'amelioration' | 'construction' }[] = [
    // Entretien (deductible nu reel)
    { id: 'peinture', label: 'Peinture', prixM2: 20, mode: 'surface', qteDefaut: 0, type: 'entretien' },
    { id: 'sols', label: 'Sols (parquet, carrelage)', prixM2: 40, mode: 'surface', qteDefaut: 0, type: 'entretien' },
    { id: 'electricite', label: '\u00C9lectricit\u00E9', prixM2: 50, mode: 'surface', qteDefaut: 0, type: 'entretien' },
    { id: 'plomberie', label: 'Plomberie', prixM2: 40, mode: 'surface', qteDefaut: 0, type: 'entretien' },
    // Amelioration (deductible nu reel + amortissable BIC/SCI)
    { id: 'cuisine', label: 'Cuisine', prixM2: 5000, mode: 'forfait', qteDefaut: 1, type: 'amelioration' },
    { id: 'sdb', label: 'Salle de bain', prixM2: 4000, mode: 'forfait', qteDefaut: bien?.nb_sdb || 1, type: 'amelioration' },
    { id: 'isolation', label: 'Isolation / DPE', prixM2: 60, mode: 'surface', qteDefaut: 0, type: 'amelioration' },
    { id: 'fenetres', label: 'Fen\u00EAtres', prixM2: 800, mode: 'forfait', qteDefaut: 0, type: 'amelioration' },
    { id: 'jardin', label: 'Jardin / ext\u00E9rieur', prixM2: 30, mode: 'surface', qteDefaut: 0, type: 'amelioration' },
    // Construction (non deductible nu reel, amortissable BIC/SCI)
    { id: 'cloisonnement', label: 'Cloisonnement / redistribution', prixM2: 60, mode: 'surface', qteDefaut: 0, type: 'construction' },
    { id: 'toiture', label: 'Toiture', prixM2: 120, mode: 'surface', qteDefaut: 0, type: 'construction' },
    { id: 'facade', label: 'Fa\u00E7ade / ravalement', prixM2: 50, mode: 'surface', qteDefaut: 0, type: 'construction' },
    { id: 'charpente', label: 'Charpente / structure', prixM2: 150, mode: 'surface', qteDefaut: 0, type: 'construction' },
  ]
  // detailTravaux stocke { posteId: { surface ou qte, prixUnitaire } }
  const [detailTravaux, setDetailTravaux] = useState<Record<string, { qte: number, prix: number }>>({})
  const budgetDetailTotal = POSTES_TRAVAUX.reduce((sum, p) => {
    const d = detailTravaux[p.id]
    if (!d || d.qte === 0) return sum
    return sum + d.qte * d.prix
  }, 0)
  const hasDetail = Object.values(detailTravaux).some(v => v && v.qte > 0)

  const [baseCalc, setBaseCalc] = useState<'fai' | 'cible'>('fai')
  const [modeCible, setModeCible] = useState<'cashflow' | 'pv'>('pv')
  const [apport, setApport] = useState<number | ''>(0)
  const [taux, setTaux] = useState<number | ''>(3.5)
  const [tauxAssurance, setTauxAssurance] = useState<number | ''>(0.3)
  const [dureeAmort, setDureeAmort] = useState(20)
  const [dureeInFine, setDureeInFine] = useState(2)
  const [typeCredit, setTypeCredit] = useState<'amortissable' | 'in_fine'>('amortissable')
  const duree = typeCredit === 'in_fine' ? dureeInFine : dureeAmort
  const setDuree = typeCredit === 'in_fine' ? setDureeInFine : setDureeAmort
  const [fraisNotaire, setFraisNotaire] = useState(7.5)
  const [fraisNotaireBase, setFraisNotaireBase] = useState(7.5) // valeur profil hors MdB
  const [tmi, setTmi] = useState(30)
  const [regime, setRegime] = useState('nu_micro_foncier')
  const [objectifCashflow, setObjectifCashflow] = useState(0)
  const [objectifPV, setObjectifPV] = useState(20)
  const [enchereManuelMax, setEnchereManuelMax] = useState<number | null>(null)
  const [enchereManuelDraft, setEnchereManuelDraft] = useState('')
  const [enchereBaseCalc, setEnchereBaseCalc] = useState<'calcule' | 'libre'>('calcule')
  const [enchereFinMode, setEnchereFinMode] = useState<'mise_a_prix' | 'calcule' | 'libre'>('calcule')
  const [regime2, setRegime2] = useState('nu_reel_foncier')
  const [budgetTravauxM2, setBudgetTravauxM2] = useState<Record<string, number>>({ '1': 200, '2': 500, '3': 800, '4': 1200, '5': 1800 })
  const [estimationData, setEstimationData] = useState<any>(null)
  const [dureeRevente, setDureeRevente] = useState<number>(1)
  const [fraisAgenceRevente, setFraisAgenceRevente] = useState<number | ''>(5) // 5% par defaut = frais agence inclus dans le FAI
  const [honorairesAvocat, setHonorairesAvocat] = useState<number | ''>(1500)
  const [adresseRowEditing, setAdresseRowEditing] = useState(false)
  const [adresseRowDraft, setAdresseRowDraft] = useState('')

  useEffect(() => {
    async function load() {
      try {
      const sessionRes = await supabase.auth.getSession()
      const session = sessionRes.data.session
      const authHeaders: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
      // Bien déjà fourni par SSR (initialBien) — on charge seulement les edits
      const editsRes = await fetch(`/api/biens/${id}/edits`, { headers: authHeaders }).catch(() => ({ ok: true, json: async () => ({ champs: {} }) }))
      const editsData = typeof editsRes === 'object' && 'json' in editsRes ? await (editsRes as any).json() : { champs: {} }
      setChampsStatut(editsData.champs || {})
      if (session) {
        setUserToken(session.access_token)
        const profilRes = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const profilData = await profilRes.json()
        if (profilData.profile) {
          const p = profilData.profile
          setProfil(p)
          if (p.plan) {
            setUserPlan(p.plan)
            // 2 analyses completes offertes aux Free
            if (p.plan === 'free') {
              const KEY = 'mdb_free_analyses'
              const MAX = 2
              try {
                const viewed: string[] = JSON.parse(localStorage.getItem(KEY) || '[]')
                if (!viewed.includes(id) && viewed.length < MAX) {
                  viewed.push(id)
                  localStorage.setItem(KEY, JSON.stringify(viewed))
                }
                setFreeAnalysesLeft(viewed.includes(id) ? 1 : 0)
                setFreeAnalysesUsed(viewed.length)
              } catch { setFreeAnalysesLeft(0); setFreeAnalysesUsed(0) }
            }
          }
          if (p.apport != null) setApport(p.apport)
          if (p.taux_credit != null) setTaux(p.taux_credit)
          if (p.taux_assurance != null) setTauxAssurance(p.taux_assurance)
          if (p.duree_ans != null) setDuree(p.duree_ans)
          if (p.tmi != null) setTmi(p.tmi)
          const baseNotaire = p.frais_notaire ?? 7.5
          setFraisNotaireBase(baseNotaire)
          if (p.regime && [...REGIMES, ...REGIMES_IDR].some(r => r.value === p.regime)) {
            setRegime(p.regime)
            // MdB = frais notaire reduits 2.5%, sinon valeur profil
            setFraisNotaire(p.regime === 'marchand_de_biens' ? 2.5 : baseNotaire)
            // Regime2 depuis le profil, sinon premier regime different
            if (p.regime2 && [...REGIMES, ...REGIMES_IDR].some(r => r.value === p.regime2) && p.regime2 !== p.regime) {
              setRegime2(p.regime2)
            } else {
              const suggere = ['lmnp_reel_bic', 'nu_reel_foncier', 'sci_is', 'marchand_de_biens', 'lmnp_micro_bic']
              const alt = suggere.find(r => r !== p.regime)
              if (alt) setRegime2(alt)
            }
          } else {
            setFraisNotaire(baseNotaire)
          }
          if (p.objectif_cashflow != null) setObjectifCashflow(p.objectif_cashflow)
          if (p.objectif_pv != null) setObjectifPV(p.objectif_pv)
          if (p.budget_travaux_m2) setBudgetTravauxM2(p.budget_travaux_m2)
        }
        // Charger le score perso depuis la watchlist
        const wRes = await fetch('/api/watchlist', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const wData = await wRes.json()
        const wItem = (wData.watchlist || []).find((w: any) => String(w.bien_id) === String(id))
        if (wItem) setInWatchlist(true)
        if (wItem?.score_travaux_perso) setScorePerso(wItem.score_travaux_perso)
      }
      setLoading(false)
      } catch (err) { setFetchError(true); setLoading(false) }
    }
    load()
  }, [id])

  function scrollToNav(sectionId: string) {
    setActiveNav(sectionId)
    const nav = document.querySelector('.sticky-nav-wrap')
    if (nav) window.scrollTo({ top: (nav as HTMLElement).getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
  }



  async function handleScorePerso(score: number) {
    if (!userToken) return
    const newScore = score === scorePerso ? null : score
    setScorePerso(newScore)
    await fetch('/api/watchlist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ bien_id: id, score_travaux_perso: newScore })
    })
  }

  async function handleUpdate(champ: string, valeur: any) {
    if (!userToken) return
    const res = await fetch(`${apiBase}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ [champ]: valeur })
    })
    if (res.ok) {
      const data = await res.json()
      const updated = data.bien || data.enchere
      if (isEnchere && updated) updated.prix_fai = updated.mise_a_prix || updated.prix_fai
      setBien((prev: any) => ({ ...prev, ...updated }))
      try {
        const editsRes = await fetch(`/api/biens/${id}/edits`)
        const editsData = await editsRes.json()
        setChampsStatut(editsData.champs || {})
      } catch {}
    }
  }

  async function toggleWatchlist() {
    if (!userToken) return
    const sourceTable = isEnchere ? 'encheres' : 'biens'
    if (inWatchlist) {
      await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ bien_id: id, source_table: sourceTable })
      })
      setInWatchlist(false)
    } else {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ bien_id: id, source_table: sourceTable })
      })
      if (res.ok || res.status === 409) setInWatchlist(true)
    }
  }

  async function handleContactUpdate(statut: string, message: string) {
    if (!userToken) return
    await fetch(`/api/biens/${id}/contact`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ message_contact: message, message_statut: statut })
    })
    setBien((prev: any) => ({ ...prev, message_contact: message, message_statut: statut, message_date: new Date().toISOString() }))
  }

  if (loading) return (
    <Layout>
      <style>{`
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .sk { background: linear-gradient(90deg, #ede8e0 25%, #f7f4f0 50%, #ede8e0 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
      `}</style>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 48px' }}>
        {/* Photo skeleton */}
        <div className="sk" style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Title */}
            <div className="sk" style={{ width: '60%', height: '28px' }} />
            {/* Subtitle */}
            <div className="sk" style={{ width: '40%', height: '16px' }} />
            {/* Tags */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="sk" style={{ width: '120px', height: '24px', borderRadius: '20px' }} />
              <div className="sk" style={{ width: '100px', height: '24px', borderRadius: '20px' }} />
            </div>
            {/* Prix */}
            <div className="sk" style={{ width: '180px', height: '36px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Data grid skeleton */}
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="sk" style={{ width: '35%', height: '16px' }} />
                <div className="sk" style={{ width: '25%', height: '16px' }} />
              </div>
            ))}
          </div>
        </div>
        {/* Estimation skeleton */}
        <div className="sk" style={{ width: '100%', height: '120px', borderRadius: '12px', marginTop: '32px' }} />
        {/* Fiscal skeleton */}
        <div className="sk" style={{ width: '100%', height: '200px', borderRadius: '12px', marginTop: '24px' }} />
      </div>
    </Layout>
  )
  if (fetchError) return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>{'\u26A0'}</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{"Impossible de charger ce bien"}</h2>
        <p style={{ color: '#7a6a60', marginBottom: '24px' }}>{"V\u00E9rifiez votre connexion ou r\u00E9essayez dans quelques instants."}</p>
        <button onClick={() => { setFetchError(false); setLoading(true); window.location.reload() }} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{"R\u00E9essayer"}</button>
      </div>
    </Layout>
  )
  if (!bien) return <Layout><p style={{ textAlign: 'center', padding: '80px', color: '#7a6a60' }}>Bien introuvable</p></Layout>

  const peutCalculer = isEnchere ? !!bien.prix_fai : (bien.loyer && bien.prix_fai)
  const isTravauxLourds = bien.strategie_mdb === 'Travaux lourds'
  const isIDR = bien.strategie_mdb === 'Immeuble de rapport' || (isEnchere && (bien.nb_lots || 0) > 1)
  const lotsData = bien.lots_data as { lots?: { type?: string; surface?: number; loyer?: number; type_loyer?: string; etat?: string; dpe?: string; etage?: string }[] } | null
  const lots = lotsData?.lots || []
  const nbLotsEffectif = bien.nb_lots || lots.length

  const resultatFAI = peutCalculer ? calculerCashflow(
    { prix_fai: bien.prix_fai, loyer: bien.loyer, type_loyer: bien.type_loyer, charges_rec: bien.charges_rec || 0, charges_copro: bien.charges_copro || 0, taxe_fonc_ann: bien.taxe_fonc_ann || 0, surface: bien.surface },
    { apport: (apport || 0) as number, tauxCredit: (taux || 0) as number, tauxAssurance: (tauxAssurance || 0) as number, dureeAns: duree, fraisNotaire, objectifCashflow },
    { tmi, regime: regime as any }
  ) : null

  // Prix cible PV (achat-revente)
  const scoreUtilCalc = scorePerso || bien.score_travaux
  const budgetTravCalc = scoreUtilCalc && bien.surface ? (budgetTravauxM2[String(scoreUtilCalc)] || 0) * bien.surface : 0
  const estimPrix = estimationData?.prix_total || 0
  // Prix cible PV : resoudre pour que pvBrute = objectifPV% × cout total
  // pvBrute = estimPrix (DVF net vendeur) - prixCible × (1 + fraisNotaire%) - travaux
  // objectif = pvBrute / (prixCible × (1 + fraisNotaire%))
  // => prixCible = (estimPrix - budgetTrav) / ((1 + fraisNotaire/100) × (1 + objectifPV/100))
  const prixCiblePV = estimPrix > 0 ? Math.round((estimPrix - budgetTravCalc) / ((1 + fraisNotaire / 100) * (1 + objectifPV / 100))) : null

  // Enchère max calculé (obj. PV) — utilisé comme prixBase quand mode "calculé"
  const enchMaxCalc = (() => {
    if (!isEnchere || !estimPrix) return null
    const obj = (objectifPV || 20) / 100
    const isMDB = regime === 'marchand_de_biens'
    const fp = bien.frais_preemption || 0
    const K = estimPrix / (1 + obj) - budgetTravCalc
    let p = K / 1.1
    for (let i = 0; i < 5; i++) {
      p = K - calculerFraisEnchere(Math.max(1, p), fp, { isMDB }).total
    }
    return Math.round(p)
  })()

  // Prix cible cashflow (locatif)
  const prixCibleCashflow = resultatFAI?.prix_cible || null

  // Prix cible selon le mode choisi
  const prixCibleChoisi = isTravauxLourds
    ? prixCiblePV
    : modeCible === 'cashflow' && prixCibleCashflow ? prixCibleCashflow : prixCiblePV
  const prixCibleCombine = prixCibleChoisi || prixCiblePV || prixCibleCashflow || null
  const hasCibleContraignant = prixCibleCombine && prixCibleCombine < bien?.prix_fai

  const isFreeBlocked = userPlan === 'free' && freeAnalysesLeft <= 0

  // Completion widget
  const COMPLETABLE = (() => {
    const isIDRs = isIDR
    const base = [
      { champ: 'adresse', label: 'adresse' },
      { champ: 'annee_construction', label: 'année de construction' },
      { champ: 'ges', label: 'GES' },
      { champ: 'charges_copro', label: 'charges copro' },
      { champ: 'taxe_fonc_ann', label: 'taxe foncière' },
    ]
    const nonIDR = [
      { champ: 'nb_sdb', label: 'salles de bain' },
      { champ: 'type_chauffage', label: 'type de chauffage' },
    ]
    const locatif = [
      { champ: 'loyer', label: 'loyer' },
      { champ: 'fin_bail', label: 'fin de bail' },
      { champ: 'profil_locataire', label: 'profil locataire' },
    ]
    const idrFields = [
      { champ: 'loyer', label: 'loyer' },
      { champ: 'nb_lots', label: 'nb lots' },
      { champ: 'monopropriete', label: 'monopropriété' },
      { champ: 'compteurs_individuels', label: 'compteurs individuels' },
    ]
    return [
      ...base,
      ...((bien.type_bien || '').toLowerCase().includes('maison') ? [{ champ: 'surface_terrain', label: 'surface terrain' }] : []),
      ...(!isIDRs ? nonIDR : []),
      ...(!isIDRs ? locatif : idrFields),
    ]
  })()
  const completableRemplis = COMPLETABLE.filter(f => { const v = (bien as any)[f.champ]; return v != null && v !== '' && v !== 'NC' && v !== 0 }).length
  const pctComplete = Math.round(completableRemplis / COMPLETABLE.length * 100)
  const completableManquants = COMPLETABLE.filter(f => { const v = (bien as any)[f.champ]; return !v || v === 'NC' })

  function getModalVal(champ: string) {
    return modalFieldVals[champ] !== undefined ? modalFieldVals[champ] : ((bien as any)[champ] ?? '')
  }
  function getModalFieldClass(champ: string): string {
    if (modalFieldVals[champ] !== undefined && modalFieldVals[champ] !== '') return 'mf-draft'
    const statut = champsStatut?.[champ]?.statut
    if (statut === 'vert') return 'mf-vert'
    if (statut === 'jaune') return 'mf-jaune'
    const v = (bien as any)[champ]
    if (v != null && v !== '' && v !== 0 && v !== 'NC') return 'mf-filled'
    return 'mf-nc'
  }
  function setModalDraft(champ: string, val: any) {
    setModalFieldVals(p => ({ ...p, [champ]: val }))
    setBien((prev: any) => ({ ...prev, [champ]: val === '' ? null : val }))
  }
  function saveModalField(champ: string) {
    const val = modalFieldVals[champ]
    if (val === undefined || val === '' || val === null) return
    handleUpdate(champ, val)
    setModalFieldVals(prev => { const n = { ...prev }; delete n[champ]; return n })
  }

  // Valeurs numeriques (coerce '' -> 0 pour les calculs)
  const apportNum = apport || 0
  const tauxNum = taux || 0
  const tauxAssuranceNum = tauxAssurance || 0
  const fraisAgenceNum = fraisAgenceRevente || 0
  const prixBase = isEnchere
    ? (enchereFinMode === 'libre' ? (enchereManuelMax || enchMaxCalc || bien.prix_fai)
      : enchereFinMode === 'mise_a_prix' ? bien.prix_fai
      : (enchMaxCalc || bien.prix_fai))
    : (baseCalc === 'fai' ? bien.prix_fai : (prixCibleCombine || bien.prix_fai))
  const montantProjet = prixBase * (1 + fraisNotaire / 100) + budgetTravCalc
  const montantEmprunte = Math.max(0, montantProjet - apportNum)
  const apportPct = montantProjet > 0 ? Math.round(apportNum / montantProjet * 1000) / 10 : 0
  const ecartPct = prixCibleCombine ? ((prixCibleCombine - bien.prix_fai) / bien.prix_fai * 100).toFixed(1) : null
  const ecartNegatif = Number(ecartPct) <= 0

  const mensualiteCredit = typeCredit === 'in_fine'
    ? montantEmprunte * (tauxNum / 100) / 12
    : calculerMensualite(montantEmprunte, tauxNum, duree)
  const mensualiteAss = montantEmprunte * (tauxAssuranceNum / 100) / 12
  const mensualiteTotale = mensualiteCredit + mensualiteAss
  const totalInterets = typeCredit === 'in_fine'
    ? mensualiteCredit * duree * 12
    : Math.max(0, mensualiteCredit * duree * 12 - montantEmprunte)
  const totalAssurance = mensualiteAss * duree * 12
  const totalCredit = totalInterets + totalAssurance
  const totalRembourser = montantEmprunte + totalCredit

  const chargesRec = bien.charges_rec || 0
  const chargesCoproMens = bien.charges_copro || 0 // deja mensuel en base
  const taxeFoncMens = (bien.taxe_fonc_ann || 0) / 12
  const loyerNet = bien.type_loyer === 'CC'
    ? bien.loyer - chargesRec - chargesCoproMens - taxeFoncMens
    : bien.loyer + chargesRec - chargesCoproMens - taxeFoncMens
  const cashflowBrut = loyerNet - mensualiteTotale

  function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }
  const financement = { montantEmprunte, tauxCredit: tauxNum, tauxAssurance: tauxAssuranceNum, dureeAns: duree, typeCredit }
  const chargesUtilisateur = profil ? {
    assurance_pno: profil.assurance_pno || 0,
    frais_gestion_pct: profil.frais_gestion_pct || 0,
    honoraires_comptable: profil.honoraires_comptable || 0,
    cfe: profil.cfe || 0,
    frais_oga: profil.frais_oga || 0,
    frais_bancaires: profil.frais_bancaires || 0,
  } : null

  return (
    <Layout>
      <style>{`
        .pnl-tooltip-wrap .pnl-tooltip-text { display: none; position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%); background: #1a1210; color: #fff; font-size: 11px; font-weight: 400; padding: 8px 12px; border-radius: 8px; white-space: pre-line; width: max-content; max-width: 280px; z-index: 10; line-height: 1.5; box-shadow: 0 4px 12px rgba(0,0,0,.15); pointer-events: none; text-transform: none; letter-spacing: normal; }
        .pnl-tooltip-wrap .pnl-tooltip-text::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #1a1210; }
        .pnl-tooltip-wrap:hover .pnl-tooltip-text { display: block; }
        .fiche-wrap { max-width: 1400px; margin: 0 auto; padding: 24px 32px 80px; }
        .back-link { display: inline-block; margin-bottom: 24px; font-size: 13px; color: #7a6a60; text-decoration: none; }
        .back-link:hover { color: #1a1210; }
        .hero-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 28px; margin-bottom: 36px; align-items: stretch; }
        .gallery-wrap { position: relative; border-radius: var(--radius-lg, 20px); overflow: hidden; background: var(--paper-alt, #ede3d4); height: 100%; min-height: 240px; box-shadow: var(--shadow-md); }
        .fiche-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }
        .gallery-wrap:hover .fiche-photo { transform: scale(1.02); }
        .fiche-photo-empty { width: 100%; height: 100%; min-height: 240px; border-radius: var(--radius-lg, 20px); background: var(--paper-alt, #ede3d4); display: flex; align-items: center; justify-content: center; color: var(--ink-mute, #a39a8c); }
        .gallery-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--ink, #1f1b16); box-shadow: 0 1px 4px rgba(0,0,0,.12); transition: all .2s; }
        .gallery-nav:hover { background: #fff; transform: translateY(-50%) scale(1.08); }
        .gallery-dots { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; padding: 6px 10px; background: rgba(31,27,22,0.5); backdrop-filter: blur(8px); border-radius: 999px; }
        .gallery-dots .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.4); cursor: pointer; transition: all .2s; display: inline-block; }
        .gallery-dots .dot.active { background: #fff; width: 18px; border-radius: 999px; }
        .gallery-count { position: absolute; bottom: 16px; right: 16px; padding: 5px 10px; background: rgba(31,27,22,0.6); backdrop-filter: blur(8px); border-radius: 6px; color: #fff; font-size: 11px; font-weight: 500; }
        .fiche-info { display: flex; flex-direction: column; gap: 14px; }
        .fiche-title { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 800; color: #1a1210; }
        .fiche-sub { font-size: 14px; color: #7a6a60; margin-top: -8px; }
        .fiche-tags { display: flex; gap: 8px; flex-wrap: wrap; }
        .tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #f0ede8; color: #7a6a60; }
        .tag-strat { background: #d4ddf5; color: #2a4a8a; }
        .tag-statut { background: #d4f5e0; color: #1a7a40; }
        .prix-bloc { display: flex; flex-direction: column; gap: 0; }
        .prix-label { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; }
        .prix-fai { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 800; color: #c0392b; line-height: 1; display: block; }
        .prix-cible-val { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 700; color: #1a1210; }
        .ecart-badge { display: inline-block; margin-top: 2px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .ecart-neg { background: #d4f5e0; color: #1a7a40; }
        .ecart-pos { background: #fde8e8; color: #a33; }
        .lbc-btn { display: inline-block; padding: 9px 18px; border: 2px solid #e8e2d8; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1a1210; text-decoration: none; transition: all 0.15s; }
        .lbc-btn:hover { border-color: #c0392b; color: #c0392b; }
        .section { background: var(--surface, #fff); border-radius: var(--radius-md, 14px); padding: 24px 26px; box-shadow: var(--shadow-sm); border: 1px solid var(--line, #e6dccb); margin-bottom: 16px; }
        .section-title { font-family: "Fraunces", serif; font-size: 18px; font-weight: 500; letter-spacing: -0.01em; margin-bottom: 18px; color: var(--ink, #1f1b16); display: flex; align-items: center; justify-content: space-between; }
        .section-subtitle { font-size: 12px; color: var(--ink-soft, #6b6358); margin-bottom: 18px; }
        .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; background: var(--line-soft, #efe7d7); border-radius: var(--radius-sm, 8px); overflow: hidden; }
        .estimation-price-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; }
        .data-subtitle { grid-column: 1 / -1; font-size: 10px; font-weight: 600; color: var(--ink-soft, #6b6358); text-transform: uppercase; letter-spacing: 0.08em; padding: 10px 16px 6px; background: var(--surface, #fff); }
        .data-item { display: grid; grid-template-columns: 1fr 110px 44px; align-items: center; column-gap: 0; padding: 14px 16px; background: var(--surface, #fff); transition: background var(--dur-hover, 150ms); }
        .encheres-info-grid .data-value { font-weight: 400; }
        .data-item:hover { background: var(--paper, #f5ede2); }
        .data-label { font-size: 11px; color: var(--ink-mute, #a39a8c); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; }
        .data-value { font-size: 14px; font-weight: 500; color: var(--ink, #1f1b16); text-align: right; display: block; width: 100%; }
        .data-value.nc { color: var(--ink-mute, #a39a8c); font-style: italic; font-weight: 400; }
        .dual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        .two-cols { display: flex; gap: 24px; align-items: flex-start; }
        .two-cols > .col { flex: 1; display: flex; flex-direction: column; gap: 0; min-width: 0; }
        .simu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .strategy-bar { display: grid; grid-template-columns: auto 1fr auto; gap: 20px; align-items: center; padding: 18px 24px; background: var(--surface, #fff); border-radius: var(--radius-lg, 16px); margin-bottom: 16px; border-left: 3px solid var(--info, #2d5a8c); }
        .strategy-bar.strat-travaux { border-left-color: var(--warning, #b8891a); }
        .strategy-bar.strat-immeuble { border-left-color: var(--accent, #b4442e); }
        .strategy-bar.strat-division { border-left-color: var(--success, #2e7c5d); }
        .strategy-bar.strat-encheres { border-left-color: #8a5a3c; }
        .strategy-bar .sb-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--info-soft, #dde8f4); color: var(--info, #2d5a8c); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .strategy-bar.strat-travaux .sb-icon { background: #fef3cd; color: var(--warning, #b8891a); }
        .strategy-bar.strat-immeuble .sb-icon { background: var(--accent-soft, #f2d9d1); color: var(--accent, #b4442e); }
        .strategy-bar.strat-division .sb-icon { background: var(--success-soft, #d4ebde); color: var(--success, #2e7c5d); }
        .strategy-bar.strat-encheres .sb-icon { background: #efe0d1; color: #8a5a3c; }
        .strategy-bar .sb-txt { font-size: 13px; color: var(--ink-soft, #6b6358); line-height: 1.5; }
        .strategy-bar .sb-txt strong { color: var(--ink, #1f1b16); font-weight: 600; font-size: 13px; display: block; margin-bottom: 2px; }
        .strategy-bar .sb-link { color: var(--accent, #b4442e); font-size: 12px; font-weight: 600; text-decoration: none; white-space: nowrap; }
        .strategy-bar .sb-link:hover { text-decoration: underline; }
        .completion-widget { background: linear-gradient(135deg, var(--accent-soft, #f2d9d1) 0%, #f7e4dc 100%); border-radius: var(--radius-lg, 16px); padding: 20px 24px; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 20px; margin-bottom: 20px; }
        .completion-widget .cw-txt strong { font-family: "Fraunces", Georgia, serif; font-size: 16px; color: var(--ink, #1f1b16); display: block; margin-bottom: 2px; }
        .completion-widget .cw-txt .cw-sub { font-size: 12px; color: var(--ink-soft, #6b6358); }
        .completion-widget .cw-progress { width: 120px; height: 6px; background: rgba(180,68,46,0.15); border-radius: 999px; overflow: hidden; margin-top: 8px; }
        .completion-widget .cw-progress .cw-bar { height: 100%; background: var(--accent, #b4442e); border-radius: 999px; }
        .completion-widget .cw-btn { background: var(--ink, #1f1b16); color: var(--paper, #f5ede2); padding: 12px 28px; font-size: 13px; font-weight: 600; border-radius: var(--radius-md, 14px); border: none; cursor: pointer; font-family: inherit; white-space: nowrap; transition: background 0.15s; }
        .completion-widget .cw-btn:hover { background: #000; }
        .modal-section-title { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: var(--ink, #1f1b16); margin-bottom: 10px; }
        .modal-section-count { font-size: 11px; font-weight: 500; background: var(--accent-soft, #f2d9d1); color: var(--accent, #b4442e); padding: 2px 10px; border-radius: 999px; }
        .modal-fields { display: flex; flex-direction: column; border: 1px solid var(--line, #e6dccb); border-radius: 10px; overflow: hidden; }
        .modal-field { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 12px; padding: 10px 14px; background: #fff; border-bottom: 1px solid var(--line-soft, #efe7d7); }
        .modal-field:last-child { border-bottom: none; }
        .mf-label { font-size: 13px; color: var(--ink, #1f1b16); }
        .mf-unit { font-size: 11px; color: var(--ink-mute, #a39a8c); }
        .mf-control { display: flex; align-items: center; justify-content: flex-end; }
        .mf-control input, .mf-control select { padding: 6px 10px; border: 1.5px solid var(--line, #e6dccb); border-radius: 8px; font-size: 13px; font-family: inherit; background: var(--paper, #f5ede2); color: var(--ink, #1f1b16); text-align: right; width: 160px; }
        .mf-control input:focus, .mf-control select:focus { outline: none; border-color: var(--ink, #1f1b16); }
        .mf-control input::placeholder { color: var(--accent, #b4442e); opacity: 0.7; }
        .mf-control input.mf-nc, .mf-control select.mf-nc { background: var(--accent-soft, #f2d9d1); border-color: rgba(180,68,46,0.35); color: var(--accent, #b4442e); }
        .mf-control input.mf-draft, .mf-control select.mf-draft { background: var(--info-soft, #dde8f4); border-color: var(--info, #2d5a8c); color: var(--info, #2d5a8c); }
        .mf-control input.mf-jaune, .mf-control select.mf-jaune { background: #fef9e7; border-color: #e6b800; color: #7a5800; }
        .mf-control input.mf-vert, .mf-control select.mf-vert { background: var(--success-soft, #d4ebde); border-color: var(--success, #2e7c5d); color: var(--success, #2e7c5d); }
        .mf-control input.mf-filled, .mf-control select.mf-filled { background: #fff; border-color: var(--line, #e6dccb); color: var(--ink, #1f1b16); }
        .mf-validate { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--success, #2e7c5d); color: #fff; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0; }
        .mf-validate.mf-validate-draft { background: var(--info, #2d5a8c); }
        .mf-validate.mf-validate-draft:hover { background: #1e3d60; }
        .mf-validate:hover { background: #1f5c42; }
        .mf-validate:disabled { background: var(--line, #e6dccb); color: var(--ink-mute, #a39a8c); cursor: default; }
        .modal-footer-note { margin-top: 20px; padding: 12px 16px; background: var(--info-soft, #dde8f4); border-radius: 10px; font-size: 12px; color: var(--ink-soft, #6b6358); line-height: 1.5; }
        .data-missing { color: #c0392b; font-style: italic; font-weight: 400; font-size: 13px; }
        .param-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; }
        .param-label { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; }
        .param-input { padding: 9px 13px; border-radius: 9px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; background: #faf8f5; color: #1a1210; outline: none; width: 100%; box-sizing: border-box; }
        .param-input:focus { border-color: #c0392b; }
        .param-hint { font-size: 11px; color: #b0a898; }
        .toggle-row { display: flex; gap: 8px; }
        .toggle-btn { flex: 1; padding: 8px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; background: #faf8f5; color: #7a6a60; transition: all 0.15s; }
        .toggle-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .fin-block { margin-top: 18px; padding-top: 18px; border-top: 1px solid #efe7d7; }
        .fin-block:first-of-type { margin-top: 4px; padding-top: 0; border-top: none; }
        .fin-label { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #a39a8c; margin-bottom: 10px; }
        .fin-calc-field { padding: 12px 16px; background: var(--paper, #f5ede2); border-radius: 8px; font-family: 'Fraunces', serif; font-size: 20px; font-weight: 500; color: #1f1b16; letter-spacing: -0.01em; }
        .fin-field { width: 100%; padding: 10px 14px; background: var(--paper, #f5ede2); border: 1.5px solid #e8e2d8; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1f1b16; outline: none; box-sizing: border-box; transition: border-color .15s; }
        .fin-field:focus { border-color: #c0392b; box-shadow: 0 0 0 3px rgba(192,57,43,.08); }
        .fin-hint { margin-top: 6px; font-size: 11px; color: #6b6358; }
        .fin-slider { width: 100%; height: 6px; appearance: none; background: linear-gradient(to right, #c0392b calc(var(--val, 0) * 1%), #e8e2d8 calc(var(--val, 0) * 1%)); border-radius: 999px; outline: none; cursor: pointer; margin: 4px 0 8px; }
        .fin-slider::-webkit-slider-runnable-track { height: 6px; border-radius: 999px; }
        .fin-slider::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; background: #c0392b; border: 3px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 0 0 1px #e8e2d8, 0 1px 3px rgba(0,0,0,.12); transition: transform .15s; margin-top: -6px; }
        .fin-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .fin-slider::-moz-range-track { height: 6px; border-radius: 999px; background: #e8e2d8; }
        .fin-slider::-moz-range-progress { height: 6px; border-radius: 999px; background: #c0392b; }
        .fin-slider::-moz-range-thumb { width: 18px; height: 18px; background: #c0392b; border: 3px solid #fff; border-radius: 50%; cursor: pointer; }
        .fin-slider-labels { display: flex; justify-content: space-between; font-size: 10px; color: #a39a8c; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 8px; }
        .fin-chip-group { display: flex; gap: 4px; background: var(--paper, #f5ede2); padding: 4px; border-radius: 999px; }
        .fin-chip { flex: 1; padding: 7px 12px; border: none; background: transparent; border-radius: 999px; font-size: 13px; font-weight: 500; color: #7a6a60; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .2s; }
        .fin-chip:hover { color: #1a1210; }
        .fin-chip.active { background: #c0392b; color: #fff; }
        .slider-wrap { padding: 4px 0; }
        .slider { width: 100%; accent-color: #c0392b; cursor: pointer; }
        .slider-labels { display: flex; justify-content: space-between; font-size: 11px; color: #b0a898; margin-top: 2px; }
        .val-blur { filter: blur(7px); user-select: none; pointer-events: none; }
        .lots-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .lots-table { width: 100%; border-collapse: collapse; margin-top: 12px; min-width: 400px; }
        .lots-table th { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 10px; text-align: left; border-bottom: 2px solid #f0ede8; }
        .lots-table td { padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f0ede8; }
        .lots-table tr:last-child td { border-bottom: none; }
        .lot-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .lot-loue { background: #d4f5e0; color: #1a7a40; }
        .lot-vacant { background: #fff8f0; color: #a06010; }
        .lot-renover { background: #fde8e8; color: #c0392b; }
        .idr-param { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .idr-param label { font-size: 12px; font-weight: 600; color: #7a6a60; min-width: 180px; }
        .idr-param input { padding: 6px 10px; border-radius: 6px; border: 1.5px solid #e8e2d8; font-size: 13px; width: 120px; font-family: 'DM Sans', sans-serif; background: #faf8f5; }
        .results-table { width: 100%; border-collapse: collapse; }
        .results-table thead th { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 12px; text-align: right; border-bottom: 2px solid #f0ede8; }
        .results-table thead th:first-child { text-align: left; }
        .results-table tbody tr { border-bottom: 1px solid #f0ede8; }
        .results-table tbody td { padding: 10px 12px; font-size: 14px; text-align: right; }
        .results-table tbody td:not(:first-child) { display: table-cell; }
        .results-table tbody td:not(:first-child) > div { margin-left: auto; }
        .results-table tbody td:not(:first-child) > span { display: block; text-align: right; }
        .results-table tbody td:first-child { text-align: left; color: #555; font-size: 13px; }
        .results-total td { font-weight: 700; background: #f7f4f0; }
        .cashflow-row td:not(:first-child) { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 800; }
        .pnl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
        .fin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
        .fin-right-col { display: flex; flex-direction: column; gap: 20px; }
        .fin-cashflow-card { flex: 1; display: flex; flex-direction: column; }
        .fin-result-stack { display: flex; flex-direction: column; margin-top: 20px; }
        .fin-result-line { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 0; border-bottom: 1px dashed #e8e2d8; font-size: 13px; color: #7a6a60; }
        .fin-result-line:last-child { border-bottom: none; }
        .fin-result-line .fin-v { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 500; color: #1a1210; font-variant-numeric: tabular-nums; }
        .fin-highlight { margin-top: 8px !important; padding: 16px 18px !important; background: linear-gradient(135deg, #fde8e8 0%, #f7e4dc 100%) !important; border: none !important; border-bottom: none !important; border-radius: 10px; }
        .fin-highlight .fin-v { font-size: 24px !important; font-weight: 600 !important; color: #c0392b !important; letter-spacing: -0.02em; }
        .fin-unit { font-size: 12px; color: #c0392b; opacity: 0.7; margin-left: 2px; font-family: 'DM Sans', sans-serif; font-weight: 500; }
        .fin-sub-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e8e2d8; }
        .fin-sub-stat { padding: 12px 14px; background: #f7f4f0; border-radius: 8px; }
        .fin-sub-highlight { background: #1a1210 !important; }
        .fin-sub-lbl { font-size: 10px; color: #a39a8c; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 4px; }
        .fin-sub-highlight .fin-sub-lbl { color: #f0d090; }
        .fin-sub-val { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 500; color: #1a1210; font-variant-numeric: tabular-nums; }
        .fin-sub-highlight .fin-sub-val { color: #fff; font-size: 18px; }
        .cf-grid { display: flex; flex-direction: column; margin-top: 16px; }
        .cf-grid-header { display: grid; grid-template-columns: 1fr 110px 44px 24px 110px 44px; padding: 0 0 10px; border-bottom: 1px solid #e8e2d8; }
        .cf-grid-header > span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: #a39a8c; font-weight: 600; text-align: right; }
        .cf-grid-header > span:first-child { text-align: left; }
        .cf-grid-row { display: grid; grid-template-columns: 1fr 110px 44px 24px 110px 44px; align-items: center; padding: 2px 0; border-bottom: 1px dashed #e8e2d8; min-height: 44px; }
        .cf-grid-row:last-of-type { border-bottom: none; }
        .cf-grid-lbl { font-size: 13px; color: #6b6358; }
        .cf-grid-static { text-align: right; font-size: 13px; font-weight: 500; }
        .cf-total-box { margin-top: 18px; padding: 16px 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .cf-total-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; color: #6b6358; }
        .cf-total-vals { display: flex; align-items: baseline; gap: 14px; }
        .cf-total-main { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 500; font-variant-numeric: tabular-nums; }
        .cf-total-ann { font-size: 12px; color: #6b6358; font-variant-numeric: tabular-nums; }
        .nc-warning { background: #fff8f0; border: 1.5px solid #f0d090; border-radius: 12px; padding: 16px 20px; color: #a06010; font-size: 13px; }
        .profil-bar { background: #f7f4f0; border-radius: 10px; padding: 10px 16px; font-size: 12px; color: #7a6a60; margin-top: 16px; }
        .legende { display: flex; gap: 14px; flex-wrap: wrap; padding: 12px 16px; background: var(--paper, #f5ede2); border-radius: 10px; margin-top: 16px; }
        .legende-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--ink-soft, #6b6358); }
        .legende-dot { width: 8px; height: 8px; border-radius: 50%; }
        .k-unit { text-transform: none; letter-spacing: 0; color: var(--ink-mute, #a39a8c); opacity: 0.7; margin-left: 2px; font-weight: 400; }
        .address-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin-bottom: 14px; background: var(--paper, #f5ede2); border: 1px solid var(--line-soft, #efe7d7); border-radius: var(--radius-sm, 8px); transition: border-color .15s, background .15s; cursor: default; }
        .address-row:hover { border-color: var(--line, #e6dccb); }
        .address-row.editing { border-color: var(--info, #3a5f7d); background: var(--surface, #fff); box-shadow: 0 0 0 3px var(--info-soft, #d3deea); }
        .address-icon { flex-shrink: 0; width: 22px; height: 22px; color: var(--accent, #b4442e); display: flex; align-items: center; justify-content: center; }
        .address-main { flex: 1 1 auto; min-width: 0; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        .address-lbl { font-size: 12px; color: var(--ink-soft, #6b6358); font-weight: 500; white-space: nowrap; }
        .address-val { font-size: 13px; color: var(--ink, #1f1b16); flex: 1 1 auto; min-width: 120px; }
        .address-val.placeholder { color: var(--accent, #b4442e); font-style: italic; cursor: pointer; }
        .address-val.placeholder:hover { text-decoration: underline; }
        .address-input { width: 100%; border: none; background: transparent; font-family: inherit; font-size: 13px; color: var(--ink, #1f1b16); outline: none; }
        .address-hint { flex-shrink: 0; font-size: 11px; color: var(--ink-mute, #a39a8c); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
        .address-edit-btn { flex-shrink: 0; width: 28px; height: 28px; border-radius: 6px; background: transparent; border: none; color: var(--ink-soft, #6b6358); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background .15s, color .15s; }
        .address-edit-btn:hover { background: var(--surface, #fff); color: var(--accent, #b4442e); }
        .add-feature-row { margin-top: 14px; padding: 14px 16px; background: var(--paper, #f5ede2); border-radius: var(--radius-sm, 8px); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .add-feature-lbl { font-size: 12px; color: var(--ink-soft, #6b6358); }
        .add-feature-lbl strong { color: var(--ink, #1f1b16); font-weight: 600; }
        .btn-add { padding: 8px 14px; background: var(--accent, #b4442e); color: #fff; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; transition: all .2s; white-space: nowrap; }
        .btn-add:hover { background: #9a3626; transform: translateY(-1px); }
        .btn-ghost { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 14px; padding: 10px; background: transparent; border: 1px solid #e8e2d8; border-radius: 8px; font-size: 13px; font-weight: 600; color: #6b6358; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .15s; }
        .btn-ghost:hover { border-color: #1a1210; background: #faf8f5; }
        .section-meta { font-size: 11px; color: #a39a8c; font-weight: 400; font-family: 'DM Sans', sans-serif; letter-spacing: 0; }
        .section-subtitle { font-size: 13px; color: #7a6a60; margin-top: -10px; margin-bottom: 20px; }
        .travaux-score { display: grid; grid-template-columns: auto 1fr auto; gap: 24px; align-items: center; margin-top: 16px; }
        .score-circle { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--warning, #c77f1f) 0%, var(--accent, #b4442e) 100%); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Fraunces', serif; line-height: 1; flex-shrink: 0; }
        .score-circle .sc-big { font-size: 28px; font-weight: 500; }
        .score-circle .sc-small { font-size: 10px; opacity: 0.85; letter-spacing: 0.08em; margin-top: 2px; }
        .travaux-score.is-manual .score-circle { background: linear-gradient(135deg, #4a4240 0%, #7a6a60 100%); }
        .score-info .si-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #a39a8c; font-weight: 600; margin-bottom: 4px; }
        .score-info .si-h4 { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 500; color: #1a1210; margin-bottom: 4px; }
        .score-info .si-p { font-size: 12px; color: #6b6358; line-height: 1.5; margin: 0; }
        .score-budget { text-align: right; }
        .score-budget .sb-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #a39a8c; font-weight: 600; margin-bottom: 4px; }
        .score-budget .sb-amount { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 500; color: var(--warning, #c77f1f); letter-spacing: -0.02em; line-height: 1; }
        .score-budget .sb-calc { font-size: 11px; color: #6b6358; margin-top: 4px; }
        .score-stepper { display: inline-flex; align-items: center; margin-top: 14px; background: #faf8f5; border: 1px solid #e8e2d8; border-radius: 999px; padding: 3px; }
        .score-stepper .ss-step { width: 30px; height: 26px; display: inline-flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 999px; font-family: 'Fraunces', serif; font-size: 13px; font-weight: 500; color: #a39a8c; cursor: pointer; transition: all .15s ease; padding: 0; }
        .score-stepper .ss-step:hover { color: #1a1210; background: #f0ede8; }
        .score-stepper .ss-step.is-active { background: #1a1210; color: #fff; }
        .score-stepper .ss-step.is-ia { background: var(--warning, #c77f1f); color: #fff; }
        .score-stepper .ss-reset { margin-left: 6px; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px; background: transparent; border: none; font-family: 'DM Sans', sans-serif; font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; color: #a39a8c; cursor: pointer; text-transform: uppercase; border-radius: 999px; transition: color .15s ease; }
        .score-stepper .ss-reset:hover { color: var(--accent, #b4442e); }
        .tva-block { display: flex; align-items: flex-start; gap: 16px; padding: 14px 18px; background: var(--info-soft, #d3deea); border-radius: 10px; margin-top: 16px; }
        .tva-block .txt { font-size: 12px; color: var(--info, #3a5f7d); line-height: 1.5; }
        .tva-block .txt strong { color: var(--info, #3a5f7d); display: block; margin-bottom: 2px; }
        .fiscal-controls { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; padding: 20px 24px; background: var(--surface, #fff); border-radius: var(--radius-md, 14px); border: 1px solid var(--line, #e6dccb); box-shadow: var(--shadow-sm); }
        .fiscal-controls-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 28px; align-items: center; }
        .fiscal-controls-grid.fiscal-row-2 { padding-top: 14px; border-top: 1px solid #efe7d7; }
        .control-group { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
        .control-group .lbl { font-size: 12px; color: #7a6a60; font-weight: 500; flex-shrink: 0; }
        .chip-group { display: flex; gap: 4px; background: var(--paper, #f5ede2); padding: 4px; border-radius: 999px; flex-wrap: wrap; }
        .chip-btn { padding: 6px 12px; border: none; background: transparent; border-radius: 999px; font-size: 12px; font-weight: 500; color: #7a6a60; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all .2s; white-space: nowrap; }
        .chip-btn:hover { color: #1a1210; }
        .chip-btn.active { background: var(--accent, #b4442e); color: #fff; }
        .select-custom { padding: 6px 12px; background: #faf8f5; border: 1px solid #e8e2d8; border-radius: 8px; font-family: inherit; font-size: 13px; color: #1a1210; cursor: pointer; outline: none; }
        .select-custom.select-inline-num { width: 64px; padding: 6px 8px; text-align: center; background: var(--paper, #f5ede2); }
        .fiscal-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .fiscal-card { background: #fff; border-radius: 14px; padding: 24px 26px; border: 1px solid #e6dccb; position: relative; display: flex; flex-direction: column; }
        .fiscal-card.your { background: linear-gradient(180deg, #fff 0%, #faf8f5 100%); border: 2px solid #f0d090; }
        .fiscal-card.your::before { content: 'Votre régime'; position: absolute; top: -10px; left: 20px; padding: 3px 10px; background: #1a1210; color: #fff; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 999px; }
        .fcard-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 500; color: #1a1210; margin-bottom: 16px; }
        .fiscal-note { font-size: 11px; color: #7a6a60; font-style: italic; margin-bottom: 16px; line-height: 1.5; background: #faf8f5; border-radius: 8px; padding: 8px 12px; min-height: 44px; }
        .fiscal-line { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; font-size: 13px; border-bottom: 1px dashed #efe7d7; min-height: 38px; }
        .fiscal-line .fl-k { color: #6b6358; display: flex; align-items: center; gap: 6px; }
        .fiscal-line .fl-v { font-weight: 500; color: #1a1210; font-variant-numeric: tabular-nums; }
        .fiscal-line .fl-v.neg { color: #b4442e; }
        .fiscal-line .fl-v.pos { color: #2e7c5d; }
        .fiscal-line .fl-v.muted { color: #a39a8c; }
        .fiscal-line.fl-bold { padding: 12px 0; border-top: 1px solid #e8e2d8 !important; border-bottom: 1px solid #e8e2d8 !important; margin: 6px 0; }
        .fiscal-line.fl-bold .fl-k { color: #1a1210; font-weight: 600; }
        .fiscal-line.fl-bold .fl-v { font-family: 'Fraunces', serif; font-size: 15px; }
        .fiscal-sl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #a39a8c; font-weight: 600; margin: 16px 0 8px; padding-top: 14px; border-top: 1px solid #efe7d7; }
        .fiscal-cf { margin: 14px 0 4px; padding: 14px 16px; border-radius: 10px; background: #f7f4f0; }
        .fiscal-cf.neg { background: #f2d9d1; }
        .fiscal-cf.pos { background: #d4e7dc; }
        .fiscal-cf .cf-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b6358; font-weight: 600; margin-bottom: 4px; }
        .fiscal-cf .cf-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
        .fiscal-cf .cf-main { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; font-variant-numeric: tabular-nums; }
        .fiscal-cf.neg .cf-main { color: #b4442e; }
        .fiscal-cf.pos .cf-main { color: #2e7c5d; }
        .fiscal-cf .cf-ann { font-size: 12px; color: #6b6358; font-variant-numeric: tabular-nums; }
        .fiscal-bilan { margin-top: 16px; padding: 16px; border-radius: 10px; }
        .fiscal-bilan.neg { background: #f2d9d1; }
        .fiscal-bilan.pos { background: #d4e7dc; }
        .fiscal-bilan .fb-lbl { font-size: 10px; color: #6b6358; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em; }
        .fiscal-bilan .fb-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; align-items: center; color: #555; }
        .fiscal-bilan .fb-total { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 800; margin-bottom: 4px; padding-top: 8px; border-top: 2px solid rgba(0,0,0,0.1); }
        .fiscal-bilan .fb-metrics { display: flex; flex-direction: column; gap: 4px; font-size: 12px; margin-top: 4px; }
        .fiscal-bilan .fb-metric { display: flex; justify-content: space-between; align-items: center; color: #555; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ink-mute, #a39a8c); margin-bottom: 20px; font-weight: 500; letter-spacing: 0.02em; }
        .breadcrumb a { color: var(--ink-soft, #6b6358); text-decoration: none; transition: color .2s; }
        .breadcrumb a:hover { color: var(--accent, #b4442e); }
        .breadcrumb .sep { opacity: .4; }
        .breadcrumb .current { color: var(--ink, #1f1b16); }

        /* Deal card */
        .deal-card { background: var(--surface, #fff); border-radius: var(--radius-lg, 20px); padding: 28px 30px; box-shadow: var(--shadow-md, 0 2px 6px rgba(31,27,22,.04),0 8px 24px rgba(31,27,22,.06)); display: flex; flex-direction: column; gap: 22px; position: relative; overflow: hidden; align-self: start; }
        .deal-card-glow { position: absolute; top: -40px; right: -40px; width: 200px; height: 200px; background: radial-gradient(circle, var(--accent-soft, #f2d9d1) 0%, transparent 70%); opacity: 0.5; pointer-events: none; }
        .deal-header h1 { font-family: "Fraunces", Georgia, serif; font-size: 32px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.1; color: var(--ink, #1f1b16); margin: 0 0 8px; }
        .deal-header .location { font-size: 13px; color: var(--ink-soft, #6b6358); display: flex; align-items: center; gap: 5px; margin-bottom: 10px; }
        .price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 18px; background: var(--paper, #f5ede2); border-radius: var(--radius-md, 14px); }
        .price-block { min-width: 0; }
        .price-block + .price-block { padding-left: 16px; border-left: 1px solid var(--line, #e6dccb); }
        .price-block .label { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-mute, #a39a8c); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .price-block .value { font-family: "Fraunces", Georgia, serif; font-size: 24px; font-weight: 500; letter-spacing: -0.02em; line-height: 1; color: var(--ink, #1f1b16); white-space: nowrap; }
        .price-block .value.target { color: var(--accent, #b4442e); }
        .price-block .value.target.positive { color: var(--success, #2f7d5b); }
        .price-block .value.enchere-max { color: var(--success, #2f7d5b); }
        .price-block .sub { margin-top: 6px; font-size: 11px; color: var(--ink-soft, #6b6358); }
        .decote-banner { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: linear-gradient(135deg, var(--accent, #b4442e) 0%, #8f3522 100%); border-radius: var(--radius-md, 14px); color: #fff; position: relative; overflow: hidden; }
        .decote-banner::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 85% 50%, rgba(255,255,255,0.15), transparent 50%); pointer-events: none; }
        .decote-banner.positive { background: linear-gradient(135deg, var(--success, #2f7d5b) 0%, #1f5a40 100%); }
        .decote-banner .label { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.85; }
        .decote-banner .pct { font-family: "Fraunces", Georgia, serif; font-size: 34px; font-weight: 500; letter-spacing: -0.02em; line-height: 1; margin-top: 2px; }
        .decote-banner .arrow { font-size: 28px; opacity: 0.6; }
        .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-top: 1px solid var(--line, #e6dccb); padding-top: 18px; }
        .kpi-row[data-count="2"] { grid-template-columns: repeat(2, 1fr); }
        .kpi { text-align: center; padding: 0 10px; border-right: 1px solid var(--line-soft, #efe7d7); }
        .kpi:last-child { border-right: none; }
        .kpi .num { font-family: "Fraunces", Georgia, serif; font-size: 18px; font-weight: 500; color: var(--ink, #1f1b16); }
        .kpi .num.mute { color: var(--ink-mute, #a39a8c); font-weight: 400; }
        .kpi .lbl { font-size: 10px; color: var(--ink-soft, #6b6358); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; white-space: nowrap; }
        .deal-actions { display: flex; gap: 10px; }
        .deal-btn-watchlist { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 15px 22px; border-radius: var(--radius-md, 14px); border: 1px solid var(--line, #e6dccb); background: #fff; color: var(--ink, #1f1b16); font-size: 14px; font-weight: 600; cursor: pointer; transition: all .15s; font-family: inherit; white-space: nowrap; }
        .deal-btn-watchlist:hover { background: var(--paper, #f5ede2); border-color: var(--ink, #1f1b16); }
        .deal-btn-watchlist.active { border-color: var(--accent, #b4442e); background: var(--accent-soft, #f2d9d1); color: var(--accent, #b4442e); }
        .deal-btn-watchlist.disabled { opacity: 0.45; cursor: default; pointer-events: none; }
        .deal-btn-source { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 15px 22px; border-radius: var(--radius-md, 14px); border: none; background: var(--ink, #1f1b16); color: var(--paper, #f5ede2); font-size: 14px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; white-space: nowrap; }
        .deal-btn-source:hover { background: #000; transform: translateY(-1px); }
        .deal-btn-completer { font-size: 12px; font-weight: 600; color: var(--accent, #b4442e); padding: 9px 14px; border: 1.5px solid var(--line, #e6dccb); border-radius: var(--radius-sm, 8px); background: #fff; cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap; }
        .deal-btn-completer:hover { border-color: var(--accent, #b4442e); }

        /* Sticky nav */
        .tab-panel { animation: fadeInTab .3s ease; }
        @keyframes fadeInTab { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .sticky-nav-wrap { position: sticky; top: 68px; z-index: 50; display: flex; justify-content: center; margin-bottom: 28px; }
        .sticky-nav { background: var(--surface, #fff); border-radius: var(--radius-md, 14px); padding: 6px; display: inline-flex; gap: 4px; box-shadow: var(--shadow-sm, 0 1px 3px rgba(31,27,22,.06)); border: 1px solid var(--line, #e6dccb); }
        .sticky-nav-item { display: inline-flex; align-items: center; gap: 7px; padding: 10px 20px; font-size: 13px; font-weight: 500; color: var(--ink-soft, #6b6358); white-space: nowrap; cursor: pointer; background: transparent; border: none; border-radius: 10px; font-family: "Inter", sans-serif; transition: all var(--dur-hover, 150ms) var(--ease); }
        .sticky-nav-item:hover { color: var(--ink, #1f1b16); background: var(--paper, #f5ede2); }
        .sticky-nav-item.active { background: var(--ink, #1f1b16); color: var(--paper, #f5ede2); }

        /* Modal panel */
        .modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(26,18,16,0.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .modal-overlay.modal-overlay-large { padding: 8px; }
        .modal-panel { background: #fff; border-radius: 16px; width: 100%; max-width: 640px; max-height: 85vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: modalIn 0.2s ease; display: flex; flex-direction: column; }
        .modal-panel.modal-panel-large { max-width: 880px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 12px; flex-shrink: 0; }
        .modal-header h3 { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700; color: #1a1210; margin: 0; }
        .modal-close { background: none; border: none; cursor: pointer; color: #7a6a60; font-size: 22px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.15s; }
        .modal-close:hover { background: #f0ede8; color: #1a1210; }
        .modal-body { padding: 0 24px 24px; overflow-y: auto; overflow-x: hidden; flex: 1; }
        .modal-panel-large .modal-body { overflow-x: auto; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }

        @media (max-width: 767px) { .fiche-wrap { padding: 16px 0; } .hero-grid { grid-template-columns: 1fr; } .dual-grid { grid-template-columns: 1fr; } .simu-grid { grid-template-columns: 1fr; } .pnl-grid { grid-template-columns: 1fr; } .two-cols { flex-direction: column; } .col { width: 100%; } .sticky-nav { padding: 3px; } .sticky-nav-item { padding: 8px 14px; font-size: 12px; } .modal-panel { max-width: 100%; max-height: 90vh; } .data-grid { grid-template-columns: repeat(3, 1fr); } .section { padding: 16px 14px; } .breadcrumb { padding: 0 14px; } .fiche-info { padding: 0 14px; } .estimation-price-grid { grid-template-columns: 1fr !important; } .estimation-price-grid > div { padding: 10px 0 !important; border-left: none !important; border-right: none !important; } }
      `}</style>

      <div className="fiche-wrap">
        <nav className="breadcrumb">
          <a href="/biens">Biens</a>
          <span className="sep">{'>'}</span>
          {bien.strategie_mdb && <><a href={`/biens?strategie=${encodeURIComponent(bien.strategie_mdb)}`}>{bien.strategie_mdb}</a><span className="sep">{'>'}</span></>}
          {bien.ville && <><a href={`/biens?ville=${encodeURIComponent(bien.ville)}`}>{bien.ville}</a><span className="sep">{'>'}</span></>}
          <span style={{ color: '#1a1210', fontWeight: 500 }}>Ce bien</span>
        </nav>

        <div className="hero-grid">
          <div>
            <PhotoCarousel bien={bien} overlay={<>
              {/* Badge stratégie — top-left du carousel */}
              {!isEnchere && bien.strategie_mdb && (() => {
                const stratColors: Record<string, { bg: string; color: string }> = {
                  'Locataire en place': { bg: 'var(--strat-locataire-soft, #f2d9d1)', color: 'var(--strat-locataire, #b4442e)' },
                  'Travaux lourds': { bg: 'var(--strat-travaux-soft, #f4e2c5)', color: 'var(--strat-travaux, #c77f1f)' },
                  'Immeuble de rapport': { bg: 'var(--strat-immeuble-soft, #d3deea)', color: 'var(--strat-immeuble, #3a5f7d)' },
                  'Division': { bg: 'var(--strat-division-soft, #d4e7dc)', color: 'var(--strat-division, #2f7d5b)' },
                  'Enchères': { bg: 'var(--strat-encheres-soft, #e8d9d5)', color: 'var(--strat-encheres, #6a2d2d)' },
                }
                const sc = stratColors[bien.strategie_mdb] || { bg: 'rgba(255,255,255,0.92)', color: 'var(--ink)' }
                return (
                  <span style={{ position: 'absolute', top: '16px', left: '16px', background: sc.bg, backdropFilter: 'blur(8px)', color: sc.color, fontSize: '11px', fontWeight: 600, padding: '5px 12px', borderRadius: '999px', zIndex: 2, letterSpacing: '0.02em' }}>
                    {bien.strategie_mdb}
                  </span>
                )
              })()}
              {/* Badge countdown enchères — top-right */}
              {isEnchere && bien.date_audience && (() => {
                const days = Math.ceil((new Date(bien.date_audience).getTime() - Date.now()) / 86400000)
                let label = '', bg = '#6c757d'
                if (days > 0) {
                  label = days === 0 ? "Aujourd'hui" : `J-${days}`
                  bg = days <= 7 ? '#c0392b' : days <= 14 ? '#e67e22' : '#6c757d'
                } else {
                  const deadline = bien.date_surenchere
                    ? new Date(bien.date_surenchere)
                    : new Date(new Date(bien.date_audience).getTime() + 10 * 86400000)
                  const remaining = Math.ceil((deadline.getTime() - Date.now()) / 86400000)
                  if (remaining > 0) { label = `Surenchère J-${remaining}`; bg = '#e8871a' }
                  else { label = 'Adjugé'; bg = '#3a5f7d' }
                }
                return label ? (
                  <span style={{ position: 'absolute', top: '16px', right: '16px', background: bg, color: '#fff', fontSize: '11px', fontWeight: 700, padding: '6px 14px', borderRadius: '6px', zIndex: 2, letterSpacing: '0.04em' }}>{label}</span>
                ) : null
              })()}
            </>} />
          </div>

          <div className="deal-card">
            <div className="deal-card-glow" />

            {/* Header */}
            <div className="deal-header">
              <h1>{bien.type_bien || 'Bien'} {bien.nb_pieces ? (String(bien.nb_pieces).startsWith('T') ? bien.nb_pieces : `T${bien.nb_pieces}`) : ''}{bien.surface ? ` · ${Math.round(bien.surface)} m²` : ''}</h1>
              <div className="location">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {bien.quartier ? `${bien.quartier} · ` : ''}{bien.ville}{bien.code_postal ? ` · ${bien.code_postal}` : ''}{bien.prix_m2 ? ` · ${fmt(bien.prix_m2)} €/m²` : ''}
              </div>
              <div className="fiche-tags">
                {isEnchere ? (
                  <>
                    {(() => {
                      const statutMap: Record<string, { label: string; bg: string; color: string }> = {
                        a_venir: { label: '\u00c0 venir', bg: '#d4f5e0', color: '#1a7a40' },
                        surenchere: { label: 'En surench\u00e8re', bg: '#ffecd2', color: '#8a5a00' },
                        adjuge: { label: 'Adjug\u00e9', bg: '#d4ddf5', color: '#2a4a8a' },
                        vendu: { label: 'Vendu', bg: '#6c757d', color: '#fff' },
                        retire: { label: 'Retir\u00e9', bg: '#f5d4d4', color: '#8a2a2a' },
                        expire: { label: 'Expir\u00e9', bg: '#e9ecef', color: '#6c757d' },
                      }
                      if (['a_venir', 'surenchere', 'adjuge'].includes(bien.statut)) return null
                      const s = statutMap[bien.statut] || statutMap.a_venir
                      return <span className="tag" style={{ background: s.bg, color: s.color, fontWeight: 700 }}>{s.label}</span>
                    })()}
                    {bien.occupation && bien.occupation !== 'NC' && (
                      <span className="tag" style={{
                        background: bien.occupation === 'libre' ? '#d4f5e0' : bien.occupation === 'loue' ? '#d4ddf5' : '#ffecd2',
                        color: bien.occupation === 'libre' ? '#1a7a40' : bien.occupation === 'loue' ? '#2a4a8a' : '#8a5a00',
                        fontWeight: 700,
                      }}>{bien.occupation === 'libre' ? 'Bien Libre' : bien.occupation === 'loue' ? 'Bien Lou\u00e9' : 'Bien Occup\u00e9'}</span>
                    )}
                    {isVenteDelocalisee(bien.departement, bien.tribunal) && (
                      <span className="tag" style={{ background: '#fff3e0', color: '#e65100', fontWeight: 700 }} title="La vente se d\u00e9roule dans un tribunal d'un autre d\u00e9partement">
                        Delocalise
                      </span>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            {/* Price grid */}
            <div className="price-grid">
              <div className="price-block">
                <div className="label">{isEnchere ? (bien.prix_adjuge && bien.prix_adjuge > 0 ? 'PRIX ADJUG\u00c9' : 'MISE \u00c0 PRIX') : 'PRIX FAI'}</div>
                <div className="value">{fmt(isEnchere && bien.prix_adjuge && bien.prix_adjuge > 0 ? bien.prix_adjuge : bien.prix_fai)} {'€'}</div>
                {isEnchere && bien.prix_adjuge && bien.prix_adjuge > 0 && (
                  <div className="sub">Mise à prix : {fmt(bien.prix_fai)} {'€'}</div>
                )}
                {!isEnchere && ecartPct && (
                  <div className="sub">{ecartNegatif ? 'Prix demand\u00e9 vendeur' : 'Prix affich\u00e9 \u00b7 sous-\u00e9valu\u00e9'}</div>
                )}
              </div>
              <div className="price-block">
                {isEnchere ? (
                  (() => {
                    return (
                      <>
                        <div className="label">
                          <select
                            value={enchereBaseCalc}
                            onChange={e => setEnchereBaseCalc(e.target.value as 'calcule' | 'libre')}
                            style={{ fontSize: '10px', fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                          >
                            <option value="calcule">{`ENCHÈRE MAX (OBJ. ${objectifPV || 20}% PV)`}</option>
                            <option value="libre">ENCHÈRE MAX (LIBRE)</option>
                          </select>
                        </div>
                        {enchereBaseCalc === 'libre' ? (
                          enchereManuelMax && !enchereManuelDraft ? (
                            // Valeur confirmée — affichage figé
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <div className="value enchere-max" style={{ flex: 1, margin: 0 }}>{fmt(enchereManuelMax)} {'€'}</div>
                              <button onClick={() => setEnchereManuelDraft(String(enchereManuelMax))} title="Modifier" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', opacity: 0.4, transition: 'opacity 0.15s', flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7a6a60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                              </button>
                              <button onClick={() => { setEnchereManuelMax(null); setEnchereManuelDraft(''); setEnchereFinMode('calcule') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a6a60', fontSize: '16px', padding: '2px 4px', lineHeight: 1 }}>{'×'}</button>
                            </div>
                          ) : (
                            // Mode saisie
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px', overflow: 'hidden' }}>
                              <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', border: '1.5px solid #e8e2d8', borderRadius: '6px', background: '#fff', padding: '4px 8px', gap: '4px' }}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="400 000"
                                  value={enchereManuelDraft}
                                  onChange={ev => setEnchereManuelDraft(ev.target.value.replace(/[^\d]/g, ''))}
                                  onKeyDown={ev => { if (ev.key === 'Enter') { const v = Number(enchereManuelDraft); if (v) { setEnchereManuelMax(v); setEnchereFinMode('libre'); setEnchereManuelDraft('') } } }}
                                  style={{ flex: 1, fontSize: '15px', fontWeight: 700, outline: 'none', fontFamily: 'inherit', color: '#1a1210', background: 'transparent', border: 'none', minWidth: 0, width: '100%' }}
                                  autoFocus
                                />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#7a6a60', flexShrink: 0 }}>{'€'}</span>
                              </div>
                              <button
                                onClick={() => { const v = Number(enchereManuelDraft); if (v) { setEnchereManuelMax(v); setEnchereFinMode('libre'); setEnchereManuelDraft('') } }}
                                style={{ background: '#2f7d5b', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff', fontSize: '14px', fontWeight: 700, padding: '5px 8px', lineHeight: 1, flexShrink: 0 }}
                              >{'✓'}</button>
                            </div>
                          )
                        ) : enchMaxCalc ? (
                          <div className="value enchere-max">{fmt(enchMaxCalc)} {'€'}</div>
                        ) : (
                          <div className="value" style={{ color: 'var(--ink-mute)' }}>NC</div>
                        )}
                      </>
                    )
                  })()
                ) : (prixCibleCashflow || prixCiblePV) ? (
                  <>
                    <div className="label">
                      {!isTravauxLourds && prixCibleCashflow && prixCiblePV ? (
                        <select value={modeCible} onChange={e => setModeCible(e.target.value as 'cashflow' | 'pv')}
                          style={{ fontSize: '10px', fontWeight: 600, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                          <option value="cashflow">{`PRIX CIBLE (CF ${objectifCashflow}%)`}</option>
                          <option value="pv">{`PRIX CIBLE (PV ${objectifPV}%)`}</option>
                        </select>
                      ) : (
                        prixCiblePV && (isTravauxLourds || !prixCibleCashflow)
                          ? `PRIX CIBLE (OBJ. ${objectifPV}% PV)`
                          : `PRIX CIBLE (OBJ. ${objectifCashflow}% CF)`
                      )}
                    </div>
                    {(() => {
                      const prixAffiche = modeCible === 'cashflow' && prixCibleCashflow ? prixCibleCashflow : (prixCiblePV || prixCibleCashflow || 0)
                      const cibleSuperieur = prixAffiche >= bien.prix_fai
                      return (
                        <>
                          <div className={`value target${cibleSuperieur ? ' positive' : ''} ${isFreeBlocked ? 'val-blur' : ''}`}>
                            {fmt(prixAffiche)} {'€'}
                          </div>
                          <div className="sub">{ecartNegatif ? "Prix d\u2019achat MDB" : 'Plafond \u00e0 ne pas d\u00e9passer'}</div>
                        </>
                      )
                    })()}
                  </>
                ) : (
                  <>
                    <div className="label">REVENTE ESTIM\u00c9E</div>
                    <div className="value" style={{ color: estimationData?.prix_total ? 'var(--success)' : 'var(--ink-mute)' }}>
                      {estimationData?.prix_total ? `${fmt(estimationData.prix_total)} €` : 'NC'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* D\u00e9cote banner */}
            {!isEnchere && ecartPct && (
              <div className={`decote-banner${ecartNegatif ? '' : ' positive'}`}>
                <div>
                  <div className="label">{ecartNegatif ? 'D\u00e9cote \u00e0 n\u00e9gocier' : 'D\u00e9j\u00e0 sous-\u00e9valu\u00e9'}</div>
                  <div className="pct">{ecartNegatif ? '' : '+'}{ecartPct} %</div>
                </div>
                <div className="arrow">{ecartNegatif ? '\u2193' : '\u2191'}</div>
              </div>
            )}

            {/* Surench\u00e8re (ench\u00e8res) */}
            {isEnchere && (bien.date_surenchere || bien.mise_a_prix_surenchere) && (
              <div style={{ padding: '12px 14px', background: '#fffaf0', borderRadius: 'var(--radius-sm)', border: '1.5px solid #f0d090', fontSize: '13px', color: '#6a4a00' }}>
                <div><strong style={{ color: '#8a5a00' }}>Surenchère possible</strong>{bien.date_surenchere ? <> jusqu'au {new Date(bien.date_surenchere).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</> : null}</div>
                {bien.mise_a_prix_surenchere && (
                  <div style={{ marginTop: '3px' }}>Nouvelle mise à prix : <strong>{bien.mise_a_prix_surenchere.toLocaleString('fr-FR')} {'€'}</strong></div>
                )}
                {bien.consignation && (
                  <div style={{ marginTop: '3px', color: '#9a7a50' }}>Consignation : <strong style={{ color: '#6a4a00' }}>{bien.consignation.toLocaleString('fr-FR')} {'€'}</strong></div>
                )}
              </div>
            )}

            {/* KPI row */}
            <div className="kpi-row" data-count={isEnchere ? '2' : '3'}>
              {!isEnchere && (
                <div className="kpi">
                  <div className={`num${!resultatFAI?.rendement_brut ? ' mute' : ''}`}>
                    {resultatFAI?.rendement_brut ? `${Number(resultatFAI.rendement_brut).toFixed(1)} %` : 'NC'}
                  </div>
                  <div className="lbl">Rdt brut</div>
                </div>
              )}
              <div className="kpi">
                <div className={`num${!estimationData?.prix_total ? ' mute' : ''}`}>
                  {estimationData?.prix_total ? `${fmt(estimationData.prix_total)} \u20ac` : 'NC'}
                </div>
                <div className="lbl">{isEnchere ? 'Revente est. DVF' : 'Revente est.'}</div>
              </div>
              <div className="kpi">
                {(() => {
                  if (!estimationData?.prix_total) return (
                    <><div className="num mute">NC</div><div className="lbl">{isEnchere ? 'PV brute' : 'PV nette est.'}</div></>
                  )
                  const pv = Math.round(estimationData.prix_total - bien.prix_fai * (1 + fraisNotaire / 100) - budgetTravCalc)
                  return (
                    <>
                      <div className={`num${isFreeBlocked ? ' val-blur' : ''}`} style={{ color: pv >= 0 ? 'var(--success)' : 'var(--accent)' }}>
                        {pv >= 0 ? '+' : ''}{fmt(pv)} {'€'}
                      </div>
                      <div className="lbl">{isEnchere ? 'PV brute' : 'PV nette est.'}</div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Deal actions */}
            <div className="deal-actions">
              <button onClick={toggleWatchlist} className={`deal-btn-watchlist${inWatchlist ? ' active' : ''}${!userToken ? ' disabled' : ''}`} title={!userToken ? 'Connectez-vous pour ajouter à la watchlist' : ''}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill={inWatchlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                Watchlist
              </button>
              <button onClick={() => setShowSourceModal(true)} className="deal-btn-source">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Source annonce
              </button>
            </div>
          </div>
        </div>

        {/* Bannière stratégie */}
        {(() => {
          type StratKey = 'locataire' | 'travaux' | 'immeuble' | 'division' | 'encheres'
          const stratMap: Record<string, { key: StratKey; title: string; desc: string; href: string; icon: React.ReactNode }> = {
            'Locataire en place': { key: 'locataire', title: 'Locataire en place', desc: 'Forte décote à l\'achat grâce à l\'occupation. Prime d\'éviction (4-8 mois de loyer), puis revente au prix marché libre.', href: '/strategies#s1', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
            'Travaux lourds': { key: 'travaux', title: 'Travaux lourds', desc: 'Bien fortement décoté à rénover. Revente après rénovation à l\'estimation DVF (prix marché "en bon état").', href: '/strategies#s2', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
            'Division': { key: 'division', title: 'Division', desc: 'Grand bien à diviser en plusieurs lots indépendants pour multiplier les loyers ou revendre à la découpe.', href: '/strategies#s3', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
            'Immeuble de rapport': { key: 'immeuble', title: 'Immeuble de rapport', desc: 'Multi-lots achetés en bloc. Création copropriété, revente lot par lot pour une marge nette de 15-25%.', href: '/strategies#s4', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
          }
          const enchereConf = { key: 'encheres' as StratKey, title: 'Vente aux enchères judiciaires', desc: 'Vente par voie judiciaire. Mise à prix fixée par le tribunal, adjudication au plus offrant lors de l\'audience.', href: '/strategies#encheres', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> }
          const conf = isEnchere ? enchereConf : (bien.strategie_mdb ? stratMap[bien.strategie_mdb] : null)
          if (!conf) return null
          return (
            <div className={`strategy-bar strat-${conf.key}`}>
              <div className="sb-icon">{conf.icon}</div>
              <div className="sb-txt"><strong>{conf.title}</strong>{conf.desc}</div>
              <a href={conf.href} className="sb-link">En savoir plus</a>
            </div>
          )
        })()}

        {/* Completion widget */}
        {completableManquants.length > 0 && (
          <div className="completion-widget">
            <div className="cw-txt">
              <strong>Fiche à {pctComplete}% complétée</strong>
              <div className="cw-sub">{completableManquants.length} données manquantes — {completableManquants.slice(0, 3).map(f => f.label).join(', ')}{completableManquants.length > 3 ? '…' : ''}</div>
              <div className="cw-progress"><div className="cw-bar" style={{ width: `${pctComplete}%` }} /></div>
            </div>
            <button className="cw-btn" onClick={() => setShowCompleterModal(true)}>Compléter</button>
          </div>
        )}

        {/* Sticky navigation */}
        <div className="sticky-nav-wrap">
          <nav className="sticky-nav">
            <button className={`sticky-nav-item ${activeNav === 'apercu' ? 'active' : ''}`} onClick={() => scrollToNav('apercu')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              {"Aper\u00E7u"}
            </button>
            <button className={`sticky-nav-item ${activeNav === 'estimation' ? 'active' : ''}`} onClick={() => scrollToNav('estimation')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
              Estimation
            </button>
            <button className={`sticky-nav-item ${activeNav === 'travaux' ? 'active' : ''}`} onClick={() => scrollToNav('travaux')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Diagnostic travaux
            </button>
            <button className={`sticky-nav-item ${activeNav === 'financement' ? 'active' : ''}`} onClick={() => scrollToNav('financement')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              Financement
            </button>
            <button className={`sticky-nav-item ${activeNav === 'fiscalite' ? 'active' : ''}`} onClick={() => scrollToNav('fiscalite')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              {"Fiscalit\u00E9"}
            </button>
          </nav>
        </div>

        {activeNav === 'apercu' && (<div className="tab-panel">
        <div id="nav-apercu" className="section">
          <h2 className="section-title">
            {isIDR ? "Caract\u00E9ristiques de l\u2019immeuble" : "Caract\u00E9ristiques du Bien"}
            {(() => {
              const mi = typeof bien.moteurimmo_data === 'string' ? JSON.parse(bien.moteurimmo_data) : bien.moteurimmo_data
              const creationDate = mi?.creationDate
              if (!creationDate) return null
              const formatted = new Date(creationDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              return <span className="section-title-meta" style={{ fontFamily: 'var(--sans, "DM Sans", sans-serif)', fontSize: '11px', fontWeight: 400, color: 'var(--ink-mute, #a39a8c)' }}>{"En ligne depuis le "}{formatted}</span>
            })()}
          </h2>
          <p className="section-subtitle">{isIDR ? "Donn\u00E9es \u00E0 l\u2019\u00E9chelle de l\u2019immeuble entier" : "Renseignez les donn\u00E9es du bien et son adresse d\u00E8s que vous les avez r\u00E9cup\u00E9r\u00E9es du vendeur"}</p>

          {/* Address-row — interactive, en dehors de la grille */}
          <div
            className={`address-row${adresseRowEditing ? ' editing' : ''}`}
            onClick={() => { if (!adresseRowEditing && userToken) { setAdresseRowEditing(true); setAdresseRowDraft(bien.adresse || '') } }}
          >
            <div className="address-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div className="address-main">
              <span className="address-lbl">{isIDR ? "Adresse de l\u2019immeuble" : "Adresse"}</span>
              <span className="address-val">
                {adresseRowEditing ? (
                  <input
                    className="address-input"
                    autoFocus
                    value={adresseRowDraft}
                    onChange={e => setAdresseRowDraft(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { handleUpdate('adresse', adresseRowDraft); setAdresseRowEditing(false) }
                      if (e.key === 'Escape') { setAdresseRowEditing(false) }
                    }}
                    onBlur={() => { if (adresseRowDraft) handleUpdate('adresse', adresseRowDraft); setAdresseRowEditing(false) }}
                    placeholder="Ex : 12 rue de Rivoli, 75001 Paris"
                  />
                ) : (
                  <span className={bien.adresse ? '' : 'placeholder'} onClick={() => { if (userToken) { setAdresseRowEditing(true); setAdresseRowDraft(bien.adresse || '') } }}>
                    {bien.adresse ? `${bien.adresse}${bien.code_postal ? `, ${bien.code_postal}` : ''} ${bien.ville || ''}`.trim() : "Renseigner l'adresse"}
                  </span>
                )}
              </span>
            </div>
            {!adresseRowEditing && <span className="address-hint">{"Améliore la précision de l'estimation"}</span>}
            {!adresseRowEditing && userToken && (
              <button
                type="button"
                className="address-edit-btn"
                onClick={e => { e.stopPropagation(); setAdresseRowEditing(true); setAdresseRowDraft(bien.adresse || '') }}
                title="Modifier"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
            )}
          </div>

          <div className="data-grid">
            {/* Année construction — show only if non-null */}
            {bien.annee_construction != null && (
              <div className="data-item">
                <span className="data-label">{"Ann\u00E9e de construction"}</span>
                <span className="data-value">{bien.annee_construction}</span>
              </div>
            )}
            {/* DPE — show only if non-null */}
            {bien.dpe && (
              <div className="data-item">
                <span className="data-label">{isIDR ? "DPE moyen" : "DPE"}</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', fontWeight: 700, fontSize: '16px', color: '#fff', background: ({ A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0e034', E: '#f0a830', F: '#eb6a2a', G: '#e42a1e' } as Record<string, string>)[bien.dpe] || '#7a6a60' }}>{bien.dpe}</span>
                </div>
              </div>
            )}
            {/* GES — show only if non-null */}
            {bien.ges && (
              <div className="data-item">
                <span className="data-label">GES</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', fontWeight: 700, fontSize: '16px', color: '#fff', background: ({ A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0e034', E: '#f0a830', F: '#eb6a2a', G: '#e42a1e' } as Record<string, string>)[bien.ges] || '#7a6a60' }}>{bien.ges}</span>
                </div>
              </div>
            )}
            {/* Budget énergie — show only if non-null */}
            {bien.budget_energie_min != null && bien.budget_energie_max != null && (
              <div className="data-item">
                <span className="data-label">Budget énergie</span>
                <span className="data-value">{bien.budget_energie_min}–{bien.budget_energie_max} {'\u20AC'}/an</span>
              </div>
            )}
            {/* Surface */}
            {bien.surface != null && (
              <div className="data-item">
                <span className="data-label">{isIDR ? "Surface totale habitable" : "Surface"}</span>
                <span className="data-value">{bien.surface} m²</span>
              </div>
            )}
            {/* Prix au m² — IDR uniquement */}
            {isIDR && bien.prix_fai && bien.surface && (
              <div className="data-item">
                <span className="data-label">Prix au m²</span>
                <span className="data-value">{Math.round(bien.prix_fai / bien.surface).toLocaleString('fr-FR')} {'\u20AC'}</span>
              </div>
            )}
            {/* Surface terrain — maison uniquement */}
            {(bien.type_bien || '').toLowerCase().includes('maison') && bien.surface_terrain != null && (
              <div className="data-item">
                <span className="data-label">Terrain</span>
                <span className="data-value">{bien.surface_terrain} m²</span>
              </div>
            )}
            {/* Pièces — pas pour IDR */}
            {!isIDR && bien.nb_pieces && (
              <div className="data-item">
                <span className="data-label">{"Pi\u00E8ces"}</span>
                <span className="data-value">{bien.nb_pieces}</span>
              </div>
            )}
            {/* Chambres — pas pour IDR */}
            {!isIDR && bien.nb_chambres != null && (
              <div className="data-item">
                <span className="data-label">Chambres</span>
                <span className="data-value">{bien.nb_chambres}</span>
              </div>
            )}
            {/* Salles de bain — pas pour IDR */}
            {!isIDR && bien.nb_sdb != null && (
              <div className="data-item">
                <span className="data-label">Salles de bain</span>
                <span className="data-value">{bien.nb_sdb}</span>
              </div>
            )}
            {/* Étage — pas pour IDR ni maison */}
            {!isIDR && !(bien.type_bien || '').toLowerCase().includes('maison') && bien.etage && (
              <div className="data-item">
                <span className="data-label">{"Étage"}</span>
                <span className="data-value">{bien.etage}</span>
              </div>
            )}
            {/* Nb étages — IDR uniquement */}
            {isIDR && bien.etage && (
              <div className="data-item">
                <span className="data-label">Nb {"\u00E9tages"}</span>
                <span className="data-value">{bien.etage}</span>
              </div>
            )}
            {/* Chauffage */}
            {(bien.type_chauffage || bien.mode_chauffage) && (
              <div className="data-item">
                <span className="data-label">Chauffage</span>
                <span className="data-value">{[bien.type_chauffage, bien.mode_chauffage].filter(Boolean).join(' / ')}</span>
              </div>
            )}
            {/* Exposition */}
            {bien.exposition && (
              <div className="data-item">
                <span className="data-label">Exposition</span>
                <span className="data-value">{bien.exposition}</span>
              </div>
            )}
            {/* Ascenseur */}
            {bien.ascenseur != null && (
              <div className="data-item">
                <span className="data-label">Ascenseur</span>
                <span className="data-value">{bien.ascenseur ? 'Oui' : 'Non'}</span>
              </div>
            )}
            {/* Cave */}
            {bien.has_cave != null && (
              <div className="data-item">
                <span className="data-label">Cave</span>
                <span className="data-value">{bien.has_cave ? 'Oui' : 'Non'}</span>
              </div>
            )}
            {/* Balcon / Terrasse */}
            {bien.acces_exterieur && (
              <div className="data-item">
                <span className="data-label">Balcon / Terrasse</span>
                <span className="data-value">{bien.acces_exterieur}</span>
              </div>
            )}
            {/* Parking / Garage */}
            {bien.parking_type && (
              <div className="data-item">
                <span className="data-label">Parking / Garage</span>
                <span className="data-value">{bien.parking_type}</span>
              </div>
            )}
            {/* Copropriété */}
            {bien.en_copropriete != null && (
              <div className="data-item">
                <span className="data-label">{"Copropri\u00E9t\u00E9"}</span>
                <span className="data-value">{bien.en_copropriete ? 'Oui' : 'Non'}</span>
              </div>
            )}
            {/* IDR — champs immeuble, toujours affichés */}
            {isIDR && (
              <div className="data-item">
                <span className="data-label">Nb lots</span>
                <CellEditable bien={bien} champ="nb_lots" suffix=" lots" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
            )}
            {isIDR && (
              <div className="data-item">
                <span className="data-label">{"Monopropri\u00E9t\u00E9"}</span>
                {userToken ? (
                  <select value={bien.monopropriete === true ? 'oui' : bien.monopropriete === false ? 'non' : ''} onChange={e => { const v = e.target.value === 'oui' ? true : e.target.value === 'non' ? false : null; setBien((prev: any) => ({ ...prev, monopropriete: v })); handleUpdate('monopropriete', v) }} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", width: 'auto', maxWidth: '80px', color: bien.monopropriete === true ? '#1a7a40' : bien.monopropriete === false ? '#c0392b' : '#7a6a60', background: '#faf8f5', cursor: 'pointer' }}>
                    <option value="">NC</option><option value="oui">Oui</option><option value="non">Non</option>
                  </select>
                ) : (
                  <span className="data-value" style={{ color: bien.monopropriete ? '#1a7a40' : '#7a6a60' }}>{bien.monopropriete === true ? 'Oui' : 'Non'}</span>
                )}
              </div>
            )}
            {isIDR && (
              <div className="data-item">
                <span className="data-label">Compteurs individuels</span>
                {userToken ? (
                  <select value={bien.compteurs_individuels === true ? 'oui' : bien.compteurs_individuels === false ? 'non' : ''} onChange={e => { const v = e.target.value === 'oui' ? true : e.target.value === 'non' ? false : null; setBien((prev: any) => ({ ...prev, compteurs_individuels: v })); handleUpdate('compteurs_individuels', v) }} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", width: 'auto', maxWidth: '80px', color: bien.compteurs_individuels === true ? '#1a7a40' : bien.compteurs_individuels === false ? '#c0392b' : '#7a6a60', background: '#faf8f5', cursor: 'pointer' }}>
                    <option value="">NC</option><option value="oui">Oui</option><option value="non">Non</option>
                  </select>
                ) : (
                  <span className="data-value" style={{ color: bien.compteurs_individuels ? '#1a7a40' : '#7a6a60' }}>{bien.compteurs_individuels === true ? 'Oui' : 'Non'}</span>
                )}
              </div>
            )}
          </div>

          {/* Add-feature-row — dans la section, sous la grille */}
          {completableManquants.length > 0 && (
            <div className="add-feature-row">
              <div className="add-feature-lbl">
                <strong>{completableManquants.length} {completableManquants.length === 1 ? 'caracteristique manquante' : 'caract\u00E9ristiques manquantes'}</strong>
                <br />
                <span style={{ color: 'var(--ink-mute, #a39a8c)', fontSize: '11px' }}>{completableManquants.slice(0, 3).map(f => f.label).join(', ')}{completableManquants.length > 3 ? '\u2026' : ''}</span>
              </div>
              <button className="btn-add" onClick={() => setShowCompleterModal(true)}>
                <span style={{ fontSize: '16px', lineHeight: 0 }}>+</span>
                Ajouter une info
              </button>
            </div>
          )}

          {/* IDR : tableau lots dépliable */}
          {isIDR && (
            <>
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button onClick={() => setShowLotsDetail(!showLotsDetail)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {showLotsDetail ? "Masquer le d\u00E9tail des lots" : "Voir le d\u00E9tail des lots"}
                </button>
              </div>
              <ModalPanel open={showLotsDetail} onClose={() => setShowLotsDetail(false)} title={"D\u00E9tail des lots"} size="large">
                <LotsEditor lots={lots} nbLotsEffectif={nbLotsEffectif} prixFai={bien.prix_fai} userToken={userToken} onSave={async (newLots) => { await handleUpdate('lots_data', { lots: newLots }); }} onCancel={() => setShowLotsDetail(false)} />
              </ModalPanel>
            </>
          )}
        </div>

        {/* CTA "Ajouter données locatives" — Travaux, IDR, Enchères sans loyer */}
        {(isTravauxLourds || isIDR || isEnchere) && bien.loyer == null && userToken && (
          <button
            onClick={() => setShowCompleterModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              width: '100%', padding: '16px 20px',
              background: 'var(--surface, #fff)', borderRadius: 'var(--radius-md, 14px)',
              border: '1.5px dashed var(--line, #e6dccb)',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              transition: 'border-color .2s, background .2s', marginBottom: '16px',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#b4442e'; (e.currentTarget as HTMLElement).style.background = '#fdfaf7' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line, #e6dccb)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface, #fff)' }}
          >
            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--paper, #f5ede2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#b4442e', flexShrink: 0 }}>+</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1210' }}>{"Ajouter des donn\u00E9es locatives"}</div>
              <div style={{ fontSize: '12px', color: '#7a6a60', marginTop: '2px' }}>{"Loyer, charges, profil locataire \u2014 pour activer les indicateurs de rendement"}</div>
            </div>
          </button>
        )}

        {/* Informations Enchères — bloc dédié, stratégie enchère uniquement */}
        {isEnchere && (
          <div className="section">
            <h2 className="section-title">
              {"Informations Ench\u00E8res"}
              {bien.tribunal && <span style={{ fontFamily: 'var(--sans, "DM Sans", sans-serif)', fontSize: '11px', fontWeight: 400, color: 'var(--ink-mute, #a39a8c)' }}>{bien.tribunal}</span>}
            </h2>
            {bien.date_audience && (
              <p className="section-subtitle">
                {"Audience du "}{new Date(bien.date_audience).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {bien.salle_criees ? <>{" \u00B7 "}{bien.salle_criees}</> : null}
              </p>
            )}
            {(() => {
              const prixBase = (bien.prix_adjuge > 0 ? bien.prix_adjuge : bien.mise_a_prix) || 0
              const isMDB = regime === 'marchand_de_biens'
              const frais = bien.mise_a_prix && bien.mise_a_prix > 0 ? calculerFraisEnchere(prixBase, undefined, { isMDB }) : null
              return (
            <div className="data-grid encheres-info-grid">
              {/* 1. Tribunal */}
              {bien.tribunal && (
                <div className="data-item">
                  <span className="data-label">Tribunal</span>
                  <span className="data-value">
                    {bien.tribunal}
                    {isVenteDelocalisee(bien.departement, bien.tribunal) && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 600, background: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: '6px' }} title="La vente se déroule dans un tribunal d'un autre département">{"📍 D\u00E9localis\u00E9e"}</span>
                    )}
                  </span>
                </div>
              )}
              {/* 2. Mise à prix */}
              {bien.mise_a_prix && bien.mise_a_prix > 0 && (
                <div className="data-item">
                  <span className="data-label">{"Mise \u00E0 prix"}</span>
                  <span className="data-value">{bien.mise_a_prix.toLocaleString('fr-FR')} {'\u20AC'}</span>
                </div>
              )}
              {/* 3. Date d'audience */}
              {bien.date_audience && (
                <div className="data-item">
                  <span className="data-label">{"Date d\u2019audience"}</span>
                  <span className="data-value" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(bien.date_audience).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {(() => { const d = Math.ceil((new Date(bien.date_audience).getTime() - Date.now()) / 86400000); return d >= 0 ? ` (J-${d})` : ' (pass\u00E9e)' })()}
                  </span>
                </div>
              )}
              {/* 4. Date de visite */}
              {bien.date_visite && (
                <div className="data-item">
                  <span className="data-label">{"Date de visite"}</span>
                  <span className="data-value" style={{ whiteSpace: 'nowrap' }}>{new Date(bien.date_visite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              )}
              {/* 5. Frais préalables */}
              <div className="data-item">
                <span className="data-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {"Frais pr\u00E9alables"}
                  <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    ?<span className="pnl-tooltip-text" style={{ textTransform: 'none' }}>{"Frais de proc\u00E9dure (commissaire de justice, annonces l\u00E9gales, diagnostics). Communiqu\u00E9s par le tribunal env. 1 semaine avant l\u2019audience. Variables, \u00E0 renseigner si connus."}</span>
                  </span>
                </span>
                <CellEditable bien={bien} champ="frais_preemption" suffix={` \u20AC`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              {/* 6. Frais de mutation */}
              {frais && (
                <div className="data-item">
                  <span className="data-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {"Frais de mutation"}
                    <span style={{ padding: '1px 7px', background: 'var(--success-soft, #d4f5e0)', color: 'var(--success, #1a7a40)', borderRadius: '999px', fontSize: '10px', fontWeight: 600 }}>{`\u2212${Math.round(frais.pct_sans_prealables)}\u00A0%`}</span>
                    <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      ?<span className="pnl-tooltip-text" style={{ textTransform: 'none' }}>{"Frais d\u2019acquisition calcul\u00E9s : \u00E9moluments avocat + droits de mutation + CSI. Hors frais pr\u00E9alables et honoraires (\u00E0 renseigner s\u00E9par\u00E9ment)."}</span>
                    </span>
                  </span>
                  <button onClick={() => setShowFraisModal(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, color: '#1a1210', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '4px', width: '100%', whiteSpace: 'nowrap' }}>
                    {Math.round(frais.total_sans_prealables).toLocaleString('fr-FR')} {'\u20AC'}
                    <span style={{ color: '#a39a8c', fontSize: '11px' }}>›</span>
                  </button>
                </div>
              )}
              {/* 7. Honoraires d'avocat */}
              <div className="data-item">
                <span className="data-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {"Honoraires d\u2019avocat"}
                  <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    ?<span className="pnl-tooltip-text" style={{ textTransform: 'none' }}>{"Honoraires libres \u2014 fix\u00E9s par l\u2019avocat mandat\u00E9 pour vous repr\u00E9senter \u00E0 l\u2019audience. G\u00E9n\u00E9ralement entre 1\u00A0000 et 3\u00A0000\u00A0\u20AC. 1\u00A0500\u00A0\u20AC par d\u00E9faut."}</span>
                  </span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box', background: '#fff', border: '1.5px solid #e8e2d8', borderRadius: '6px', padding: '4px 8px', gap: '4px' }}>
                  <input
                    type="number"
                    value={honorairesAvocat}
                    onChange={e => setHonorairesAvocat(e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={e => { if (e.target.value === '') setHonorairesAvocat(1500) }}
                    placeholder="1500"
                    style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textAlign: 'right', background: 'transparent', color: '#1a1210' }}
                  />
                  <span style={{ fontSize: '13px', color: '#7a6a60', flexShrink: 0 }}>{'\u20AC'}</span>
                </div>
              </div>
              {/* 8. Avocat poursuivant */}
              {/* 8. Avocat poursuivant */}
              {bien.avocat_nom && (
                <div className="data-item">
                  <span className="data-label">Avocat poursuivant</span>
                  <button onClick={() => setShowAvocatModal(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, color: '#1a1210', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', gridColumn: '2 / 4', whiteSpace: 'nowrap' }}>
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--info-soft, #d3deea)', color: 'var(--info, #3a5f7d)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, flexShrink: 0 }}>
                      {bien.avocat_nom.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                    </span>
                    {bien.avocat_nom}
                    <span style={{ color: '#a39a8c', fontSize: '11px', flexShrink: 0 }}>›</span>
                  </button>
                </div>
              )}
              {/* 9. Consignation */}
              {bien.mise_a_prix && bien.mise_a_prix > 0 && (
                <div className="data-item">
                  <span className="data-label">{"Consignation "}<span style={{ color: '#a39a8c', fontWeight: 500 }}>(10 %)</span></span>
                  <span className="data-value">{Math.round((bien.consignation || bien.mise_a_prix * 0.1)).toLocaleString('fr-FR')} {'\u20AC'}</span>
                </div>
              )}
              {/* Prix adjugé et Statut — affichés en fin si disponibles */}
              {bien.prix_adjuge && bien.prix_adjuge > 0 && (
                <div className="data-item">
                  <span className="data-label">{"Prix adjug\u00E9"}</span>
                  <span className="data-value" style={{ fontWeight: 700 }}>{bien.prix_adjuge.toLocaleString('fr-FR')} {'\u20AC'}</span>
                </div>
              )}
              {bien.statut && bien.statut !== 'a_venir' && (
                <div className="data-item">
                  <span className="data-label">Statut</span>
                  <span className="data-value">{({ surenchere: 'En surench\u00E8re', adjuge: 'Adjug\u00E9', vendu: 'Vendu', retire: 'Retir\u00E9', expire: 'Expir\u00E9' } as Record<string, string>)[bien.statut] || bien.statut}</span>
                </div>
              )}
            </div>
              )
            })()}
            {/* Surenchère alert */}
            {(bien.date_surenchere || bien.mise_a_prix_surenchere) && (
              <div style={{ marginTop: '16px', padding: '12px 14px', background: '#efe0d1', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: '#5d3d24' }}>
                <div><strong style={{ color: '#8a5a3c' }}>{"Surench\u00E8re possible pendant 10 jours apr\u00E8s l\u2019adjudication"}</strong>{bien.date_surenchere ? <> {"jusqu\u2019au"} {new Date(bien.date_surenchere).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</> : null}</div>
                {bien.mise_a_prix_surenchere && <div style={{ marginTop: '3px' }}>{"Nouvelle mise \u00E0 prix :"} <strong>{bien.mise_a_prix_surenchere.toLocaleString('fr-FR')} {'\u20AC'}</strong></div>}
                {bien.consignation && <div style={{ marginTop: '3px' }}>{"Consignation :"} <strong>{bien.consignation.toLocaleString('fr-FR')} {'\u20AC'}</strong></div>}
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#7a5a3a' }}>{"Un tiers peut surench\u00E9rir de 10\u00A0% minimum dans les 10 jours suivant la vente. L\u2019adjudicataire final est celui de la seconde audience."}</div>
              </div>
            )}
            {/* Documents juridiques */}
            {bien.documents && (() => {
              const docs = typeof bien.documents === 'string' ? JSON.parse(bien.documents) : bien.documents
              if (!docs || docs.length === 0) return null
              const icons: Record<string, string> = { ccv: '\uD83D\uDCCB', pv: '\uD83D\uDCDD', diag: '\uD83C\uDFE5', affiche: '\uD83D\uDCE2', autre: '\uD83D\uDCC4' }
              return (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{"Documents Juridiques"}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {docs.map((doc: any, i: number) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#faf8f5', borderRadius: '8px', border: '1px solid #e8e2d8', textDecoration: 'none', color: '#1a1210', fontSize: '12px', fontWeight: 500 }}>
                        <span style={{ fontSize: '14px' }}>{icons[doc.type] || icons.autre}</span>
                        {doc.label || doc.type}
                        <span style={{ color: '#7a6a60', marginLeft: '4px' }}>{"↗"}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Données Locatives — LEP et IDR toujours, autres stratégies si loyer rempli (enchères incluses) */}
        {(bien.strategie_mdb === 'Locataire en place' || isIDR || bien.loyer != null) && (
          <div className="section">
            <h2 className="section-title">
              {isIDR ? "Donn\u00E9es locatives \u00B7 agr\u00E9g\u00E9es" : "Donn\u00E9es Locatives"}
              {isIDR && bien.nb_lots ? (
                <span style={{ fontFamily: 'var(--sans, "DM Sans", sans-serif)', fontSize: '11px', fontWeight: 400, color: 'var(--ink-mute, #a39a8c)' }}>{"Totaux des "}{bien.nb_lots}{" lots"}</span>
              ) : (
                <span style={{ fontFamily: 'var(--sans, "DM Sans", sans-serif)', fontSize: '11px', fontWeight: 400, color: 'var(--ink-mute, #a39a8c)' }}>{"Soumises par la communaut\u00E9"}</span>
              )}
            </h2>
            <p className="section-subtitle">{isIDR ? "Somme des loyers et charges \u00E0 l\u2019\u00E9chelle de l\u2019immeuble" : "Cliquez sur une valeur pour la saisir ou la modifier"}</p>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">{isIDR ? "Loyer total" : <>"Loyer "<span className="k-unit">/mois</span></>}</span>
                <CellEditable bien={bien} champ="loyer" suffix={` \u20AC`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              {!isIDR && (
                <div className="data-item">
                  <span className="data-label">Type loyer</span>
                  <CellTypeLoyer bien={bien} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
                </div>
              )}
              <div className="data-item">
                <span className="data-label">{isIDR ? "Charges r\u00E9cup. totales" : <>"Charges r\u00E9cup." <span className="k-unit">/mois</span></>}</span>
                <CellEditable bien={bien} champ="charges_rec" suffix={` \u20AC`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              <div className="data-item">
                <span className="data-label">{isIDR ? "Charges copro totales" : <>"Charges copro " <span className="k-unit">/mois</span></>}</span>
                <CellEditable bien={bien} champ="charges_copro" suffix={` \u20AC`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              <div className="data-item">
                <span className="data-label">{isIDR ? "Taxe fonci\u00E8re globale" : <>"Taxe fonci\u00E8re" <span className="k-unit">/an</span></>}</span>
                <CellEditable bien={bien} champ="taxe_fonc_ann" suffix={` \u20AC`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              {!isIDR && (
                <div className="data-item">
                  <span className="data-label">Profil locataire</span>
                  {userToken ? (() => {
                    const isEmpty = !bien.profil_locataire || bien.profil_locataire === 'NC'
                    return (
                      <div style={{ position: 'relative', width: '100%' }}>
                        <select
                          value={bien.profil_locataire && bien.profil_locataire !== 'NC' ? bien.profil_locataire : ''}
                          onChange={async e => {
                            const val = e.target.value || null
                            setBien((prev: any) => ({ ...prev, profil_locataire: val }))
                            if (val) await handleUpdate('profil_locataire', val)
                          }}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '4px 22px 4px 8px', borderRadius: '6px',
                            border: `1.5px solid ${isEmpty ? '#c0392b' : '#e8e2d8'}`,
                            fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
                            background: isEmpty ? '#fde8e8' : '#faf8f5',
                            color: isEmpty ? '#a39a8c' : '#1a1210',
                            cursor: 'pointer', outline: 'none',
                            appearance: 'none', WebkitAppearance: 'none',
                            textAlign: 'right',
                          } as React.CSSProperties}
                        >
                          <option value="">NC</option>
                          {['Actif CDI', 'Actif CDD / int\u00E9rim', 'Ind\u00E9pendant', 'Retrait\u00E9', '\u00C9tudiant', 'Inconnu'].map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                        <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#7a6a60', pointerEvents: 'none' }}>{'▾'}</span>
                      </div>
                    )
                  })() : (
                    <span className={`data-value ${!bien.profil_locataire || bien.profil_locataire === 'NC' ? 'nc' : ''}`}>
                      {bien.profil_locataire && bien.profil_locataire !== 'NC' ? bien.profil_locataire : 'NC'}
                    </span>
                  )}
                </div>
              )}
              {!isIDR && (
                <div className="data-item">
                  <span className="data-label">Fin de bail</span>
                  <input
                    type="date"
                    defaultValue={bien.fin_bail && bien.fin_bail !== 'inconnu' && bien.fin_bail !== 'NC' ? bien.fin_bail.slice(0, 10) : ''}
                    onBlur={async (e) => {
                      const val = e.target.value
                      if (!val || !userToken) return
                      await fetch(`/api/biens/${bien.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
                        body: JSON.stringify({ fin_bail: val })
                      })
                      setBien((prev: any) => ({ ...prev, fin_bail: val }))
                    }}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '3px 6px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', background: '#faf8f5', color: '#1a1210', outline: 'none' }}
                  />
                </div>
              )}
              <div className="data-item">
                <span className="data-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Rendement brut
                  <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{`Indicateur simple de rentabilit\u00E9 locative, avant toute charge et imp\u00F4t.\n\nCalcul : loyer annuel / prix d\u2019achat FAI\n${bien.loyer ? `${fmt(Math.round(bien.loyer * 12))}\u00A0\u20AC / ${fmt(bien.prix_fai)}\u00A0\u20AC = ${(bien.rendement_brut * 100).toFixed(2)}\u00A0%` : ''}\n\nNe tient pas compte des charges, cr\u00E9dit, fiscalit\u00E9 ni travaux. Pour une vision compl\u00E8te, consultez le Cash Flow Net d\u2019Imp\u00F4t dans l\u2019analyse fiscale.`}</span></span>
                </span>
                <span className="data-value" style={{ color: '#c0392b' }}>{bien.rendement_brut ? `${(bien.rendement_brut * 100).toFixed(2)} %` : 'NC'}</span>
              </div>
            </div>
            <div className="legende">
              <div className="legende-item"><div className="legende-dot" style={{ background: 'var(--accent, #b4442e)' }}></div>Manquant</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: 'var(--info, #3a5f7d)' }}></div>Simulation</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#e8b843' }}></div>{"1 utilisateur"}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: 'var(--success, #2f7d5b)' }}></div>{"Valid\u00E9 2+"}</div>
            </div>
            {!userToken && <p style={{ fontSize: '12px', color: '#b0a898', marginTop: '12px', fontStyle: 'italic' }}>{"Connectez-vous pour compléter les données manquantes"}</p>}
            {/* IDR : taux occupation + loyers par lot dépliable */}
            {isIDR && (
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button onClick={() => setShowLotsDetail(true)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {"Voir le d\u00E9tail des lots"}
                </button>
              </div>
            )}
          </div>
        )}
        </div>)}

        {(activeNav === 'estimation' || activeNav === 'travaux' || activeNav === 'financement') && (<div className="tab-panel">
        <div id="nav-estimation" className="two-cols">
        <div className="col" style={{ display: activeNav === 'estimation' ? '' : 'none' }}>
        {(() => {
          const isFreeBlocked = userPlan === 'free' && freeAnalysesLeft <= 0
          return (
            <div style={isFreeBlocked ? { position: 'relative' } : {}}>
              {userPlan === 'free' && freeAnalysesLeft > 0 && (
                <div style={{
                  background: 'rgba(26,122,64,0.06)', border: '1px solid rgba(26,122,64,0.15)',
                  borderRadius: 10, padding: '10px 16px', marginBottom: 16,
                  fontSize: 13, color: '#1a7a40', fontWeight: 500
                }}>
                  {`\u2728 Analyse compl\u00E8te offerte (${freeAnalysesUsed}/2 utilis\u00E9es) \u2014 d\u00E9couvrez ce que le plan Pro vous r\u00E9serve !`}
                </div>
              )}
              <EstimationSection bienId={id} prixFai={bien.prix_fai} surface={bien.surface} adresseInitiale={bien.adresse} villeInitiale={bien.ville} userToken={userToken} onEstimationLoaded={setEstimationData} isFree={isFreeBlocked} estimationApiBase={isEnchere ? '/api/estimation/encheres' : undefined} labelPrix={isEnchere ? (bien.prix_adjuge > 0 ? <>{"Prix adjug\u00e9"}</> : <>{"Mise \u00e0 prix"}</>) : undefined} estimationInitiale={bien.estimation_details} estimationDateInitiale={bien.estimation_date}
                extra={isIDR && nbLotsEffectif > 0 ? (
                  <div style={{ marginTop: '4px', textAlign: 'center' }}>
                    <button onClick={() => setShowReventeLots(!showReventeLots)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#2a4a8a', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      {showReventeLots ? "Masquer la revente par lot" : "Estimer la revente par lot"}
                    </button>
                    <ModalPanel open={showReventeLots} onClose={() => setShowReventeLots(false)} title="Estimer la revente par lot">
                      <div style={{ textAlign: 'left' }}>
                        <div className="lots-table-wrap"><table className="lots-table">
                          <thead><tr><th>Lot</th><th>Type</th><th>Surface</th><th>{"Prix/m\u00B2"}</th><th>{"Prix revente"}</th></tr></thead>
                          <tbody>
                            {Array.from({ length: Math.max(nbLotsEffectif, lots.length) }).map((_, i) => {
                              const lot = lots[i] || {}
                              const prixM2DVF = estimationData?.prix_m2 || (bien.estimation_prix_total && bien.surface ? Math.round(bien.estimation_prix_total / bien.surface) : 0)
                              const prixEstime = lot.surface && prixM2DVF ? Math.round(lot.surface * prixM2DVF) : 0
                              return (
                                <tr key={i}>
                                  <td style={{ fontWeight: 600 }}>{i + 1}</td>
                                  <td>{lot.type || 'NC'}</td>
                                  <td>{lot.surface ? `${lot.surface} m\u00B2` : 'NC'}</td>
                                  <td style={{ color: '#7a6a60' }}>{prixM2DVF ? `${prixM2DVF.toLocaleString('fr-FR')} \u20AC` : '-'}</td>
                                  <td><input type="number" value={(prixReventeLots[i] !== undefined ? prixReventeLots[i] : prixEstime) || ''} onChange={e => setPrixReventeLots(prev => ({ ...prev, [i]: Number(e.target.value) }))} placeholder={prixEstime ? String(prixEstime) : '0'} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', width: '110px', fontFamily: "'DM Sans', sans-serif", background: '#fff', textAlign: 'right' }} /></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table></div>
                        <div style={{ textAlign: 'center', marginTop: '8px' }}>
                          <button onClick={() => {
                            const pm2 = estimationData?.prix_m2 || (bien.estimation_prix_total && bien.surface ? Math.round(bien.estimation_prix_total / bien.surface) : 0)
                            if (!pm2) return
                            const newPrix: Record<number, number> = {}
                            Array.from({ length: Math.max(nbLotsEffectif, lots.length) }).forEach((_, i) => {
                              const lot = lots[i] || {}
                              if (lot.surface) newPrix[i] = Math.round(lot.surface * pm2)
                            })
                            setPrixReventeLots(newPrix)
                          }} style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: '#2a4a8a', background: '#f0f4ff', border: '1px solid #d4ddf5', borderRadius: '6px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                            {"Appliquer l\u2019estimation DVF/m\u00B2 \u00E0 tous les lots"}
                          </button>
                        </div>
                        {(() => {
                          const prixM2DVF = estimationData?.prix_m2 || (bien.estimation_prix_total && bien.surface ? Math.round(bien.estimation_prix_total / bien.surface) : 0)
                          const totalRevente = Array.from({ length: Math.max(nbLotsEffectif, lots.length) }).reduce<number>((sum, _, i) => {
                            const lot = lots[i] || {}
                            return sum + (prixReventeLots[i] ?? (lot.surface && prixM2DVF ? Math.round(lot.surface * prixM2DVF) : 0))
                          }, 0)
                          const prixAchat = bien.prix_fai || 0
                          const fraisNotaireAchat = Math.round(prixAchat * fraisNotaire / 100)
                          const coutCopro = (coutGeometreParLot + coutReglementCoproParLot + coutCompteursParLot) * nbLotsEffectif
                          const prixNetVendeurAchatIDR = fraisAgenceNum > 0 ? Math.round(prixAchat / (1 + fraisAgenceNum / 100)) : prixAchat
                          const fraisNotaireRevente = Math.round(totalRevente * 2.5 / 100) // 2.5% MdB
                          const margeBrute = totalRevente - prixAchat - fraisNotaireAchat - coutCopro - coutTravauxGlobal - fraisNotaireRevente
                          const margeTVA = Math.max(0, totalRevente - prixNetVendeurAchatIDR)
                          const tvaMarge = Math.round(margeTVA * 20 / 120)
                          const isBase = Math.max(0, margeBrute - tvaMarge)
                          const isTotal = Math.round(Math.min(isBase, 42500) * 0.15 + Math.max(0, isBase - 42500) * 0.25)
                          const margeNette = margeBrute - tvaMarge - isTotal
                          return totalRevente > 0 ? (
                            <div style={{ marginTop: '16px', borderTop: '1px solid #e8e2d8', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px' }}>
                              <span style={{ color: '#7a6a60' }}>Revente totale</span><span style={{ textAlign: 'right', fontWeight: 600, color: '#1a7a40' }}>{totalRevente.toLocaleString('fr-FR')} {'\u20AC'}</span>
                              <span style={{ color: '#7a6a60' }}>{"Co\u00FBts totaux"}</span><span style={{ textAlign: 'right', color: '#c0392b' }}>-{(prixAchat + fraisNotaireAchat + coutCopro + coutTravauxGlobal + fraisNotaireRevente).toLocaleString('fr-FR')} {'\u20AC'}</span>
                              <span style={{ color: '#7a6a60' }}>Marge brute</span><span style={{ textAlign: 'right', fontWeight: 700, color: margeBrute >= 0 ? '#1a7a40' : '#c0392b' }}>{margeBrute >= 0 ? '+' : ''}{margeBrute.toLocaleString('fr-FR')} {'\u20AC'}</span>
                              <span style={{ color: '#7a6a60' }}>TVA marge + IS</span><span style={{ textAlign: 'right', color: '#c0392b' }}>-{(tvaMarge + isTotal).toLocaleString('fr-FR')} {'\u20AC'}</span>
                              <span style={{ fontWeight: 700 }}>Marge nette MdB</span><span style={{ textAlign: 'right', fontWeight: 800, fontSize: '15px', fontFamily: "'Fraunces', serif", color: margeNette >= 0 ? '#1a7a40' : '#c0392b' }}>{margeNette >= 0 ? '+' : ''}{margeNette.toLocaleString('fr-FR')} {'\u20AC'}</span>
                            </div>
                          ) : null
                        })()}
                      </div>
                    </ModalPanel>
                  </div>
                ) : undefined}
              />
            </div>
          )
        })()}

        {/* Cashflow brut (dans colonne gauche) */}
        {!peutCalculer && !isTravauxLourds && !bien.prix_fai && (
          <div className="section"><div className="nc-warning">Le prix est manquant — impossible de calculer.</div></div>
        )}
        </div>{/* fin col gauche */}

        <div className="col" style={{ display: (activeNav === 'travaux' || activeNav === 'financement') ? '' : 'none' }}>
        {/* Estimation travaux (toutes strategies) */}
        <div id="nav-travaux" className="section" style={{ display: activeNav === 'travaux' ? '' : 'none', borderTop: '3px solid var(--warning, #c77f1f)' }}>
          <h2 className="section-title">
            {bien.strategie_mdb === 'Travaux lourds' ? 'Diagnostic travaux' : 'Estimation travaux'}
            <span className="section-meta">Score IA · Analyse photos + description</span>
          </h2>
          <p className="section-subtitle">{"Évaluation automatique du budget rénovation selon la grille Mon Petit MDB"}</p>

          {isFreeBlocked && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff8f0', border: '1.5px solid #f0d090', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: '#1a1210', fontWeight: 600 }}>{"D\u00E9bloquez le diagnostic travaux"}</span>
              <a href="/mon-profil" style={{ display: 'inline-block', padding: '7px 18px', borderRadius: 8, background: '#c0392b', color: '#fff', fontWeight: 600, fontSize: 12, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                {"D\u00E9bloquer \u2192"}
              </a>
            </div>
          )}

          {(() => {
            const scoreUtilise = scorePerso || bien.score_travaux
            const scoreAffiche = scoreUtilise || 0
            const isManual = !!scorePerso && scorePerso !== bien.score_travaux
            const budgetM2 = scoreUtilise ? (budgetTravauxM2[String(scoreUtilise)] || 0) : 0
            const totalScore = scoreUtilise && bien.surface ? Math.round(budgetM2 * bien.surface) : 0
            const totalAffiche = hasDetail ? budgetDetailTotal : totalScore
            const scoreData = SCORE_LABELS[scoreAffiche]
            const tvaRecup = totalAffiche > 0 ? Math.round(totalAffiche * 0.20) : 0

            return (
              <>
                <div className={`travaux-score${isManual ? ' is-manual' : ''}`}>
                  {/* Cercle score */}
                  <div className={`score-circle${isFreeBlocked ? ' val-blur' : ''}`}>
                    <span className="sc-big">{scoreAffiche || '?'}</span>
                    <span className="sc-small">/ 5</span>
                  </div>

                  {/* Info */}
                  <div className="score-info">
                    <div className="si-label">{isManual ? 'Mon estimation' : 'Score travaux · IA'}</div>
                    <div className={`si-h4${isFreeBlocked ? ' val-blur' : ''}`}>
                      {scoreData ? scoreData.label : 'Aucun score disponible'}
                    </div>
                    {bien.score_commentaire && (
                      <p className={`si-p${isFreeBlocked ? ' val-blur' : ''}`}>{bien.score_commentaire}</p>
                    )}
                    {userToken && (
                      <div className="score-stepper">
                        {[1, 2, 3, 4, 5].map(i => {
                          const isActive = scoreAffiche === i
                          const isIa = isActive && bien.score_travaux === i && !isManual
                          return (
                            <button
                              key={i}
                              className={`ss-step${isActive ? (isIa ? ' is-active is-ia' : ' is-active') : ''}`}
                              title={SCORE_LABELS[i]?.label}
                              onClick={() => handleScorePerso(i)}
                            >
                              <span>{i}</span>
                            </button>
                          )
                        })}
                        {isManual && (
                          <button className="ss-reset" onClick={() => handleScorePerso(scorePerso)}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                            IA
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Budget */}
                  {totalAffiche > 0 && (
                    <div className="score-budget">
                      <div className="sb-lbl">{hasDetail ? 'Budget (par poste)' : 'Budget estim\u00E9'}</div>
                      <div className={`sb-amount${isFreeBlocked ? ' val-blur' : ''}`}>
                        {totalAffiche.toLocaleString('fr-FR')} {'\u20AC'}
                      </div>
                      {bien.surface && (
                        <div className={`sb-calc${isFreeBlocked ? ' val-blur' : ''}`}>
                          {hasDetail
                            ? `${Math.round(totalAffiche / bien.surface)} \u20AC/m\u00B2 \u00D7 ${bien.surface} m\u00B2`
                            : `${budgetM2} \u20AC/m\u00B2 \u00D7 ${bien.surface} m\u00B2`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* TVA sur marge */}
                {tvaRecup > 0 && (
                  <div className="tva-block">
                    <div className="txt">
                      <strong>TVA sur marge activable en régime MdB</strong>
                      {`Sur ce budget travaux, la TVA r\u00E9cup\u00E9rable est d\u2019environ ${tvaRecup.toLocaleString('fr-FR')}\u00A0\u20AC (20\u00A0%). Int\u00E9gr\u00E9 dans l\u2019analyse fiscale.`}
                    </div>
                  </div>
                )}

                {/* Bouton Affiner */}
                {scoreUtilise && bien.surface && (
                  <div style={{ textAlign: 'center', marginTop: '14px' }}>
                    <button onClick={() => setShowDetailTravaux(!showDetailTravaux)} style={{
                      background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px',
                      padding: '7px 20px', fontSize: '12px', fontWeight: 600, color: '#7a6a60',
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                      display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all .15s'
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      {showDetailTravaux ? 'Masquer le d\u00E9tail' : 'Affiner le budget travaux'}
                    </button>
                    {hasDetail && !showDetailTravaux && (
                      <div style={{ marginTop: '6px' }}>
                        <span onClick={() => setDetailTravaux({})} style={{ fontSize: '11px', color: '#c0392b', cursor: 'pointer', textDecoration: 'underline' }}>
                          {"R\u00E9initialiser au score"}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Detail par poste — modal */}
                <ModalPanel open={showDetailTravaux} onClose={() => setShowDetailTravaux(false)} title="Affiner le budget travaux">
                  <div style={{ marginTop: '16px', background: '#faf8f5', borderRadius: '12px', padding: '16px 20px', border: '1px solid #f0ede8' }}>
                    {(['entretien', 'amelioration', 'construction'] as const).map(type => {
                      const postes = POSTES_TRAVAUX.filter(p => p.type === type)
                      const typeLabels = { entretien: 'Entretien / r\u00E9paration', amelioration: 'Am\u00E9lioration', construction: 'Construction / gros \u0153uvre' }
                      const typeInfos = {
                        entretien: "D\u00E9ductible en nu r\u00E9el (d\u00E9ficit foncier), amortissable en BIC/SCI IS",
                        amelioration: "D\u00E9ductible en nu r\u00E9el, amortissable en BIC/SCI IS",
                        construction: "Non d\u00E9ductible en nu r\u00E9el, amortissable en BIC/SCI IS"
                      }
                      const typeColors = { entretien: '#1a7a40', amelioration: '#2a4a8a', construction: '#c0392b' }
                      return (
                        <div key={type} style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', paddingBottom: '4px', borderBottom: `2px solid ${typeColors[type]}20` }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: typeColors[type], textTransform: 'uppercase', letterSpacing: '0.06em' }}>{typeLabels[type]}</span>
                            <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '10px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '13px', height: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{typeInfos[type]}</span></span>
                          </div>
                          {postes.map(poste => {
                            const d = detailTravaux[poste.id]
                            const qte = d?.qte || 0
                            const prix = d?.prix ?? poste.prixM2
                            const total = qte * prix
                            const unite = poste.mode === 'surface' ? 'm\u00B2' : 'unit\u00E9(s)'
                            const qteDefaut = poste.mode === 'surface' ? (bien.surface || 0) : poste.qteDefaut
                            return (
                              <div key={poste.id} style={{ display: 'grid', gridTemplateColumns: '160px 65px 45px 12px 70px 35px 1fr', alignItems: 'center', gap: '6px', padding: '6px 0', borderBottom: '1px solid #f0ede8' }}>
                                <span style={{ fontSize: '13px', color: '#555' }}>{poste.label}</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={qte || ''}
                                  placeholder={poste.mode === 'surface' ? `${qteDefaut}` : `${qteDefaut}`}
                                  onChange={e => {
                                    const v = Number(e.target.value) || 0
                                    setDetailTravaux(prev => ({ ...prev, [poste.id]: { qte: v, prix } }))
                                  }}
                                  onFocus={e => { if (!qte && qteDefaut) setDetailTravaux(prev => ({ ...prev, [poste.id]: { qte: qteDefaut, prix } })) }}
                                  style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '12px', textAlign: 'right', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                                />
                                <span style={{ fontSize: '11px', color: '#b0a898' }}>{unite}</span>
                                <span style={{ fontSize: '11px', color: '#b0a898', textAlign: 'center' }}>{'\u00D7'}</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={prix || ''}
                                  onChange={e => {
                                    const v = Number(e.target.value) || 0
                                    setDetailTravaux(prev => ({ ...prev, [poste.id]: { qte, prix: v } }))
                                  }}
                                  style={{ width: '100%', padding: '4px 6px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '12px', textAlign: 'right', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                                />
                                <span style={{ fontSize: '11px', color: '#b0a898' }}>{poste.mode === 'surface' ? '\u20AC/m\u00B2' : '\u20AC'}</span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: total > 0 ? '#a06010' : '#c0b0a0', textAlign: 'right' }}>
                                  {total > 0 ? `${Math.round(total).toLocaleString('fr-FR')} \u20AC` : '-'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '2px solid #e8e2d8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1210' }}>Total</span>
                        {hasDetail && (
                          <span onClick={() => setDetailTravaux({})} style={{ fontSize: '11px', color: '#c0392b', cursor: 'pointer', textDecoration: 'underline' }}>
                            {"R\u00E9initialiser"}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'Fraunces', serif", color: '#a06010' }}>{Math.round(budgetDetailTotal).toLocaleString('fr-FR')} {'\u20AC'}</span>
                    </div>
                  </div>
                </ModalPanel>
              </>
            )
          })()}

          {/* IDR : Coûts création copropriété — intégré dans le bloc travaux */}
          {isIDR && nbLotsEffectif > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ marginTop: '8px', textAlign: 'center' }}>
                <button onClick={() => setShowCoutsCopro(!showCoutsCopro)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#a06010', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {showCoutsCopro ? "Masquer les co\u00FBts copro" : "Estimer les co\u00FBts de cr\u00E9ation de copropri\u00E9t\u00E9"}
                </button>
              </div>
              <ModalPanel open={showCoutsCopro} onClose={() => setShowCoutsCopro(false)} title={"Co\u00FBts de cr\u00E9ation de copropri\u00E9t\u00E9"}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px 12px', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: '#7a6a60', fontWeight: 600 }}>{"\u00C9tat descriptif (g\u00E9om\u00E8tre)"}</span>
                    <input type="number" value={coutGeometreParLot} onChange={e => setCoutGeometreParLot(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', width: '90px', fontFamily: "'DM Sans', sans-serif", background: '#fff', textAlign: 'right' }} />
                    <span style={{ color: '#7a6a60' }}>{'\u20AC'} / lot</span>

                    <span style={{ color: '#7a6a60', fontWeight: 600 }}>{"R\u00E8glement de copropri\u00E9t\u00E9"}</span>
                    <input type="number" value={coutReglementCoproParLot} onChange={e => setCoutReglementCoproParLot(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', width: '90px', fontFamily: "'DM Sans', sans-serif", background: '#fff', textAlign: 'right' }} />
                    <span style={{ color: '#7a6a60' }}>{'\u20AC'} / lot</span>

                    <span style={{ color: '#7a6a60', fontWeight: 600 }}>Compteurs individuels</span>
                    <input type="number" value={coutCompteursParLot} onChange={e => setCoutCompteursParLot(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', width: '90px', fontFamily: "'DM Sans', sans-serif", background: '#fff', textAlign: 'right' }} />
                    <span style={{ color: '#7a6a60' }}>{'\u20AC'} / lot{bien.compteurs_individuels ? " (d\u00E9j\u00E0 ind.)" : ''}</span>

                    <span style={{ color: '#7a6a60', fontWeight: 600 }}>Travaux divers</span>
                    <input type="number" value={coutTravauxGlobal} onChange={e => setCoutTravauxGlobal(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', width: '90px', fontFamily: "'DM Sans', sans-serif", background: '#fff', textAlign: 'right' }} />
                    <span style={{ color: '#7a6a60' }}>{'\u20AC'} global</span>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #e8e2d8' }}>
                    <span style={{ fontSize: '12px', color: '#7a6a60' }}>{`(${coutGeometreParLot.toLocaleString('fr-FR')} + ${coutReglementCoproParLot.toLocaleString('fr-FR')} + ${coutCompteursParLot.toLocaleString('fr-FR')}) \u00D7 ${nbLotsEffectif} lots + ${coutTravauxGlobal.toLocaleString('fr-FR')} \u20AC`}</span>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 800, color: '#a06010' }}>
                      {((coutGeometreParLot + coutReglementCoproParLot + coutCompteursParLot) * nbLotsEffectif + coutTravauxGlobal).toLocaleString('fr-FR')} {'\u20AC'}
                    </span>
                  </div>
              </ModalPanel>
            </div>
          )}
        </div>

        {activeNav === 'financement' && (peutCalculer || (isTravauxLourds && bien.prix_fai)) && (
          <div id="nav-financement" className="fin-grid">
            {/* Colonne gauche : paramètres */}
            <div className="section">
              <h2 className="section-title">Simulateur de financement</h2>
              <p className="section-subtitle">{"Ajustez les param\u00E8tres pour calculer vos mensualit\u00E9s"}</p>
              {isEnchere && (
                <div className="fin-block">
                  <div className="fin-label">Prix d{'\''}enchère simulé</div>
                  <div className="fin-chip-group">
                    <button className={`fin-chip ${enchereFinMode === 'mise_a_prix' ? 'active' : ''}`} onClick={() => setEnchereFinMode('mise_a_prix')}>Mise à prix</button>
                    <button className={`fin-chip ${enchereFinMode === 'calcule' ? 'active' : ''}`} onClick={() => setEnchereFinMode('calcule')}>{`Enchère max (obj. ${objectifPV || 20}% PV)`}</button>
                    <button className={`fin-chip ${enchereFinMode === 'libre' ? 'active' : ''}`} onClick={() => setEnchereFinMode('libre')}>Enchère max libre</button>
                  </div>
                  {enchereFinMode === 'libre' && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
                      <input
                        type="number"
                        placeholder="Mon prix max…"
                        value={enchereManuelMax || ''}
                        onChange={ev => setEnchereManuelMax(ev.target.value ? Number(ev.target.value) : null)}
                        className="fin-field"
                        style={{ flex: 1 }}
                      />
                      {enchereManuelMax && (
                        <button onClick={() => setEnchereManuelMax(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a6a60', fontSize: '18px', padding: '4px', lineHeight: 1 }}>{'×'}</button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {prixCibleCombine && !isEnchere && (
                <div className="fin-block">
                  <div className="fin-label">Base de calcul <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{"D\u00E9termine le prix utilis\u00E9 pour calculer le montant du projet et l\u2019emprunt.\n\n\u2022 Prix FAI : le prix affich\u00E9 dans l\u2019annonce (frais d\u2019agence inclus). Utile pour simuler l\u2019achat au prix demand\u00E9.\n\n\u2022 Prix cible : le prix id\u00E9al calcul\u00E9 selon votre objectif de cashflow ou de plus-value. Utile pour pr\u00E9parer une offre."}</span></span></div>
                  <div className="fin-chip-group">
                    <button className={`fin-chip ${baseCalc === 'fai' ? 'active' : ''}`} onClick={() => setBaseCalc('fai')}>Prix FAI</button>
                    <button className={`fin-chip ${baseCalc === 'cible' ? 'active' : ''}`} onClick={() => setBaseCalc('cible')}>Prix cible</button>
                  </div>
                </div>
              )}
              <div className="fin-block">
                <div className="fin-label">Montant du projet (frais notaire inclus)</div>
                <div className="fin-calc-field">{fmt(Math.round(montantProjet))} {'\u20AC'}</div>
                <div className="fin-hint">{isEnchere ? `Prix enchère : ${fmt(prixBase)} €` : `Base : ${fmt(prixBase)} € + ${fraisNotaire}% notaire`}{budgetTravCalc > 0 ? ` + ${fmt(budgetTravCalc)} € travaux` : ''}</div>
              </div>
              <div className="fin-block">
                <div className="fin-label">Apport — {apportPct} % du projet ({fmt(apportNum)} {'\u20AC'})</div>
                <input type="range" className="fin-slider" min={0} max={100} step={0.5} value={apportPct}
                  style={{ '--val': apportPct } as React.CSSProperties}
                  onChange={e => { const pct = Number(e.target.value); setApport(Math.round(montantProjet * pct / 100)) }} />
                <div className="fin-slider-labels"><span>0 %</span><span>100 %</span></div>
                <input className="fin-field" type="number" value={apport} onChange={e => setApport(e.target.value === '' ? '' : Number(e.target.value))} onBlur={e => { if (e.target.value === '') setApport(profil?.apport ?? 0) }} placeholder={"Montant en \u20AC"} />
                <div className="fin-hint">{"Montant emprunt\u00E9"} : <strong style={{ color: '#1f1b16' }}>{fmt(montantEmprunte)} {'\u20AC'}</strong></div>
              </div>
              <div className="fin-block">
                <div className="fin-label">Type de cr{'\u00E9'}dit <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{"Choisissez le type de cr\u00E9dit pour votre simulation.\n\n\u2022 Amortissable : vous remboursez le capital + les int\u00E9r\u00EAts chaque mois. Mensualit\u00E9 plus \u00E9lev\u00E9e mais le capital emprunt\u00E9 diminue au fil du temps. Dur\u00E9e : 5 \u00E0 30\u00A0ans.\n\n\u2022 In fine : vous ne payez que les int\u00E9r\u00EAts chaque mois. Le capital est rembours\u00E9 en une seule fois \u00E0 la revente du bien. Mensualit\u00E9 plus faible, utilis\u00E9 par les marchands de biens. Dur\u00E9e : 1 \u00E0 5\u00A0ans."}</span></span></div>
                <div className="fin-chip-group">
                  <button type="button" className={`fin-chip ${typeCredit === 'amortissable' ? 'active' : ''}`} onClick={() => setTypeCredit('amortissable')}>Amortissable</button>
                  <button type="button" className={`fin-chip ${typeCredit === 'in_fine' ? 'active' : ''}`} onClick={() => setTypeCredit('in_fine')}>In fine</button>
                </div>
                {typeCredit === 'in_fine' && <div className="fin-hint">{"Int\u00E9r\u00EAts seuls chaque mois, capital rembours\u00E9 \u00E0 la revente"}</div>}
              </div>
              <div className="fin-block">
                <div className="fin-label">{"Taux cr\u00E9dit (%)"}</div>
                <input className="fin-field" type="number" step="0.01" value={taux} onChange={e => setTaux(e.target.value === '' ? '' : Number(e.target.value))} onBlur={e => { if (e.target.value === '') setTaux(profil?.taux_credit ?? 3.5) }} />
              </div>
              <div className="fin-block">
                <div className="fin-label">Taux assurance (%)</div>
                <input className="fin-field" type="number" step="0.01" value={tauxAssurance} onChange={e => setTauxAssurance(e.target.value === '' ? '' : Number(e.target.value))} onBlur={e => { if (e.target.value === '') setTauxAssurance(profil?.taux_assurance ?? 0.3) }} />
              </div>
              <div className="fin-block">
                <div className="fin-label">{"Dur\u00E9e"} — {duree} an{duree > 1 ? 's' : ''}</div>
                {typeCredit === 'in_fine' ? (
                  <>
                    <input type="range" className="fin-slider" min={1} max={5} step={1} value={Math.min(duree, 5)}
                      style={{ '--val': ((Math.min(duree, 5) - 1) / 4) * 100 } as React.CSSProperties}
                      onChange={e => setDuree(Number(e.target.value))} />
                    <div className="fin-slider-labels"><span>1 an</span><span>5 ans</span></div>
                  </>
                ) : (
                  <>
                    <input type="range" className="fin-slider" min={5} max={30} step={1} value={duree}
                      style={{ '--val': ((duree - 5) / 25) * 100 } as React.CSSProperties}
                      onChange={e => setDuree(Number(e.target.value))} />
                    <div className="fin-slider-labels"><span>5 ans</span><span>30 ans</span></div>
                  </>
                )}
              </div>
              {profil && <div className="profil-bar">{"Param\u00E8tres pr\u00E9-remplis depuis votre profil \u2014 modifiables dans Mon profil"}</div>}
            </div>

            {/* Colonne droite */}
            <div className="fin-right-col">
              {/* Résultats du crédit */}
              <div className="section">
                <h2 className="section-title">{"R\u00E9sultats du cr\u00E9dit"}</h2>
                <p className="section-subtitle">Calcul en temps r{'\u00E9'}el selon vos param{'\u00E8'}tres</p>
                <div className="fin-result-stack">
                  <div className="fin-result-line">
                    <span>{typeCredit === 'in_fine' ? "Int\u00E9r\u00EAts mensuels (in fine)" : "Mensualit\u00E9 cr\u00E9dit"}</span>
                    <span className="fin-v">{fmt(mensualiteCredit)} {'\u20AC'}</span>
                  </div>
                  <div className="fin-result-line">
                    <span>Assurance emprunteur</span>
                    <span className="fin-v">{fmt(mensualiteAss)} {'\u20AC'}</span>
                  </div>
                  <div style={{ marginTop: '8px', background: '#fde8e8', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#7a6a60', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{"Mensualit\u00E9 totale"}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 800, color: '#c0392b' }} className={isFreeBlocked ? 'val-blur' : ''}>
                        {fmt(mensualiteTotale)} {'\u20AC'}<span style={{ fontSize: '13px', fontWeight: 600, color: '#c0392b', opacity: 0.7, marginLeft: '3px' }}>/mois</span>
                      </span>
                      <span style={{ fontSize: '13px', color: '#c0392b', fontWeight: 600 }} className={isFreeBlocked ? 'val-blur' : ''}>
                        {fmt(mensualiteTotale * 12)} {'\u20AC'}/an
                      </span>
                    </div>
                  </div>
                </div>
                <div className="fin-sub-stats">
                  <div className="fin-sub-stat">
                    <div className="fin-sub-lbl">{"Co\u00FBt total int\u00E9r\u00EAts"}</div>
                    <div className="fin-sub-val" style={{ color: '#c0392b' }}>{fmt(totalInterets)} {'\u20AC'}</div>
                  </div>
                  <div className="fin-sub-stat">
                    <div className="fin-sub-lbl">{"Co\u00FBt total assurance"}</div>
                    <div className="fin-sub-val" style={{ color: '#c0392b' }}>{fmt(totalAssurance)} {'\u20AC'}</div>
                  </div>
                  <div className="fin-sub-stat">
                    <div className="fin-sub-lbl">{"Co\u00FBt total cr\u00E9dit"}</div>
                    <div className="fin-sub-val">{fmt(totalCredit)} {'\u20AC'}</div>
                  </div>
                  <div className="fin-sub-stat fin-sub-highlight">
                    <div className="fin-sub-lbl">Total {'\u00E0'} rembourser</div>
                    <div className="fin-sub-val">{fmt(totalRembourser)} {'\u20AC'}</div>
                  </div>
                </div>
              </div>

              {/* Cash Flow Avant Impôt */}
              {peutCalculer && !isTravauxLourds && bien.loyer && (
                <div className="section fin-cashflow-card">
                  <h2 className="section-title">{"Revenus locatifs \u00B7 Cash flow avant imp\u00F4t"}</h2>
                  <p className="section-subtitle">{"Votre tr\u00E9sorerie op\u00E9rationnelle, avant optimisation fiscale"}</p>
                  <div className="cf-grid">
                    <div className="cf-grid-header">
                      <span></span>
                      <span>Mensuel</span>
                      <span></span>
                      <span></span>
                      <span>Annuel</span>
                      <span></span>
                    </div>
                    <div className="cf-grid-row">
                      <span className="cf-grid-lbl">{"Loyer"} <span style={{ fontSize: '11px', color: '#a39a8c' }}>{bien.type_loyer === 'CC' ? '(CC)' : '(HC)'}</span></span>
                      <CellEditable bien={bien} champ="loyer" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} />
                      <span></span>
                      <CellEditable bien={bien} champ="loyer" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={12} />
                    </div>
                    <div className="cf-grid-row">
                      <span className="cf-grid-lbl">{bien.type_loyer === 'CC' ? "Charges r\u00E9cup. (CC)" : "Charges r\u00E9cup."}</span>
                      <CellEditable bien={bien} champ="charges_rec" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} />
                      <span></span>
                      <CellEditable bien={bien} champ="charges_rec" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={12} />
                    </div>
                    <div className="cf-grid-row">
                      <span className="cf-grid-lbl">{"Charges copro"}</span>
                      <CellEditable bien={bien} champ="charges_copro" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} />
                      <span></span>
                      <CellEditable bien={bien} champ="charges_copro" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={12} />
                    </div>
                    <div className="cf-grid-row">
                      <span className="cf-grid-lbl">{"Taxe fonci\u00E8re"}</span>
                      <CellEditable bien={bien} champ="taxe_fonc_ann" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1/12} />
                      <span></span>
                      <CellEditable bien={bien} champ="taxe_fonc_ann" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} />
                    </div>
                    <div className="cf-grid-row">
                      <span className="cf-grid-lbl">{"Mensualit\u00E9 cr\u00E9dit"}</span>
                      <span className={`cf-grid-static${isFreeBlocked ? ' val-blur' : ''}`} style={{ color: '#c0392b' }}>-{fmt(mensualiteCredit)} {'\u20AC'}</span>
                      <span></span>
                      <span></span>
                      <span className={`cf-grid-static${isFreeBlocked ? ' val-blur' : ''}`} style={{ color: '#c0392b' }}>-{fmt(mensualiteCredit * 12)} {'\u20AC'}</span>
                      <span></span>
                    </div>
                    <div className="cf-grid-row">
                      <span className="cf-grid-lbl">Assurance emprunteur</span>
                      <span className={`cf-grid-static${isFreeBlocked ? ' val-blur' : ''}`} style={{ color: '#c0392b' }}>-{fmt(mensualiteAss)} {'\u20AC'}</span>
                      <span></span>
                      <span></span>
                      <span className={`cf-grid-static${isFreeBlocked ? ' val-blur' : ''}`} style={{ color: '#c0392b' }}>-{fmt(mensualiteAss * 12)} {'\u20AC'}</span>
                      <span></span>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px', background: cashflowBrut >= 0 ? '#d4f5e0' : '#fde8e8', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '11px', color: '#7a6a60', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{"Cash Flow Avant Imp\u00F4t"}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 800, color: cashflowBrut >= 0 ? '#1a7a40' : '#c0392b' }} className={isFreeBlocked ? 'val-blur' : ''}>
                        {cashflowBrut >= 0 ? '+' : ''}{fmt(cashflowBrut)} {'\u20AC'}/mois
                      </span>
                      <span style={{ fontSize: '13px', color: (cashflowBrut * 12) >= 0 ? '#1a7a40' : '#c0392b', fontWeight: 600 }} className={isFreeBlocked ? 'val-blur' : ''}>
                        {(cashflowBrut * 12) >= 0 ? '+' : ''}{fmt(cashflowBrut * 12)} {'\u20AC'}/an
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>{/* fin col droite */}
        </div>{/* fin two-cols nav-estimation */}
        </div>)}

        {activeNav === 'fiscalite' && bien.prix_fai && (<div className="tab-panel">
          <div id="nav-fiscalite">
            <div className="fiscal-controls">
              {/* Row 1 : Détention | Base de calcul */}
              <div className="fiscal-controls-grid">
                <div className="control-group">
                  <span className="lbl">{"D\u00E9tention"}</span>
                  <div className="chip-group">
                    {[1, 2, 3, 4, 5, 10, 15, 20].map(d => (
                      <button key={d} className={`chip-btn${dureeRevente === d ? ' active' : ''}`} onClick={() => setDureeRevente(d)}>
                        {d} an{d > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>
                {!isEnchere && (
                <div className="control-group">
                  <span className="lbl">Base de calcul</span>
                  <div className="chip-group">
                    <button className={`chip-btn${baseCalc === 'fai' ? ' active' : ''}`} onClick={() => setBaseCalc('fai')}>Prix FAI</button>
                    <button className={`chip-btn${prixCibleCombine ? (baseCalc === 'cible' ? ' active' : '') : ' active'}`} onClick={() => prixCibleCombine && setBaseCalc('cible')} style={!prixCibleCombine ? { opacity: 0.4, cursor: 'default' } : {}}>Prix cible</button>
                  </div>
                </div>
                )}
              </div>
              {/* Row 2 : Frais agence | Comparer avec */}
              <div className="fiscal-controls-grid fiscal-row-2">
                {!isEnchere && (
                  <div className="control-group">
                    <span className="lbl">{"Frais agence \u00E0 l\u2019achat"}</span>
                    <input type="number" step="0.5" min="0" max="10" value={fraisAgenceRevente}
                      onChange={e => setFraisAgenceRevente(e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={e => { if (e.target.value === '') setFraisAgenceRevente(5) }}
                      className="select-custom select-inline-num" />
                    <span className="lbl">%</span>
                  </div>
                )}
                <div className="control-group">
                  <span className="lbl">Comparer avec</span>
                  {userPlan === 'expert' ? (
                    <select className="select-custom" value={regime2} onChange={e => setRegime2(e.target.value)}>
                      {(isIDR ? REGIMES_IDR : REGIMES).filter(r => r.value !== regime).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span className="select-custom" style={{ background: '#f0ede8' }}>{[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime2)?.label || regime2}</span>
                      <a href="/#pricing" style={{ fontSize: '11px', color: '#c0392b', textDecoration: 'underline', whiteSpace: 'nowrap' }}>{"Tous les r\u00E9gimes \u2192 Expert"}</a>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div>
              {isFreeBlocked && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff8f0', border: '1.5px solid #f0d090', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, color: '#1a1210', fontWeight: 600 }}>
                    {"D\u00E9bloquez les simulations fiscales compl\u00E8tes"}
                  </span>
                  <a href="/mon-profil" style={{
                    display: 'inline-block', padding: '7px 18px', borderRadius: 8,
                    background: '#c0392b', color: '#fff', fontWeight: 600, fontSize: 12,
                    textDecoration: 'none', fontFamily: "'DM Sans', sans-serif"
                  }}>
                    {"D\u00E9bloquer \u2192"}
                  </a>
                </div>
              )}
              <div className="fiscal-compare">
                <PnlColonne titre={`${[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime)?.label || regime} (votre r\u00E9gime)`} bien={{ ...bien, prix_fai: prixBase }} financement={financement} tmi={tmi} regime={regime} otherRegime={regime2} highlight dureeRevente={dureeRevente} estimation={estimationData} budgetTravauxM2={budgetTravauxM2} scorePerso={scorePerso} fraisNotaire={fraisNotaire} fraisNotaireBase={fraisNotaireBase} apport={apportNum} fraisAgenceRevente={fraisAgenceNum} chargesUtilisateur={chargesUtilisateur} isFree={isFreeBlocked} isEnchere={isEnchere} fraisPrealables={bien.frais_preemption || 0} />
                <PnlColonne titre={[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime2)?.label || regime2} bien={{ ...bien, prix_fai: prixBase }} financement={financement} tmi={tmi} regime={regime2} otherRegime={regime} dureeRevente={dureeRevente} estimation={estimationData} budgetTravauxM2={budgetTravauxM2} scorePerso={scorePerso} fraisNotaire={fraisNotaire} fraisNotaireBase={fraisNotaireBase} apport={apportNum} fraisAgenceRevente={fraisAgenceNum} chargesUtilisateur={chargesUtilisateur} isFree={isFreeBlocked} isEnchere={isEnchere} fraisPrealables={bien.frais_preemption || 0} />
              </div>
            </div>
          </div>
        </div>)}

        {/* Modal Source annonce */}
        <ModalPanel open={showSourceModal} onClose={() => setShowSourceModal(false)} title="Annonce source">
          {(() => {
            const mi = typeof bien.moteurimmo_data === 'string' ? JSON.parse(bien.moteurimmo_data) : bien.moteurimmo_data
            const links: { origin: string; url: string }[] = []
            if (bien.sources) {
              const sources = typeof bien.sources === 'string' ? JSON.parse(bien.sources) : bien.sources
              if (Array.isArray(sources)) for (const s of sources) { if (s.url) links.push({ origin: s.source, url: s.url }) }
            }
            if (links.length === 0 && bien.url) links.push({ origin: mi?.origin || getPlatformFromUrl(bien.url), url: bien.url })
            if (mi?.duplicates) for (const d of mi.duplicates) { if (d.url && !links.some((l: any) => l.url === d.url)) links.push({ origin: d.origin || getPlatformFromUrl(d.url), url: d.url }) }
            const byOrigin = new Map<string, { origin: string; url: string }>()
            for (const l of links) byOrigin.set(l.origin, l)
            const uniqueLinks = Array.from(byOrigin.values())
            if (uniqueLinks.length === 0) return <p style={{ color: 'var(--ink-mute)', fontSize: '13px', margin: 0 }}>Aucune source disponible.</p>
            return (
              <>
                <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: '0 0 16px' }}>
                  {uniqueLinks.length === 1 ? 'Cette annonce est publiée sur 1 plateforme.' : `Cette annonce est publiée sur ${uniqueLinks.length} plateformes.`} Cliquez pour accéder à la version originale.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {uniqueLinks.map((l, i) => {
                    const platform = PLATFORM_LOGOS[l.origin]
                    const name = platform?.name || l.origin
                    const color = platform?.color || '#7a6a60'
                    const abbrev = platform?.abbrev || l.origin.slice(0, 3).toUpperCase()
                    const textColor = color === '#ffcc00' ? '#1f1b16' : '#fff'
                    return (
                      <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{
                        padding: '16px', background: 'var(--paper, #f5ede2)', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        textDecoration: 'none', border: '1px solid transparent',
                        transition: 'all .2s',
                      }}
                      onMouseEnter={e => { const t = e.currentTarget; t.style.borderColor = 'var(--line)'; t.style.background = '#fff'; t.style.transform = 'translateY(-1px)'; t.style.boxShadow = 'var(--shadow-sm)' }}
                      onMouseLeave={e => { const t = e.currentTarget; t.style.borderColor = 'transparent'; t.style.background = 'var(--paper, #f5ede2)'; t.style.transform = ''; t.style.boxShadow = '' }}
                      >
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: color, color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Fraunces", serif', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>{abbrev}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px' }}>{name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--ink-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.origin}</div>
                        </div>
                        <span style={{ color: 'var(--ink-mute)', fontSize: '16px', transition: 'transform .2s' }}>↗</span>
                      </a>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </ModalPanel>

        {/* Modal avocat enchère */}
        <ModalPanel open={showAvocatModal} onClose={() => setShowAvocatModal(false)} title="Avocat poursuivant">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', color: '#7a6a60', flexShrink: 0,
              }}>{'\u2696'}</div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#1a1210' }}>{bien.avocat_nom}</div>
                {bien.avocat_cabinet && <div style={{ fontSize: '14px', color: '#7a6a60', marginTop: '2px' }}>{bien.avocat_cabinet}</div>}
              </div>
            </div>
            {bien.avocat_tel && (
              <a href={`tel:${bien.avocat_tel.replace(/\s/g, '')}`} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px',
                background: '#faf8f5', borderRadius: '10px', border: '1.5px solid #e8e2d8',
                textDecoration: 'none', color: '#1a1210', fontSize: '15px', fontWeight: 600,
              }}>
                <span style={{ fontSize: '20px' }}>{'\uD83D\uDCDE'}</span>
                {bien.avocat_tel}
              </a>
            )}
            {(bien.avocat_email || avocatEmailSaved) ? (
              <a href={`mailto:${avocatEmailSaved || bien.avocat_email}`} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px',
                background: '#faf8f5', borderRadius: '10px', border: '1.5px solid #e8e2d8',
                textDecoration: 'none', color: '#1a1210', fontSize: '15px', fontWeight: 600,
              }}>
                <span style={{ fontSize: '20px' }}>{'\u2709'}</span>
                {avocatEmailSaved || bien.avocat_email}
              </a>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="email"
                  placeholder="Email de l'avocat"
                  value={avocatEmailInput}
                  onChange={e => setAvocatEmailInput(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e8e2d8', fontSize: '14px', outline: 'none' }}
                />
                <button
                  disabled={!avocatEmailInput || avocatEmailSaving}
                  onClick={async () => {
                    if (!avocatEmailInput) return
                    setAvocatEmailSaving(true)
                    const res = await fetch(`/api/encheres/${bien.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ avocat_email: avocatEmailInput }),
                    })
                    if (res.ok) setAvocatEmailSaved(avocatEmailInput)
                    setAvocatEmailSaving(false)
                  }}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: '#2a4a8a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', opacity: avocatEmailInput ? 1 : 0.5 }}
                >
                  {avocatEmailSaving ? '...' : 'Enregistrer'}
                </button>
              </div>
            )}
            {bien.tribunal && (
              <div style={{ fontSize: '13px', color: '#7a6a60', padding: '8px 0', borderTop: '1px solid #f0ede8' }}>
                {bien.tribunal}
              </div>
            )}
          </div>
        </ModalPanel>

        <ModalPanel open={showContact} onClose={() => setShowContact(false)} title={"R\u00E9cup\u00E9rer les donn\u00E9es manquantes"}>
          <ContactVendeur bien={bien} userToken={userToken} onStatusUpdate={handleContactUpdate} />
        </ModalPanel>

        {/* Modal détail des frais d'adjudication */}
        {isEnchere && bien.mise_a_prix && bien.mise_a_prix > 0 && (() => {
          const prixBase = (bien.prix_adjuge > 0 ? bien.prix_adjuge : bien.mise_a_prix) || 0
          const isMDB = regime === 'marchand_de_biens'
          const frais = calculerFraisEnchere(prixBase, undefined, { isMDB })
          return (
            <ModalPanel open={showFraisModal} onClose={() => setShowFraisModal(false)} title={"Frais de mutation \u2014 D\u00E9tail"}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Badge régime */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#7a6a60' }}>Régime :</span>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                    background: isMDB ? '#d4ddf5' : '#f0ede8', color: isMDB ? '#2a4a8a' : '#7a6a60',
                  }}>
                    {isMDB ? 'Marchand de Biens' : 'Particulier'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#b0a898' }}>base : {prixBase.toLocaleString('fr-FR')} {'\u20AC'}</span>
                </div>
                {/* Tableau frais */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '8px 0', color: '#3a2a20' }}>Émoluments avocat TTC</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#1a1210' }}>{frais.emoluments_ttc.toLocaleString('fr-FR')} {'\u20AC'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '4px 0 4px 16px', color: '#7a6a60', fontSize: '12px' }}>dont avocat poursuivant (75&nbsp;%)</td>
                      <td style={{ padding: '4px 0', textAlign: 'right', color: '#7a6a60', fontSize: '12px' }}>{frais.emoluments_poursuivant_ttc.toLocaleString('fr-FR')} {'\u20AC'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '4px 0 8px 16px', color: '#7a6a60', fontSize: '12px' }}>dont avocat adjudicataire (25&nbsp;%)</td>
                      <td style={{ padding: '4px 0 8px', textAlign: 'right', color: '#7a6a60', fontSize: '12px' }}>{frais.emoluments_adjudicataire_ttc.toLocaleString('fr-FR')} {'\u20AC'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '8px 0', color: '#3a2a20' }}>Droits de mutation ({frais.droits_enregistrement_pct}&nbsp;%{isMDB ? ' — taux réduit MDB' : ''})</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#1a1210' }}>{frais.droits_enregistrement.toLocaleString('fr-FR')} {'\u20AC'}</td>
                    </tr>
                    <tr style={{ borderBottom: '2px solid #e8e2d8' }}>
                      <td style={{ padding: '8px 0', color: '#3a2a20' }}>CSI — Contribution de Sécurité Immobilière (0,10&nbsp;%)</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#1a1210' }}>{frais.csi.toLocaleString('fr-FR')} {'\u20AC'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 0', color: '#1a1210', fontWeight: 700 }}>Total frais de mutation</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800, color: '#1a1210', fontSize: '15px' }}>
                        {Math.round(frais.total_sans_prealables).toLocaleString('fr-FR')} {'\u20AC'}
                        <span style={{ fontWeight: 500, fontSize: '12px', color: '#7a6a60', marginLeft: '6px' }}>(~{Math.round(frais.pct_sans_prealables)}&nbsp;%)</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                {/* Note frais préalables */}
                <div style={{ background: '#fdf8f0', border: '1px solid #f0d898', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#6a4a00' }}>
                  <strong>Note :</strong> Ce calcul ne comprend pas les frais préalables (frais de procédure : commissaire de justice, annonces légales, diagnostics). Ces frais sont variables (~3 000 à 10 000&nbsp;{'\u20AC'}) et communiqués par le tribunal environ 1 semaine avant l{"'"}audience. Renseignez-les dans la case "Frais préalables" ci-dessus.
                </div>
              </div>
            </ModalPanel>
          )
        })()}

      </div>

      {/* Modal — Compléter les données du bien */}
      <ModalPanel open={showCompleterModal} onClose={() => setShowCompleterModal(false)} title="Compléter les données du bien">
        <div style={{ fontSize: '13px', color: 'var(--ink-soft, #6b6358)', marginBottom: '20px' }}>
          Saisissez les infos que vous avez récupérées — chaque donnée partagée améliore la précision de l{"'"}analyse.
        </div>

        <div className="modal-section-title" style={{ marginBottom: '10px' }}>
          <span>Caractéristiques du bien</span>
          {completableManquants.length > 0 && <span className="modal-section-count">{completableManquants.length} à compléter</span>}
        </div>

        {/* Adresse */}
        <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'var(--paper, #f5ede2)', borderRadius: '10px', border: '1px solid var(--line, #e6dccb)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-mute, #a39a8c)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Adresse du bien</div>
            {modalFieldVals['adresse'] !== undefined ? (
              <input type="text" autoFocus value={modalFieldVals['adresse']} onChange={e => setModalFieldVals(p => ({ ...p, adresse: e.target.value }))} placeholder="Ex : 12 rue de Rivoli, 75001 Paris" style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontFamily: 'inherit', color: 'var(--ink, #1f1b16)', outline: 'none' }} onKeyDown={e => e.key === 'Enter' && saveModalField('adresse')} />
            ) : (
              <div style={{ fontSize: '13px', color: bien.adresse ? 'var(--ink, #1f1b16)' : 'var(--ink-mute, #a39a8c)', cursor: 'pointer' }} onClick={() => setModalFieldVals(p => ({ ...p, adresse: bien.adresse || '' }))}>{bien.adresse || "Renseigner l'adresse"}</div>
            )}
          </div>
          {modalFieldVals['adresse'] !== undefined ? (
            <button className="mf-validate" onClick={() => saveModalField('adresse')}>✓</button>
          ) : (
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute, #a39a8c)', padding: '4px' }} onClick={() => setModalFieldVals(p => ({ ...p, adresse: bien.adresse || '' }))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          )}
        </div>

        <div className="modal-fields" style={{ marginBottom: '20px' }}>
          {/* Année de construction — toutes stratégies */}
          <div className="modal-field">
            <span className="mf-label">{"Ann\u00E9e de construction"}</span>
            <span className="mf-control"><input type="number" min={1800} max={2030} placeholder="NC" className={getModalFieldClass('annee_construction')} value={getModalVal('annee_construction')} onChange={e => setModalDraft('annee_construction', e.target.value === '' ? '' : Number(e.target.value))} onKeyDown={e => e.key === 'Enter' && saveModalField('annee_construction')} /></span>
            <button className={`mf-validate${getModalFieldClass('annee_construction') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('annee_construction') !== 'mf-draft'} onClick={() => saveModalField('annee_construction')}>✓</button>
          </div>
          {/* Surface terrain — maison uniquement */}
          {(bien.type_bien || '').toLowerCase().includes('maison') && (
            <div className="modal-field">
              <span className="mf-label">Surface terrain <span className="mf-unit">(m²)</span></span>
              <span className="mf-control"><input type="number" min={0} placeholder="NC" className={getModalFieldClass('surface_terrain')} value={getModalVal('surface_terrain')} onChange={e => setModalDraft('surface_terrain', e.target.value === '' ? '' : Number(e.target.value))} onKeyDown={e => e.key === 'Enter' && saveModalField('surface_terrain')} /></span>
              <button className={`mf-validate${getModalFieldClass('surface_terrain') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('surface_terrain') !== 'mf-draft'} onClick={() => saveModalField('surface_terrain')}>✓</button>
            </div>
          )}
          {/* Salles de bain — pas pour IDR */}
          {!isIDR && (
            <div className="modal-field">
              <span className="mf-label">Salles de bain</span>
              <span className="mf-control"><input type="number" min={0} max={20} placeholder="NC" className={getModalFieldClass('nb_sdb')} value={getModalVal('nb_sdb')} onChange={e => setModalDraft('nb_sdb', e.target.value === '' ? '' : Number(e.target.value))} onKeyDown={e => e.key === 'Enter' && saveModalField('nb_sdb')} /></span>
              <button className={`mf-validate${getModalFieldClass('nb_sdb') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('nb_sdb') !== 'mf-draft'} onClick={() => saveModalField('nb_sdb')}>✓</button>
            </div>
          )}
          {/* GES — toutes stratégies */}
          <div className="modal-field">
            <span className="mf-label">GES</span>
            <span className="mf-control"><select className={getModalFieldClass('ges')} value={getModalVal('ges')} onChange={e => setModalDraft('ges', e.target.value)}><option value="">NC</option>{['A','B','C','D','E','F','G'].map(o => <option key={o} value={o}>{o}</option>)}</select></span>
            <button className={`mf-validate${getModalFieldClass('ges') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('ges') !== 'mf-draft'} onClick={() => saveModalField('ges')}>✓</button>
          </div>
          {/* Type de chauffage — pas pour IDR */}
          {!isIDR && (
            <div className="modal-field">
              <span className="mf-label">Type de chauffage</span>
              <span className="mf-control"><select className={getModalFieldClass('type_chauffage')} value={getModalVal('type_chauffage')} onChange={e => setModalDraft('type_chauffage', e.target.value)}><option value="">NC</option>{['Gaz','Fioul','\u00C9lectrique','Pompe \u00E0 chaleur','Bois / pellets','Collectif'].map(o => <option key={o} value={o}>{o}</option>)}</select></span>
              <button className={`mf-validate${getModalFieldClass('type_chauffage') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('type_chauffage') !== 'mf-draft'} onClick={() => saveModalField('type_chauffage')}>✓</button>
            </div>
          )}
          {/* Exposition — pas pour IDR */}
          {!isIDR && (
            <div className="modal-field">
              <span className="mf-label">Exposition</span>
              <span className="mf-control"><select className={getModalFieldClass('exposition')} value={getModalVal('exposition')} onChange={e => setModalDraft('exposition', e.target.value)}><option value="">NC</option>{['N','S','E','O','NE','NO','SE','SO'].map(o => <option key={o} value={o}>{o}</option>)}</select></span>
              <button className={`mf-validate${getModalFieldClass('exposition') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('exposition') !== 'mf-draft'} onClick={() => saveModalField('exposition')}>✓</button>
            </div>
          )}
          {/* Balcon / Terrasse — pas pour IDR */}
          {!isIDR && (
            <div className="modal-field">
              <span className="mf-label">Balcon / Terrasse</span>
              <span className="mf-control"><select className={getModalFieldClass('acces_exterieur')} value={getModalVal('acces_exterieur')} onChange={e => setModalDraft('acces_exterieur', e.target.value)}><option value="">NC</option>{['aucun','balcon','terrasse','loggia','jardin'].map(o => <option key={o} value={o}>{o}</option>)}</select></span>
              <button className={`mf-validate${getModalFieldClass('acces_exterieur') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('acces_exterieur') !== 'mf-draft'} onClick={() => saveModalField('acces_exterieur')}>✓</button>
            </div>
          )}
          {/* Parking / Garage — pas pour IDR */}
          {!isIDR && (
            <div className="modal-field">
              <span className="mf-label">Parking / Garage</span>
              <span className="mf-control"><select className={getModalFieldClass('parking_type')} value={getModalVal('parking_type')} onChange={e => setModalDraft('parking_type', e.target.value)}><option value="">NC</option>{['aucun','inclus','en option','box'].map(o => <option key={o} value={o}>{o}</option>)}</select></span>
              <button className={`mf-validate${getModalFieldClass('parking_type') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('parking_type') !== 'mf-draft'} onClick={() => saveModalField('parking_type')}>✓</button>
            </div>
          )}
          {/* Ascenseur — pas pour IDR */}
          {!isIDR && (
            <div className="modal-field">
              <span className="mf-label">Ascenseur</span>
              <span className="mf-control"><select className={modalFieldVals['ascenseur'] !== undefined ? 'mf-draft' : bien.ascenseur != null ? 'mf-filled' : 'mf-nc'} value={modalFieldVals['ascenseur'] !== undefined ? (modalFieldVals['ascenseur'] === true ? 'oui' : modalFieldVals['ascenseur'] === false ? 'non' : '') : (bien.ascenseur === true ? 'oui' : bien.ascenseur === false ? 'non' : '')} onChange={e => { const v = e.target.value === 'oui' ? true : e.target.value === 'non' ? false : null; setModalFieldVals(p => ({ ...p, ascenseur: v })); setBien((prev: any) => ({ ...prev, ascenseur: v })) }}><option value="">NC</option><option value="oui">Oui</option><option value="non">Non</option></select></span>
              <button className={`mf-validate${modalFieldVals['ascenseur'] !== undefined ? ' mf-validate-draft' : ''}`} disabled={modalFieldVals['ascenseur'] === undefined} onClick={() => { handleUpdate('ascenseur', modalFieldVals['ascenseur']); setModalFieldVals(p => { const n = { ...p }; delete n['ascenseur']; return n }) }}>✓</button>
            </div>
          )}
          {/* Cave — pas pour IDR */}
          {!isIDR && (
            <div className="modal-field">
              <span className="mf-label">Cave</span>
              <span className="mf-control"><select className={modalFieldVals['has_cave'] !== undefined ? 'mf-draft' : bien.has_cave != null ? 'mf-filled' : 'mf-nc'} value={modalFieldVals['has_cave'] !== undefined ? (modalFieldVals['has_cave'] === true ? 'oui' : modalFieldVals['has_cave'] === false ? 'non' : '') : (bien.has_cave === true ? 'oui' : bien.has_cave === false ? 'non' : '')} onChange={e => { const v = e.target.value === 'oui' ? true : e.target.value === 'non' ? false : null; setModalFieldVals(p => ({ ...p, has_cave: v })); setBien((prev: any) => ({ ...prev, has_cave: v })) }}><option value="">NC</option><option value="oui">Oui</option><option value="non">Non</option></select></span>
              <button className={`mf-validate${modalFieldVals['has_cave'] !== undefined ? ' mf-validate-draft' : ''}`} disabled={modalFieldVals['has_cave'] === undefined} onClick={() => { handleUpdate('has_cave', modalFieldVals['has_cave']); setModalFieldVals(p => { const n = { ...p }; delete n['has_cave']; return n }) }}>✓</button>
            </div>
          )}
          {/* Copropriété — toutes stratégies */}
          <div className="modal-field">
            <span className="mf-label">{"Copropri\u00E9t\u00E9"}</span>
            <span className="mf-control"><select className={modalFieldVals['en_copropriete'] !== undefined ? 'mf-draft' : (bien as any).en_copropriete != null ? 'mf-filled' : 'mf-nc'} value={modalFieldVals['en_copropriete'] !== undefined ? (modalFieldVals['en_copropriete'] === true ? 'oui' : modalFieldVals['en_copropriete'] === false ? 'non' : '') : ((bien as any).en_copropriete === true ? 'oui' : (bien as any).en_copropriete === false ? 'non' : '')} onChange={e => { const v = e.target.value === 'oui' ? true : e.target.value === 'non' ? false : null; setModalFieldVals(p => ({ ...p, en_copropriete: v })); setBien((prev: any) => ({ ...prev, en_copropriete: v })) }}><option value="">NC</option><option value="oui">Oui</option><option value="non">Non</option></select></span>
            <button className={`mf-validate${modalFieldVals['en_copropriete'] !== undefined ? ' mf-validate-draft' : ''}`} disabled={modalFieldVals['en_copropriete'] === undefined} onClick={() => { handleUpdate('en_copropriete', modalFieldVals['en_copropriete']); setModalFieldVals(p => { const n = { ...p }; delete n['en_copropriete']; return n }) }}>✓</button>
          </div>
        </div>

        {/* IDR — champs immeuble */}
        {isIDR && (
          <>
            <div className="modal-section-title" style={{ marginTop: '8px', marginBottom: '10px' }}>
              <span>Immeuble</span>
              <span className="modal-section-count">IDR</span>
            </div>
            <div className="modal-fields" style={{ marginBottom: '20px' }}>
              <div className="modal-field">
                <span className="mf-label">Nombre de lots</span>
                <span className="mf-control"><input type="number" min={1} max={100} placeholder="NC" className={getModalFieldClass('nb_lots')} value={getModalVal('nb_lots')} onChange={e => setModalDraft('nb_lots', e.target.value === '' ? '' : Number(e.target.value))} onKeyDown={e => e.key === 'Enter' && saveModalField('nb_lots')} /></span>
                <button className={`mf-validate${getModalFieldClass('nb_lots') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('nb_lots') !== 'mf-draft'} onClick={() => saveModalField('nb_lots')}>✓</button>
              </div>
              <div className="modal-field">
                <span className="mf-label">{"Monopropri\u00E9t\u00E9"}</span>
                <span className="mf-control"><select className={modalFieldVals['monopropriete'] !== undefined ? 'mf-draft' : bien.monopropriete != null ? 'mf-filled' : 'mf-nc'} value={modalFieldVals['monopropriete'] !== undefined ? (modalFieldVals['monopropriete'] === true ? 'oui' : modalFieldVals['monopropriete'] === false ? 'non' : '') : (bien.monopropriete === true ? 'oui' : bien.monopropriete === false ? 'non' : '')} onChange={e => { const v = e.target.value === 'oui' ? true : e.target.value === 'non' ? false : null; setModalFieldVals(p => ({ ...p, monopropriete: v })); setBien((prev: any) => ({ ...prev, monopropriete: v })) }}><option value="">NC</option><option value="oui">Oui</option><option value="non">Non</option></select></span>
                <button className={`mf-validate${modalFieldVals['monopropriete'] !== undefined ? ' mf-validate-draft' : ''}`} disabled={modalFieldVals['monopropriete'] === undefined} onClick={() => { handleUpdate('monopropriete', modalFieldVals['monopropriete']); setModalFieldVals(p => { const n = { ...p }; delete n['monopropriete']; return n }) }}>✓</button>
              </div>
              <div className="modal-field">
                <span className="mf-label">Compteurs individuels</span>
                <span className="mf-control"><select className={modalFieldVals['compteurs_individuels'] !== undefined ? 'mf-draft' : bien.compteurs_individuels != null ? 'mf-filled' : 'mf-nc'} value={modalFieldVals['compteurs_individuels'] !== undefined ? (modalFieldVals['compteurs_individuels'] === true ? 'oui' : modalFieldVals['compteurs_individuels'] === false ? 'non' : '') : (bien.compteurs_individuels === true ? 'oui' : bien.compteurs_individuels === false ? 'non' : '')} onChange={e => { const v = e.target.value === 'oui' ? true : e.target.value === 'non' ? false : null; setModalFieldVals(p => ({ ...p, compteurs_individuels: v })); setBien((prev: any) => ({ ...prev, compteurs_individuels: v })) }}><option value="">NC</option><option value="oui">Oui</option><option value="non">Non</option></select></span>
                <button className={`mf-validate${modalFieldVals['compteurs_individuels'] !== undefined ? ' mf-validate-draft' : ''}`} disabled={modalFieldVals['compteurs_individuels'] === undefined} onClick={() => { handleUpdate('compteurs_individuels', modalFieldVals['compteurs_individuels']); setModalFieldVals(p => { const n = { ...p }; delete n['compteurs_individuels']; return n }) }}>✓</button>
              </div>
            </div>
          </>
        )}

        {/* Lots de la vente — enchères */}
        {isEnchere && (
          <>
            <div className="modal-section-title" style={{ marginTop: '8px', marginBottom: '10px' }}>
              <span>Lots de la vente</span>
              <span className="modal-section-count">{"Spécifique enchères"}</span>
            </div>
            <div className="modal-fields" style={{ marginBottom: '20px' }}>
              {(() => { const cls = getModalFieldClass('nb_lots'); const isDraft = cls === 'mf-draft'; return (
                <div className="modal-field">
                  <span className="mf-label">Nombre de lots</span>
                  <span className="mf-control">
                    <input type="number" min={1} max={50} placeholder="NC" className={cls} value={getModalVal('nb_lots')} onChange={e => setModalDraft('nb_lots', e.target.value === '' ? '' : Number(e.target.value))} onKeyDown={e => e.key === 'Enter' && saveModalField('nb_lots')} />
                  </span>
                  <button className={`mf-validate${isDraft ? ' mf-validate-draft' : ''}`} disabled={!isDraft} onClick={() => saveModalField('nb_lots')}>✓</button>
                </div>
              )})()}
            </div>
          </>
        )}

        <div className="modal-section-title" style={{ marginTop: '8px', marginBottom: '10px' }}>
          <span>{"Donn\u00E9es locatives"}</span>
        </div>
        <div className="modal-fields" style={{ marginBottom: '20px' }}>
          {([
            { champ: 'loyer', label: 'Loyer mensuel', unit: '(\u20AC)', min: 0 },
            { champ: 'charges_copro', label: 'Charges copropriété', unit: '(\u20AC/mois)', min: 0 },
            { champ: 'taxe_fonc_ann', label: 'Taxe foncière', unit: '(\u20AC/an)', min: 0 },
          ] as { champ: string; label: string; unit: string; min: number }[]).map(({ champ, label, unit, min }) => {
            const cls = getModalFieldClass(champ); const isDraft = cls === 'mf-draft'
            return (
              <div key={champ} className="modal-field">
                <span className="mf-label">{label} <span className="mf-unit">{unit}</span></span>
                <span className="mf-control">
                  <input type="number" min={min} placeholder="NC" className={cls} value={getModalVal(champ)} onChange={e => setModalDraft(champ, e.target.value === '' ? '' : Number(e.target.value))} onKeyDown={e => e.key === 'Enter' && saveModalField(champ)} />
                </span>
                <button className={`mf-validate${isDraft ? ' mf-validate-draft' : ''}`} disabled={!isDraft} onClick={() => saveModalField(champ)}>✓</button>
              </div>
            )
          })}
          {!isIDR && (
            <div className="modal-field">
              <span className="mf-label">Fin de bail</span>
              <span className="mf-control">
                <input type="date" className={getModalFieldClass('fin_bail')} value={getModalVal('fin_bail')} onChange={e => setModalDraft('fin_bail', e.target.value)} onKeyDown={e => e.key === 'Enter' && saveModalField('fin_bail')} />
              </span>
              <button className={`mf-validate${getModalFieldClass('fin_bail') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('fin_bail') !== 'mf-draft'} onClick={() => saveModalField('fin_bail')}>✓</button>
            </div>
          )}
          {!isIDR && (
            <div className="modal-field">
              <span className="mf-label">Profil locataire</span>
              <span className="mf-control">
                <select className={getModalFieldClass('profil_locataire')} value={getModalVal('profil_locataire')} onChange={e => setModalDraft('profil_locataire', e.target.value)}>
                  <option value="">NC</option>
                  {['Actif CDI', 'Actif CDD / intérim', 'Indépendant', 'Retraité', 'Étudiant', 'Inconnu'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </span>
              <button className={`mf-validate${getModalFieldClass('profil_locataire') === 'mf-draft' ? ' mf-validate-draft' : ''}`} disabled={getModalFieldClass('profil_locataire') !== 'mf-draft'} onClick={() => saveModalField('profil_locataire')}>✓</button>
            </div>
          )}
          <div className="modal-field" style={{ background: 'var(--paper, #f5ede2)' }}>
            <span className="mf-label" style={{ color: 'var(--ink-soft, #6b6358)' }}>Rendement brut</span>
            <span style={{ fontSize: '12px', color: 'var(--ink-mute, #a39a8c)', fontStyle: 'italic', gridColumn: '2 / span 2', textAlign: 'right' }}>{"Calcul auto dès que le loyer est saisi"}</span>
          </div>
        </div>

        <div className="modal-footer-note">
          <strong>Statut après soumission :</strong> 1<sup>re</sup> saisie → <span style={{ color: '#b8891a', fontWeight: 600 }}>Soumis par 1 utilisateur</span> · 2<sup>e</sup> confirmation concordante → <span style={{ color: 'var(--success, #2e7c5d)', fontWeight: 600 }}>Validé 2+ utilisateurs</span>
        </div>
      </ModalPanel>

    </Layout>
  )
}