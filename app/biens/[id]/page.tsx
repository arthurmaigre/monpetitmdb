'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { calculerCashflow, calculerMensualite, calculerRevente, calculerCapitalRestantDu, calculerAbattementPV } from '@/lib/calculs'

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

function PhotoCarousel({ bien }: { bien: any }) {
  const [idx, setIdx] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const photos = getPhotos(bien)

  if (photos.length === 0) return <div className="fiche-photo-empty">Pas de photo</div>

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
      <img src={photos[idx]} alt="" className="fiche-photo" onClick={() => setFullscreen(true)} style={{ cursor: 'zoom-in' }} />
      {/* Fullscreen overlay */}
      {fullscreen && (
        <div onClick={() => setFullscreen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
        }}>
          <img src={photos[idx]} alt="" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: '8px' }} />
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

  // Annonce principale
  if (bien.url) {
    const origin = mi?.origin || getPlatformFromUrl(bien.url)
    links.push({ origin, url: bien.url })
  }

  // Duplicates
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

function CellEditable({ bien, champ, suffix = '', userToken, champsStatut, onUpdate }: any) {
  const valeur = bien[champ]
  const statut = champsStatut[champ]
  const [forceEdit, setForceEdit] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick() { setShowMenu(false) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (valeur === null || valeur === undefined) {
    if (!userToken) return <span style={{ color: '#c0b0a0', fontStyle: 'italic', fontSize: '13px' }}>NC</span>
    return (
      <input type="number" defaultValue="" placeholder="NC"
        style={{ width: '90px', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: '#faf8f5', outline: 'none' }}
        onBlur={e => { if (e.target.value) onUpdate(champ, Number(e.target.value)) }}
        onFocus={e => e.target.style.borderColor = '#c0392b'} />
    )
  }

  if (statut?.statut === 'vert' && !forceEdit) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <span onContextMenu={e => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setShowMenu(true) }}
          style={{ fontWeight: 600, color: '#1a7a40', cursor: 'context-menu', borderBottom: '2px solid #1a7a40', paddingBottom: '1px' }}
          title="Clic droit pour modifier">{valeur}{suffix}</span>
        {showMenu && (
          <div ref={menuRef} style={{ position: 'fixed', top: menuPos.y, left: menuPos.x, background: '#fff', border: '1.5px solid #e8e2d8', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '8px', zIndex: 1000, minWidth: '220px' }}>
            <div style={{ fontSize: '12px', color: '#7a6a60', padding: '6px 10px', borderBottom: '1px solid #f0ede8', marginBottom: '4px' }}>Valide par 2+ utilisateurs</div>
            <button onClick={() => { setShowMenu(false); if (window.confirm('Cette donnee a ete validee par plusieurs utilisateurs. Etes-vous sur de vouloir la modifier ?')) setForceEdit(true) }}
              style={{ width: '100%', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#c0392b', textAlign: 'left', borderRadius: '6px', fontFamily: 'DM Sans, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fff8f7')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              Modifier quand meme
            </button>
          </div>
        )}
      </div>
    )
  }

  if (statut?.statut === 'jaune' || forceEdit) {
    return (
      <input type="number" defaultValue={valeur || ''} placeholder="NC"
        style={{ width: '90px', padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${forceEdit ? '#c0392b' : '#f0c040'}`, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: forceEdit ? '#fff8f7' : '#fffdf0', outline: 'none' }}
        onBlur={e => { if (e.target.value && e.target.value !== String(valeur)) { onUpdate(champ, Number(e.target.value)); setForceEdit(false) } }}
        onFocus={e => e.target.style.borderColor = '#c0392b'} />
    )
  }

  return (
    <span style={{ fontWeight: 600, color: '#1a1210', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'text' }}
      title={"Cliquez pour modifier"}
    >
      {valeur}{suffix}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c0b0a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
        <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
    </span>
  )
}

function CellTypeLoyer({ bien, userToken, champsStatut, onUpdate }: any) {
  const valeur = bien.type_loyer
  const statut = champsStatut['type_loyer']
  const [forceEdit, setForceEdit] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    function handleClick() { setShowMenu(false) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (valeur === null || valeur === undefined) {
    if (!userToken) return <span style={{ color: '#c0b0a0', fontStyle: 'italic', fontSize: '13px' }}>NC</span>
    return (
      <select defaultValue="" onChange={e => { if (e.target.value) onUpdate('type_loyer', e.target.value) }}
        style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: '#faf8f5', outline: 'none' }}>
        <option value="">NC</option>
        <option value="HC">HC</option>
        <option value="CC">CC</option>
      </select>
    )
  }

  if (statut?.statut === 'vert' && !forceEdit) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <span onContextMenu={e => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setShowMenu(true) }}
          style={{ fontWeight: 600, color: '#1a7a40', cursor: 'context-menu', borderBottom: '2px solid #1a7a40', paddingBottom: '1px' }}
          title="Clic droit pour modifier">{valeur}</span>
        {showMenu && (
          <div style={{ position: 'fixed', top: menuPos.y, left: menuPos.x, background: '#fff', border: '1.5px solid #e8e2d8', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '8px', zIndex: 1000, minWidth: '220px' }}>
            <div style={{ fontSize: '12px', color: '#7a6a60', padding: '6px 10px', borderBottom: '1px solid #f0ede8', marginBottom: '4px' }}>Valide par 2+ utilisateurs</div>
            <button onClick={() => { setShowMenu(false); if (window.confirm('Cette donnee a ete validee par plusieurs utilisateurs. Etes-vous sur de vouloir la modifier ?')) setForceEdit(true) }}
              style={{ width: '100%', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#c0392b', textAlign: 'left', borderRadius: '6px', fontFamily: 'DM Sans, sans-serif' }}>
              Modifier quand meme
            </button>
          </div>
        )}
      </div>
    )
  }

  if (statut?.statut === 'jaune' || forceEdit) {
    return (
      <select defaultValue={valeur || ''} onChange={e => { if (e.target.value) { onUpdate('type_loyer', e.target.value); setForceEdit(false) } }}
        style={{ padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${forceEdit ? '#c0392b' : '#f0c040'}`, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: forceEdit ? '#fff8f7' : '#fffdf0', outline: 'none' }}>
        <option value="">NC</option>
        <option value="HC">HC</option>
        <option value="CC">CC</option>
      </select>
    )
  }

  return <span style={{ fontWeight: 600, color: '#1a1210' }}>{valeur}</span>
}

