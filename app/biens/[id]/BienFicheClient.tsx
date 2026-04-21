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
      style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden' }}
    >
      <Image src={photos[idx]} alt="" width={800} height={450} className="fiche-photo" onClick={() => setFullscreen(true)} style={{ cursor: 'zoom-in', width: '100%', height: 'auto', maxHeight: '320px', objectFit: 'cover' }} />
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
              <button onClick={e => { e.stopPropagation(); prev() }} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '24px', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer' }}>{'<'}</button>
              <button onClick={e => { e.stopPropagation(); next() }} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '24px', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer' }}>{'>'}</button>
            </>
          )}
        </div>
      )}
      {photos.length > 1 && (
        <>
          <button onClick={prev} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{'<'}</button>
          <button onClick={next} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{'>'}</button>
          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '12px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 }}>
            {idx + 1} / {photos.length}
          </div>
        </>
      )}
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

function ModalPanel({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
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
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', color: '#7a6a60', marginRight: '4px' }}>Voir sur :</span>
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

  // --- Pas connecté : lecture seule ---
  if (!userToken) {
    if (displayVal == null) return <span style={{ color: '#c0392b', fontStyle: 'italic', fontSize: '13px' }}>NC</span>
    return <span style={{ fontWeight: 600, color: '#1a1210', fontSize: '13px' }}>{readText}</span>
  }

  // --- Donnée source (IA/scraper) et pas en mode édition : lecture seule + crayon ---
  if (hasSourceData && !dirty) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontWeight: 600, color: '#1a1210', fontSize: '13px' }}>{readText}</span>
        <PencilBtn />
      </div>
    )
  }

  // --- Donnée validée (vert) et pas en mode édition ---
  if (isVert && !dirty) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontWeight: 600, color: '#1a7a40', fontSize: '13px' }}>{readText}</span>
        <span title={"Valid\u00E9 par la communaut\u00E9"} style={{ fontSize: '12px', color: '#1a7a40' }}>{'\u2713'}</span>
        <PencilBtn />
      </div>
    )
  }

  // --- Donnée jaune (1 user) et pas en mode édition ---
  if (isJaune && !dirty) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontWeight: 600, color: '#a06010', fontSize: '13px' }}>{readText}</span>
        <PencilBtn />
      </div>
    )
  }

  // --- Éditable (manquante ou en cours de simulation) ---
  const isEmpty = !localVal
  const borderColor = dirty ? '#2a4a8a' : isEmpty ? '#c0392b' : '#e8e2d8'
  const bgColor = dirty ? '#f0f4ff' : isEmpty ? '#fde8e8' : '#faf8f5'

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <input
        type="number"
        value={localVal}
        placeholder="NC"
        style={{
          width: '80px', padding: '4px 8px', borderRadius: '6px',
          border: `1.5px solid ${borderColor}`,
          fontFamily: "'DM Sans', sans-serif", fontSize: '13px',
          background: bgColor,
          outline: 'none', color: isEmpty ? '#c0392b' : '#1a1210',
        }}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
      />
      {dirty && localVal && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          title={"Soumettre \u00E0 la communaut\u00E9"}
          style={{
            width: '24px', height: '24px', borderRadius: '6px', border: 'none',
            background: '#1a7a40', color: '#fff', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'opacity 0.15s', opacity: submitting ? 0.5 : 1,
          }}
        >{'\u2713'}</button>
      )}
      {dirty && (
        <button onClick={handleCancel} title={"Annuler"}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#c0392b', fontSize: '14px' }}
        >{'\u00D7'}</button>
      )}
    </div>
  )
}