function PnlColonne({ titre, bien, financement, tmi, regime, highlight = false, dureeRevente, estimation, budgetTravauxM2, scorePerso, fraisNotaire, apport, fraisAgenceRevente = 5, chargesUtilisateur, isFree = false }: any) {
  const { prix_fai, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann } = bien
  const { montantEmprunte, tauxCredit, tauxAssurance, dureeAns } = financement
  const isTravauxLourds = bien.strategie_mdb === 'Travaux lourds'
  const hasLoyer = loyer && loyer > 0
  const isMarchand = regime === 'marchand_de_biens'

  const loyerAnnuel = (loyer || 0) * 12
  const chargesRecAnn = (charges_rec || 0) * 12
  const chargesCoproAnn = (charges_copro || 0) * 12 // charges_copro est mensuel en base
  const taxeFoncAnn = taxe_fonc_ann || 0
  const interetsAnn = montantEmprunte * tauxCredit / 100
  const assuranceAnn = montantEmprunte * (tauxAssurance / 100)
  const mobilier = 5000
  const amortImmo = prix_fai * 0.85 / 30
  const amortMobilier = mobilier / 10
  const amortLMNP = amortImmo + amortMobilier
  const fraisNotairePctLocatif = regime === 'marchand_de_biens' ? 2.5 : (fraisNotaire || 7.5)
  const fraisNotaireMontantLocatif = Math.round(prix_fai * fraisNotairePctLocatif / 100)
  const amortSCI = prix_fai * 0.85 / 30
  const amortNotaireSCI = fraisNotaireMontantLocatif / 5
  const hasAmort = regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is'
  const amort = (regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic') ? amortLMNP : regime === 'sci_is' ? (amortSCI + amortNotaireSCI) : 0

  // Charges utilisateur (deductibles seulement en reel, pas en MdB ni micro)
  const isReel = regime === 'nu_reel_foncier' || regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is'
  const assurancePNO = isReel ? (chargesUtilisateur?.assurance_pno || 0) : 0
  const fraisGestionPct = isReel ? (chargesUtilisateur?.frais_gestion_pct || 0) : 0
  const fraisGestion = loyerAnnuel * fraisGestionPct / 100
  const honorairesComptable = isReel ? (chargesUtilisateur?.honoraires_comptable || 0) : 0
  // CFE et frais OGA : uniquement en BIC (LMNP/LMP) et SCI IS
  const isBICouSCI = regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is'
  const cfe = isBICouSCI ? (chargesUtilisateur?.cfe || 0) : 0
  const fraisOGA = isBICouSCI ? (chargesUtilisateur?.frais_oga || 0) : 0
  const fraisBancaires = chargesUtilisateur?.frais_bancaires || 0
  const chargesSupplementaires = assurancePNO + fraisGestion + honorairesComptable + cfe + fraisOGA

  // --- Travaux (toutes strategies) ---
  const scoreUtilise = scorePerso || bien.score_travaux
  const budgetTravaux = scoreUtilise && bien.surface
    ? (budgetTravauxM2?.[String(scoreUtilise)] || 0) * bien.surface : 0
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
    impot = revenuImposable * (tmi / 100)
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

  const mensualiteCredit = calculerMensualite(montantEmprunte, tauxCredit, dureeAns)
  const mensualiteAss = montantEmprunte * (tauxAssurance / 100) / 12
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
  const prixReventeBrut = estimation?.prix_total || 0
  const fraisAgenceMontant = Math.round(prixReventeBrut * fraisAgenceRevente / 100)
  const prixRevente = prixReventeBrut - fraisAgenceMontant
  const fraisNotairePct = regime === 'marchand_de_biens' ? 2.5 : (fraisNotaire || 7.5)
  const fraisNotaireMontant = Math.round(prix_fai * fraisNotairePct / 100)

  // PV brute = revente - achat - notaire - travaux
  // Travaux deja deduits/amortis en locatif ne viennent pas en deduction de la PV
  // Nu reel : deduits en deficit foncier → pas dans PV
  // LMNP/LMP/SCI IS : amortis → deja dans VNC ou reintegres
  // Micro : pas de deduction locative → travaux dans PV
  // MdB : travaux = cout du stock, deduits du benefice (traite separement)
  // Travaux deja deduits seulement si phase locative active (pas en Travaux lourds)
  const hasPhaseLocative = hasLoyer && !isTravauxLourds
  const travauxDejaDeduits = hasPhaseLocative && (regime === 'nu_reel_foncier' || regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is')
  const travauxPV = travauxDejaDeduits ? 0 : budgetTravaux
  const pvBrute = prixRevente - prix_fai - fraisNotaireMontant - travauxPV

  // Fiscalite PV selon regime
  let irPV = 0, psPV = 0, tvaMarge = 0, isPV = 0
  let reintegrationAmort = 0
  let cotisationsSocialesLMP = 0
  const abattements = calculerAbattementPV(dur)

  if (regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier' || regime === 'lmnp_micro_bic') {
    // Particuliers : IR 19% + PS 17.2%, avec abattements detention
    if (pvBrute > 0) {
      const pvIR = pvBrute * (1 - abattements.abattementIR / 100)
      const pvPS = pvBrute * (1 - abattements.abattementPS / 100)
      irPV = pvIR * 0.19
      psPV = pvPS * 0.172
    }
  } else if (regime === 'lmnp_reel_bic') {
    // LMNP reel : reintegration des amortissements cumules (reforme LFI 2025) + abattements
    reintegrationAmort = amort * dur
    const pvReintegree = Math.max(0, pvBrute + reintegrationAmort)
    if (pvReintegree > 0) {
      const pvIR = pvReintegree * (1 - abattements.abattementIR / 100)
      const pvPS = pvReintegree * (1 - abattements.abattementPS / 100)
      irPV = pvIR * 0.19
      psPV = pvPS * 0.172
    }
  } else if (regime === 'lmp_reel_bic') {
    // LMP : exoneration si recettes < 90k ET > 5 ans, sinon PV professionnelle (court terme + long terme)
    if (dur > 5 && loyerAnnuel < 90000) {
      irPV = 0
      psPV = 0
      cotisationsSocialesLMP = 0
    } else if (pvBrute > 0) {
      // Court terme = min(PV brute, amortissements cumules) -> TMI + SSI 45%
      const amortsCumules = amort * dur
      const pvCourtTerme = Math.min(pvBrute, amortsCumules)
      // Long terme = PV brute - court terme -> 12.8% IR + 17.2% PS
      const pvLongTerme = Math.max(0, pvBrute - pvCourtTerme)
      irPV = pvCourtTerme * (tmi / 100) + pvLongTerme * 0.128
      psPV = pvLongTerme * 0.172
      cotisationsSocialesLMP = pvCourtTerme * 0.45
    }
  } else if (regime === 'sci_is') {
    // SCI IS : PV sur VNC, IS 15/25%, pas d'abattement + PFU 30% sur dividendes
    const amortCumule = ((prix_fai * 0.85 / 30) + fraisNotaireMontant / 5) * dur
    const vnc = prix_fai + fraisNotaireMontant + budgetTravaux - amortCumule
    const pvSCI = Math.max(0, prixRevente - vnc)
    isPV = pvSCI <= 42500 ? pvSCI * 0.15 : 42500 * 0.15 + (pvSCI - 42500) * 0.25
    // PFU 30% flat tax sur dividendes distribues (benefice apres IS)
    const beneficeDistribuable = pvSCI - isPV
    psPV = beneficeDistribuable > 0 ? beneficeDistribuable * 0.30 : 0
  } else if (regime === 'marchand_de_biens') {
    // MdB toujours a l'IS : TVA sur marge + IS sur benefice
    const marge = Math.max(0, prixReventeBrut - prix_fai)
    tvaMarge = marge * 20 / 120
    const benefice = Math.max(0, prixRevente - prix_fai - budgetTravaux - fraisNotaireMontant - tvaMarge)
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
  const crd = calculerCapitalRestantDu(montantEmprunte, tauxCredit, dureeAns, dur)

  // Bilan = produit revente - CRD - fiscalite PV + cashflow cumule - apport - frais notaire - travaux
  const produitRevente = prixRevente - crd
  const fondsInvestis = apport || 0
  const coutTotal = prix_fai + fraisNotaireMontant + budgetTravaux
  const fraisBancairesRevente = (!hasLoyer || isTravauxLourds) ? fraisBancaires : 0
  const profitNet = Math.round(cashflowCumule + pvNette - interetsCumules - fraisBancairesRevente)
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

  const hasRevente = prixReventeBrut > 0

  function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }

  function Row({ label, value, rouge = false, bold = false, tiret = false, info = '', vert = false }: any) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>
        <span style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: '#1a1210' }}>{titre}</div>

      {/* === PARTIE LOCATIVE (annuelle) === */}
      {hasLoyer && !isTravauxLourds && (
        <>
          <SectionLabel label="Revenus locatifs (annuel)" />
          <Row label="Loyer brut annuel" value={`${fmt(loyerAnnuel)} \u20AC`} />
          {regime === 'nu_micro_foncier' && (
            <Row label="Abattement forfaitaire (30%)" value={`-${fmt(Math.round(loyerAnnuel * 0.30))} \u20AC`} rouge info={"Micro-foncier : abattement de 30% sur les revenus fonciers bruts (art. 32 CGI). Toutes les charges sont r\u00E9put\u00E9es incluses dans cet abattement."} />
          )}
          {regime === 'lmnp_micro_bic' && (
            <Row label="Abattement forfaitaire (50%)" value={`-${fmt(Math.round(loyerAnnuel * 0.50))} \u20AC`} rouge info={"Micro-BIC : abattement de 50% sur les recettes BIC meubl\u00E9es (art. 50-0 CGI). Toutes les charges sont r\u00E9put\u00E9es incluses."} />
          )}
          <Row label="Charges copro" value={`-${fmt(chargesCoproAnn)} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'} info={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic' ? "Inclus dans l\u2019abattement forfaitaire" : undefined} />
          <Row label="Taxe fonciere" value={`-${fmt(taxeFoncAnn)} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'} info={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic' ? "Inclus dans l\u2019abattement forfaitaire" : undefined} />
          <Row label="Charges recup. annuelles" value={type_loyer === 'CC' ? `-${fmt(chargesRecAnn)} \u20AC` : `+${fmt(chargesRecAnn)} \u20AC`} />
          <Row label="Interets emprunt" value={`-${fmt(interetsAnn)} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'} info={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic' ? "Inclus dans l\u2019abattement forfaitaire" : undefined} />
          <Row label="Assurance emprunteur" value={`-${fmt(assuranceAnn)} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'} info={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic' ? "Inclus dans l\u2019abattement forfaitaire" : undefined} />
          <Row
            label={"Autres charges d\u00E9ductibles"}
            value={isReel && chargesSupplementaires > 0 ? `-${fmt(chargesSupplementaires)} \u20AC` : `0 \u20AC`}
            rouge={isReel && chargesSupplementaires > 0}
            tiret={!isReel}
            info={!isReel
              ? "D\u00E9ductible uniquement en r\u00E9gime r\u00E9el"
              : chargesSupplementaires > 0
                ? [
                    assurancePNO > 0 && `Assurance PNO : ${fmt(assurancePNO)} \u20AC`,
                    fraisGestion > 0 && `Gestion locative (${fraisGestionPct}%) : ${fmt(fraisGestion)} \u20AC`,
                    honorairesComptable > 0 && `Comptable : ${fmt(honorairesComptable)} \u20AC`,
                    cfe > 0 && `CFE : ${fmt(cfe)} \u20AC`,
                    fraisOGA > 0 && `Frais OGA : ${fmt(fraisOGA)} \u20AC`,
                    fraisBancaires > 0 && `Frais bancaires : ${fmt(fraisBancaires)} \u20AC/an (${fmt(chargesUtilisateur?.frais_bancaires || 0)} \u20AC liss\u00E9s sur ${dureeAns} ans, d\u00E9ductibles en totalit\u00E9 la 1\u00E8re ann\u00E9e)`,
                  ].filter(Boolean).join(' | ')
                : "Renseignez vos charges dans Mes param\u00E8tres (PNO, gestion locative, comptable, CFE, OGA, frais bancaires)"}
          />
          <Row
            label={"Travaux d\u00E9ductibles"}
            value={regime === 'nu_reel_foncier' && travauxDeductibles > 0 ? `-${fmt(travauxDeductibles)} \u20AC`
              : (regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is') && travauxAmortis > 0 ? `-${fmt(travauxAmortis)} \u20AC`
              : `0 \u20AC`}
            rouge={(regime === 'nu_reel_foncier' && travauxDeductibles > 0) || ((regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is') && travauxAmortis > 0)}
            tiret={!isReel}
            info={!isReel
              ? "D\u00E9ductible uniquement en r\u00E9gime r\u00E9el"
              : regime === 'nu_reel_foncier'
                ? (budgetTravaux > 0
                  ? `Budget : ${fmt(budgetTravaux)} \u20AC (score ${scoreUtilise}/5). Seuls entretien et am\u00E9lioration sont d\u00E9ductibles (d\u00E9ficit foncier, plafonn\u00E9 10 700 \u20AC/an). Pas la construction/agrandissement.`
                  : "Renseignez un score travaux pour estimer le budget")
                : (budgetTravaux > 0
                  ? `Budget : ${fmt(budgetTravaux)} \u20AC (score ${scoreUtilise}/5). Tous travaux amortissables sur 10 ans.`
                  : "Renseignez un score travaux pour estimer le budget")}
          />
          <Row label="Amortissement" value={`-${fmt(amort)} \u20AC`} rouge tiret={!hasAmort} info={"Amortissement fiscal uniquement en LMNP r\u00E9el, LMP et SCI IS"} />
          <Row label="Cotisations SSI (45%)" value={regime === 'lmp_reel_bic' ? `-${fmt(Math.max(0, revenuImposable) * 0.45)} \u20AC` : ''} rouge={regime === 'lmp_reel_bic'} tiret={regime !== 'lmp_reel_bic'} info={regime === 'lmp_reel_bic' ? "Cotisations sociales des ind\u00E9pendants (SSI)" : "Applicable uniquement en LMP"} />
          <Row label="Resultat imposable" value={`${fmt(revenuImposable)} \u20AC`} bold />
          <Row label="Impot" value={`-${fmt(impot)} \u20AC`} rouge bold />
        </>
      )}
      <div style={{ marginTop: 'auto' }}>
      {hasLoyer && !isTravauxLourds && (
        <div style={{ paddingTop: '12px', background: cashflowNetMensuel >= 0 ? '#d4f5e0' : '#fde8e8', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: '#7a6a60', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cashflow net</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 800, color: cashflowNetMensuel >= 0 ? '#1a7a40' : '#c0392b' }}>
              {cashflowNetMensuel >= 0 ? '+' : ''}{fmt(cashflowNetMensuel)} {'\u20AC'}/mois
            </span>
            <span style={{ fontSize: '13px', color: cashflowNetAnnuel >= 0 ? '#1a7a40' : '#c0392b', fontWeight: 600 }}>
              {cashflowNetAnnuel >= 0 ? '+' : ''}{fmt(cashflowNetAnnuel)} {'\u20AC'}/an
            </span>
          </div>
        </div>
      )}

      {/* === SCENARIO REVENTE === */}
      {hasRevente && (
        <>
          <SectionLabel label={`Sc\u00e9nario revente \u00e0 ${dur} an${dur > 1 ? 's' : ''}`} />
          <Row label="Prix de revente (DVF)" value={`${fmt(prixReventeBrut)} \u20AC`} />
          <Row label={`Frais d'agence (${fraisAgenceRevente}%)`} value={`-${fmt(fraisAgenceMontant)} \u20AC`} rouge />
          <Row label="Net vendeur" value={`${fmt(prixRevente)} \u20AC`} bold />
          <Row label="Prix d'achat (FAI)" value={`-${fmt(prix_fai)} \u20AC`} rouge />
          <Row label={`Frais de notaire (${fraisNotairePct}%)`} value={`-${fmt(fraisNotaireMontant)} \u20AC`} rouge />
          <Row
            label={budgetTravaux > 0 ? `Travaux (score ${scoreUtilise})` : 'Travaux'}
            value={travauxDejaDeduits
              ? (budgetTravaux > 0 ? `${fmt(budgetTravaux)} \u20AC (d\u00E9j\u00E0 d\u00E9duits)` : `0 \u20AC`)
              : (budgetTravaux > 0 ? `-${fmt(budgetTravaux)} \u20AC` : `0 \u20AC`)}
            rouge={!travauxDejaDeduits && budgetTravaux > 0}
            info={travauxDejaDeduits
              ? "Travaux d\u00E9j\u00E0 d\u00E9duits ou amortis en phase locative. Non comptabilis\u00E9s une 2e fois dans la plus-value."
              : "Co\u00FBt total des travaux. En micro (pas de d\u00E9duction locative), ils augmentent le prix de revient et r\u00E9duisent la plus-value imposable."}
          />
          {interetsCumules > 0 && (
            <Row label={`Int\u00E9r\u00EAts d'emprunt (${dur} an${dur > 1 ? 's' : ''})`} value={`-${fmt(interetsCumules)} \u20AC`} rouge info={`Int\u00E9r\u00EAts : ${fmt(interetsAnn)} \u20AC/an + Assurance : ${fmt(assuranceAnn)} \u20AC/an \u00D7 ${dur} an${dur > 1 ? 's' : ''}`} />
          )}
          {interetsCumules > 0 && fraisBancaires > 0 && (
            <Row label="Frais de dossier bancaire" value={`-${fmt(fraisBancaires)} \u20AC`} rouge info="Frais de dossier et de garantie bancaire, d\u00E9ductibles en totalit\u00E9" />
          )}
          <Row label={pvBrute >= 0 ? "Plus-value brute" : "Moins-value brute"} value={`${pvBrute > 0 ? '+' : ''}${fmt(pvBrute)} \u20AC`} bold vert={pvBrute > 0} rouge={pvBrute <= 0} />

          {/* Fiscalite PV — 3 lignes fixes pour alignement */}
          <Row
            label={regime === 'lmnp_reel_bic' ? "R\u00E9int\u00E9gration amortissements" : regime === 'marchand_de_biens' ? "TVA sur marge (20/120)" : regime === 'lmp_reel_bic' ? (dur > 5 ? "PV professionnelle" : `PV professionnelle (TMI ${tmi}%)`) : regime === 'sci_is' ? "IS sur PV (15% / 25%)" : "IR sur PV (19%)"}
            value={regime === 'lmnp_reel_bic' ? `+${fmt(Math.round(reintegrationAmort))} \u20AC`
              : regime === 'marchand_de_biens' ? `-${fmt(Math.round(tvaMarge))} \u20AC`
              : regime === 'lmp_reel_bic' ? (dur > 5 ? "Exon\u00E9r\u00E9e (> 5 ans)" : `-${fmt(Math.round(irPV))} \u20AC`)
              : regime === 'sci_is' ? `-${fmt(Math.round(isPV))} \u20AC`
              : `-${fmt(Math.round(irPV))} \u20AC`}
            rouge={!(regime === 'lmp_reel_bic' && dur > 5)}
            vert={regime === 'lmp_reel_bic' && dur > 5}
            info={regime === 'lmnp_reel_bic' ? "Amortissements d\u00E9duits r\u00E9int\u00E9gr\u00E9s dans la base imposable (r\u00E9forme LFI 2025)"
              : regime === 'sci_is' ? "PV sur VNC (valeur nette comptable), reste dans la SCI"
              : regime === 'lmp_reel_bic' && dur > 5 ? "Exon\u00E9ration totale apr\u00E8s 5 ans de d\u00E9tention" : ''}
          />
          <Row
            label={regime === 'lmnp_reel_bic' ? "IR sur PV (19%)"
              : regime === 'marchand_de_biens' ? "IS sur b\u00E9n\u00E9fice (15% / 25%)"
              : regime === 'sci_is' ? "PFU dividendes (30%)"
              : regime === 'lmp_reel_bic' ? "Pr\u00E9l. sociaux (17.2%)"
              : "Pr\u00E9l. sociaux (17.2%)"}
            value={regime === 'lmnp_reel_bic' ? `-${fmt(Math.round(irPV))} \u20AC`
              : regime === 'marchand_de_biens' ? `-${fmt(Math.round(isPV))} \u20AC`
              : regime === 'sci_is' ? `-${fmt(Math.round(psPV))} \u20AC`
              : regime === 'lmp_reel_bic' ? (psPV > 0 ? `-${fmt(Math.round(psPV))} \u20AC` : '') : `-${fmt(Math.round(psPV))} \u20AC`}
            rouge={psPV > 0 || (regime === 'lmnp_reel_bic' && irPV > 0) || (regime === 'marchand_de_biens' && isPV > 0)}
            tiret={regime === 'lmp_reel_bic' && psPV === 0}
            info={regime === 'sci_is' ? "Flat tax 30% sur les dividendes distribu\u00E9s aux associ\u00E9s (b\u00E9n\u00E9fice apr\u00E8s IS)" : ''}
          />
          <Row
            label={regime === 'lmnp_reel_bic' ? "Pr\u00E9l. sociaux (17.2%)"
              : regime === 'lmp_reel_bic' ? "Cotisations SSI (45%)"
              : ''}
            value={regime === 'lmnp_reel_bic' ? `-${fmt(Math.round(psPV))} \u20AC`
              : regime === 'lmp_reel_bic' && cotisationsSocialesLMP > 0 ? `-${fmt(Math.round(cotisationsSocialesLMP))} \u20AC`
              : ''}
            rouge={regime === 'lmnp_reel_bic' || (regime === 'lmp_reel_bic' && cotisationsSocialesLMP > 0)}
            tiret={regime !== 'lmnp_reel_bic' && !(regime === 'lmp_reel_bic' && cotisationsSocialesLMP > 0)}
            info={regime === 'lmp_reel_bic' ? "Cotisations SSI sur la plus-value court terme (amortissements)" : ''}
          />
          <Row label={pvNette >= 0 ? "Plus-value nette" : "Moins-value nette"} value={`${pvNette >= 0 ? '+' : ''}${fmt(pvNette)} \u20AC`} bold vert={pvNette >= 0} rouge={pvNette < 0} />

          {/* BILAN FINAL */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', background: profitNet >= 0 ? '#d4f5e0' : '#fde8e8', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#7a6a60', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {`Bilan sur ${dur} an${dur > 1 ? 's' : ''}`}
            </div>
            {cashflowCumule !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: '#555' }}>Cashflow locatif net cumul{'\u00e9'}</span>
                <span style={{ fontWeight: 600, color: cashflowCumule >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{cashflowCumule >= 0 ? '+' : ''}{fmt(cashflowCumule)} {'\u20AC'}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: '#555' }}>{pvNette >= 0 ? 'Plus-value nette' : 'Moins-value nette'}</span>
              <span style={{ fontWeight: 600, color: pvNette >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{pvNette >= 0 ? '+' : ''}{fmt(pvNette)} {'\u20AC'}</span>
            </div>
            {interetsCumules > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: '#555' }}>{`Int\u00E9r\u00EAts d'emprunt (${dur} an${dur > 1 ? 's' : ''})`}</span>
                <span style={{ fontWeight: 600, color: '#c0392b' }} className={isFree ? 'val-blur' : ''}>-{fmt(interetsCumules)} {'\u20AC'}</span>
              </div>
            )}
            {fraisBancairesRevente > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: '#555' }}>Frais de dossier bancaire</span>
                <span style={{ fontWeight: 600, color: '#c0392b' }} className={isFree ? 'val-blur' : ''}>-{fmt(fraisBancairesRevente)} {'\u20AC'}</span>
              </div>
            )}
            <div style={{ borderTop: '2px solid rgba(0,0,0,0.1)', paddingTop: '8px' }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 800, color: profitNet >= 0 ? '#1a7a40' : '#c0392b', marginBottom: '4px' }} className={isFree ? 'val-blur' : ''}>
                {profitNet >= 0 ? '+' : ''}{fmt(profitNet)} {'\u20AC'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#555' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>ROI</span>
                  <span style={{ fontWeight: 600, color: roiTotal >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{roiTotal > 0 ? '+' : ''}{roiTotal}% ({roiAnnualise > 0 ? '+' : ''}{roiAnnualise}%/an)</span>
                </div>
                {fondsInvestis > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#555' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>ROE</span>
                    <span style={{ fontWeight: 600, color: roeTotal >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{roeTotal > 0 ? '+' : ''}{roeTotal}% ({roeAnnualise > 0 ? '+' : ''}{roeAnnualise}%/an)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
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
          {champsManquants.length} information{champsManquants.length > 1 ? 's' : ''} manquante{champsManquants.length > 1 ? 's' : ''} pour calculer la rentabilit\u00e9 nette
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

function EstimationSection({ bienId, prixFai, surface, adresseInitiale, villeInitiale, userToken, onEstimationLoaded, isFree = false, extra }: { bienId: string, prixFai: number, surface?: number, adresseInitiale?: string, villeInitiale?: string, userToken?: string | null, onEstimationLoaded?: (est: any) => void, isFree?: boolean, extra?: React.ReactNode }) {
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
      const res = await fetch(`/api/estimation/${bienId}${force ? '?force=true' : ''}`)
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
        <h2 className="section-title">{"Estimation marché DVF"}</h2>
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
        <h2 className="section-title">{"Estimation marché DVF"}</h2>
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
      <h2 className="section-title">{"Estimation march\u00E9 DVF"}</h2>
      {isFree && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff8f0', border: '1.5px solid #f0d090', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#1a1210', fontWeight: 600 }}>
            {"D\u00E9bloquez l\u2019estimation march\u00E9 DVF"}
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
              placeholder={"Ex : 12 rue de la Paix"}
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0', marginBottom: '24px' }}>

        {/* Colonne gauche : Prix FAI */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{"Prix demand\u00E9"}</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 800, color: '#1a1210' }}>{fmt(prixFai)} {'\u20AC'}</div>
          {surface ? <div style={{ fontSize: '12px', color: '#7a6a60', marginTop: '4px' }}>{fmt(Math.round(prixFai / surface))} {'\u20AC'}/m{'\u00B2'}</div> : null}
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
            {isAjuste ? "Mon estimation" : "Estimation march\u00E9"}
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 800, color: ecartPositif ? '#1a7a40' : '#1a1210' }}><V>{fmt(prixActuel)} {'\u20AC'}</V></div>
          <div style={{ fontSize: '12px', color: '#7a6a60', marginTop: '4px' }}><V>{fmt(prixM2Actuel)} {'\u20AC'}/m{"²"}</V></div>
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
        <div style={{ fontSize: '11px', color: '#b0a898', textAlign: 'right' }}>
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

export default function FicheBienPage() {
  const params = useParams()
  const id = params.id as string
  const [bien, setBien] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [profil, setProfil] = useState<any>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<string>('free')
  const [freeAnalysesLeft, setFreeAnalysesLeft] = useState<number>(0)
  const [freeAnalysesUsed, setFreeAnalysesUsed] = useState<number>(0)
  const [champsStatut, setChampsStatut] = useState<Record<string, { valeur: string, statut: 'jaune' | 'vert' }>>({})
  const [scorePerso, setScorePerso] = useState<number | null>(null)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [showDetailTravaux, setShowDetailTravaux] = useState(false)
  // IDR states
  const [showLotsDetail, setShowLotsDetail] = useState(false)
  const [showLotsLocatif, setShowLotsLocatif] = useState(false)
  const [showCoutsCopro, setShowCoutsCopro] = useState(false)
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
  const [apport, setApport] = useState(0)
  const [taux, setTaux] = useState(3.5)
  const [tauxAssurance, setTauxAssurance] = useState(0.3)
  const [duree, setDuree] = useState(20)
  const [fraisNotaire, setFraisNotaire] = useState(7.5)
  const [tmi, setTmi] = useState(30)
  const [regime, setRegime] = useState('nu_micro_foncier')
  const [objectifCashflow, setObjectifCashflow] = useState(0)
  const [objectifPV, setObjectifPV] = useState(20)
  const [regime2, setRegime2] = useState('nu_reel_foncier')
  const [budgetTravauxM2, setBudgetTravauxM2] = useState<Record<string, number>>({ '1': 200, '2': 500, '3': 800, '4': 1200, '5': 1800 })
  const [estimationData, setEstimationData] = useState<any>(null)
  const [dureeRevente, setDureeRevente] = useState<number>(1)
  const [fraisAgenceRevente, setFraisAgenceRevente] = useState<number>(5)

  useEffect(() => {
    async function load() {
      try {
      const [bienRes, editsRes, sessionRes] = await Promise.all([
        fetch(`/api/biens/${id}`),
        fetch(`/api/biens/${id}/edits`),
        supabase.auth.getSession()
      ])
      if (!bienRes.ok) { setFetchError(true); setLoading(false); return }
      const bienData = await bienRes.json()
      const editsData = await editsRes.json()
      setBien(bienData.bien)
      setChampsStatut(editsData.champs || {})

      const session = sessionRes.data.session
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
          if (p.frais_notaire != null) setFraisNotaire(p.frais_notaire)
          if (p.tmi != null) setTmi(p.tmi)
          if (p.regime && [...REGIMES, ...REGIMES_IDR].some(r => r.value === p.regime)) setRegime(p.regime)
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
    const res = await fetch(`/api/biens/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ [champ]: valeur })
    })
    if (res.ok) {
      const data = await res.json()
      setBien((prev: any) => ({ ...prev, ...data.bien }))
      const editsRes = await fetch(`/api/biens/${id}/edits`)
      const editsData = await editsRes.json()
      setChampsStatut(editsData.champs || {})
    }
  }

  async function toggleWatchlist() {
    if (!userToken) return
    if (inWatchlist) {
      await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ bien_id: id })
      })
      setInWatchlist(false)
    } else {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ bien_id: id })
      })
      setInWatchlist(true)
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

  const peutCalculer = bien.loyer && bien.prix_fai
  const isTravauxLourds = bien.strategie_mdb === 'Travaux lourds'
  const isIDR = bien.strategie_mdb === 'Immeuble de rapport'
  const lotsData = bien.lots_data as { lots?: { type?: string; surface?: number; loyer?: number; type_loyer?: string; etat?: string; dpe?: string; etage?: string }[] } | null
  const lots = lotsData?.lots || []
  const nbLotsEffectif = bien.nb_lots || lots.length

  const resultatFAI = peutCalculer ? calculerCashflow(
    { prix_fai: bien.prix_fai, loyer: bien.loyer, type_loyer: bien.type_loyer, charges_rec: bien.charges_rec || 0, charges_copro: bien.charges_copro || 0, taxe_fonc_ann: bien.taxe_fonc_ann || 0, surface: bien.surface },
    { apport, tauxCredit: taux, tauxAssurance, dureeAns: duree, fraisNotaire, objectifCashflow },
    { tmi, regime: regime as any }
  ) : null

  // Prix cible PV (achat-revente)
  const scoreUtilCalc = scorePerso || bien.score_travaux
  const budgetTravCalc = scoreUtilCalc && bien.surface ? (budgetTravauxM2[String(scoreUtilCalc)] || 0) * bien.surface : 0
  const estimPrix = estimationData?.prix_total || 0
  // Prix cible PV : resoudre pour que pvBrute = objectifPV% × cout total
  // pvBrute = estimPrix × (1 - fraisAgence%) - prixCible × (1 + fraisNotaire%) - travaux
  // objectif = pvBrute / (prixCible × (1 + fraisNotaire%))
  // => prixCible = (estimPrix × (1 - fraisAgence/100) - budgetTrav) / ((1 + fraisNotaire/100) × (1 + objectifPV/100))
  const prixCiblePV = estimPrix > 0 ? Math.round((estimPrix * (1 - fraisAgenceRevente / 100) - budgetTravCalc) / ((1 + fraisNotaire / 100) * (1 + objectifPV / 100))) : null

  // Prix cible cashflow (locatif)
  const prixCibleCashflow = resultatFAI?.prix_cible || null

  // Prix cible selon le mode choisi
  const prixCibleChoisi = isTravauxLourds
    ? prixCiblePV
    : modeCible === 'cashflow' && prixCibleCashflow ? prixCibleCashflow : prixCiblePV
  const prixCibleCombine = prixCibleChoisi || prixCiblePV || prixCibleCashflow || null
  const hasCibleContraignant = prixCibleCombine && prixCibleCombine < bien?.prix_fai

  const isFreeBlocked = userPlan === 'free' && freeAnalysesLeft <= 0
  const prixBase = baseCalc === 'fai' ? bien.prix_fai : (prixCibleCombine || bien.prix_fai)
  const montantProjet = prixBase * (1 + fraisNotaire / 100) + budgetTravCalc
  const montantEmprunte = Math.max(0, montantProjet - apport)
  const apportPct = montantProjet > 0 ? Math.round(apport / montantProjet * 1000) / 10 : 0
  const ecartPct = prixCibleCombine ? ((prixCibleCombine - bien.prix_fai) / bien.prix_fai * 100).toFixed(1) : null
  const ecartNegatif = Number(ecartPct) <= 0

  const mensualiteCredit = calculerMensualite(montantEmprunte, taux, duree)
  const mensualiteAss = montantEmprunte * (tauxAssurance / 100) / 12
  const mensualiteTotale = mensualiteCredit + mensualiteAss

  const chargesRec = bien.charges_rec || 0
  const chargesCoproMens = bien.charges_copro || 0 // deja mensuel en base
  const taxeFoncMens = (bien.taxe_fonc_ann || 0) / 12
  const loyerNet = bien.type_loyer === 'CC'
    ? bien.loyer - chargesRec - chargesCoproMens - taxeFoncMens
    : bien.loyer + chargesRec - chargesCoproMens - taxeFoncMens
  const cashflowBrut = loyerNet - mensualiteTotale

  function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }
  const financement = { montantEmprunte, tauxCredit: taux, tauxAssurance, dureeAns: duree }
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
        .pnl-tooltip-wrap .pnl-tooltip-text { display: none; position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%); background: #1a1210; color: #fff; font-size: 11px; font-weight: 400; padding: 8px 12px; border-radius: 8px; white-space: normal; width: max-content; max-width: 280px; z-index: 10; line-height: 1.5; box-shadow: 0 4px 12px rgba(0,0,0,.15); pointer-events: none; }
        .pnl-tooltip-wrap .pnl-tooltip-text::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #1a1210; }
        .pnl-tooltip-wrap:hover .pnl-tooltip-text { display: block; }
        .fiche-wrap { max-width: 1200px; margin: 0 auto; padding: 40px 48px; }
        .back-link { display: inline-block; margin-bottom: 24px; font-size: 13px; color: #7a6a60; text-decoration: none; }
        .back-link:hover { color: #1a1210; }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
        .fiche-photo { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 16px; }
        .fiche-photo-empty { width: 100%; aspect-ratio: 16/9; border-radius: 16px; background: #ede8e0; display: flex; align-items: center; justify-content: center; color: #b0a898; }
        .fiche-info { display: flex; flex-direction: column; gap: 14px; }
        .fiche-title { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 800; color: #1a1210; }
        .fiche-sub { font-size: 14px; color: #7a6a60; margin-top: -8px; }
        .fiche-tags { display: flex; gap: 8px; flex-wrap: wrap; }
        .tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #f0ede8; color: #7a6a60; }
        .tag-strat { background: #d4ddf5; color: #2a4a8a; }
        .tag-statut { background: #d4f5e0; color: #1a7a40; }
        .prix-bloc { display: flex; flex-direction: column; gap: 3px; }
        .prix-label { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; }
        .prix-fai { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 800; color: #c0392b; }
        .prix-cible-val { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 700; color: #1a1210; }
        .ecart-badge { display: inline-block; margin-top: 2px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .ecart-neg { background: #d4f5e0; color: #1a7a40; }
        .ecart-pos { background: #fde8e8; color: #a33; }
        .lbc-btn { display: inline-block; padding: 9px 18px; border: 2px solid #e8e2d8; border-radius: 10px; font-size: 13px; font-weight: 600; color: #1a1210; text-decoration: none; transition: all 0.15s; }
        .lbc-btn:hover { border-color: #c0392b; color: #c0392b; }
        .section { background: #fff; border-radius: 16px; padding: 28px 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 24px; }
        .section-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #1a1210; }
        .data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .data-subtitle { grid-column: 1 / -1; font-size: 11px; font-weight: 700; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.08em; padding-top: 8px; border-top: 1px solid #e8e2d8; margin-top: 4px; }
        .data-item { display: flex; flex-direction: column; gap: 6px; }
        .data-label { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; }
        .data-value { font-size: 14px; font-weight: 600; color: #1a1210; }
        .data-value.nc { color: #7a6a60; font-style: italic; font-weight: 400; }
        .simu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
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
        @media (max-width: 767px) { .fiche-wrap { padding: 16px; } .hero-grid { grid-template-columns: 1fr; } .simu-grid { grid-template-columns: 1fr; } .pnl-grid { grid-template-columns: 1fr; } }
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
          <PhotoCarousel bien={bien} />

          <div className="fiche-info">
            <h1 className="fiche-title">{bien.type_bien || 'Bien'} {bien.nb_pieces}{bien.surface ? ` - ${bien.surface} m\u00B2` : ''}</h1>
            <p className="fiche-sub">{bien.quartier ? `${bien.quartier} - ` : ''}{bien.ville}{bien.code_postal ? ` - ${bien.code_postal}` : ''}</p>
            <div className="fiche-tags">
              {bien.strategie_mdb && <span className="tag tag-strat">{bien.strategie_mdb}</span>}
              {bien.statut && <span className="tag tag-statut">{bien.statut}</span>}
              {bien.prix_m2 && <span className="tag">{fmt(bien.prix_m2)} {'\u20AC'}/m{'\u00B2'}</span>}
            </div>
            <div className="prix-bloc">
              <span className="prix-label">Prix FAI</span>
              <span className="prix-fai">{fmt(bien.prix_fai)} {'\u20AC'}</span>
              {/* Prix cible avec dropdown */}
              {(prixCibleCashflow || prixCiblePV) && (
                <>
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!isTravauxLourds && prixCibleCashflow && prixCiblePV ? (
                      <select
                        value={modeCible}
                        onChange={e => setModeCible(e.target.value as 'cashflow' | 'pv')}
                        style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: '1px solid #e8e2d8', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <option value="cashflow">{`Prix cible (Objectif ${objectifCashflow}% Cash Flow Brut)`}</option>
                        <option value="pv">{`Prix cible (Objectif ${objectifPV}% PV Brute)`}</option>
                      </select>
                    ) : (
                      <span className="prix-label" style={{ margin: 0 }}>
                        {prixCiblePV && (isTravauxLourds || !prixCibleCashflow)
                          ? `Prix cible (Objectif ${objectifPV}% PV Brute)`
                          : `Prix cible (Objectif ${objectifCashflow}% Cash Flow Brut)`}
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
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#1a7a40' }}>Cashflow positif</span>
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
            {userToken && (
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

        <div style={{ marginTop: '-16px', marginBottom: '24px' }}>
          <PlatformLinks bien={bien} />
        </div>

        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <h2 className="section-title" style={{ margin: 0 }}>{"Caract\u00E9ristiques du bien"}</h2>
            {(() => {
              const mi = typeof bien.moteurimmo_data === 'string' ? JSON.parse(bien.moteurimmo_data) : bien.moteurimmo_data
              const creationDate = mi?.creationDate
              if (!creationDate) return null
              const formatted = new Date(creationDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              return <span style={{ fontSize: '12px', color: '#7a6a60' }}>{"En ligne depuis le "}{formatted}</span>
            })()}
          </div>
          <div className="data-grid">
            <div className="data-subtitle">{"Caract\u00E9ristiques"}</div>
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
                  <CellEditable bien={bien} champ="nb_lots" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
                </div>
                <div className="data-item">
                  <span className="data-label">{"Monopropri\u00E9t\u00E9"}</span>
                  <span className="data-value" style={{ color: bien.monopropriete ? '#1a7a40' : '#7a6a60' }}>{bien.monopropriete === true ? 'Oui' : bien.monopropriete === false ? 'Non' : 'NC'}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Compteurs individuels</span>
                  <span className="data-value" style={{ color: bien.compteurs_individuels ? '#1a7a40' : '#7a6a60' }}>{bien.compteurs_individuels === true ? 'Oui' : bien.compteurs_individuels === false ? 'Non' : 'NC'}</span>
                </div>
              </div>
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button onClick={() => setShowLotsDetail(!showLotsDetail)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {showLotsDetail ? "Masquer le d\u00E9tail des lots" : "Voir le d\u00E9tail des lots"}
                </button>
              </div>
              {showLotsDetail && (
                <div className="lots-table-wrap"><table className="lots-table" style={{ marginTop: '12px' }}>
                  <thead><tr><th>Lot</th><th>Type</th><th>Surface</th><th>{"\u00C9tage"}</th><th>DPE</th></tr></thead>
                  <tbody>
                    {Array.from({ length: Math.max(nbLotsEffectif, lots.length) }).map((_, i) => {
                      const lot = lots[i] || {}
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{i + 1}</td>
                          <td>{lot.type || 'NC'}</td>
                          <td>{lot.surface ? `${lot.surface} m\u00B2` : 'NC'}</td>
                          <td>{lot.etage || 'NC'}</td>
                          <td>{lot.dpe || 'NC'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table></div>
              )}
            </>
          )}
        </div>

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
              <EstimationSection bienId={id} prixFai={bien.prix_fai} surface={bien.surface} adresseInitiale={bien.adresse} villeInitiale={bien.ville} userToken={userToken} onEstimationLoaded={setEstimationData} isFree={isFreeBlocked}
                extra={isIDR && nbLotsEffectif > 0 ? (
                  <div style={{ marginTop: '4px', textAlign: 'center' }}>
                    <button onClick={() => setShowReventeLots(!showReventeLots)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#2a4a8a', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      {showReventeLots ? "Masquer la revente par lot" : "Estimer la revente par lot"}
                    </button>
                    {showReventeLots && (
                      <div style={{ marginTop: '12px', background: '#f7f4f0', borderRadius: '10px', padding: '16px', border: '1px solid #e8e2d8', textAlign: 'left' }}>
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
                          const fraisAgence = Math.round(totalRevente * fraisAgenceRevente / 100)
                          const fraisNotaireRevente = Math.round(totalRevente * 2.5 / 100) // 2.5% MdB
                          const margeBrute = totalRevente - prixAchat - fraisNotaireAchat - coutCopro - coutTravauxGlobal - fraisAgence - fraisNotaireRevente
                          const tvaMarge = Math.round(Math.max(0, margeBrute) * 20 / 120)
                          const isBase = Math.max(0, margeBrute - tvaMarge)
                          const isTotal = Math.round(Math.min(isBase, 42500) * 0.15 + Math.max(0, isBase - 42500) * 0.25)
                          const margeNette = margeBrute - tvaMarge - isTotal
                          return totalRevente > 0 ? (
                            <div style={{ marginTop: '16px', borderTop: '1px solid #e8e2d8', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px' }}>
                              <span style={{ color: '#7a6a60' }}>Revente totale</span><span style={{ textAlign: 'right', fontWeight: 600, color: '#1a7a40' }}>{totalRevente.toLocaleString('fr-FR')} {'\u20AC'}</span>
                              <span style={{ color: '#7a6a60' }}>{"Co\u00FBts totaux"}</span><span style={{ textAlign: 'right', color: '#c0392b' }}>-{(prixAchat + fraisNotaireAchat + coutCopro + coutTravauxGlobal + fraisAgence + fraisNotaireRevente).toLocaleString('fr-FR')} {'\u20AC'}</span>
                              <span style={{ color: '#7a6a60' }}>Marge brute</span><span style={{ textAlign: 'right', fontWeight: 700, color: margeBrute >= 0 ? '#1a7a40' : '#c0392b' }}>{margeBrute >= 0 ? '+' : ''}{margeBrute.toLocaleString('fr-FR')} {'\u20AC'}</span>
                              <span style={{ color: '#7a6a60' }}>TVA marge + IS</span><span style={{ textAlign: 'right', color: '#c0392b' }}>-{(tvaMarge + isTotal).toLocaleString('fr-FR')} {'\u20AC'}</span>
                              <span style={{ fontWeight: 700 }}>Marge nette MdB</span><span style={{ textAlign: 'right', fontWeight: 800, fontSize: '15px', fontFamily: "'Fraunces', serif", color: margeNette >= 0 ? '#1a7a40' : '#c0392b' }}>{margeNette >= 0 ? '+' : ''}{margeNette.toLocaleString('fr-FR')} {'\u20AC'}</span>
                            </div>
                          ) : null
                        })()}
                      </div>
                    )}
                  </div>
                ) : undefined}
              />
            </div>
          )
        })()}

        {bien.strategie_mdb === 'Travaux lourds' ? (
          <div className="section">
            <h2 className="section-title">{"Données du bien"}</h2>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">{"Taxe foncière"}</span>
                <CellEditable bien={bien} champ="taxe_fonc_ann" suffix={` \u20AC/an`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
              </div>
              {!(bien.type_bien || '').toLowerCase().includes('maison') && (
                <div className="data-item">
                  <span className="data-label">Charges copro</span>
                  <CellEditable bien={bien} champ="charges_copro" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
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
              <div className="legende-item"><div className="legende-dot" style={{ background: '#f0c040' }}></div>{"Renseigné par 1 utilisateur — modifiable"}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#1a7a40' }}></div>{"Validé par 2+ utilisateurs — clic droit pour modifier"}</div>
            </div>
            {!userToken && <p style={{ fontSize: '12px', color: '#b0a898', marginTop: '12px', fontStyle: 'italic' }}>{"Connectez-vous pour compléter les données manquantes"}</p>}
          </div>
        ) : (
          <div className="section">
            <h2 className="section-title">{"Données locatives"}</h2>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">Loyer</span>
                <CellEditable bien={bien} champ="loyer" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
              </div>
              <div className="data-item">
                <span className="data-label">Type loyer</span>
                <CellTypeLoyer bien={bien} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
              </div>
              <div className="data-item">
                <span className="data-label">{"Charges récup."}</span>
                <CellEditable bien={bien} champ="charges_rec" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
              </div>
              <div className="data-item">
                <span className="data-label">Charges copro</span>
                <CellEditable bien={bien} champ="charges_copro" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
              </div>
              <div className="data-item">
                <span className="data-label">{"Taxe foncière"}</span>
                <CellEditable bien={bien} champ="taxe_fonc_ann" suffix={` \u20AC/an`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
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
                      bien.fin_bail = val
                    }}
                    style={{ padding: '3px 6px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', background: '#faf8f5', color: '#1a1210', outline: 'none', width: '120px' }}
                  />
                </div>
              )}
              <div className="data-item">
                <span className="data-label">Rendement brut</span>
                <span className="data-value" style={{ color: '#c0392b' }}>{bien.rendement_brut ? `${(bien.rendement_brut * 100).toFixed(2)} %` : 'NC'}</span>
              </div>
            </div>
            <div className="legende">
              <div className="legende-item"><div className="legende-dot" style={{ background: '#f0c040' }}></div>{"Renseigné par 1 utilisateur — modifiable"}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#1a7a40' }}></div>{"Validé par 2+ utilisateurs — clic droit pour modifier"}</div>
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
                {showLotsLocatif && (
                  <div className="lots-table-wrap"><table className="lots-table" style={{ marginTop: '12px' }}>
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
                )}
              </>
            )}
          </div>
        )}

        {/* Estimation travaux (toutes strategies) */}
        <div className="section">
          <h2 className="section-title">{bien.strategie_mdb === 'Travaux lourds' ? 'Diagnostic travaux' : 'Estimation travaux'}</h2>
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
                {/* Detail par poste */}
                {showDetailTravaux && (
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
                )}
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
              {showCoutsCopro && (
                <div style={{ marginTop: '12px', background: '#faf8f5', borderRadius: '12px', padding: '16px 20px', border: '1px solid #f0ede8' }}>
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
                </div>
              )}
            </div>
          )}
        </div>

        <div id="contact" className="section">
          <h2 className="section-title">{"Récupérer les données manquantes"}</h2>
          <ContactVendeur bien={bien} userToken={userToken} onStatusUpdate={handleContactUpdate} />
        </div>

        {!peutCalculer && !isTravauxLourds && !bien.prix_fai && (
          <div className="section"><div className="nc-warning">Le prix est manquant — impossible de calculer.</div></div>
        )}
        {(peutCalculer || (isTravauxLourds && bien.prix_fai)) && (
          <>
            <div className="section">
              <h2 className="section-title">Simulateur de financement</h2>
              <div className="simu-grid">
                <div>
                  {prixCibleCombine && (
                    <div className="param-group">
                      <label className="param-label">Base de calcul</label>
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
                    <label className="param-label">Apport — {apportPct} % du projet ({fmt(apport)} {'\u20AC'})</label>
                    <div className="slider-wrap">
                      <input type="range" className="slider" min={0} max={100} step={0.5} value={apportPct}
                        onChange={e => { const pct = Number(e.target.value); setApport(Math.round(montantProjet * pct / 100)) }} />
                      <div className="slider-labels"><span>0 %</span><span>100 %</span></div>
                    </div>
                    <input className="param-input" type="number" value={apport} onChange={e => setApport(Number(e.target.value))} placeholder={"Montant en \u20AC"} />
                    <span className="param-hint">{"Montant emprunt\u00E9"} : {fmt(montantEmprunte)} {'\u20AC'}</span>
                  </div>
                  <div className="param-group">
                    <label className="param-label">Taux credit (%)</label>
                    <input className="param-input" type="number" step="0.01" value={taux} onChange={e => setTaux(Number(e.target.value))} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">Taux assurance (%)</label>
                    <input className="param-input" type="number" step="0.01" value={tauxAssurance} onChange={e => setTauxAssurance(Number(e.target.value))} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">Duree — {duree} ans</label>
                    <div className="slider-wrap">
                      <input type="range" className="slider" min={5} max={30} step={1} value={duree} onChange={e => setDuree(Number(e.target.value))} />
                      <div className="slider-labels"><span>5 ans</span><span>30 ans</span></div>
                    </div>
                  </div>
                </div>
                <div>
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Mensuel</th>
                        <th>Annuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {peutCalculer && !isTravauxLourds ? (() => {
                        const coproMens = bien.charges_copro || 0
                        const tfAnn = bien.taxe_fonc_ann || 0
                        const loyerMensuel = bien.loyer || 0
                        const chargesRecMens = bien.charges_rec || 0
                        const isCC = bien.type_loyer === 'CC'

                        // Couleur selon statut : rouge=manquant, jaune=renseigné 1 user, vert=validé 2+
                        function cfColor(champ: string, val: number) {
                          if (!val) return '#c0392b' // rouge — manquant
                          const s = champsStatut[champ]
                          if (s?.statut === 'vert') return '#1a7a40' // vert — validé
                          if (s?.statut === 'jaune') return '#a06010' // jaune — 1 user
                          return '#1a1210' // noir — donnée source
                        }
                        function cfBorder(champ: string, val: number) {
                          if (!val) return '#c0392b'
                          const s = champsStatut[champ]
                          if (s?.statut === 'vert') return '#1a7a40'
                          if (s?.statut === 'jaune') return '#f0c040'
                          return '#e8e2d8'
                        }
                        function cfBg(champ: string, val: number) {
                          if (!val) return '#fde8e8'
                          const s = champsStatut[champ]
                          if (s?.statut === 'vert') return '#eafaf1'
                          if (s?.statut === 'jaune') return '#fffdf0'
                          return '#faf8f5'
                        }
                        const editStyle = (champ: string, val: number) => ({ padding: '3px 6px', borderRadius: '4px', border: `1.5px solid ${cfBorder(champ, val)}`, fontFamily: "'DM Sans', sans-serif", fontSize: '12px', background: cfBg(champ, val), color: '#1a1210', outline: 'none', width: '65px', textAlign: 'right' as const })

                        // Cellule liée mensuel/annuel
                        function LinkedCell({ champ, valMens, isMensuel, signe }: { champ: string; valMens: number; isMensuel: boolean; signe: string }) {
                          const val = isMensuel ? valMens : valMens * 12
                          const hasVal = valMens > 0
                          if (hasVal) {
                            return <td style={{ color: signe === '-' ? '#c0392b' : '#1a7a40' }}>{signe}{fmt(Math.round(val))} {'\u20AC'}</td>
                          }
                          return (
                            <td>
                              <input
                                type="number" placeholder="0"
                                style={editStyle(champ, 0)}
                                onBlur={async e => {
                                  const v = Number(e.target.value)
                                  if (!v || !userToken) return
                                  const dbVal = isMensuel ? v : Math.round(v / 12)
                                  const patch: Record<string, number> = {}
                                  if (champ === 'taxe_fonc_ann') {
                                    patch.taxe_fonc_ann = isMensuel ? v * 12 : v
                                  } else {
                                    patch[champ] = dbVal
                                  }
                                  await fetch(`/api/biens/${bien.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify(patch) })
                                  ;(bien as any)[champ] = champ === 'taxe_fonc_ann' ? (isMensuel ? v * 12 : v) : dbVal
                                }}
                              /> {'\u20AC'}
                            </td>
                          )
                        }

                        return (
                          <>
                            {/* Loyer */}
                            <tr>
                              <td>{"Loyer encaiss\u00E9"}{isCC ? ' (CC)' : ' (HC)'}</td>
                              <td style={{ color: '#1a7a40' }}>+{fmt(loyerMensuel)} {'\u20AC'}</td>
                              <td style={{ color: '#1a7a40' }}>+{fmt(loyerMensuel * 12)} {'\u20AC'}</td>
                            </tr>
                            {/* Charges récup */}
                            <tr>
                              <td>{isCC ? "Charges r\u00E9cup. (incluses CC)" : "Charges r\u00E9cup."}</td>
                              <LinkedCell champ="charges_rec" valMens={chargesRecMens} isMensuel={true} signe={isCC ? '-' : '+'} />
                              <LinkedCell champ="charges_rec" valMens={chargesRecMens} isMensuel={false} signe={isCC ? '-' : '+'} />
                            </tr>
                            {/* Charges copro */}
                            <tr>
                              <td>{"Charges copropri\u00E9t\u00E9"}</td>
                              <LinkedCell champ="charges_copro" valMens={coproMens} isMensuel={true} signe="-" />
                              <LinkedCell champ="charges_copro" valMens={coproMens} isMensuel={false} signe="-" />
                            </tr>
                            {/* Taxe foncière */}
                            <tr>
                              <td>{"Taxe fonci\u00E8re"}</td>
                              <LinkedCell champ="taxe_fonc_ann" valMens={Math.round(tfAnn / 12)} isMensuel={true} signe="-" />
                              <LinkedCell champ="taxe_fonc_ann" valMens={Math.round(tfAnn / 12)} isMensuel={false} signe="-" />
                            </tr>
                            {/* Crédit */}
                            <tr>
                              <td>{"Mensualit\u00E9 cr\u00E9dit"}</td>
                              <td style={{ color: '#c0392b' }}>-{fmt(mensualiteCredit)} {'\u20AC'}</td>
                              <td style={{ color: '#c0392b' }}>-{fmt(mensualiteCredit * 12)} {'\u20AC'}</td>
                            </tr>
                            <tr>
                              <td>Assurance emprunteur</td>
                              <td style={{ color: '#c0392b' }}>-{fmt(mensualiteAss)} {'\u20AC'}</td>
                              <td style={{ color: '#c0392b' }}>-{fmt(mensualiteAss * 12)} {'\u20AC'}</td>
                            </tr>
                            {/* Total */}
                            <tr className="results-total">
                              <td style={{ fontWeight: 700 }}>{"= Cashflow brut"}</td>
                              <td style={{ color: cashflowBrut >= 0 ? '#1a7a40' : '#c0392b', fontWeight: 700 }}>{cashflowBrut >= 0 ? '+' : ''}{fmt(cashflowBrut)} {'\u20AC'}</td>
                              <td style={{ color: cashflowBrut >= 0 ? '#1a7a40' : '#c0392b', fontWeight: 800, fontSize: '16px', fontFamily: "'Fraunces', serif" }}>{cashflowBrut >= 0 ? '+' : ''}{fmt(cashflowBrut * 12)} {'\u20AC'}</td>
                            </tr>
                          </>
                        )
                      })() : (
                        <>
                          <tr>
                            <td>{"Mensualit\u00E9 cr\u00E9dit"}</td>
                            <td style={{ color: '#c0392b', fontWeight: 600 }}>{fmt(mensualiteCredit)} {'\u20AC'}</td>
                            <td style={{ color: '#c0392b' }}>{fmt(mensualiteCredit * 12)} {'\u20AC'}</td>
                          </tr>
                          <tr>
                            <td>Assurance emprunteur</td>
                            <td style={{ color: '#c0392b', fontWeight: 600 }}>{fmt(mensualiteAss)} {'\u20AC'}</td>
                            <td style={{ color: '#c0392b' }}>{fmt(mensualiteAss * 12)} {'\u20AC'}</td>
                          </tr>
                          <tr className="results-total">
                            <td>{"Total mensualit\u00E9"}</td>
                            <td style={{ color: '#c0392b', fontWeight: 700 }}>{fmt(mensualiteTotale)} {'\u20AC'}</td>
                            <td style={{ color: '#c0392b', fontWeight: 600 }}>{fmt(mensualiteTotale * 12)} {'\u20AC'}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                  {profil && <div className="profil-bar">Parametres pre-remplis depuis votre profil — modifiables dans Mon profil</div>}
                </div>
              </div>
            </div>

          </>
        )}

        {bien.prix_fai && (
          <div>
          <div className="section">
            <h2 className="section-title">Analyse Fiscale</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#7a6a60' }}>Comparer avec :</span>
                <select className="param-input" style={{ width: 'auto' }} value={regime2} onChange={e => setRegime2(e.target.value)}>
                  {/* TODO: limit to 2 regimes for Pro — currently shows all regimes for both Pro and Expert */}
                  {(isIDR ? REGIMES_IDR : REGIMES).filter(r => r.value !== regime).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#7a6a60' }}>{"D\u00E9tention :"}</span>
                {[1, 2, 3, 4, 5].map(d => (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#7a6a60' }}>Frais agence revente :</span>
                <input type="number" step="0.5" min="0" max="10" value={fraisAgenceRevente}
                  onChange={e => setFraisAgenceRevente(Number(e.target.value))}
                  className="param-input" style={{ width: '60px', textAlign: 'right' }} />
                <span style={{ fontSize: '12px', color: '#7a6a60' }}>%</span>
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
              <div className="pnl-grid">
                <PnlColonne titre={`${[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime)?.label || regime} (votre regime)`} bien={{ ...bien, prix_fai: prixBase }} financement={financement} tmi={tmi} regime={regime} highlight dureeRevente={dureeRevente} estimation={estimationData} budgetTravauxM2={budgetTravauxM2} scorePerso={scorePerso} fraisNotaire={fraisNotaire} apport={apport} fraisAgenceRevente={fraisAgenceRevente} chargesUtilisateur={chargesUtilisateur} isFree={isFreeBlocked} />
                <PnlColonne titre={[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime2)?.label || regime2} bien={{ ...bien, prix_fai: prixBase }} financement={financement} tmi={tmi} regime={regime2} dureeRevente={dureeRevente} estimation={estimationData} budgetTravauxM2={budgetTravauxM2} scorePerso={scorePerso} fraisNotaire={fraisNotaire} apport={apport} fraisAgenceRevente={fraisAgenceRevente} chargesUtilisateur={chargesUtilisateur} isFree={isFreeBlocked} />
              </div>
            </div>
          </div>
          </div>
        )}

      </div>
    </Layout>
  )
}