function CellTypeLoyer({ bien, userToken, champsStatut, onUpdate }: any) {
  const valeur = bien.type_loyer
  const statut = champsStatut['type_loyer']
  const hasSourceData = valeur && !statut
  const isVert = statut?.statut === 'vert'

  if (!userToken || hasSourceData) {
    if (!valeur) return <span style={{ color: '#c0392b', fontStyle: 'italic', fontSize: '13px' }}>NC</span>
    return <span style={{ fontWeight: 600, color: '#1a1210', fontSize: '13px' }}>{valeur}</span>
  }

  const borderColor = !valeur ? '#c0392b' : isVert ? '#1a7a40' : '#e8e2d8'
  const bgColor = !valeur ? '#fde8e8' : isVert ? '#eafaf1' : '#faf8f5'

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <select
        value={valeur || ''}
        onChange={e => { if (e.target.value) onUpdate('type_loyer', e.target.value) }}
        style={{ padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${borderColor}`, fontFamily: "'DM Sans', sans-serif", fontSize: '13px', background: bgColor, outline: 'none' }}
      >
        <option value="">NC</option>
        <option value="HC">HC</option>
        <option value="CC">CC</option>
      </select>
      {isVert && <span title={"Valid\u00E9 par la communaut\u00E9"} style={{ fontSize: '12px', color: '#1a7a40' }}>{'\u2713'}</span>}
    </div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>
        <span style={{ fontSize: '13px', color: '#555', fontWeight: bold ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {info && !isFree && <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{info}</span></span>}
        </span>
        <span style={{ fontSize: '14px', fontWeight: bold ? 700 : 500, color: tiret ? '#c0b0a0' : rouge ? '#c0392b' : vert ? '#1a7a40' : '#1a1210' }} className={isFree && !tiret ? 'val-blur' : ''}>
          {tiret ? '-' : value}
        </span>
      </div>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return <div style={{ fontSize: '11px', fontWeight: 700, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '20px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '2px solid #f0ede8' }}>{label}</div>
  }

  return (
    <div style={{ background: highlight ? '#fff8f0' : '#fff', border: highlight ? '2px solid #f0d090' : '1.5px solid #ede8e0', borderRadius: '14px', padding: '20px 24px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '15px', fontWeight: 700, marginBottom: colFraisNotairePct !== (fraisNotaire || 7.5) ? '8px' : '16px', color: '#1a1210' }}>{titre}</div>
      {(() => {
        const thisHasNote = colFraisNotairePct !== (fraisNotaire || 7.5)
        const otherNotairePct = otherRegime === 'marchand_de_biens' ? 2.5 : (fraisNotaireBase || 7.5)
        const otherHasNote = otherNotairePct !== (fraisNotaire || 7.5)
        if (thisHasNote) return (
          <div style={{ fontSize: '11px', color: '#7a6a60', background: '#faf8f5', borderRadius: '8px', padding: '8px 12px', marginBottom: '16px', lineHeight: 1.5, fontStyle: 'italic', minHeight: '44px' }}>
            {`Mensualit\u00E9s et int\u00E9r\u00EAts calcul\u00E9s avec ${colFraisNotairePct}\u00A0% de frais de notaire${isMarchand ? ' (MdB)' : ''}, soit un emprunt de ${fmt(colMontantEmprunte)}\u00A0\u20AC.`}
          </div>
        )
        if (otherHasNote) return (
          <div style={{ fontSize: '11px', borderRadius: '8px', padding: '8px 12px', marginBottom: '16px', lineHeight: 1.5, visibility: 'hidden', minHeight: '44px' }} aria-hidden="true">
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
        <div style={{ paddingTop: '12px', background: cashflowNetMensuel >= 0 ? '#d4f5e0' : '#fde8e8', borderRadius: '10px', padding: '12px 16px', marginTop: '12px' }}>
          <div style={{ fontSize: '11px', color: '#7a6a60', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{"Cash Flow Net d\u2019Imp\u00F4t"}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 800, color: cashflowNetMensuel >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>
              {cashflowNetMensuel >= 0 ? '+' : ''}{fmt(cashflowNetMensuel)} {'\u20AC'}/mois
            </span>
            <span style={{ fontSize: '13px', color: cashflowNetAnnuel >= 0 ? '#1a7a40' : '#c0392b', fontWeight: 600 }} className={isFree ? 'val-blur' : ''}>
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
          <div style={{ marginTop: '16px', paddingTop: '16px', background: profitNet >= 0 ? '#d4f5e0' : '#fde8e8', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#7a6a60', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {`Bilan sur ${dur} an${dur > 1 ? 's' : ''}`}
            </div>
            {!isTravauxLourds && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', alignItems: 'center' }}>
                <span className="pnl-tooltip-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help', color: '#555' }}>
                  {"Cashflow locatif net cumul\u00E9"}
                  <span style={{ fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</span>
                  <span className="pnl-tooltip-text">{`Somme des loyers nets encaiss\u00E9s apr\u00E8s d\u00E9duction des mensualit\u00E9s de cr\u00E9dit et de l\u2019imp\u00F4t, sur ${dur}\u00A0an${dur > 1 ? 's' : ''} de d\u00E9tention.\n\n${fmt(cashflowNetMensuel)}\u00A0\u20AC/mois \u00D7 ${dur * 12}\u00A0mois${fraisBancaires > 0 ? `\n- Frais bancaires : ${fmt(fraisBancaires)}\u00A0\u20AC` : ''}\n= ${fmt(cashflowCumule)}\u00A0\u20AC`}</span>
                </span>
                <span style={{ fontWeight: 600, color: cashflowCumule >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{cashflowCumule >= 0 ? '+' : ''}{fmt(cashflowCumule)} {'\u20AC'}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', alignItems: 'center' }}>
              <span className="pnl-tooltip-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help', color: '#555' }}>
                {"Cashflow achat-revente net"}
                <span style={{ fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</span>
                <span className="pnl-tooltip-text">{`R\u00E9sultat net de l\u2019op\u00E9ration d\u2019achat-revente apr\u00E8s remboursement du cr\u00E9dit et fiscalit\u00E9.\n\n+ Emprunt re\u00E7u : ${fmt(colMontantEmprunte)}\u00A0\u20AC\n+ PV nette d\u2019imp\u00F4t : ${fmt(pvNette)}\u00A0\u20AC\n- Remboursement CRD : ${fmt(Math.round(crd))}\u00A0\u20AC${interetsCumules > 0 ? `\n- Int\u00E9r\u00EAts cumul\u00E9s : ${fmt(interetsCumules)}\u00A0\u20AC` : ''}\n= ${fmt(cashflowAchatRevente)}\u00A0\u20AC\n\n${colTypeCredit === 'in_fine' ? `Cr\u00E9dit in fine : le capital (${fmt(colMontantEmprunte)}\u00A0\u20AC) est int\u00E9gralement rembours\u00E9 \u00E0 la revente.` : `Cr\u00E9dit amortissable : ${fmt(Math.round(colMontantEmprunte - crd))}\u00A0\u20AC de capital d\u00E9j\u00E0 rembours\u00E9 via les mensualit\u00E9s.`}`}</span>
              </span>
              <span style={{ fontWeight: 600, color: cashflowAchatRevente >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>
                {cashflowAchatRevente >= 0 ? '+' : ''}{fmt(cashflowAchatRevente)} {'\u20AC'}
              </span>
            </div>
            <div style={{ borderTop: '2px solid rgba(0,0,0,0.1)', paddingTop: '8px' }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 800, color: profitNet >= 0 ? '#1a7a40' : '#c0392b', marginBottom: '4px' }} className={isFree ? 'val-blur' : ''}>
                {profitNet >= 0 ? '+' : ''}{fmt(profitNet)} {'\u20AC'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#555' }}>
                  <span className="pnl-tooltip-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>ROI <span style={{ fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</span><span className="pnl-tooltip-text">{"Return On Investment (retour sur investissement). C\u2019est votre gain total (cashflow + plus-value) divis\u00E9 par le co\u00FBt total de l\u2019op\u00E9ration (achat + notaire + travaux). Un ROI de 20% signifie que vous avez gagn\u00E9 20\u00A0\u20AC pour 100\u00A0\u20AC investis. Le ROI annualis\u00E9 permet de comparer des op\u00E9rations de dur\u00E9es diff\u00E9rentes."}</span></span>
                  <span style={{ fontWeight: 600, color: roiTotal >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{roiTotal > 0 ? '+' : ''}{roiTotal}% ({roiAnnualise > 0 ? '+' : ''}{roiAnnualise}%/an)</span>
                </div>
                {fondsInvestis > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#555' }}>
                    <span className="pnl-tooltip-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>ROE <span style={{ fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</span><span className="pnl-tooltip-text">{"Return On Equity (retour sur fonds propres). C\u2019est votre gain total divis\u00E9 par l\u2019argent que VOUS avez mis de votre poche (apport + frais de notaire). Gr\u00E2ce \u00E0 l\u2019effet de levier du cr\u00E9dit, le ROE est souvent bien sup\u00E9rieur au ROI. Un ROE de 50% signifie que vous avez gagn\u00E9 50\u00A0\u20AC pour 100\u00A0\u20AC sortis de votre poche."}</span></span>
                    <span style={{ fontWeight: 600, color: roeTotal >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{roeTotal > 0 ? '+' : ''}{roeTotal}% ({roeAnnualise > 0 ? '+' : ''}{roeAnnualise}%/an)</span>
                  </div>
                )}
              </div>
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

function LotsEditor({ lots, nbLotsEffectif, userToken, onSave }: { lots: any[], nbLotsEffectif: number, userToken: string | null, onSave: (lots: any[]) => Promise<void> }) {
  const [editLots, setEditLots] = useState(() => {
    return Array.from({ length: Math.max(nbLotsEffectif, lots.length) }).map((_, i) => ({
      type: lots[i]?.type || '',
      surface: lots[i]?.surface || '',
      loyer: lots[i]?.loyer || '',
      etage: lots[i]?.etage || '',
      dpe: lots[i]?.dpe || '',
      etat: lots[i]?.etat || '',
    }))
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function updateLot(i: number, field: string, value: string) {
    setEditLots(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
    setSaved(false)
  }

  function addLot() {
    setEditLots(prev => [...prev, { type: '', surface: '', loyer: '', etage: '', dpe: '', etat: '' }])
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    const cleaned = editLots.map(l => ({
      type: l.type || undefined,
      surface: l.surface ? Number(l.surface) : undefined,
      loyer: l.loyer ? Number(l.loyer) : undefined,
      etage: l.etage || undefined,
      dpe: l.dpe || undefined,
      etat: l.etat || undefined,
    }))
    await onSave(cleaned)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputStyle: React.CSSProperties = { padding: '5px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", background: '#faf8f5', width: '100%', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table className="lots-table" style={{ fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ width: '36px' }}>Lot</th>
              <th style={{ width: '90px' }}>Type</th>
              <th style={{ width: '70px' }}>Surface</th>
              <th style={{ width: '70px' }}>Loyer</th>
              <th style={{ width: '60px' }}>{"\u00C9tage"}</th>
              <th style={{ width: '50px' }}>DPE</th>
              <th style={{ width: '70px' }}>{"\u00C9tat"}</th>
            </tr>
          </thead>
          <tbody>
            {editLots.map((lot, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, textAlign: 'center' }}>{i + 1}</td>
                <td>
                  <select value={lot.type} onChange={e => updateLot(i, 'type', e.target.value)} style={inputStyle}>
                    <option value="">-</option>
                    <option value="Appartement">Appartement</option>
                    <option value="Studio">Studio</option>
                    <option value="Local commercial">Local commercial</option>
                    <option value="Parking">Parking</option>
                    <option value="Cave">Cave</option>
                    <option value="Autre">Autre</option>
                  </select>
                </td>
                <td><input type="number" placeholder={"m\u00B2"} value={lot.surface} onChange={e => updateLot(i, 'surface', e.target.value)} style={inputStyle} /></td>
                <td><input type="number" placeholder={"\u20AC/mois"} value={lot.loyer} onChange={e => updateLot(i, 'loyer', e.target.value)} style={inputStyle} /></td>
                <td><input type="text" placeholder="RDC" value={lot.etage} onChange={e => updateLot(i, 'etage', e.target.value)} style={inputStyle} /></td>
                <td>
                  <select value={lot.dpe} onChange={e => updateLot(i, 'dpe', e.target.value)} style={inputStyle}>
                    <option value="">-</option>
                    {['A','B','C','D','E','F','G'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </td>
                <td>
                  <select value={lot.etat} onChange={e => updateLot(i, 'etat', e.target.value)} style={inputStyle}>
                    <option value="">-</option>
                    <option value="loue">{"Lou\u00E9"}</option>
                    <option value="vacant">Vacant</option>
                    <option value="travaux">Travaux</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={addLot} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e8e2d8', background: '#faf8f5', fontSize: '12px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          + Ajouter un lot
        </button>
        {userToken && (
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: saved ? '#1a7a40' : '#1a1210', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Sauvegarde...' : saved ? '\u2713 Sauvegard\u00E9' : 'Sauvegarder'}
          </button>
        )}
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

function EstimationSection({ bienId, prixFai, surface, adresseInitiale, villeInitiale, userToken, onEstimationLoaded, isFree = false, extra, estimationApiBase, labelPrix }: { bienId: string, prixFai: number, surface?: number, adresseInitiale?: string, villeInitiale?: string, userToken?: string | null, onEstimationLoaded?: (est: any) => void, isFree?: boolean, extra?: React.ReactNode, estimationApiBase?: string, labelPrix?: React.ReactNode }) {
  const [estimation, setEstimation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
    loadEstimation()
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
      <h2 className="section-title">{"Estimation Prix de Revente"}</h2>
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
  const [activeNav, setActiveNav] = useState('donnees')
  const [showLotsDetail, setShowLotsDetail] = useState(false)
  const [showLotsLocatif, setShowLotsLocatif] = useState(false)
  const [showCoutsCopro, setShowCoutsCopro] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showAvocatModal, setShowAvocatModal] = useState(false)
  const [showFraisModal, setShowFraisModal] = useState(false)
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
  const [regime2, setRegime2] = useState('nu_reel_foncier')
  const [budgetTravauxM2, setBudgetTravauxM2] = useState<Record<string, number>>({ '1': 200, '2': 500, '3': 800, '4': 1200, '5': 1800 })
  const [estimationData, setEstimationData] = useState<any>(null)
  const [dureeRevente, setDureeRevente] = useState<number>(1)
  const [fraisAgenceRevente, setFraisAgenceRevente] = useState<number | ''>(5) // 5% par defaut = frais agence inclus dans le FAI
  const [honorairesAvocat, setHonorairesAvocat] = useState<number | ''>(1500)

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

  // Sticky nav — IntersectionObserver to highlight active section
  useEffect(() => {
    const sections = ['donnees', 'estimation', 'financement', 'fiscalite']
    const observers: IntersectionObserver[] = []
    const visibleSet = new Set<string>()
    for (const sectionId of sections) {
      const el = document.getElementById(`nav-${sectionId}`)
      if (!el) continue
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) visibleSet.add(sectionId)
          else visibleSet.delete(sectionId)
          // Pick the first visible section in order
          for (const s of sections) {
            if (visibleSet.has(s)) { setActiveNav(s); break }
          }
        },
        { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    }
    return () => observers.forEach(o => o.disconnect())
  }, [bien])

  function scrollToNav(sectionId: string) {
    const el = document.getElementById(`nav-${sectionId}`)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 130
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
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

  // Prix cible cashflow (locatif)
  const prixCibleCashflow = resultatFAI?.prix_cible || null

  // Prix cible selon le mode choisi
  const prixCibleChoisi = isTravauxLourds
    ? prixCiblePV
    : modeCible === 'cashflow' && prixCibleCashflow ? prixCibleCashflow : prixCiblePV
  const prixCibleCombine = prixCibleChoisi || prixCiblePV || prixCibleCashflow || null
  const hasCibleContraignant = prixCibleCombine && prixCibleCombine < bien?.prix_fai

  const isFreeBlocked = userPlan === 'free' && freeAnalysesLeft <= 0
  // Valeurs numeriques (coerce '' -> 0 pour les calculs)
  const apportNum = apport || 0
  const tauxNum = taux || 0
  const tauxAssuranceNum = tauxAssurance || 0
  const fraisAgenceNum = fraisAgenceRevente || 0
  const prixBase = baseCalc === 'fai' ? bien.prix_fai : (prixCibleCombine || bien.prix_fai)
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
        .fiche-wrap { max-width: 1200px; margin: 0 auto; padding: 40px 48px; }
        .back-link { display: inline-block; margin-bottom: 24px; font-size: 13px; color: #7a6a60; text-decoration: none; }
        .back-link:hover { color: #1a1210; }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
        .fiche-photo { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 16px; max-height: 320px; }
        .fiche-photo-empty { width: 100%; aspect-ratio: 16/9; border-radius: 16px; background: #ede8e0; display: flex; align-items: center; justify-content: center; color: #b0a898; max-height: 320px; }
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
        .section { background: #fff; border-radius: 16px; padding: 24px 28px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 16px; }
        .section-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #1a1210; }
        .data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .estimation-price-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; }
        .data-subtitle { grid-column: 1 / -1; font-size: 11px; font-weight: 700; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.08em; padding-top: 8px; border-top: 1px solid #e8e2d8; margin-top: 4px; }
        .data-item { display: flex; flex-direction: column; gap: 4px; }
        .data-label { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; }
        .data-value { font-size: 14px; font-weight: 600; color: #1a1210; }
        .data-value.nc { color: #7a6a60; font-style: italic; font-weight: 400; }
        .dual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        .two-cols { display: flex; gap: 24px; align-items: flex-start; }
        .two-cols > .col { flex: 1; display: flex; flex-direction: column; gap: 0; min-width: 0; }
        .simu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .strat-intro { background: #fff; border-radius: 12px; border: 1px solid #e8e2d8; padding: 18px 22px; margin-bottom: 20px; font-size: 13px; color: #7a6a60; line-height: 1.7; display: flex; flex-direction: column; gap: 10px; }
        .strat-intro strong { color: #1a1210; }
        .strat-intro-cta { display: inline-flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 12px; font-weight: 600; color: #c0392b; text-decoration: none; transition: color 0.15s; }
        .strat-intro-cta:hover { color: #a5301f; }
        .data-missing { color: #c0392b; font-style: italic; font-weight: 400; font-size: 13px; }
        .param-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; }
        .param-label { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; }
        .param-input { padding: 9px 13px; border-radius: 9px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; background: #faf8f5; color: #1a1210; outline: none; width: 100%; box-sizing: border-box; }
        .param-input:focus { border-color: #c0392b; }
        .param-hint { font-size: 11px; color: #b0a898; }
        .toggle-row { display: flex; gap: 8px; }
        .toggle-btn { flex: 1; padding: 8px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; background: #faf8f5; color: #7a6a60; transition: all 0.15s; }
        .toggle-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; }
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
        .nc-warning { background: #fff8f0; border: 1.5px solid #f0d090; border-radius: 12px; padding: 16px 20px; color: #a06010; font-size: 13px; }
        .profil-bar { background: #f7f4f0; border-radius: 10px; padding: 10px 16px; font-size: 12px; color: #7a6a60; margin-top: 16px; }
        .legende { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
        .legende-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #7a6a60; }
        .legende-dot { width: 10px; height: 10px; border-radius: 50%; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #7a6a60; margin-bottom: 20px; }
        .breadcrumb a { color: #7a6a60; text-decoration: none; }
        .breadcrumb a:hover { color: #1a1210; }
        .breadcrumb .sep { color: #d0c8be; }

        /* Sticky nav */
        .sticky-nav { position: sticky; top: 68px; z-index: 50; background: rgba(250,248,245,0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 12px; padding: 4px; display: inline-flex; gap: 2px; margin-bottom: 24px; border: 1px solid #e8e2d8; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .sticky-nav-wrap { position: sticky; top: 68px; z-index: 50; display: flex; justify-content: center; margin-bottom: 24px; }
        .sticky-nav-item { padding: 9px 20px; font-size: 13px; font-weight: 600; color: #7a6a60; white-space: nowrap; cursor: pointer; background: none; border: none; border-radius: 9px; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .sticky-nav-item:hover { color: #1a1210; background: rgba(0,0,0,0.04); }
        .sticky-nav-item.active { color: #c0392b; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        /* Modal panel */
        .modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(26,18,16,0.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .modal-panel { background: #fff; border-radius: 16px; width: 100%; max-width: 640px; max-height: 85vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: modalIn 0.2s ease; display: flex; flex-direction: column; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 12px; flex-shrink: 0; }
        .modal-header h3 { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700; color: #1a1210; margin: 0; }
        .modal-close { background: none; border: none; cursor: pointer; color: #7a6a60; font-size: 22px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.15s; }
        .modal-close:hover { background: #f0ede8; color: #1a1210; }
        .modal-body { padding: 0 24px 24px; overflow-y: auto; flex: 1; }
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
            <PhotoCarousel bien={bien} overlay={isEnchere && bien.date_audience ? (() => {
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
                if (remaining > 0) { label = `Surenchère J-${remaining}`; bg = '#e67e22' }
                else { label = 'Adjugé'; bg = '#2a4a8a' }
              }
              return label ? (
                <span style={{ position: 'absolute', top: '12px', right: '12px', background: bg, color: '#fff', fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', zIndex: 2 }}>{label}</span>
              ) : null
            })() : undefined} />
            {isEnchere && (
              <div style={{ marginTop: '8px' }}>
                <PlatformLinks bien={bien} />
              </div>
            )}
          </div>

          <div className="fiche-info">
            <h1 className="fiche-title">{bien.type_bien || 'Bien'} {bien.nb_pieces ? (String(bien.nb_pieces).startsWith('T') ? bien.nb_pieces : `T${bien.nb_pieces}`) : ''}{bien.surface ? ` - ${Math.round(bien.surface)} m\u00B2` : ''}</h1>
            <p className="fiche-sub">{bien.quartier ? `${bien.quartier} - ` : ''}{bien.ville}{bien.code_postal ? ` - ${bien.code_postal}` : ''}{!isEnchere && bien.adresse ? ` — ${bien.adresse}` : ''}</p>
            <div className="fiche-tags">
              {isEnchere ? (
                <>
                  {(() => {
                    const statutMap: Record<string, { label: string; bg: string; color: string }> = {
                      a_venir: { label: 'À venir', bg: '#d4f5e0', color: '#1a7a40' },
                      surenchere: { label: 'En surenchère', bg: '#ffecd2', color: '#8a5a00' },
                      adjuge: { label: 'Adjugé', bg: '#d4ddf5', color: '#2a4a8a' },
                      vendu: { label: 'Vendu', bg: '#6c757d', color: '#fff' },
                      retire: { label: 'Retiré', bg: '#f5d4d4', color: '#8a2a2a' },
                      expire: { label: 'Expiré', bg: '#e9ecef', color: '#6c757d' },
                    }
                    // Ne pas afficher le badge statut si le countdown le couvre déjà
                    if (['a_venir', 'surenchere', 'adjuge'].includes(bien.statut)) return null
                    const s = statutMap[bien.statut] || statutMap.a_venir
                    return <span className="tag" style={{ background: s.bg, color: s.color, fontWeight: 700 }}>{s.label}</span>
                  })()}
                  {bien.occupation && bien.occupation !== 'NC' && (
                    <span className="tag" style={{
                      background: bien.occupation === 'libre' ? '#d4f5e0' : bien.occupation === 'loue' ? '#d4ddf5' : '#ffecd2',
                      color: bien.occupation === 'libre' ? '#1a7a40' : bien.occupation === 'loue' ? '#2a4a8a' : '#8a5a00',
                      fontWeight: 700,
                    }}>{bien.occupation === 'libre' ? 'Bien Libre' : bien.occupation === 'loue' ? 'Bien Loué' : 'Bien Occupé'}</span>
                  )}
                  {isVenteDelocalisee(bien.departement, bien.tribunal) && (
                    <span className="tag" style={{ background: '#fff3e0', color: '#e65100', fontWeight: 700 }} title="La vente se déroule dans un tribunal d'un autre département">
                      📍 Délocalisée
                    </span>
                  )}
                </>
              ) : (
                <>
                  {bien.strategie_mdb && <span className="tag tag-strat">{bien.strategie_mdb}</span>}
                  {bien.statut && <span className="tag tag-statut">{bien.statut}</span>}
                  {bien.prix_m2 && <span className="tag">{fmt(bien.prix_m2)} {'\u20AC'}/m{'\u00B2'}</span>}
                </>
              )}
            </div>
            <div className="prix-bloc">
              {isEnchere ? (
                <>
                  {/* Ligne prix : labels au-dessus, montants alignés */}
                  {(() => {
                    const hasAdjuge = bien.prix_adjuge && bien.prix_adjuge > 0
                    const dvf = estimationData?.prix_total || 0
                    const travaux = dvf && (bien.score_travaux || scorePerso) && bien.surface
                      ? (budgetTravauxM2[String(bien.score_travaux || scorePerso)] || 0) * bien.surface : 0
                    const enchMax = (() => {
                      if (!dvf) return null
                      const obj = (objectifPV || 20) / 100
                      const isMDB = regime === 'marchand_de_biens'
                      const fp = bien.frais_preemption || 0
                      // Itération point fixe : p = K - fraisEnchere(p), K = DVF/(1+obj) - travaux
                      const K = dvf / (1 + obj) - travaux
                      let p = K / 1.1 // estimation initiale (frais ≈ 10%)
                      for (let i = 0; i < 5; i++) {
                        p = K - calculerFraisEnchere(Math.max(1, p), fp, { isMDB }).total
                      }
                      return Math.round(p)
                    })()
                    return enchMax ? (
                      <>
                        <div style={{ display: 'flex', gap: '40px' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#7a6a60', marginBottom: 0, lineHeight: 1.2 }}>{hasAdjuge ? 'Prix Adjugé' : 'Mise à prix'}</div>
                            <span className="prix-fai">{fmt(hasAdjuge ? bien.prix_adjuge : bien.prix_fai)} {'\u20AC'}</span>
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#7a6a60', marginBottom: 0, lineHeight: 1.2 }}>Enchère Max (Objectif {objectifPV || 20}% PV)</div>
                            <span style={{ fontFamily: "'Fraunces', serif", fontSize: '30px', fontWeight: 800, color: '#1a7a40', lineHeight: 1, display: 'block' }}>
                              {fmt(enchMax)} {'\u20AC'}
                            </span>
                          </div>
                        </div>
                        {hasAdjuge && (
                          <div style={{ marginTop: '4px', fontSize: '13px', color: '#7a6a60' }}>Mise à prix : {fmt(bien.prix_fai)} {'\u20AC'}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#7a6a60', marginBottom: 0, lineHeight: 1.2 }}>{hasAdjuge ? 'Prix Adjugé' : 'Mise à prix'}</div>
                        <span className="prix-fai">{fmt(hasAdjuge ? bien.prix_adjuge : bien.prix_fai)} {'\u20AC'}</span>
                        {hasAdjuge && (
                          <div style={{ marginTop: '4px', fontSize: '13px', color: '#7a6a60' }}>Mise à prix : {fmt(bien.prix_fai)} {'\u20AC'}</div>
                        )}
                      </>
                    )
                  })()}
                  {/* Surenchère */}
                  {(bien.date_surenchere || bien.mise_a_prix_surenchere) && (
                    <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fffaf0', borderRadius: '8px', border: '1.5px solid #f0d090', fontSize: '13px', color: '#6a4a00', alignSelf: 'flex-start' }}>
                      <div><strong style={{ color: '#8a5a00' }}>Surenchère possible</strong>{bien.date_surenchere ? <> jusqu{"'"}au {new Date(bien.date_surenchere).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</> : null}</div>
                      {bien.mise_a_prix_surenchere && (
                        <div style={{ marginTop: '3px' }}>Nouvelle mise à prix : <strong>{bien.mise_a_prix_surenchere.toLocaleString('fr-FR')} {'\u20AC'}</strong></div>
                      )}
                      {bien.consignation && (
                        <div style={{ marginTop: '3px', color: '#9a7a50' }}>Consignation : <strong style={{ color: '#6a4a00' }}>{bien.consignation.toLocaleString('fr-FR')} {'\u20AC'}</strong></div>
                      )}
                    </div>
                  )}
                  {/* Watchlist */}
                  {userToken && (
                    <div style={{ marginTop: '10px' }}>
                      <button onClick={toggleWatchlist} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                        borderRadius: '10px', border: inWatchlist ? '2px solid #c0392b' : '2px solid #e8e2d8',
                        background: inWatchlist ? '#fde8e8' : '#fff', color: inWatchlist ? '#c0392b' : '#7a6a60',
                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        transition: 'all 0.15s',
                      }}>
                        <span style={{ fontSize: '16px' }}>{inWatchlist ? '\u2665' : '\u2661'}</span>
                        Watchlist
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span className="prix-label" style={{ marginBottom: '-2px' }}>Prix FAI</span>
                  <span className="prix-fai">{fmt(bien.prix_fai)} {'\u20AC'}</span>
                </>
              )}
              {/* Prix cible — masqué si enchère max présente (redondant) */}
              {(prixCibleCashflow || prixCiblePV) && !(isEnchere && estimationData?.prix_total) && (
                <>
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!isTravauxLourds && prixCibleCashflow && prixCiblePV ? (
                      <select
                        value={modeCible}
                        onChange={e => setModeCible(e.target.value as 'cashflow' | 'pv')}
                        style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: '1px solid #e8e2d8', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <option value="cashflow">{`Prix cible (Objectif ${objectifCashflow}% Cash Flow Avant Imp\u00F4t)`}</option>
                        <option value="pv">{`Prix cible (Objectif ${objectifPV}% PV Brute)`}</option>
                      </select>
                    ) : (
                      <span className="prix-label" style={{ margin: 0 }}>
                        {prixCiblePV && (isTravauxLourds || !prixCibleCashflow)
                          ? `Prix cible (Objectif ${objectifPV}% PV Brute)`
                          : `Prix cible (Objectif ${objectifCashflow}% Cash Flow Avant Imp\u00F4t)`}
                      </span>
                    )}
                  </div>
                  {(() => {
                    const prixAffiche = modeCible === 'cashflow' && prixCibleCashflow ? prixCibleCashflow : (prixCiblePV || prixCibleCashflow || 0)
                    const cibleSuperieur = prixAffiche >= bien.prix_fai
                    const isCashflowMode = modeCible === 'cashflow' && prixCibleCashflow

                    if (cibleSuperieur) {
                      // Prix cible > prix FAI : objectif déjà atteint, afficher le gain
                      if (isCashflowMode) {
                        return (
                          <div style={{ marginTop: '4px', background: '#d4f5e0', borderRadius: '8px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#1a7a40' }}>Cash flow positif</span>
                            <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 700, color: '#1a7a40' }} className={isFreeBlocked ? 'val-blur' : ''}>+{fmt(cashflowBrut)} {'\u20AC'}/mois</span>
                          </div>
                        )
                      }
                      // Mode PV : afficher la PV brute estimée
                      const pvBruteEstimee = (estimationData?.prix_total || 0) - bien.prix_fai - Math.round(bien.prix_fai * fraisNotaire / 100) - budgetTravCalc
                      return (
                        <div style={{ marginTop: '4px', background: '#d4f5e0', borderRadius: '8px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#1a7a40' }}>PV brute</span>
                          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 700, color: '#1a7a40' }} className={isFreeBlocked ? 'val-blur' : ''}>{pvBruteEstimee >= 0 ? '+' : ''}{fmt(pvBruteEstimee)} {'\u20AC'}</span>
                        </div>
                      )
                    }

                    const ecart = bien.prix_fai ? ((prixAffiche - bien.prix_fai) / bien.prix_fai * 100).toFixed(1) : '0'
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`prix-cible-val ${isFreeBlocked ? 'val-blur' : ''}`}>{fmt(prixAffiche)} {'\u20AC'}</span>
                        <span className={`ecart-badge ${Number(ecart) <= 0 ? 'ecart-neg' : 'ecart-pos'} ${isFreeBlocked ? 'val-blur' : ''}`}>{Number(ecart) > 0 ? '+' : ''}{ecart} %</span>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
            {!isEnchere && userToken && (
              <button onClick={toggleWatchlist} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                borderRadius: '10px', border: inWatchlist ? '2px solid #c0392b' : '2px solid #e8e2d8',
                background: inWatchlist ? '#fde8e8' : '#fff', color: inWatchlist ? '#c0392b' : '#7a6a60',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.15s', alignSelf: 'flex-start', marginTop: '4px'
              }}>
                <span style={{ fontSize: '16px' }}>{inWatchlist ? '\u2665' : '\u2661'}</span>
                Watchlist
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '-16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {!isEnchere && <PlatformLinks bien={bien} />}
          {!isEnchere && (
            <button onClick={() => setShowContact(true)} style={{ fontSize: '12px', fontWeight: 600, color: '#c0392b', padding: '6px 14px', border: '1px solid #e8e2d8', borderRadius: '8px', background: '#fff', transition: 'all 150ms ease', whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{"Compl\u00E9ter les donn\u00E9es manquantes \u2192"}</button>
          )}
        </div>

        {/* Sticky navigation */}
        <div className="sticky-nav-wrap">
          <nav className="sticky-nav">
            <button className={`sticky-nav-item ${activeNav === 'donnees' ? 'active' : ''}`} onClick={() => scrollToNav('donnees')}>{"Donn\u00E9es"}</button>
            <button className={`sticky-nav-item ${activeNav === 'estimation' ? 'active' : ''}`} onClick={() => scrollToNav('estimation')}>Estimation</button>
            <button className={`sticky-nav-item ${activeNav === 'financement' ? 'active' : ''}`} onClick={() => scrollToNav('financement')}>Financement</button>
            <button className={`sticky-nav-item ${activeNav === 'fiscalite' ? 'active' : ''}`} onClick={() => scrollToNav('fiscalite')}>{"Fiscalit\u00E9"}</button>
          </nav>
        </div>

        {/* Intro stratégie */}
        <div className="strat-intro">
          {bien.strategie_mdb === 'Locataire en place' && (
            <>
              <div>
                <strong>Stratégie Locataire en place</strong> — Les biens vendus occupés sont parmi les plus difficiles à vendre sur le marché immobilier&nbsp;: peu d{"'"}acquéreurs souhaitent acheter un logement qu{"'"}ils ne peuvent pas habiter immédiatement. C{"'"}est précisément ce qui permet de négocier des prix avec une <strong>forte décote</strong> par rapport au marché libre.
              </div>
              <div>
                Une fois le bien acheté, le marchand de biens propose généralement une <strong>prime d{"'"}éviction</strong> (entre 4 et 8 mois de loyer selon les pratiques) afin de permettre au locataire de partir et de se reloger, pour ensuite <strong>revendre le bien au prix du marché</strong>. Cette stratégie implique de faire beaucoup d{"'"}offres avant d{"'"}obtenir un retour positif&nbsp;: il n{"'"}est donc pas nécessaire de visiter avant de faire une offre, mais seulement une fois celle-ci acceptée, pour vérifier la conformité avec les informations transmises par le vendeur.
              </div>
              <div>
                Même si l{"'"}objectif est d{"'"}acheter et revendre le plus rapidement possible, cette stratégie génère un <strong>revenu locatif dès l{"'"}acquisition</strong>. L{"'"}analyse ci-dessous calcule le <strong>cash flow avant impôt</strong> (loyer − charges − crédit), puis l{"'"}<strong>analyse fiscale</strong> détermine le cash flow net d{"'"}impôt et simule la plus-value à la revente sur 1 à 5&nbsp;ans. Complétez les données manquantes (en rouge) pour affiner les résultats.
              </div>
              <a href="/strategies#s1" className="strat-intro-cta">En savoir plus sur cette stratégie →</a>
            </>
          )}
          {bien.strategie_mdb === 'Travaux lourds' && (
            <>
              <div>
                <strong>Stratégie Travaux lourds</strong> — Ce bien nécessite des travaux importants, ce qui entraîne un prix d{"'"}achat fortement décoté. L{"'"}objectif est de le rénover pour le revendre au <strong>prix marché</strong> ou le louer avec un rendement optimisé. Le <strong>score travaux IA</strong> (de 1 = bon état à 5 = très lourds) est généré automatiquement par analyse de la description de l{"'"}annonce. À chaque score correspond un <strong>budget travaux au m²</strong> paramétrable dans <a href="/parametres" style={{color: '#c0392b', fontWeight: 600}}>Mes paramètres</a> → Budget travaux.
              </div>
              <div>
                L{"'"}<strong>estimation DVF</strong> correspond au prix marché <strong>après rénovation</strong> (sans décote travaux). L{"'"}analyse calcule la <strong>plus-value nette avant impôt</strong> (estimation − prix − travaux − frais) et la fiscalité selon le régime choisi.
              </div>
              <div>
                En régime <strong>marchand de biens</strong>, l{"'"}option <strong>TVA sur marge</strong> (art. 260-5° bis CGI) peut être particulièrement avantageuse sur ce type de bien&nbsp;: en optant pour la TVA, vous payez 20&nbsp;% sur la marge (revente − achat), mais vous pouvez <strong>récupérer la TVA sur les travaux</strong> (20&nbsp;% du montant HT). Lorsque le budget travaux est élevé, la TVA récupérée peut dépasser la TVA due sur la marge. L{"'"}analyse fiscale ci-dessous intègre ce calcul avec un toggle TVA activable dans la colonne MdB.
              </div>
              <a href="/strategies#s2" className="strat-intro-cta">En savoir plus sur cette stratégie →</a>
            </>
          )}
          {bien.strategie_mdb === 'Division' && (
            <>
              <div>
                <strong>Stratégie Division</strong> — Ce bien présente un potentiel de division en plusieurs lots indépendants. L{"'"}idée est de <strong>multiplier les loyers</strong> en créant plusieurs logements à partir d{"'"}un seul bien (ex&nbsp;: un T5 divisé en 3 studios). Le rendement locatif peut être multiplié par 2 à 3 après travaux.
              </div>
              <div>
                L{"'"}analyse estime la rentabilité locative globale et le scénario de revente lot par lot. Vérifiez le PLU et les règles de copropriété avant de vous engager.
              </div>
              <a href="/strategies#s3" className="strat-intro-cta">En savoir plus sur cette stratégie →</a>
            </>
          )}
          {bien.strategie_mdb === 'Immeuble de rapport' && (
            <>
              <div>
                <strong>Stratégie Immeuble de rapport</strong> — Cet immeuble se compose de <strong>plusieurs lots</strong> achetés en bloc. L{"'"}approche marchand de biens consiste à acheter l{"'"}ensemble, rénover si nécessaire, créer la copropriété, puis <strong>revendre lot par lot</strong> pour dégager une marge nette de 15 à 25&nbsp;%.
              </div>
              <div>
                L{"'"}analyse détaille les revenus locatifs par lot, le cashflow global, et propose un scénario de revente à la découpe avec estimation DVF par lot. Régime obligatoire&nbsp;: <strong>IS</strong> (frais notaire 2,5&nbsp;%, TVA sur marge 20/120).
              </div>
              <a href="/strategies#s4" className="strat-intro-cta">En savoir plus sur cette stratégie →</a>
            </>
          )}
          {isEnchere && (
            <>
              <div>
                <strong>Vente aux enchères judiciaires</strong> — Ce bien est vendu par voie judiciaire (saisie immobilière ou liquidation). La mise à prix est fixée par le tribunal. L{"'"}adjudication se fait au plus offrant lors de l{"'"}audience.
              </div>
              <div>
                L{"'"}analyse compare la mise à prix avec l{"'"}estimation DVF pour calculer la <strong>décote</strong> potentielle. Les frais d{"'"}acquisition incluent les émoluments du commissaire de justice et les frais de poursuites.
              </div>
            </>
          )}
        </div>

        <div id="nav-donnees" className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <h2 className="section-title" style={{ margin: 0 }}>{"Caract\u00E9ristiques du Bien"}</h2>
            {(() => {
              const mi = typeof bien.moteurimmo_data === 'string' ? JSON.parse(bien.moteurimmo_data) : bien.moteurimmo_data
              const creationDate = mi?.creationDate
              if (!creationDate) return null
              const formatted = new Date(creationDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              return <span style={{ fontSize: '12px', color: '#7a6a60' }}>{"En ligne depuis le "}{formatted}</span>
            })()}
          </div>
          <div className="data-grid">
            {/* Infos enchère dans les caractéristiques */}
            {isEnchere && (
              <>
                <div className="data-subtitle">Enchère</div>
                {bien.tribunal && <div className="data-item"><span className="data-label">Tribunal</span><span className="data-value">{bien.tribunal}{isVenteDelocalisee(bien.departement, bien.tribunal) && <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 600, background: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: '6px' }} title="La vente se déroule dans un tribunal d'un autre département">📍 Délocalisée</span>}</span></div>}
                {bien.date_audience && <div className="data-item"><span className="data-label">Audience</span><span className="data-value">{new Date(bien.date_audience).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{(() => { const d = Math.ceil((new Date(bien.date_audience).getTime() - Date.now()) / 86400000); return d >= 0 ? ` (J-${d})` : ' (passée)' })()}</span></div>}
                {bien.date_visite && <div className="data-item"><span className="data-label">Visite</span><span className="data-value">{new Date(bien.date_visite).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>}
                {bien.prix_adjuge && bien.prix_adjuge > 0 && <div className="data-item"><span className="data-label">Prix adjugé</span><span className="data-value" style={{ fontWeight: 700 }}>{bien.prix_adjuge.toLocaleString('fr-FR')} {'\u20AC'}</span></div>}
                {bien.statut && bien.statut !== 'a_venir' && <div className="data-item"><span className="data-label">Statut</span><span className="data-value">{({ surenchere: 'En surenchère', adjuge: 'Adjugé', vendu: 'Vendu', retire: 'Retiré', expire: 'Expiré' } as Record<string, string>)[bien.statut] || bien.statut}</span></div>}
                {/* Frais préalables + Honoraires avocat + Frais de mutation + Avocat — même ligne */}
                <div className="data-grid" style={{ gridColumn: '1 / -1' }}>
                  <div className="data-item">
                    <span className="data-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Frais préalables
                      <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        ?<span className="pnl-tooltip-text" style={{ textTransform: 'none' }}>Frais de procédure (commissaire de justice, annonces légales, diagnostics). Communiqués par le tribunal env. 1 semaine avant l{"'"}audience. Variables, à renseigner si connus.</span>
                      </span>
                    </span>
                    <CellEditable bien={bien} champ="frais_preemption" suffix={` \u20AC`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
                  </div>
                  {/* Honoraires d'avocat — libres */}
                  <div className="data-item">
                    <span className="data-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Honoraires d{"'"}avocat
                      <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        ?<span className="pnl-tooltip-text" style={{ textTransform: 'none' }}>Honoraires libres — fixés par l{"'"}avocat mandaté pour vous représenter à l{"'"}audience. Généralement entre 1{'\u00A0'}000 et 3{'\u00A0'}000{'\u00A0'}{'\u20AC'}. 1{'\u00A0'}500{'\u00A0'}{'\u20AC'} par défaut.</span>
                      </span>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        value={honorairesAvocat}
                        onChange={e => setHonorairesAvocat(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={e => { if (e.target.value === '') setHonorairesAvocat(1500) }}
                        placeholder="1500"
                        style={{
                          width: '80px', padding: '4px 8px', borderRadius: '6px',
                          border: '1.5px solid #e8e2d8', fontSize: '13px', fontWeight: 600,
                          fontFamily: "'DM Sans', sans-serif", textAlign: 'right',
                          background: '#fff', color: '#1a1210',
                        }}
                      />
                      <span style={{ fontSize: '13px', color: '#7a6a60' }}>{'\u20AC'}</span>
                    </div>
                  </div>
                  {/* Frais de mutation */}
                  {bien.mise_a_prix && bien.mise_a_prix > 0 && (() => {
                    const prixBase = (bien.prix_adjuge > 0 ? bien.prix_adjuge : bien.mise_a_prix) || 0
                    const isMDB = regime === 'marchand_de_biens'
                    const frais = calculerFraisEnchere(prixBase, undefined, { isMDB })
                    return (
                      <div className="data-item">
                        <span className="data-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Frais de mutation
                          <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '9px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            ?<span className="pnl-tooltip-text" style={{ textTransform: 'none' }}>Frais d{"'"}acquisition calculés : émoluments avocat + droits de mutation + CSI. Hors frais préalables et honoraires (à renseigner séparément).</span>
                          </span>
                        </span>
                        <button onClick={() => setShowFraisModal(true)} style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600,
                          color: '#2a4a8a', textDecoration: 'underline dotted', textUnderlineOffset: '2px',
                          textAlign: 'left',
                        }}>
                          {Math.round(frais.total_sans_prealables).toLocaleString('fr-FR')} {'\u20AC'} (~{Math.round(frais.pct_sans_prealables)}%)
                        </button>
                      </div>
                    )
                  })()}
                  {/* Avocat poursuivant */}
                  {bien.avocat_nom && (
                    <div className="data-item">
                      <span className="data-label">Avocat poursuivant</span>
                      <button onClick={() => setShowAvocatModal(true)} style={{
                        background: '#faf8f5', border: '1.5px solid #e8e2d8', borderRadius: '10px',
                        padding: '8px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
                      }}>
                        <span style={{ fontSize: '16px' }}>{'\u2696'}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1210' }}>{bien.avocat_nom}</div>
                          {bien.avocat_cabinet && <div style={{ fontSize: '11px', color: '#7a6a60' }}>{bien.avocat_cabinet}</div>}
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="data-subtitle">{"Caract\u00E9ristiques"}</div>
            {bien.adresse && (
              <div className="data-item" style={{ gridColumn: '1 / -1' }}>
                <span className="data-label">Adresse</span>
                <span className="data-value">{bien.adresse}{bien.code_postal ? `, ${bien.code_postal}` : ''} {bien.ville || ''}</span>
              </div>
            )}
            <div className="data-item">
              <span className="data-label">{"Ann\u00E9e de construction"}</span>
              <span className={`data-value ${!bien.annee_construction ? 'nc' : ''}`}>{bien.annee_construction || 'NC'}</span>
            </div>
            <div className="data-item">
              <span className="data-label">DPE</span>
              {bien.dpe ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '8px', fontWeight: 700, fontSize: '16px', color: '#fff',
                  background: ({ A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0e034', E: '#f0a830', F: '#eb6a2a', G: '#e42a1e' } as Record<string, string>)[bien.dpe] || '#7a6a60'
                }}>{bien.dpe}</span>
              ) : <span className="data-value nc">NC</span>}
            </div>
            <div className="data-item">
              <span className="data-label">Surface</span>
              <span className="data-value">{bien.surface ? `${bien.surface} m²` : 'NC'}</span>
            </div>
            {(bien.type_bien || '').toLowerCase().includes('maison') && (
              <div className="data-item">
                <span className="data-label">Terrain</span>
                <span className={`data-value ${!bien.surface_terrain ? 'nc' : ''}`}>{bien.surface_terrain ? `${bien.surface_terrain} m²` : 'NC'}</span>
              </div>
            )}
            <div className="data-item">
              <span className="data-label">{"Pièces"}</span>
              <span className={`data-value ${!bien.nb_pieces ? 'nc' : ''}`}>{bien.nb_pieces || 'NC'}</span>
            </div>
            <div className="data-item">
              <span className="data-label">Chambres</span>
              <span className={`data-value ${bien.nb_chambres == null ? 'nc' : ''}`}>{bien.nb_chambres != null ? bien.nb_chambres : 'NC'}</span>
            </div>
            <div className="data-item">
              <span className="data-label">Salles de bain</span>
              <span className={`data-value ${bien.nb_sdb == null ? 'nc' : ''}`}>{bien.nb_sdb != null ? bien.nb_sdb : 'NC'}</span>
            </div>
            <div className="data-item">
              <span className="data-label">{"Étage"}</span>
              <span className={`data-value ${!bien.etage ? 'nc' : ''}`}>{bien.etage || 'NC'}</span>
            </div>
            <div className="data-item">
              <span className="data-label">Chauffage</span>
              <span className={`data-value ${!bien.type_chauffage ? 'nc' : ''}`}>{[bien.type_chauffage, bien.mode_chauffage].filter(Boolean).join(' / ') || 'NC'}</span>
            </div>
          </div>
          {/* IDR : infos agrégées + tableau lots dépliable */}
          {isIDR && (
            <>
              <div className="data-grid" style={{ marginTop: '12px' }}>
                <div className="data-subtitle">Immeuble</div>
                <div className="data-item">
                  <span className="data-label">Nb lots</span>
                  <CellEditable bien={bien} champ="nb_lots" suffix=" lots" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
                </div>
                <div className="data-item">
                  <span className="data-label">{"Monopropri\u00E9t\u00E9"}</span>
                  {userToken ? (
                    <select value={bien.monopropriete === true ? 'oui' : bien.monopropriete === false ? 'non' : ''} onChange={e => { const v = e.target.value === 'oui' ? true : e.target.value === 'non' ? false : null; setBien((prev: any) => ({ ...prev, monopropriete: v })); handleUpdate('monopropriete', v) }} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", width: 'auto', maxWidth: '80px', color: bien.monopropriete === true ? '#1a7a40' : bien.monopropriete === false ? '#c0392b' : '#7a6a60', background: '#faf8f5', cursor: 'pointer' }}>
                      <option value="">NC</option>
                      <option value="oui">Oui</option>
                      <option value="non">Non</option>
                    </select>
                  ) : (
                    <span className="data-value" style={{ color: bien.monopropriete ? '#1a7a40' : '#7a6a60' }}>{bien.monopropriete === true ? 'Oui' : bien.monopropriete === false ? 'Non' : 'NC'}</span>
                  )}
                </div>
                <div className="data-item">
                  <span className="data-label">Compteurs individuels</span>
                  {userToken ? (
                    <select value={bien.compteurs_individuels === true ? 'oui' : bien.compteurs_individuels === false ? 'non' : ''} onChange={e => { const v = e.target.value === 'oui' ? true : e.target.value === 'non' ? false : null; setBien((prev: any) => ({ ...prev, compteurs_individuels: v })); handleUpdate('compteurs_individuels', v) }} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", width: 'auto', maxWidth: '80px', color: bien.compteurs_individuels === true ? '#1a7a40' : bien.compteurs_individuels === false ? '#c0392b' : '#7a6a60', background: '#faf8f5', cursor: 'pointer' }}>
                      <option value="">NC</option>
                      <option value="oui">Oui</option>
                      <option value="non">Non</option>
                    </select>
                  ) : (
                    <span className="data-value" style={{ color: bien.compteurs_individuels ? '#1a7a40' : '#7a6a60' }}>{bien.compteurs_individuels === true ? 'Oui' : bien.compteurs_individuels === false ? 'Non' : 'NC'}</span>
                  )}
                </div>
              </div>
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button onClick={() => setShowLotsDetail(!showLotsDetail)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {showLotsDetail ? "Masquer le d\u00E9tail des lots" : "Voir le d\u00E9tail des lots"}
                </button>
              </div>
              <ModalPanel open={showLotsDetail} onClose={() => setShowLotsDetail(false)} title={"D\u00E9tail des lots"}>
                <LotsEditor lots={lots} nbLotsEffectif={nbLotsEffectif} userToken={userToken} onSave={async (newLots) => { await handleUpdate('lots_data', { lots: newLots }); }} />
              </ModalPanel>
            </>
          )}
        </div>

        {bien.strategie_mdb === 'Travaux lourds' || (isEnchere && !bien.loyer) ? (
          <div className="section">
            <h2 className="section-title">{"Donn\u00E9es du Bien"}</h2>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">{"Taxe foncière"}</span>
                <CellEditable bien={bien} champ="taxe_fonc_ann" suffix={` \u20AC/an`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              {!(bien.type_bien || '').toLowerCase().includes('maison') && (
                <div className="data-item">
                  <span className="data-label">Charges copro</span>
                  <CellEditable bien={bien} champ="charges_copro" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
                </div>
              )}
              <div className="data-item">
                <span className="data-label">{"Budget énergie"}</span>
                <span className={`data-value ${!bien.budget_energie_min ? 'nc' : ''}`}>
                  {bien.budget_energie_min && bien.budget_energie_max ? `${bien.budget_energie_min} - ${bien.budget_energie_max} \u20AC/an` : 'NC'}
                </span>
              </div>
              <div className="data-item">
                <span className="data-label">GES</span>
                <span className={`data-value ${!bien.ges ? 'nc' : ''}`}>{bien.ges || 'NC'}</span>
              </div>
            </div>
            <div className="legende" style={{ marginTop: '12px' }}>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#c0392b' }}></div>{"Donn\u00E9e manquante \u2014 \u00E9ditable"}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#2a4a8a' }}></div>{"Simulation \u2014 \u2713 pour soumettre, \u00D7 pour annuler"}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#f0c040' }}></div>{"Soumis par 1 utilisateur"}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#1a7a40' }}></div>{"\u2713 Valid\u00E9 par 2+ utilisateurs"}</div>
            </div>
            {!userToken && <p style={{ fontSize: '12px', color: '#b0a898', marginTop: '12px', fontStyle: 'italic' }}>{"Connectez-vous pour compléter les données manquantes"}</p>}
          </div>
        ) : (
          <div className="section">
            <h2 className="section-title">{"Donn\u00E9es Locatives"}</h2>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">Loyer</span>
                <CellEditable bien={bien} champ="loyer" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              <div className="data-item">
                <span className="data-label">Type loyer</span>
                <CellTypeLoyer bien={bien} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              <div className="data-item">
                <span className="data-label">{"Charges récup."}</span>
                <CellEditable bien={bien} champ="charges_rec" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              <div className="data-item">
                <span className="data-label">Charges copro</span>
                <CellEditable bien={bien} champ="charges_copro" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              <div className="data-item">
                <span className="data-label">{"Taxe foncière"}</span>
                <CellEditable bien={bien} champ="taxe_fonc_ann" suffix={` \u20AC/an`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              {!isIDR && (
                <div className="data-item">
                  <span className="data-label">Profil locataire</span>
                  <span className={`data-value ${!bien.profil_locataire || bien.profil_locataire === 'NC' ? 'nc' : ''}`}>{bien.profil_locataire && bien.profil_locataire !== 'NC' ? bien.profil_locataire : 'Non communiqu\u00E9'}</span>
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
                    style={{ padding: '3px 6px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', background: '#faf8f5', color: '#1a1210', outline: 'none', width: '120px' }}
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
              <div className="legende-item"><div className="legende-dot" style={{ background: '#c0392b' }}></div>{"Donn\u00E9e manquante \u2014 \u00E9ditable"}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#2a4a8a' }}></div>{"Simulation \u2014 \u2713 pour soumettre, \u00D7 pour annuler"}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#f0c040' }}></div>{"Soumis par 1 utilisateur"}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#1a7a40' }}></div>{"\u2713 Valid\u00E9 par 2+ utilisateurs"}</div>
            </div>
            {!userToken && <p style={{ fontSize: '12px', color: '#b0a898', marginTop: '12px', fontStyle: 'italic' }}>{"Connectez-vous pour compléter les données manquantes"}</p>}
            {/* IDR : taux occupation + loyers par lot dépliable */}
            {isIDR && lots.length > 0 && (
              <>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: '#1a7a40', fontWeight: 600 }}>{lots.filter(l => l.etat === 'loue').length}/{nbLotsEffectif} lots {"lou\u00E9s"}</span>
                  {bien.loyer && <span style={{ fontSize: '13px', color: '#7a6a60' }}>Loyer annuel : {(bien.loyer * 12).toLocaleString('fr-FR')} {'\u20AC'}</span>}
                </div>
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  <button onClick={() => setShowLotsLocatif(!showLotsLocatif)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {showLotsLocatif ? "Masquer" : "D\u00E9tail loyers par lot"}
                  </button>
                </div>
                <ModalPanel open={showLotsLocatif} onClose={() => setShowLotsLocatif(false)} title={"D\u00E9tail loyers par lot"}>
                  <div className="lots-table-wrap"><table className="lots-table">
                    <thead><tr><th>Lot</th><th>Type</th><th>Loyer</th><th>{"\u00C9tat"}</th></tr></thead>
                    <tbody>
                      {Array.from({ length: Math.max(nbLotsEffectif, lots.length) }).map((_, i) => {
                        const lot = lots[i] || {}
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{i + 1}</td>
                            <td>
                              {lot.type ? lot.type : (
                                <select defaultValue="" style={{ padding: '2px 4px', borderRadius: '4px', border: '1px solid #e8e2d8', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", background: '#faf8f5' }}>
                                  <option value="">NC</option>
                                  <option value="Studio">Studio</option>
                                  <option value="T1">T1</option>
                                  <option value="T2">T2</option>
                                  <option value="T3">T3</option>
                                  <option value="T4">T4</option>
                                  <option value="T5">T5</option>
                                  <option value="Local commercial">Local commercial</option>
                                  <option value="Garage">Garage</option>
                                </select>
                              )}
                            </td>
                            <td>
                              {lot.loyer ? `${lot.loyer.toLocaleString('fr-FR')} \u20AC` : (
                                <input type="number" placeholder="0" style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #e8e2d8', fontSize: '12px', width: '70px', fontFamily: "'DM Sans', sans-serif", background: '#faf8f5', textAlign: 'right' }} />
                              )}
                            </td>
                            <td>
                              {lot.etat ? (
                                <span className={`lot-badge ${lot.etat === 'loue' ? 'lot-loue' : lot.etat === 'vacant' ? 'lot-vacant' : lot.etat === 'a_renover' ? 'lot-renover' : ''}`}>{lot.etat === 'loue' ? "Lou\u00E9" : lot.etat === 'vacant' ? 'Vacant' : lot.etat === 'a_renover' ? "\u00C0 r\u00E9nover" : 'NC'}</span>
                              ) : (
                                <select defaultValue="" style={{ padding: '2px 4px', borderRadius: '4px', border: '1px solid #e8e2d8', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", background: '#faf8f5' }}>
                                  <option value="">NC</option>
                                  <option value="loue">{"Lou\u00E9"}</option>
                                  <option value="vacant">Vacant</option>
                                  <option value="a_renover">{"\u00C0 r\u00E9nover"}</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table></div>
                </ModalPanel>
              </>
            )}
          </div>
        )}

        <div id="nav-estimation" className="two-cols">
        <div className="col">
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
              <EstimationSection bienId={id} prixFai={bien.prix_fai} surface={bien.surface} adresseInitiale={bien.adresse} villeInitiale={bien.ville} userToken={userToken} onEstimationLoaded={setEstimationData} isFree={isFreeBlocked} estimationApiBase={isEnchere ? '/api/estimation/encheres' : undefined} labelPrix={isEnchere ? (bien.prix_adjuge > 0 ? <>{"Prix adjug\u00e9"}</> : <>{"Mise \u00e0 prix"}</>) : undefined}
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
        {(peutCalculer || (isTravauxLourds && bien.prix_fai)) && peutCalculer && !isTravauxLourds && bien.loyer && (
          <div className="section">
              <h2 className="section-title">{"Cash Flow Avant Imp\u00F4t"}</h2>
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Mensuel</th>
                        <th>Annuel</th>
                      </tr>
                    </thead>
                    <tbody>
                            <tr>
                              <td>{"Loyer"} <span style={{ fontSize: '11px', color: '#7a6a60' }}>{bien.type_loyer === 'CC' ? '(CC)' : '(HC)'}</span></td>
                              <td><CellEditable bien={bien} champ="loyer" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} /></td>
                              <td><CellEditable bien={bien} champ="loyer" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={12} /></td>
                            </tr>
                            <tr>
                              <td>{bien.type_loyer === 'CC' ? "Charges r\u00E9cup. (incluses CC)" : "Charges r\u00E9cup."}</td>
                              <td><CellEditable bien={bien} champ="charges_rec" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} /></td>
                              <td><CellEditable bien={bien} champ="charges_rec" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={12} /></td>
                            </tr>
                            <tr>
                              <td>{"Charges copro"}</td>
                              <td><CellEditable bien={bien} champ="charges_copro" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} /></td>
                              <td><CellEditable bien={bien} champ="charges_copro" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={12} /></td>
                            </tr>
                            <tr>
                              <td>{"Taxe fonci\u00E8re"}</td>
                              <td><CellEditable bien={bien} champ="taxe_fonc_ann" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1/12} /></td>
                              <td><CellEditable bien={bien} champ="taxe_fonc_ann" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setBien} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} /></td>
                            </tr>
                            <tr>
                              <td>{"Mensualit\u00E9 cr\u00E9dit"}</td>
                              <td style={{ color: '#c0392b' }} className={isFreeBlocked ? 'val-blur' : ''}>-{fmt(mensualiteCredit)} {'\u20AC'}</td>
                              <td style={{ color: '#c0392b' }} className={isFreeBlocked ? 'val-blur' : ''}>-{fmt(mensualiteCredit * 12)} {'\u20AC'}</td>
                            </tr>
                            <tr>
                              <td>Assurance emprunteur</td>
                              <td style={{ color: '#c0392b' }} className={isFreeBlocked ? 'val-blur' : ''}>-{fmt(mensualiteAss)} {'\u20AC'}</td>
                              <td style={{ color: '#c0392b' }} className={isFreeBlocked ? 'val-blur' : ''}>-{fmt(mensualiteAss * 12)} {'\u20AC'}</td>
                            </tr>
                    </tbody>
                  </table>
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
        </div>{/* fin col gauche */}

        <div className="col">
        {/* Estimation travaux (toutes strategies) */}
        <div className="section">
          <h2 className="section-title">{bien.strategie_mdb === 'Travaux lourds' ? 'Diagnostic Travaux' : 'Estimation Travaux'}</h2>
          {isFreeBlocked && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff8f0', border: '1.5px solid #f0d090', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: '#1a1210', fontWeight: 600 }}>
                {"D\u00E9bloquez le diagnostic travaux"}
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
          <div style={{ marginBottom: '20px' }}>
            {bien.score_travaux ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span className="data-label" style={{ margin: 0, minWidth: '110px' }}>Score IA</span>
                <div style={{ display: 'flex', gap: '4px' }} className={isFreeBlocked ? 'val-blur' : ''}>
                  {[1, 2, 3, 4, 5].map(i => {
                    const color = i <= 2 ? '#1a7a40' : i <= 3 ? '#f0a830' : '#c0392b'
                    return (
                      <div key={i} style={{
                        width: '28px', height: '10px', borderRadius: '4px',
                        background: i <= (bien.score_travaux || 0) ? color : '#e8e2d8'
                      }} />
                    )
                  })}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210' }} className={userPlan === 'free' && freeAnalysesLeft <= 0 ? 'val-blur' : ''}>{bien.score_travaux}/5</span>
                <ScoreLabel score={bien.score_travaux} />
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#7a6a60', marginBottom: '8px' }}>Aucun score IA disponible</div>
            )}
            {bien.score_commentaire && (
              <div style={{ background: '#faf8f5', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#555', lineHeight: '1.5', fontStyle: 'italic', marginBottom: '12px' }} className={userPlan === 'free' && freeAnalysesLeft <= 0 ? 'val-blur' : ''}>
                {bien.score_commentaire}
              </div>
            )}
            {userToken && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                <span className="data-label" style={{ margin: 0, minWidth: '110px' }}>Mon estimation</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(i => {
                    const scoreAffiche = scorePerso || bien.score_travaux || 0
                    const active = i <= scoreAffiche
                    const color = i <= 2 ? '#1a7a40' : i <= 3 ? '#f0a830' : '#c0392b'
                    return (
                      <div key={i} onClick={() => handleScorePerso(i)} style={{
                        width: '28px', height: '11px', borderRadius: '4px',
                        cursor: 'pointer',
                        background: active ? color : '#e8e2d8',
                        transition: 'transform 0.15s'
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scaleY(1.3)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                      />
                    )
                  })}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210' }}>{(scorePerso || bien.score_travaux) ? `${scorePerso || bien.score_travaux}/5` : 'NC'}</span>
                <ScoreLabel score={scorePerso || bien.score_travaux} />
                {scorePerso && scorePerso !== bien.score_travaux && <span style={{ fontSize: '11px', color: '#b0a898', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleScorePerso(scorePerso)}>{"Réinitialiser au score IA"}</span>}
              </div>
            )}
          </div>
          {(() => {
            const scoreUtilise = scorePerso || bien.score_travaux
            if (!scoreUtilise || !bien.surface) return null
            const budgetM2 = budgetTravauxM2[String(scoreUtilise)] || 0
            const totalScore = Math.round(budgetM2 * bien.surface)
            const totalAffiche = hasDetail ? budgetDetailTotal : totalScore
            return (
              <>
                <div style={{ background: '#fff8f0', border: '1.5px solid #f0d090', borderRadius: '12px', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#a06010', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                        {hasDetail ? "Budget travaux (par poste)" : "Estimation budget travaux"}
                      </div>
                      <div style={{ fontSize: '13px', color: '#7a6a60' }} className={userPlan === 'free' && freeAnalysesLeft <= 0 ? 'val-blur' : ''}>
                        {hasDetail
                          ? `${Math.round(totalAffiche / bien.surface)} \u20AC/m\u00B2 \u00D7 ${bien.surface} m\u00B2`
                          : `${budgetM2} \u20AC/m\u00B2 \u00D7 ${bien.surface} m\u00B2 (${scorePerso ? 'mon estimation' : 'score IA'} ${scoreUtilise}/5)`}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 800, color: '#a06010' }} className={userPlan === 'free' && freeAnalysesLeft <= 0 ? 'val-blur' : ''}>
                      {totalAffiche.toLocaleString('fr-FR')} {'\u20AC'}
                    </div>
                  </div>
                </div>
                {/* Bouton pour detailler */}
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <button onClick={() => setShowDetailTravaux(!showDetailTravaux)} style={{
                    background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px',
                    padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#7a6a60',
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif"
                  }}>
                    {showDetailTravaux ? 'Masquer le d\u00E9tail' : 'Affiner le budget travaux'}
                  </button>
                  {hasDetail && !showDetailTravaux && (
                    <span onClick={() => { setDetailTravaux({}); }} style={{ marginLeft: '10px', fontSize: '11px', color: '#c0392b', cursor: 'pointer', textDecoration: 'underline' }}>
                      {"R\u00E9initialiser au score"}
                    </span>
                  )}
                </div>
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

        {/* Documents PDF enchères — colonne droite, après travaux */}
        {isEnchere && bien.documents && (() => {
          const docs = typeof bien.documents === 'string' ? JSON.parse(bien.documents) : bien.documents
          if (!docs || docs.length === 0) return null
          const icons: Record<string, string> = { ccv: '\uD83D\uDCCB', pv: '\uD83D\uDCDD', diag: '\uD83C\uDFE5', affiche: '\uD83D\uDCE2', autre: '\uD83D\uDCC4' }
          return (
            <div className="section">
              <h2 className="section-title">Documents Juridiques</h2>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {docs.map((doc: any, i: number) => (
                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px', background: '#faf8f5', borderRadius: '8px',
                    border: '1px solid #e8e2d8', textDecoration: 'none',
                    color: '#1a1210', fontSize: '12px', fontWeight: 500,
                  }}>
                    <span style={{ fontSize: '14px' }}>{icons[doc.type] || icons.autre}</span>
                    {doc.label || doc.type}
                    <span style={{ color: '#7a6a60', marginLeft: '4px' }}>↗</span>
                  </a>
                ))}
              </div>
            </div>
          )
        })()}

        {(peutCalculer || (isTravauxLourds && bien.prix_fai)) && (
          <>
            <div id="nav-financement" className="section">
              <h2 className="section-title">Simulateur de Financement</h2>
                <div>
                  {prixCibleCombine && (
                    <div className="param-group">
                      <label className="param-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Base de calcul <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{"D\u00E9termine le prix utilis\u00E9 pour calculer le montant du projet et l\u2019emprunt.\n\n\u2022 Prix FAI : le prix affich\u00E9 dans l\u2019annonce (frais d\u2019agence inclus). Utile pour simuler l\u2019achat au prix demand\u00E9.\n\n\u2022 Prix cible : le prix id\u00E9al calcul\u00E9 selon votre objectif de cashflow ou de plus-value. Utile pour pr\u00E9parer une offre."}</span></span></label>
                      <div className="toggle-row">
                        <button className={`toggle-btn ${baseCalc === 'fai' ? 'active' : ''}`} onClick={() => setBaseCalc('fai')}>Prix FAI</button>
                        <button className={`toggle-btn ${baseCalc === 'cible' ? 'active' : ''}`} onClick={() => setBaseCalc('cible')}>Prix cible</button>
                      </div>
                    </div>
                  )}
                  <div className="param-group">
                    <label className="param-label">Montant du projet (frais notaire inclus)</label>
                    <div className="param-input" style={{ background: '#f0ede8', color: '#1a1210', fontWeight: 700, fontSize: '16px' }}>{fmt(Math.round(montantProjet))} {'\u20AC'}</div>
                    <span className="param-hint">Base : {fmt(prixBase)} {'\u20AC'} + {fraisNotaire}% notaire{budgetTravCalc > 0 ? ` + ${fmt(budgetTravCalc)} \u20AC travaux` : ''}</span>
                  </div>
                  <div className="param-group">
                    <label className="param-label">Apport — {apportPct} % du projet ({fmt(apportNum)} {'\u20AC'})</label>
                    <div className="slider-wrap">
                      <input type="range" className="slider" min={0} max={100} step={0.5} value={apportPct}
                        onChange={e => { const pct = Number(e.target.value); setApport(Math.round(montantProjet * pct / 100)) }} />
                      <div className="slider-labels"><span>0 %</span><span>100 %</span></div>
                    </div>
                    <input className="param-input" type="number" value={apport} onChange={e => setApport(e.target.value === '' ? '' : Number(e.target.value))} onBlur={e => { if (e.target.value === '') setApport(profil?.apport ?? 0) }} placeholder={"Montant en \u20AC"} />
                    <span className="param-hint">{"Montant emprunt\u00E9"} : {fmt(montantEmprunte)} {'\u20AC'}</span>
                  </div>
                  <div className="param-group">
                    <label className="param-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Type de cr{'\u00E9'}dit <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{"Choisissez le type de cr\u00E9dit pour votre simulation.\n\n\u2022 Amortissable : vous remboursez le capital + les int\u00E9r\u00EAts chaque mois. Mensualit\u00E9 plus \u00E9lev\u00E9e mais le capital emprunt\u00E9 diminue au fil du temps. Dur\u00E9e : 5 \u00E0 30\u00A0ans.\n\n\u2022 In fine : vous ne payez que les int\u00E9r\u00EAts chaque mois. Le capital est rembours\u00E9 en une seule fois \u00E0 la revente du bien. Mensualit\u00E9 plus faible, utilis\u00E9 par les marchands de biens. Dur\u00E9e : 1 \u00E0 5\u00A0ans."}</span></span></label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button type="button" onClick={() => setTypeCredit('amortissable')} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e8e2d8', background: typeCredit === 'amortissable' ? '#1a1210' : '#fff', color: typeCredit === 'amortissable' ? '#fff' : '#7a6a60', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Amortissable</button>
                      <button type="button" onClick={() => setTypeCredit('in_fine')} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e8e2d8', background: typeCredit === 'in_fine' ? '#1a1210' : '#fff', color: typeCredit === 'in_fine' ? '#fff' : '#7a6a60', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>In fine</button>
                    </div>
                    {typeCredit === 'in_fine' && <span className="param-hint">{"Int\u00E9r\u00EAts seuls chaque mois, capital rembours\u00E9 \u00E0 la revente"}</span>}
                  </div>
                  <div className="param-group">
                    <label className="param-label">{"Taux cr\u00E9dit (%)"}</label>
                    <input className="param-input" type="number" step="0.01" value={taux} onChange={e => setTaux(e.target.value === '' ? '' : Number(e.target.value))} onBlur={e => { if (e.target.value === '') setTaux(profil?.taux_credit ?? 3.5) }} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">Taux assurance (%)</label>
                    <input className="param-input" type="number" step="0.01" value={tauxAssurance} onChange={e => setTauxAssurance(e.target.value === '' ? '' : Number(e.target.value))} onBlur={e => { if (e.target.value === '') setTauxAssurance(profil?.taux_assurance ?? 0.3) }} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">{"Dur\u00E9e"} — {duree} an{duree > 1 ? 's' : ''}</label>
                    <div className="slider-wrap">
                      {typeCredit === 'in_fine' ? (
                        <>
                          <input type="range" className="slider" min={1} max={5} step={1} value={Math.min(duree, 5)} onChange={e => setDuree(Number(e.target.value))} />
                          <div className="slider-labels"><span>1 an</span><span>5 ans</span></div>
                        </>
                      ) : (
                        <>
                          <input type="range" className="slider" min={5} max={30} step={1} value={duree} onChange={e => setDuree(Number(e.target.value))} />
                          <div className="slider-labels"><span>5 ans</span><span>30 ans</span></div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {/* Mensualités */}
                <div style={{ background: '#f7f4f0', borderRadius: '10px', padding: '16px 18px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #e8e2d8' }}>
                    <span style={{ fontSize: '12px', color: '#7a6a60' }}>{typeCredit === 'in_fine' ? "Int\u00E9r\u00EAts mensuels (in fine)" : "Mensualit\u00E9 cr\u00E9dit"}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210' }}>{fmt(mensualiteCredit)} {'\u20AC'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #e8e2d8' }}>
                    <span style={{ fontSize: '12px', color: '#7a6a60' }}>Assurance emprunteur</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210' }}>{fmt(mensualiteAss)} {'\u20AC'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1210' }}>{"Mensualité totale"}</span>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 800, color: '#c0392b' }}>{fmt(mensualiteTotale)} {'\u20AC'}<span style={{ fontSize: '13px', fontWeight: 600, color: '#7a6a60', marginLeft: '4px' }}>/mois</span></span>
                  </div>
                </div>
                {profil && <div className="profil-bar">{"Paramètres pré-remplis depuis votre profil — modifiables dans Mon profil"}</div>}
            </div>
          </>
        )}
        </div>{/* fin col droite */}
        </div>{/* fin two-cols nav-estimation */}

        {bien.prix_fai && (
          <div id="nav-fiscalite">
          <div className="section">
            <h2 className="section-title">Analyse Fiscale</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#7a6a60' }}>Comparer avec :</span>
                {userPlan === 'expert' ? (
                  <select className="param-input" style={{ width: 'auto' }} value={regime2} onChange={e => setRegime2(e.target.value)}>
                    {(isIDR ? REGIMES_IDR : REGIMES).filter(r => r.value !== regime).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="param-input" style={{ width: 'auto', background: '#f0ede8' }}>{[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime2)?.label || regime2}</span>
                    <a href="/#pricing" style={{ fontSize: '11px', color: '#c0392b', textDecoration: 'underline', whiteSpace: 'nowrap' }}>{"Tous les r\u00E9gimes \u2192 Expert"}</a>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#7a6a60' }}>{"D\u00E9tention :"}</span>
                {[1, 2, 3, 4, 5, 10, 15, 20].map(d => (
                  <button key={d} onClick={() => setDureeRevente(d)} style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: dureeRevente === d ? '2px solid #c0392b' : '1.5px solid #e8e2d8',
                    background: dureeRevente === d ? '#fde8e8' : '#faf8f5',
                    color: dureeRevente === d ? '#c0392b' : '#7a6a60',
                  }}>
                    {d} an{d > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {prixCibleCombine && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#7a6a60', whiteSpace: 'nowrap' }}>Base de calcul :</span>
                  <div className="toggle-row" style={{ minWidth: '220px' }}>
                    <button className={`toggle-btn ${baseCalc === 'fai' ? 'active' : ''}`} onClick={() => setBaseCalc('fai')}>Prix FAI</button>
                    <button className={`toggle-btn ${baseCalc === 'cible' ? 'active' : ''}`} onClick={() => setBaseCalc('cible')}>Prix cible</button>
                  </div>
                </div>
              )}
              {!isEnchere && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#7a6a60' }}>{"Frais d\u2019agence \u00E0 l\u2019achat :"}</span>
                  <input type="number" step="0.5" min="0" max="10" value={fraisAgenceRevente}
                    onChange={e => setFraisAgenceRevente(e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={e => { if (e.target.value === '') setFraisAgenceRevente(5) }}
                    className="param-input" style={{ width: '60px', textAlign: 'right' }} />
                  <span style={{ fontSize: '12px', color: '#7a6a60' }}>%</span>
                </div>
              )}
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
              <div className="pnl-grid">
                <PnlColonne titre={`${[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime)?.label || regime} (votre r\u00E9gime)`} bien={{ ...bien, prix_fai: prixBase }} financement={financement} tmi={tmi} regime={regime} otherRegime={regime2} highlight dureeRevente={dureeRevente} estimation={estimationData} budgetTravauxM2={budgetTravauxM2} scorePerso={scorePerso} fraisNotaire={fraisNotaire} fraisNotaireBase={fraisNotaireBase} apport={apportNum} fraisAgenceRevente={fraisAgenceNum} chargesUtilisateur={chargesUtilisateur} isFree={isFreeBlocked} isEnchere={isEnchere} fraisPrealables={bien.frais_preemption || 0} />
                <PnlColonne titre={[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime2)?.label || regime2} bien={{ ...bien, prix_fai: prixBase }} financement={financement} tmi={tmi} regime={regime2} otherRegime={regime} dureeRevente={dureeRevente} estimation={estimationData} budgetTravauxM2={budgetTravauxM2} scorePerso={scorePerso} fraisNotaire={fraisNotaire} fraisNotaireBase={fraisNotaireBase} apport={apportNum} fraisAgenceRevente={fraisAgenceNum} chargesUtilisateur={chargesUtilisateur} isFree={isFreeBlocked} isEnchere={isEnchere} fraisPrealables={bien.frais_preemption || 0} />
              </div>
            </div>
          </div>
          </div>
        )}

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
            {bien.avocat_email && (
              <a href={`mailto:${bien.avocat_email}`} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px',
                background: '#faf8f5', borderRadius: '10px', border: '1.5px solid #e8e2d8',
                textDecoration: 'none', color: '#1a1210', fontSize: '15px', fontWeight: 600,
              }}>
                <span style={{ fontSize: '20px' }}>{'\u2709'}</span>
                {bien.avocat_email}
              </a>
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
    </Layout>
  )
}