'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { calculerCashflow, calculerMensualite, calculerRevente, calculerCapitalRestantDu, calculerAbattementPV, calculerFraisEnchere } from '@/lib/calculs'
import { isVenteDelocalisee } from '@/lib/utils-encheres'

function getPhotos(enchere: any): string[] {
  const photos: string[] = []
  if (enchere.photo_url) {
    photos.push(enchere.photo_url)
  }
  return photos
}

function PhotoCarousel({ enchere }: { enchere: any }) {
  const [idx, setIdx] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const photos = getPhotos(enchere)

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
      <Image src={photos[idx]} alt="" width={800} height={450} className="fiche-photo" onClick={() => setFullscreen(true)} style={{ cursor: 'zoom-in', width: '100%', height: 'auto', maxHeight: '320px', objectFit: 'cover' }} />
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

const STATUT_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  a_venir: { label: 'À venir', bg: '#d4f5e0', color: '#1a7a40' },
  surenchere: { label: 'Surenchère', bg: '#ffecd2', color: '#8a5a00' },
  adjuge: { label: 'Adjugé', bg: '#d4ddf5', color: '#2a4a8a' },
  vendu: { label: 'Vendu', bg: '#6c757d', color: '#fff' },
  retire: { label: 'Retiré', bg: '#f5d4d4', color: '#8a2a2a' },
  expire: { label: 'Expiré', bg: '#e9ecef', color: '#6c757d' },
}

const OCCUPATION_LABELS: Record<string, string> = {
  libre: 'Libre', occupe: 'Occupé', loue: 'Loué',
}

const SOURCE_LABELS: Record<string, string> = {
  licitor: 'Licitor', avoventes: 'Avoventes', vench: 'Vench',
}

const DOC_ICONS: Record<string, string> = {
  ccv: '\uD83D\uDCCB', pv: '\uD83D\uDCDD', diag: '\uD83C\uDFE5', affiche: '\uD83D\uDCE2', autre: '\uD83D\uDCC4',
}

const REGIMES = [
  { value: 'nu_micro_foncier', label: 'Nu Micro-foncier' },
  { value: 'nu_reel_foncier', label: 'Nu Réel foncier' },
  { value: 'lmnp_micro_bic', label: 'LMNP Micro-BIC' },
  { value: 'lmnp_reel_bic', label: 'LMNP Réel BIC' },
  { value: 'lmp_reel_bic', label: 'LMP Réel BIC' },
  { value: 'sci_is', label: "SCI à l'IS" },
  { value: 'marchand_de_biens', label: 'Marchand de biens (IS)' },
]

const REGIMES_IDR = [
  { value: 'nu_reel_foncier', label: 'Nu Réel foncier' },
  { value: 'lmnp_reel_bic', label: 'LMNP Réel BIC' },
  { value: 'lmp_reel_bic', label: 'LMP Réel BIC' },
  { value: 'sci_is', label: "SCI à l'IS" },
  { value: 'marchand_de_biens', label: 'Marchand de biens (IS)' },
]

function CellEditable({ bien, champ, suffix = '', userToken, champsStatut, onUpdate, setBien: setBienProp, scale = 1, dirtyChamps, setDirtyChamps, originalVals, setOriginalVals }: any) {
  const dbVal = bien[champ]
  const displayVal = dbVal != null ? Math.round(dbVal * scale) : null
  const displayFormatted = displayVal != null ? `${displayVal.toLocaleString('fr-FR')}\u00A0\u20AC` : null
  const statut = champsStatut[champ]
  const hasSourceData = dbVal != null && !statut
  const isVert = statut?.statut === 'vert'
  const isJaune = statut?.statut === 'jaune'
  const dirty = dirtyChamps?.[champ] || false
  const [submitting, setSubmitting] = useState(false)

  const localVal = displayVal != null ? String(displayVal) : ''

  function setDirty(val: boolean) {
    if (setDirtyChamps) setDirtyChamps((prev: any) => ({ ...prev, [champ]: val }))
  }

  function startEdit() {
    if (setOriginalVals) setOriginalVals((prev: any) => ({ ...prev, [champ]: dbVal }))
    setDirty(true)
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

  const readText = suffix ? `${displayVal != null ? displayVal.toLocaleString('fr-FR') : ''}${suffix.replace(/ /g, '\u00A0')}` : displayFormatted

  if (!userToken) {
    if (displayVal == null) return <span style={{ color: '#c0392b', fontStyle: 'italic', fontSize: '13px' }}>NC</span>
    return <span style={{ fontWeight: 600, color: '#1a1210', fontSize: '13px' }}>{readText}</span>
  }

  if (hasSourceData && !dirty) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontWeight: 600, color: '#1a1210', fontSize: '13px' }}>{readText}</span>
        <PencilBtn />
      </div>
    )
  }

  if (isVert && !dirty) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontWeight: 600, color: '#1a7a40', fontSize: '13px' }}>{readText}</span>
        <span title={"Validé par la communauté"} style={{ fontSize: '12px', color: '#1a7a40' }}>{'\u2713'}</span>
        <PencilBtn />
      </div>
    )
  }

  if (isJaune && !dirty) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontWeight: 600, color: '#a06010', fontSize: '13px' }}>{readText}</span>
        <PencilBtn />
      </div>
    )
  }

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
          title={"Soumettre à la communauté"}
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
          {!isReel && <span className="pnl-tooltip-wrap" style={{ position: 'relative', cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?<span className="pnl-tooltip-text">{"Déductible uniquement en régime réel"}</span></span>}
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

function PnlColonne({ titre, bien, financement, tmi, regime, otherRegime = '', highlight = false, dureeRevente, estimation, budgetTravauxM2, scorePerso, fraisNotaire, fraisNotaireBase = 7.5, apport, fraisAgenceRevente = 5, chargesUtilisateur, isFree = false, isEnchere = false }: any) {
  const { prix_fai, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann } = bien
  const { tauxCredit, tauxAssurance, dureeAns, typeCredit: typeCreditSimu } = financement
  const hasLoyer = loyer && loyer > 0
  const isMarchand = regime === 'marchand_de_biens'
  const [optionTVA, setOptionTVA] = useState(true)

  // Frais d'acquisition : barème Didiercam pour enchères, % flat pour biens classiques
  const fraisEnchere = isEnchere ? calculerFraisEnchere(prix_fai, 0, { isMDB: isMarchand }) : null
  const colFraisNotairePct = isEnchere && fraisEnchere ? fraisEnchere.pct : (isMarchand ? 2.5 : (fraisNotaireBase || 7.5))
  const colFraisNotaireMontant = isEnchere && fraisEnchere ? fraisEnchere.total : (prix_fai * colFraisNotairePct / 100)
  const colMontantEmprunte = Math.max(0, prix_fai + colFraisNotaireMontant - (apport || 0))

  const isMicro = (r: string) => r === 'nu_micro_foncier' || r === 'lmnp_micro_bic'
  const hasAmortRegime = (r: string) => r === 'lmnp_reel_bic' || r === 'lmp_reel_bic' || r === 'sci_is'
  const isLMP = (r: string) => r === 'lmp_reel_bic'
  const showAbattementRow = isMicro(regime) || isMicro(otherRegime)
  const showAmortRow = hasAmortRegime(regime) || hasAmortRegime(otherRegime)
  const showSSIRow = isLMP(regime) || isLMP(otherRegime)
  const showReintegrationRow = regime === 'lmnp_reel_bic' || otherRegime === 'lmnp_reel_bic'

  const loyerAnnuel = (loyer || 0) * 12
  const chargesRecAnn = (charges_rec || 0) * 12
  const chargesCoproAnn = (charges_copro || 0) * 12
  const taxeFoncAnn = taxe_fonc_ann || 0
  const interetsAnn = colMontantEmprunte * tauxCredit / 100
  const assuranceAnn = colMontantEmprunte * (tauxAssurance / 100)
  const mobilier = 5000
  const amortImmo = prix_fai * 0.85 / 30
  const amortMobilier = mobilier / 10
  const amortLMNP = amortImmo + amortMobilier
  const fraisNotaireMontantLocatif = Math.round(colFraisNotaireMontant)
  const amortSCI = prix_fai * 0.85 / 30
  const amortNotaireSCI = fraisNotaireMontantLocatif / 5
  const hasAmort = regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is'
  const amort = (regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic') ? amortLMNP : regime === 'sci_is' ? (amortSCI + amortNotaireSCI) : 0

  const isReel = regime === 'nu_reel_foncier' || regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is' || regime === 'marchand_de_biens'
  const assurancePNO = isReel ? (chargesUtilisateur?.assurance_pno || 0) : 0
  const fraisGestionPct = isReel ? (chargesUtilisateur?.frais_gestion_pct || 0) : 0
  const fraisGestion = loyerAnnuel * fraisGestionPct / 100
  const honorairesComptable = isReel ? (chargesUtilisateur?.honoraires_comptable || 0) : 0
  const isBICouSCIouMdB = regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic' || regime === 'sci_is' || regime === 'marchand_de_biens'
  const isBIC = regime === 'lmnp_reel_bic' || regime === 'lmp_reel_bic'
  const cfe = isBICouSCIouMdB ? (chargesUtilisateur?.cfe || 0) : 0
  const fraisOGA = isBIC ? (chargesUtilisateur?.frais_oga || 0) : 0
  const fraisBancaires = chargesUtilisateur?.frais_bancaires || 0
  const chargesSupplementaires = assurancePNO + fraisGestion + honorairesComptable + cfe + fraisOGA

  const scoreUtilise = scorePerso || bien.score_travaux
  const budgetTravaux = scoreUtilise && bien.surface
    ? (budgetTravauxM2?.[String(scoreUtilise)] || 0) * bien.surface : 0
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
      const deficitHorsInterets = Math.max(0, chargesDeductibles - interetsAnn - loyerAnnuel)
      const imputableRevenuGlobal = Math.min(deficitHorsInterets, 10700)
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
      impot = -(Math.abs(benefice) * (tmi / 100))
    }
  } else if (regime === 'sci_is') {
    const chargesDeductibles = chargesCoproAnn + taxeFoncAnn + interetsAnn + assuranceAnn + amort + chargesSupplementaires + travauxAmortis
    revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impot = revenuImposable <= 42500 ? revenuImposable * 0.15 : 42500 * 0.15 + (revenuImposable - 42500) * 0.25
  } else if (regime === 'marchand_de_biens') {
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
  const prixReventeNetVendeur = estimation?.prix_total || 0
  const prixNetVendeurAchat = fraisAgenceRevente > 0 ? Math.round(prix_fai / (1 + fraisAgenceRevente / 100)) : prix_fai
  const prixReventeApresAgence = prixReventeNetVendeur
  const fraisNotaireMontant = Math.round(colFraisNotaireMontant)

  const travauxPV = budgetTravauxEffectif
  const pvBrute = prixReventeApresAgence - prix_fai - fraisNotaireMontant - travauxPV

  let irPV = 0, psPV = 0, tvaMarge = 0, isPV = 0
  let reintegrationAmort = 0
  let cotisationsSocialesLMP = 0
  const abattements = calculerAbattementPV(dur)
  let pvBaseIR = 0, pvBasePS = 0, pvImposableIR = 0, pvImposablePS = 0

  if (regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier' || regime === 'lmnp_micro_bic') {
    if (pvBrute > 0) {
      pvBaseIR = pvBrute; pvBasePS = pvBrute
      pvImposableIR = pvBrute * (1 - abattements.abattementIR / 100)
      pvImposablePS = pvBrute * (1 - abattements.abattementPS / 100)
      irPV = pvImposableIR * 0.19
      psPV = pvImposablePS * 0.172
    }
  } else if (regime === 'lmnp_reel_bic') {
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
    if (dur > 5 && loyerAnnuel < 90000) {
      irPV = 0; psPV = 0; cotisationsSocialesLMP = 0
    } else if (pvBrute > 0) {
      const amortsCumules = (amort + travauxAmortis) * dur
      const pvCourtTerme = Math.min(pvBrute, amortsCumules)
      const pvLongTerme = Math.max(0, pvBrute - pvCourtTerme)
      irPV = pvCourtTerme * (tmi / 100) + pvLongTerme * 0.128
      psPV = pvLongTerme * 0.172
      cotisationsSocialesLMP = pvCourtTerme * 0.45
    }
  } else if (regime === 'sci_is') {
    const amortCumuleImmo = (prix_fai * 0.85 / 30) * dur
    const amortCumuleNotaire = (fraisNotaireMontant / 5) * Math.min(dur, 5)
    const amortCumuleTravaux = travauxAmortis * Math.min(dur, 10)
    const amortCumule = amortCumuleImmo + amortCumuleNotaire + amortCumuleTravaux
    const vnc = prix_fai + fraisNotaireMontant + budgetTravaux - amortCumule
    const pvSCI = Math.max(0, prixReventeApresAgence - vnc)
    isPV = pvSCI <= 42500 ? pvSCI * 0.15 : 42500 * 0.15 + (pvSCI - 42500) * 0.25
    const beneficeDistribuable = pvSCI - isPV
    psPV = beneficeDistribuable > 0 ? beneficeDistribuable * 0.30 : 0
  } else if (regime === 'marchand_de_biens') {
    if (optionTVA) {
      const marge = Math.max(0, prixReventeApresAgence - prixNetVendeurAchat)
      tvaMarge = marge * 20 / 120
    }
    const benefice = Math.max(0, prixReventeApresAgence - prix_fai - budgetTravauxEffectif - fraisNotaireMontant - tvaMarge)
    isPV = benefice <= 42500 ? benefice * 0.15 : 42500 * 0.15 + (benefice - 42500) * 0.25
  }
  let surtaxePV = 0
  const isRegimeParticulier = regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier' || regime === 'lmnp_micro_bic' || regime === 'lmnp_reel_bic'
  if (isRegimeParticulier && pvBrute > 0) {
    const pvImposableIRSurtaxe = regime === 'lmnp_reel_bic'
      ? Math.max(0, pvBrute + reintegrationAmort) * (1 - abattements.abattementIR / 100)
      : pvBrute * (1 - abattements.abattementIR / 100)
    if (pvImposableIRSurtaxe > 150000) surtaxePV = pvImposableIRSurtaxe * 0.06
    else if (pvImposableIRSurtaxe > 110000) surtaxePV = pvImposableIRSurtaxe * 0.05
    else if (pvImposableIRSurtaxe > 100000) surtaxePV = pvImposableIRSurtaxe * 0.04
    else if (pvImposableIRSurtaxe > 60000) surtaxePV = pvImposableIRSurtaxe * 0.03
    else if (pvImposableIRSurtaxe > 50000) surtaxePV = pvImposableIRSurtaxe * 0.02
  }
  const totalFiscPV = Math.round(irPV + psPV + tvaMarge + isPV + cotisationsSocialesLMP + surtaxePV)
  const pvNette = Math.round(pvBrute - totalFiscPV)

  const cashflowCumule = hasLoyer ? Math.round(cashflowNetAnnuel * dur - fraisBancaires) : 0
  const interetsCumules = !hasLoyer ? Math.round((interetsAnn + assuranceAnn) * dur) : 0

  const crd = colTypeCredit === 'in_fine' ? colMontantEmprunte : calculerCapitalRestantDu(colMontantEmprunte, tauxCredit, dureeAns, dur)

  const fondsInvestis = apport || 0
  const coutTotal = prix_fai + fraisNotaireMontant + budgetTravauxEffectif
  const cashflowAchatRevente = Math.round(colMontantEmprunte + pvNette - crd - interetsCumules - ((!hasLoyer) ? fraisBancaires : 0))
  const profitNet = Math.round(cashflowCumule + cashflowAchatRevente)
  const roiTotal = coutTotal > 0 ? Math.round(profitNet / coutTotal * 1000) / 10 : 0
  const ratioROI = coutTotal > 0 ? 1 + profitNet / coutTotal : 0
  const roiAnnualise = coutTotal > 0 && dur > 0 && ratioROI > 0
    ? Math.round((Math.pow(ratioROI, 1 / dur) - 1) * 1000) / 10
    : coutTotal > 0 && dur > 0 ? Math.round(profitNet / coutTotal / dur * 1000) / 10 : 0
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
            {`Mensualités et intérêts calculés avec ${colFraisNotairePct}\u00A0% de frais de notaire${isMarchand ? ' (MdB)' : ''}, soit un emprunt de ${fmt(colMontantEmprunte)}\u00A0\u20AC.`}
          </div>
        )
        if (otherHasNote) return (
          <div style={{ fontSize: '11px', borderRadius: '8px', padding: '8px 12px', marginBottom: '16px', lineHeight: 1.5, visibility: 'hidden', minHeight: '44px' }} aria-hidden="true">
            {"Mensualités et intérêts calculés avec 0,0\u00A0% de frais de notaire (MdB), soit un emprunt de 000\u00A0000\u00A0\u20AC."}
          </div>
        )
        return null
      })()}

      {/* === PARTIE LOCATIVE (annuelle) === */}
      {hasLoyer && (
        <>
          <SectionLabel label="Revenus locatifs (annuel)" />
          <Row label={type_loyer === 'CC' ? "Loyer (CC)" : "Loyer (HC)"} value={`${fmt(loyerAnnuel)} \u20AC`} />
          <Row label={"Charges récup."} value={type_loyer === 'CC' ? `-${fmt(chargesRecAnn)} \u20AC` : `+${fmt(chargesRecAnn)} \u20AC`} />
          {showAbattementRow && (
            regime === 'nu_micro_foncier' ? (
              <Row label="Abattement forfaitaire (30%)" value={`-${fmt(Math.round(loyerAnnuel * 0.30))} \u20AC`} rouge />
            ) : regime === 'lmnp_micro_bic' ? (
              <Row label="Abattement forfaitaire (50%)" value={`-${fmt(Math.round(loyerAnnuel * 0.50))} \u20AC`} rouge />
            ) : (
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>&nbsp;</div>
            )
          )}
          <Row label="Charges copro" value={`-${fmt(chargesCoproAnn)} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'} />
          <Row label={"Taxe foncière"} value={`-${fmt(taxeFoncAnn)} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'} />
          <Row label={"Intérêts d'emprunt"} value={`-${fmt(Math.round(interetsAnn))} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'} />
          <Row label="Assurance emprunteur" value={`-${fmt(Math.round(assuranceAnn))} \u20AC`} rouge tiret={regime === 'nu_micro_foncier' || regime === 'lmnp_micro_bic'} />
          {showAmortRow && (
            hasAmort ? (
              <Row label="Amortissements" value={`-${fmt(Math.round(amort))} \u20AC`} rouge />
            ) : (
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>&nbsp;</div>
            )
          )}
          {travauxAmortis > 0 && hasAmort && (
            <Row label="Amort. travaux (10 ans)" value={`-${fmt(Math.round(travauxAmortis))} \u20AC`} rouge />
          )}
          {travauxDeductibles > 0 && regime === 'nu_reel_foncier' && (
            <Row label="Travaux (déficit foncier)" value={`-${fmt(travauxDeductibles)} \u20AC`} rouge />
          )}
          <ExpandableCharges
            label={"Charges déductibles"}
            total={isReel ? Math.round(chargesSupplementaires) : 0}
            isReel={isReel}
            isFree={isFree}
            details={[
              { label: 'Assurance PNO', value: assurancePNO },
              { label: `Frais de gestion (${fraisGestionPct}%)`, value: Math.round(fraisGestion) },
              { label: 'Honoraires comptable', value: honorairesComptable },
              { label: 'CFE', value: cfe },
              { label: 'Frais OGA', value: fraisOGA },
            ]}
          />
          {showSSIRow && (
            regime === 'lmp_reel_bic' ? (
              <Row label="Cotisations SSI (45%)" value={revenuImposable > 0 ? `-${fmt(Math.round(revenuImposable * 0.45))} \u20AC` : `0 \u20AC`} rouge />
            ) : (
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>&nbsp;</div>
            )
          )}
          <Row label="Revenu imposable" value={`${fmt(Math.round(revenuImposable))} \u20AC`} bold />
          <Row label={regime === 'sci_is' || regime === 'marchand_de_biens' ? "IS (15% / 25%)" : `Impôt (TMI ${tmi}% + PS 17,2%)`} value={impot > 0 ? `-${fmt(Math.round(impot))} \u20AC` : impot < 0 ? `+${fmt(Math.round(Math.abs(impot)))} \u20AC (économie)` : `0 \u20AC`} rouge={impot > 0} vert={impot < 0} />
          <Row label="Cash Flow Net d'Impôt" value={`${cashflowNetMensuel >= 0 ? '+' : ''}${fmt(cashflowNetMensuel)} \u20AC/mois`} bold vert={cashflowNetMensuel >= 0} rouge={cashflowNetMensuel < 0} />
        </>
      )}

      {/* === PARTIE REVENTE === */}
      {hasRevente && (
        <>
          <SectionLabel label={`Scénario revente (${dur} an${dur > 1 ? 's' : ''})`} />
          <Row label="Prix de revente (DVF)" value={`${fmt(prixReventeNetVendeur)} \u20AC`} />
          <Row label="Prix d'achat (mise à prix)" value={`-${fmt(prix_fai)} \u20AC`} rouge />
          {isEnchere && fraisEnchere ? (
            <>
              <Row label="Émoluments avocat TTC" value={`-${fmt(fraisEnchere.emoluments_ttc)} \u20AC`} rouge info="Barème Didiercam : poursuivant 3/4 + adjudicataire 1/4" />
              <Row label={`Droits d'enregistrement (${isMarchand ? '0,715%' : '5,8%'})`} value={`-${fmt(fraisEnchere.droits_enregistrement)} \u20AC`} rouge />
              <Row label="CSI (0,10%)" value={`-${fmt(fraisEnchere.csi)} \u20AC`} rouge />
            </>
          ) : (
            <Row label={`Frais de notaire (${colFraisNotairePct}%)`} value={`-${fmt(fraisNotaireMontant)} \u20AC`} rouge />
          )}
          <Row
            label={budgetTravaux > 0 ? `Travaux (score ${scoreUtilise})${isMarchand && optionTVA ? ' HT' : ''}` : 'Travaux'}
            value={budgetTravauxEffectif > 0 ? `-${fmt(budgetTravauxEffectif)} \u20AC` : `0 \u20AC`}
            rouge={budgetTravauxEffectif > 0}
          />
          {interetsCumules > 0 && (
            <Row label={`Intérêts d'emprunt (${dur} an${dur > 1 ? 's' : ''})`} value={`-${fmt(interetsCumules)} \u20AC`} rouge />
          )}
          {interetsCumules > 0 && fraisBancaires > 0 && (
            <Row label="Frais de dossier bancaire" value={`-${fmt(fraisBancaires)} \u20AC`} rouge />
          )}
          <Row label={pvBrute >= 0 ? "Plus-value nette avant impôt" : "Moins-value nette avant impôt"} value={`${pvBrute > 0 ? '+' : ''}${fmt(pvBrute)} \u20AC`} bold vert={pvBrute > 0} rouge={pvBrute <= 0} />

          {showReintegrationRow && (
            regime === 'lmnp_reel_bic' ? (
              <Row label={"Réintégration amortissements"} value={`+${fmt(Math.round(reintegrationAmort))} \u20AC`} rouge />
            ) : (
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>&nbsp;</div>
            )
          )}

          {(regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier' || regime === 'lmnp_micro_bic' || regime === 'lmnp_reel_bic') && (
            <ExpandableTaxRow label={"IR sur PV (19%)"} total={Math.round(irPV)} isFree={isFree}
              details={[
                { label: `IR sur PV (19%) - avant abattements`, value: `${fmt(Math.round(pvBaseIR * 0.19))}\u00A0\u20AC` },
                { label: abattements.abattementIR > 0 ? `Abattement IR (${dur} ans / -${Math.round(abattements.abattementIR)}%)` : `Abattement IR (${dur} an${dur > 1 ? 's' : ''} / 0%)`, value: abattements.abattementIR > 0 ? `-${fmt(Math.round(pvBaseIR * 0.19 - irPV))}\u00A0\u20AC` : '0\u00A0\u20AC', vert: abattements.abattementIR > 0 },
              ]} />
          )}
          {isMarchand && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>
              <span style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
                TVA sur marge
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
              details={[
                { label: 'PV sur VNC', value: `${fmt(Math.round(isPV / (isPV <= 42500 * 0.15 ? 0.15 : 0.25) || 0))}\u00A0\u20AC` },
                { label: 'IS (15% / 25%)', value: `-${fmt(Math.round(isPV))}\u00A0\u20AC` },
              ]} />
          )}
          {regime === 'lmp_reel_bic' && (
            <ExpandableTaxRow label={dur > 5 ? "PV professionnelle" : `PV professionnelle (TMI ${tmi}%)`} total={dur > 5 ? 0 : Math.round(irPV)} isFree={isFree}
              details={dur > 5 ? [{ label: 'Exonérée (> 5 ans, recettes < 90k\u20AC)', value: '0\u00A0\u20AC', vert: true }] : [
                { label: `IR (TMI ${tmi}%)`, value: `-${fmt(Math.round(irPV))}\u00A0\u20AC` },
              ]} />
          )}

          {(regime === 'nu_micro_foncier' || regime === 'nu_reel_foncier' || regime === 'lmnp_micro_bic' || regime === 'lmnp_reel_bic') && (
            <ExpandableTaxRow label={"PS sur PV (17,2%)"} total={Math.round(psPV)} isFree={isFree}
              details={[
                { label: `PS sur PV (17,2%) - avant abattements`, value: `${fmt(Math.round(pvBasePS * 0.172))}\u00A0\u20AC` },
                { label: abattements.abattementPS > 0 ? `Abattement PS (${dur} ans / -${Math.round(abattements.abattementPS)}%)` : `Abattement PS (${dur} an${dur > 1 ? 's' : ''} / 0%)`, value: abattements.abattementPS > 0 ? `-${fmt(Math.round(pvBasePS * 0.172 - psPV))}\u00A0\u20AC` : '0\u00A0\u20AC', vert: abattements.abattementPS > 0 },
              ]} />
          )}
          {regime === 'marchand_de_biens' && (
            <ExpandableTaxRow label={"IS sur bénéfice (15% / 25%)"} total={Math.round(isPV)} isFree={isFree}
              details={[
                { label: 'Bénéfice (marge - TVA - frais)', value: `${fmt(Math.round(isPV <= 42500 * 0.15 ? isPV / 0.15 : (isPV - 42500 * 0.15) / 0.25 + 42500))}\u00A0\u20AC` },
                { label: 'IS (15% / 25%)', value: `-${fmt(Math.round(isPV))}\u00A0\u20AC` },
              ]} />
          )}
          {regime === 'sci_is' && (
            <ExpandableTaxRow label={"PFU dividendes (30%)"} total={Math.round(psPV)} isFree={isFree}
              details={[
                { label: 'Bénéfice distribuable (après IS)', value: `${fmt(Math.round(psPV / 0.3 || 0))}\u00A0\u20AC` },
                { label: 'PFU (30%)', value: `-${fmt(Math.round(psPV))}\u00A0\u20AC` },
              ]} />
          )}
          {regime === 'lmp_reel_bic' && (
            <ExpandableTaxRow label={"Cotisations SSI (45%)"} total={Math.round(cotisationsSocialesLMP)} isFree={isFree}
              details={cotisationsSocialesLMP > 0 ? [
                { label: 'PV court terme (amortissements)', value: `${fmt(Math.round(cotisationsSocialesLMP / 0.45))}\u00A0\u20AC` },
                { label: 'SSI (45%)', value: `-${fmt(Math.round(cotisationsSocialesLMP))}\u00A0\u20AC` },
              ] : [{ label: 'Pas de PV court terme', value: '0\u00A0\u20AC', vert: true }]} />
          )}
          <Row label={pvNette >= 0 ? "Plus-value nette d'impôt" : "Moins-value nette d'impôt"} value={`${pvNette >= 0 ? '+' : ''}${fmt(pvNette)} \u20AC`} bold vert={pvNette >= 0} rouge={pvNette < 0} />

          {/* BILAN FINAL */}
          <div style={{ marginTop: '16px', paddingTop: '16px', background: profitNet >= 0 ? '#d4f5e0' : '#fde8e8', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#7a6a60', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {`Bilan sur ${dur} an${dur > 1 ? 's' : ''}`}
            </div>
            {hasLoyer && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', alignItems: 'center' }}>
                <span style={{ color: '#555' }}>{"Cashflow locatif net cumulé"}</span>
                <span style={{ fontWeight: 600, color: cashflowCumule >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{cashflowCumule >= 0 ? '+' : ''}{fmt(cashflowCumule)} {'\u20AC'}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', alignItems: 'center' }}>
              <span style={{ color: '#555' }}>{"Cashflow achat-revente net"}</span>
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
                  <span>ROI</span>
                  <span style={{ fontWeight: 600, color: roiTotal >= 0 ? '#1a7a40' : '#c0392b' }} className={isFree ? 'val-blur' : ''}>{roiTotal > 0 ? '+' : ''}{roiTotal}% ({roiAnnualise > 0 ? '+' : ''}{roiAnnualise}%/an)</span>
                </div>
                {fondsInvestis > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#555' }}>
                    <span>ROE</span>
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
  1: { label: 'Bon état', color: '#1a7a40', info: "Le bien est en bon état général. Quelques rafraîchissements légers possibles (peinture, petites réparations). Habitable immédiatement sans travaux majeurs. Budget : ~200 \u20AC/m²." },
  2: { label: 'Rafraîchissement', color: '#1a7a40', info: "Le bien nécessite des travaux de rafraîchissement : peinture, sols, électricité aux normes, petite plomberie. Pas de modification structurelle. Budget : ~500 \u20AC/m²." },
  3: { label: 'Rénovation moyenne', color: '#f0a830', info: "Rénovation complète d'une ou plusieurs pièces : cuisine, salle de bain, électricité complète, revêtements. Pas de gros \u0153uvre. Budget : ~800 \u20AC/m²." },
  4: { label: 'Travaux lourds', color: '#c0392b', info: "Travaux lourds touchant la structure ou les réseaux : reprise de plomberie, électricité, cloisons, planchers, isolation, fenêtres. Peut nécessiter un architecte. Budget : ~1 200 \u20AC/m²." },
  5: { label: 'Réhabilitation complète', color: '#c0392b', info: "Réhabilitation totale du bien : reprise de la structure (charpente, toiture, façade, murs porteurs), mise aux normes complète, redistribution des espaces. Local commercial ou bien insalubre à transformer. Budget : ~1 800 \u20AC/m² et plus." },
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
              <th style={{ width: '60px' }}>{"Étage"}</th>
              <th style={{ width: '50px' }}>DPE</th>
              <th style={{ width: '70px' }}>{"État"}</th>
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
                <td><input type="number" placeholder={"m²"} value={lot.surface} onChange={e => updateLot(i, 'surface', e.target.value)} style={inputStyle} /></td>
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
                    <option value="loue">{"Loué"}</option>
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
            {saving ? 'Sauvegarde...' : saved ? '\u2713 Sauvegardé' : 'Sauvegarder'}
          </button>
        )}
      </div>
    </div>
  )
}

function EstimationSection({ enchereId, prixFai, surface, adresseInitiale, villeInitiale, userToken, onEstimationLoaded, isFree = false, extra }: { enchereId: string, prixFai: number, surface?: number, adresseInitiale?: string, villeInitiale?: string, userToken?: string | null, onEstimationLoaded?: (est: any) => void, isFree?: boolean, extra?: React.ReactNode }) {
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
      const res = await fetch(`/api/estimation/encheres/${enchereId}${force ? '?force=true' : ''}`)
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
      await fetch(`/api/encheres/${enchereId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}) },
        body: JSON.stringify({ adresse, latitude: null, longitude: null })
      })
      setAdresseEdit(false)
      await loadEstimation(true)
    } catch { setError('Erreur lors de la sauvegarde') }
    setAdresseSaving(false)
  }

  useEffect(() => {
    loadEstimation()
  }, [enchereId])

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
  const isAjuste = prixAjuste !== null && prixAjuste !== estimation.prix_total

  const handleSliderChange = (val: number) => {
    const prix = Math.round(val)
    setPrixAjuste(prix)
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
            {"Débloquez l'estimation prix de revente"}
          </span>
          <a href="/mon-profil" style={{
            display: 'inline-block', padding: '7px 18px', borderRadius: 8,
            background: '#c0392b', color: '#fff', fontWeight: 600, fontSize: 12,
            textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap'
          }}>
            {"Débloquer \u2192"}
          </a>
        </div>
      )}

      {/* Adresse */}
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
              {adresse ? `${adresse}${villeInitiale ? `, ${villeInitiale}` : ''}` : 'Adresse non renseignée — cliquez pour affiner l\'estimation'}
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

      {/* 3 columns: Mise à prix | Décote | Estimation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0', marginBottom: '24px' }}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{"Mise à prix"}</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 800, color: '#1a1210', whiteSpace: 'nowrap' }}>{fmt(prixFai)}{'\u00A0\u20AC'}</div>
          {surface ? <div style={{ fontSize: '12px', color: '#7a6a60', marginTop: '4px', whiteSpace: 'nowrap' }}>{fmt(Math.round(prixFai / surface))}{'\u00A0\u20AC'}/m{'\u00B2'}</div> : null}
        </div>

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
            {ecartPositif ? 'Au-dessus du marché' : 'Décote vs marché'}
          </div>
        </div>

        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            {isAjuste ? "Mon estimation" : "Prix de revente estimé"}
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 800, color: ecartPositif ? '#1a7a40' : '#1a1210', whiteSpace: 'nowrap' }}><V>{fmt(prixActuel)}{'\u00A0\u20AC'}</V></div>
          <div style={{ fontSize: '12px', color: '#7a6a60', marginTop: '4px', whiteSpace: 'nowrap' }}><V>{fmt(prixM2Actuel)}{'\u00A0\u20AC'}/m{'\u00B2'}</V></div>
          {isAjuste && !isFree && (
            <div style={{ fontSize: '11px', color: '#b0a898', marginTop: '4px' }}>
              DVF : {fmt(estimation.prix_total)} {'\u20AC'}
              <span onClick={resetEstimation} style={{ marginLeft: '6px', color: '#c0392b', cursor: 'pointer', textDecoration: 'underline' }}>{"Réinitialiser"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Price range + slider */}
      <div style={{ background: '#faf8f5', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#7a6a60' }}>Fourchette</span>
          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: conf.bg, color: conf.color }}>
            Confiance {estimation.confiance} (<V>{"±"}{estimation.marge_pct}%</V>)
          </span>
        </div>
        <div style={{ position: 'relative', height: '10px', marginBottom: '4px' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', borderRadius: '5px', background: 'linear-gradient(90deg, #d4f5e0, #fff8f0, #fde8e8)' }} />
          <div title={`Estimation DVF : ${fmt(estimation.prix_total)} \u20AC`} style={{
            position: 'absolute', top: '-3px', left: `${prixInitialPos}%`, transform: 'translateX(-50%)',
            width: '3px', height: '16px', borderRadius: '2px', background: '#1a1210',
            opacity: isAjuste ? 0.4 : 1, zIndex: 1
          }} />
          <div style={{ position: 'absolute', top: '-5px', left: `${prixFaiPos}%`, transform: 'translateX(-50%)', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div title={`Mise à prix : ${fmt(prixFai)} \u20AC`} style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: ecartPositif ? '#c0392b' : '#1a7a40',
              border: '3px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
            </div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: ecartPositif ? '#c0392b' : '#1a7a40', marginTop: '4px', whiteSpace: 'nowrap' }}>{fmt(prixFai)} {'\u20AC'}</span>
          </div>
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

      {/* Correcteurs + meta */}
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
          <div style={{ marginTop: '4px', fontStyle: 'italic' }}>{"Source : DVF (données notariales)"}</div>
          <div style={{ marginTop: '2px', fontStyle: 'italic' }}>{"Estimation sur la base d'un bien en bon état général, sans travaux"}</div>
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

function getCountdown(dateAudience: string | null): { label: string; color: string } {
  if (!dateAudience) return { label: '', color: '#6c757d' }
  const diffDays = Math.ceil((new Date(dateAudience).getTime() - Date.now()) / 86400000)
  if (diffDays < 0) return { label: 'Passée', color: '#6c757d' }
  if (diffDays === 0) return { label: "Aujourd'hui", color: '#c0392b' }
  if (diffDays <= 7) return { label: `J-${diffDays}`, color: '#c0392b' }
  if (diffDays <= 14) return { label: `J-${diffDays}`, color: '#e65100' }
  return { label: `J-${diffDays}`, color: '#6c757d' }
}

export default function FicheEncherePage() {
  const params = useParams()
  const id = params?.id as string
  const [enchere, setEnchere] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
  const [activeNav, setActiveNav] = useState('donnees')
  const [showLotsDetail, setShowLotsDetail] = useState(false)
  const [showLotsLocatif, setShowLotsLocatif] = useState(false)
  const [showCoutsCopro, setShowCoutsCopro] = useState(false)
  const [showReventeLots, setShowReventeLots] = useState(false)
  const [showDetailTravaux, setShowDetailTravaux] = useState(false)
  const [coutGeometreParLot, setCoutGeometreParLot] = useState(1500)
  const [coutReglementCoproParLot, setCoutReglementCoproParLot] = useState(2500)
  const [coutCompteursParLot, setCoutCompteursParLot] = useState(1500)
  const [coutTravauxGlobal, setCoutTravauxGlobal] = useState(0)
  const [prixReventeLots, setPrixReventeLots] = useState<Record<number, number>>({})

  const [apport, setApport] = useState<number | ''>(0)
  const [taux, setTaux] = useState<number | ''>(3.5)
  const [tauxAssurance, setTauxAssurance] = useState<number | ''>(0.3)
  const [dureeAmort, setDureeAmort] = useState(20)
  const [dureeInFine, setDureeInFine] = useState(2)
  const [typeCredit, setTypeCredit] = useState<'amortissable' | 'in_fine'>('amortissable')
  const duree = typeCredit === 'in_fine' ? dureeInFine : dureeAmort
  const setDuree = typeCredit === 'in_fine' ? setDureeInFine : setDureeAmort
  const [fraisNotaire, setFraisNotaire] = useState(7.5)
  const [fraisNotaireBase, setFraisNotaireBase] = useState(7.5)
  const [tmi, setTmi] = useState(30)
  const [regime, setRegime] = useState('sci_is')
  const [regime2, setRegime2] = useState('marchand_de_biens')
  const [budgetTravauxM2, setBudgetTravauxM2] = useState<Record<string, number>>({ '1': 200, '2': 500, '3': 800, '4': 1200, '5': 1800 })
  const [estimationData, setEstimationData] = useState<any>(null)
  const [dureeRevente, setDureeRevente] = useState<number>(1)
  const [fraisAgenceRevente, setFraisAgenceRevente] = useState<number | ''>(0) // 0% for auctions (no agency fees)

  useEffect(() => {
    async function load() {
      try {
        const sessionRes = await supabase.auth.getSession()
        const session = sessionRes.data.session
        const enchereRes = await fetch(`/api/encheres/${id}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
        })
        if (!enchereRes.ok) { setFetchError(true); setLoading(false); return }
        const enchereData = await enchereRes.json()
        setEnchere(enchereData.enchere)
        if (session) {
          setUserToken(session.access_token)
          const profilRes = await fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
          const profilData = await profilRes.json()
          if (profilData.profile) {
            const p = profilData.profile
            setProfil(p)
            if (p.plan) {
              setUserPlan(p.plan)
              if (p.plan === 'free') {
                const KEY = 'mdb_free_analyses'
                const MAX = 2
                try {
                  const viewed: string[] = JSON.parse(localStorage.getItem(KEY) || '[]')
                  const enchereKey = `enc_${id}`
                  if (!viewed.includes(enchereKey) && viewed.length < MAX) {
                    viewed.push(enchereKey)
                    localStorage.setItem(KEY, JSON.stringify(viewed))
                  }
                  setFreeAnalysesLeft(viewed.includes(enchereKey) ? 1 : 0)
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
              setFraisNotaire(p.regime === 'marchand_de_biens' ? 2.5 : baseNotaire)
              if (p.regime2 && [...REGIMES, ...REGIMES_IDR].some(r => r.value === p.regime2) && p.regime2 !== p.regime) {
                setRegime2(p.regime2)
              } else {
                const suggere = ['marchand_de_biens', 'sci_is', 'lmnp_reel_bic', 'nu_reel_foncier', 'lmp_reel_bic']
                const alt = suggere.find(r => r !== p.regime)
                if (alt) setRegime2(alt)
              }
            } else {
              setFraisNotaire(baseNotaire)
            }
            if (p.budget_travaux_m2) setBudgetTravauxM2(p.budget_travaux_m2)
          }
        }
        setLoading(false)
      } catch (err) { setFetchError(true); setLoading(false) }
    }
    load()
  }, [id])

  // Sticky nav — IntersectionObserver
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
  }, [enchere])

  function scrollToNav(sectionId: string) {
    const el = document.getElementById(`nav-${sectionId}`)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 130
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  async function handleScorePerso(score: number) {
    const newScore = score === scorePerso ? null : score
    setScorePerso(newScore)
  }

  async function handleUpdate(champ: string, valeur: any) {
    if (!userToken) return
    const res = await fetch(`/api/encheres/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ [champ]: valeur })
    })
    if (res.ok) {
      const data = await res.json()
      setEnchere((prev: any) => ({ ...prev, ...data.enchere }))
    }
  }

  if (loading) return (
    <Layout>
      <style>{`
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .sk { background: linear-gradient(90deg, #ede8e0 25%, #f7f4f0 50%, #ede8e0 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
      `}</style>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 48px' }}>
        <div className="sk" style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="sk" style={{ width: '60%', height: '28px' }} />
            <div className="sk" style={{ width: '40%', height: '16px' }} />
            <div className="sk" style={{ width: '180px', height: '36px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="sk" style={{ width: '35%', height: '16px' }} />
                <div className="sk" style={{ width: '25%', height: '16px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
  if (fetchError) return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>{'\u26A0'}</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{"Impossible de charger cette enchère"}</h2>
        <p style={{ color: '#7a6a60', marginBottom: '24px' }}>{"Vérifiez votre connexion ou réessayez dans quelques instants."}</p>
        <button onClick={() => { setFetchError(false); setLoading(true); window.location.reload() }} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{"Réessayer"}</button>
      </div>
    </Layout>
  )
  if (!enchere) return <Layout><p style={{ textAlign: 'center', padding: '80px', color: '#7a6a60' }}>Enchère introuvable</p></Layout>

  const enrichData = typeof enchere.enrichissement_data === 'string' ? JSON.parse(enchere.enrichissement_data) : enchere.enrichissement_data || {}
  const lotsData = typeof enchere.lots_data === 'string' ? JSON.parse(enchere.lots_data) : enchere.lots_data
  const lots = lotsData?.lots || []
  const nbLotsEffectif = enchere.nb_lots || lots.length
  const isIDR = nbLotsEffectif > 1
  const sources = enchere.sources || []
  const documents = (typeof enchere.documents === 'string' ? JSON.parse(enchere.documents) : enchere.documents) || []

  const hasLoyer = enchere.occupation === 'loue' && (enchere.loyer || enrichData.loyer_mensuel)
  const peutCalculer = hasLoyer && enchere.mise_a_prix

  // Build a "bien-like" object for PnlColonne compatibility
  const bienLike = {
    prix_fai: enchere.mise_a_prix,
    loyer: enchere.loyer || enrichData.loyer_mensuel || 0,
    type_loyer: 'HC',
    charges_rec: 0,
    charges_copro: enchere.charges_copro || 0,
    taxe_fonc_ann: enchere.taxe_fonc_ann || 0,
    surface: enchere.surface,
    score_travaux: enchere.score_travaux || null,
    nb_lots: nbLotsEffectif,
    nb_sdb: enrichData.nb_sdb || 1,
  }

  const scoreUtilCalc = scorePerso || enchere.score_travaux
  const budgetTravCalc = scoreUtilCalc && enchere.surface ? (budgetTravauxM2[String(scoreUtilCalc)] || 0) * enchere.surface : 0
  const estimPrix = estimationData?.prix_total || 0

  const isFreeBlocked = userPlan === 'free' && freeAnalysesLeft <= 0
  const apportNum = apport || 0
  const tauxNum = taux || 0
  const tauxAssuranceNum = tauxAssurance || 0
  const fraisAgenceNum = fraisAgenceRevente || 0
  const prixBase = enchere.mise_a_prix
  // Frais d'adjudication barème Didiercam (remplace le % flat)
  const fraisEnchereMain = calculerFraisEnchere(prixBase, 0, { isMDB: regime === 'marchand_de_biens' })
  const montantProjet = prixBase + fraisEnchereMain.total + budgetTravCalc
  const prixCiblePV = estimPrix > 0 ? Math.round((estimPrix - budgetTravCalc - fraisEnchereMain.total) / 1.2) : null
  const montantEmprunte = Math.max(0, montantProjet - apportNum)
  const apportPct = montantProjet > 0 ? Math.round(apportNum / montantProjet * 1000) / 10 : 0

  const mensualiteCredit = typeCredit === 'in_fine'
    ? montantEmprunte * (tauxNum / 100) / 12
    : calculerMensualite(montantEmprunte, tauxNum, duree)
  const mensualiteAss = montantEmprunte * (tauxAssuranceNum / 100) / 12
  const mensualiteTotale = mensualiteCredit + mensualiteAss

  // Cashflow brut (only if loué)
  const chargesCoproMens = enchere.charges_copro || 0
  const taxeFoncMens = (enchere.taxe_fonc_ann || 0) / 12
  const loyerNet = (enchere.loyer || enrichData.loyer_mensuel || 0) - chargesCoproMens - taxeFoncMens
  const cashflowBrut = loyerNet - mensualiteTotale

  const countdown = getCountdown(enchere.date_audience)
  const statutInfo = STATUT_LABELS[enchere.statut] || STATUT_LABELS.a_venir

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

  const regimesDisponibles = isIDR ? REGIMES_IDR : REGIMES

  return (
    <Layout>
      <style>{`
        .pnl-tooltip-wrap .pnl-tooltip-text { display: none; position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%); background: #1a1210; color: #fff; font-size: 11px; font-weight: 400; padding: 8px 12px; border-radius: 8px; white-space: pre-line; width: max-content; max-width: 280px; z-index: 10; line-height: 1.5; box-shadow: 0 4px 12px rgba(0,0,0,.15); pointer-events: none; text-transform: none; letter-spacing: normal; }
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
        .tag-statut { background: ${statutInfo.bg}; color: ${statutInfo.color}; }
        .section { background: #fff; border-radius: 16px; padding: 24px 28px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-bottom: 24px; }
        .section-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #1a1210; }
        .data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .data-subtitle { grid-column: 1 / -1; font-size: 11px; font-weight: 700; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.08em; padding-top: 8px; border-top: 1px solid #e8e2d8; margin-top: 4px; }
        .data-item { display: flex; flex-direction: column; gap: 4px; }
        .data-label { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; }
        .data-value { font-size: 14px; font-weight: 600; color: #1a1210; }
        .data-value.nc { color: #7a6a60; font-style: italic; font-weight: 400; }
        .two-cols { display: flex; gap: 24px; align-items: flex-start; }
        .two-cols > .col { flex: 1; display: flex; flex-direction: column; gap: 0; min-width: 0; }
        .param-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; }
        .param-label { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; }
        .param-input { padding: 9px 13px; border-radius: 9px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; background: #faf8f5; color: #1a1210; outline: none; width: 100%; box-sizing: border-box; }
        .param-input:focus { border-color: #c0392b; }
        .param-hint { font-size: 11px; color: #b0a898; }
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
        .nc-warning { background: #fff8f0; border: 1.5px solid #f0d090; border-radius: 12px; padding: 16px 20px; color: #a06010; font-size: 13px; }
        .profil-bar { background: #f7f4f0; border-radius: 10px; padding: 10px 16px; font-size: 12px; color: #7a6a60; margin-top: 16px; }
        .pnl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
        .results-table { width: 100%; border-collapse: collapse; }
        .results-table thead th { font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 12px; text-align: right; border-bottom: 2px solid #f0ede8; }
        .results-table thead th:first-child { text-align: left; }
        .results-table tbody tr { border-bottom: 1px solid #f0ede8; }
        .results-table tbody td { padding: 10px 12px; font-size: 14px; text-align: right; }
        .results-table tbody td:first-child { text-align: left; color: #555; font-size: 13px; }
        .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #7a6a60; margin-bottom: 20px; }
        .breadcrumb a { color: #7a6a60; text-decoration: none; }
        .breadcrumb a:hover { color: #1a1210; }
        .breadcrumb .sep { color: #d0c8be; }
        .sticky-nav { position: sticky; top: 68px; z-index: 50; background: rgba(250,248,245,0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 12px; padding: 4px; display: inline-flex; gap: 2px; margin-bottom: 24px; border: 1px solid #e8e2d8; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .sticky-nav-wrap { position: sticky; top: 68px; z-index: 50; display: flex; justify-content: center; margin-bottom: 24px; }
        .sticky-nav-item { padding: 9px 20px; font-size: 13px; font-weight: 600; color: #7a6a60; white-space: nowrap; cursor: pointer; background: none; border: none; border-radius: 9px; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .sticky-nav-item:hover { color: #1a1210; background: rgba(0,0,0,0.04); }
        .sticky-nav-item.active { color: #c0392b; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(26,18,16,0.45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .modal-panel { background: #fff; border-radius: 16px; width: 100%; max-width: 640px; max-height: 85vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: modalIn 0.2s ease; display: flex; flex-direction: column; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 12px; flex-shrink: 0; }
        .modal-header h3 { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700; color: #1a1210; margin: 0; }
        .modal-close { background: none; border: none; cursor: pointer; color: #7a6a60; font-size: 22px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.15s; }
        .modal-close:hover { background: #f0ede8; color: #1a1210; }
        .modal-body { padding: 0 24px 24px; overflow-y: auto; flex: 1; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 767px) { .fiche-wrap { padding: 16px; } .hero-grid { grid-template-columns: 1fr; } .pnl-grid { grid-template-columns: 1fr; } .two-cols { flex-direction: column; } .sticky-nav { padding: 3px; } .sticky-nav-item { padding: 8px 14px; font-size: 12px; } .modal-panel { max-width: 100%; max-height: 90vh; } .data-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div className="fiche-wrap">
        <nav className="breadcrumb">
          <a href="/encheres">Enchères</a>
          <span className="sep">{'>'}</span>
          {enchere.ville && <><a href={`/encheres?ville=${encodeURIComponent(enchere.ville)}`}>{enchere.ville}</a><span className="sep">{'>'}</span></>}
          <span style={{ color: '#1a1210', fontWeight: 500 }}>Cette enchère</span>
        </nav>

        <div className="hero-grid">
          <PhotoCarousel enchere={enchere} />

          <div className="fiche-info">
            <h1 className="fiche-title">{enchere.type_bien || 'Bien'} {enchere.nb_pieces ? `${enchere.nb_pieces} pièces` : ''}{enchere.surface ? ` - ${enchere.surface} m²` : ''}</h1>
            <p className="fiche-sub">{enchere.adresse ? `${enchere.adresse} - ` : ''}{enchere.ville}{enchere.code_postal ? ` - ${enchere.code_postal}` : ''}</p>
            <div className="fiche-tags">
              <span className="tag tag-statut">{statutInfo.label}</span>
              {countdown.label && (
                <span className="tag" style={{ background: countdown.color, color: '#fff' }}>{countdown.label}</span>
              )}
              {enchere.occupation && <span className="tag">{OCCUPATION_LABELS[enchere.occupation] || enchere.occupation}</span>}
              {isIDR && <span className="tag tag-strat">{nbLotsEffectif} lots</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mise à prix</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: '30px', fontWeight: 800, color: '#c0392b' }}>{fmt(enchere.mise_a_prix)} {'\u20AC'}</span>
              {enchere.prix_adjuge && enchere.prix_adjuge > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#7a6a60', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prix adjugé</span>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 700, color: '#2a4a8a' }}>{fmt(enchere.prix_adjuge)} {'\u20AC'}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enchère info block */}
        <div className="section">
          <h2 className="section-title">Enchère</h2>
          <div className="data-grid">
            <div className="data-item">
              <span className="data-label">Tribunal</span>
              <span className="data-value">
                {enchere.tribunal || 'NC'}
                {isVenteDelocalisee(enchere.departement, enchere.tribunal) && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 600, background: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: '6px' }} title="La vente se déroule dans un tribunal d'un autre département">
                    📍 Délocalisée
                  </span>
                )}
              </span>
            </div>
            <div className="data-item">
              <span className="data-label">Date audience</span>
              <span className="data-value">{enchere.date_audience ? new Date(enchere.date_audience).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'NC'}</span>
            </div>
            {enchere.date_visite && (
              <div className="data-item">
                <span className="data-label">Date visite</span>
                <span className="data-value">{new Date(enchere.date_visite).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            )}
            {enchere.avocat_nom && (
              <div className="data-item">
                <span className="data-label">Avocat poursuivant</span>
                <span className="data-value">{enchere.avocat_nom}{enchere.avocat_cabinet ? ` (${enchere.avocat_cabinet})` : ''}{enchere.avocat_tel ? ` — ${enchere.avocat_tel}` : ''}</span>
              </div>
            )}
            {enchere.avocat_email && (
              <div className="data-item">
                <span className="data-label"></span>
                <a
                  href={`mailto:${enchere.avocat_email}?subject=${encodeURIComponent(`Demande de dossier — ${enchere.adresse || enchere.ville || 'enchère judiciaire'}`)}&body=${encodeURIComponent(`Bonjour,\n\nJe suis intéressé par l'acquisition du bien mis en vente aux enchères judiciaires :\n${enchere.adresse ? enchere.adresse + ', ' : ''}${enchere.ville || ''}\nMise à prix : ${enchere.mise_a_prix ? enchere.mise_a_prix.toLocaleString('fr-FR') + ' €' : 'NC'}\n\nPouvez-vous m'adresser le dossier complet (cahier des conditions de vente, procès-verbal de description) ?\n\nCordialement`)}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '6px',
                    background: '#c0392b', color: '#fff',
                    textDecoration: 'none', fontSize: '13px', fontWeight: 600,
                  }}
                >
                  ✉ Contacter l{"'"}avocat poursuivant
                </a>
              </div>
            )}
          </div>
          {/* Sources */}
          {sources.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#7a6a60', marginRight: '4px', alignSelf: 'center' }}>Voir sur :</span>
              {sources.map((s: any, i: number) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '8px',
                    border: '1.5px solid #e8e2d820', background: '#faf8f5',
                    textDecoration: 'none', fontSize: '12px', fontWeight: 600, color: '#1a1210',
                  }}
                >
                  {SOURCE_LABELS[s.source] || s.source} ↗
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Sticky navigation */}
        <div className="sticky-nav-wrap">
          <nav className="sticky-nav">
            <button className={`sticky-nav-item ${activeNav === 'donnees' ? 'active' : ''}`} onClick={() => scrollToNav('donnees')}>{"Données"}</button>
            <button className={`sticky-nav-item ${activeNav === 'estimation' ? 'active' : ''}`} onClick={() => scrollToNav('estimation')}>Estimation</button>
            <button className={`sticky-nav-item ${activeNav === 'financement' ? 'active' : ''}`} onClick={() => scrollToNav('financement')}>Financement</button>
            <button className={`sticky-nav-item ${activeNav === 'fiscalite' ? 'active' : ''}`} onClick={() => scrollToNav('fiscalite')}>{"Fiscalité"}</button>
          </nav>
        </div>

        {/* Intro */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e8e2d8', padding: '18px 22px', marginBottom: '20px', fontSize: '13px', color: '#7a6a60', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <strong style={{ color: '#1a1210' }}>Vente aux enchères judiciaire</strong> — Les ventes aux enchères immobilières permettent d{"'"}acquérir des biens avec une <strong style={{ color: '#1a1210' }}>décote significative</strong> par rapport au marché. La mise à prix est fixée par le tribunal, souvent à 20-40% en dessous de la valeur réelle. L{"'"}acquisition se fait via un avocat obligatoire, avec des frais spécifiques (émoluments, droits de mutation, frais de procédure).
          </div>
          <div>
            L{"'"}analyse ci-dessous compare la mise à prix avec l{"'"}estimation DVF du marché pour calculer la <strong style={{ color: '#1a1210' }}>décote réelle</strong> et simuler la rentabilité de l{"'"}opération selon différents régimes fiscaux.
          </div>
        </div>

        {/* Caractéristiques */}
        <div id="nav-donnees" className="section">
          <h2 className="section-title">{"Caractéristiques du Bien"}</h2>
          <div className="data-grid">
            <div className="data-subtitle">{"Caractéristiques"}</div>
            <div className="data-item">
              <span className="data-label">Type</span>
              <span className={`data-value ${!enchere.type_bien ? 'nc' : ''}`}>{enchere.type_bien || 'NC'}</span>
            </div>
            <div className="data-item">
              <span className="data-label">Surface</span>
              <span className="data-value">{enchere.surface ? `${enchere.surface} m²` : 'NC'}</span>
            </div>
            <div className="data-item">
              <span className="data-label">{"Pièces"}</span>
              <span className={`data-value ${!enchere.nb_pieces && !enrichData.nb_pieces ? 'nc' : ''}`}>{enchere.nb_pieces || enrichData.nb_pieces || 'NC'}</span>
            </div>
            {enrichData.nb_chambres && (
              <div className="data-item">
                <span className="data-label">Chambres</span>
                <span className="data-value">{enrichData.nb_chambres}</span>
              </div>
            )}
            {enrichData.etage && (
              <div className="data-item">
                <span className="data-label">{"Étage"}</span>
                <span className="data-value">{enrichData.etage}</span>
              </div>
            )}
            <div className="data-item">
              <span className="data-label">Occupation</span>
              <span className="data-value">{OCCUPATION_LABELS[enchere.occupation] || 'NC'}</span>
            </div>
            {enrichData.dpe && (
              <div className="data-item">
                <span className="data-label">DPE</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '8px', fontWeight: 700, fontSize: '16px', color: '#fff',
                  background: ({ A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0e034', E: '#f0a830', F: '#eb6a2a', G: '#e42a1e' } as Record<string, string>)[enrichData.dpe] || '#7a6a60'
                }}>{enrichData.dpe}</span>
              </div>
            )}
            {/* Équipements */}
            {(enrichData.has_cave || enrichData.has_parking || enrichData.has_jardin || enrichData.has_terrasse || enrichData.has_piscine || enrichData.has_ascenseur) && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {enrichData.has_cave && <span className="tag">Cave</span>}
                {enrichData.has_parking && <span className="tag">Parking</span>}
                {enrichData.has_jardin && <span className="tag">Jardin</span>}
                {enrichData.has_terrasse && <span className="tag">Terrasse</span>}
                {enrichData.has_piscine && <span className="tag">Piscine</span>}
                {enrichData.has_ascenseur && <span className="tag">Ascenseur</span>}
              </div>
            )}
          </div>
          {/* IDR: lots */}
          {isIDR && (
            <>
              <div className="data-grid" style={{ marginTop: '12px' }}>
                <div className="data-subtitle">Immeuble</div>
                <div className="data-item">
                  <span className="data-label">Nb lots</span>
                  <CellEditable bien={enchere} champ="nb_lots" suffix=" lots" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setEnchere} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
                </div>
              </div>
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button onClick={() => setShowLotsDetail(!showLotsDetail)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {showLotsDetail ? "Masquer le détail des lots" : "Voir le détail des lots"}
                </button>
              </div>
              <ModalPanel open={showLotsDetail} onClose={() => setShowLotsDetail(false)} title={"Détail des lots"}>
                <LotsEditor lots={lots} nbLotsEffectif={nbLotsEffectif} userToken={userToken} onSave={async (newLots) => { await handleUpdate('lots_data', { lots: newLots }); }} />
              </ModalPanel>
            </>
          )}
        </div>

        {/* Données Locatives (only if occupation = loué) */}
        {enchere.occupation === 'loue' && (
          <div className="section">
            <h2 className="section-title">{"Données Locatives"}</h2>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">Loyer</span>
                <CellEditable bien={enchere} champ="loyer" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setEnchere} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              <div className="data-item">
                <span className="data-label">Charges copro</span>
                <CellEditable bien={enchere} champ="charges_copro" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setEnchere} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              <div className="data-item">
                <span className="data-label">{"Taxe foncière"}</span>
                <CellEditable bien={enchere} champ="taxe_fonc_ann" suffix={` \u20AC/an`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setEnchere} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} />
              </div>
              {enchere.mise_a_prix && (enchere.loyer || enrichData.loyer_mensuel) && (
                <div className="data-item">
                  <span className="data-label">Rendement brut</span>
                  <span className="data-value" style={{ color: ((enchere.loyer || enrichData.loyer_mensuel) * 12 / enchere.mise_a_prix) >= 0.07 ? '#1a7a40' : '#a06010' }}>
                    {(((enchere.loyer || enrichData.loyer_mensuel) * 12 / enchere.mise_a_prix) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            {/* IDR: loyers par lot */}
            {isIDR && lots.length > 0 && (
              <>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: '#1a7a40', fontWeight: 600 }}>{lots.filter((l: any) => l.etat === 'loue' || l.occupation === 'loue').length}/{nbLotsEffectif} lots {"loués"}</span>
                </div>
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  <button onClick={() => setShowLotsLocatif(!showLotsLocatif)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#7a6a60', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    {showLotsLocatif ? "Masquer" : "Détail loyers par lot"}
                  </button>
                </div>
                <ModalPanel open={showLotsLocatif} onClose={() => setShowLotsLocatif(false)} title={"Détail loyers par lot"}>
                  <div className="lots-table-wrap"><table className="lots-table">
                    <thead><tr><th>Lot</th><th>Type</th><th>Loyer</th><th>{"État"}</th></tr></thead>
                    <tbody>
                      {lots.map((lot: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{i + 1}</td>
                          <td>{lot.type || 'NC'}</td>
                          <td>{lot.loyer ? `${lot.loyer.toLocaleString('fr-FR')} \u20AC` : 'NC'}</td>
                          <td>
                            {(lot.etat || lot.occupation) ? (
                              <span className={`lot-badge ${(lot.etat || lot.occupation) === 'loue' ? 'lot-loue' : (lot.etat || lot.occupation) === 'vacant' ? 'lot-vacant' : 'lot-renover'}`}>
                                {(lot.etat || lot.occupation) === 'loue' ? "Loué" : (lot.etat || lot.occupation) === 'vacant' ? 'Vacant' : 'NC'}
                              </span>
                            ) : 'NC'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </ModalPanel>
              </>
            )}
          </div>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div className="section">
            <h2 className="section-title">Documents</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map((doc: any, i: number) => (
                <a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', borderRadius: '10px',
                    background: '#faf8f5', border: '1px solid #e8e2d8',
                    textDecoration: 'none', color: '#1a1210',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{DOC_ICONS[doc.type] || DOC_ICONS.autre}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{doc.label || doc.type}</div>
                    <div style={{ fontSize: '11px', color: '#7a6a60' }}>Télécharger ↗</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {enchere.description && (
          <div className="section">
            <h2 className="section-title">Description</h2>
            <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#555' }}>{enchere.description}</p>
          </div>
        )}

        <div id="nav-estimation" className="two-cols">
        <div className="col">
        {/* Estimation */}
        {(() => {
          return (
            <div style={isFreeBlocked ? { position: 'relative' } : {}}>
              {userPlan === 'free' && freeAnalysesLeft > 0 && (
                <div style={{
                  background: 'rgba(26,122,64,0.06)', border: '1px solid rgba(26,122,64,0.15)',
                  borderRadius: 10, padding: '10px 16px', marginBottom: 16,
                  fontSize: 13, color: '#1a7a40', fontWeight: 500
                }}>
                  {`\u2728 Analyse complète offerte (${freeAnalysesUsed}/2 utilisées) — découvrez ce que le plan Pro vous réserve !`}
                </div>
              )}
              <EstimationSection enchereId={id} prixFai={enchere.mise_a_prix} surface={enchere.surface} adresseInitiale={enchere.adresse} villeInitiale={enchere.ville} userToken={userToken} onEstimationLoaded={setEstimationData} isFree={isFreeBlocked}
                extra={isIDR && nbLotsEffectif > 0 ? (
                  <div style={{ marginTop: '4px', textAlign: 'center' }}>
                    <button onClick={() => setShowReventeLots(!showReventeLots)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#2a4a8a', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      {showReventeLots ? "Masquer la revente par lot" : "Estimer la revente par lot"}
                    </button>
                    <ModalPanel open={showReventeLots} onClose={() => setShowReventeLots(false)} title="Estimer la revente par lot">
                      <div style={{ textAlign: 'left' }}>
                        <div className="lots-table-wrap"><table className="lots-table">
                          <thead><tr><th>Lot</th><th>Type</th><th>Surface</th><th>{"Prix/m²"}</th><th>{"Prix revente"}</th></tr></thead>
                          <tbody>
                            {Array.from({ length: Math.max(nbLotsEffectif, lots.length) }).map((_, i) => {
                              const lot = lots[i] || {}
                              const prixM2DVF = estimationData?.prix_m2 || (enchere.estimation_prix_total && enchere.surface ? Math.round(enchere.estimation_prix_total / enchere.surface) : 0)
                              const prixEstime = lot.surface && prixM2DVF ? Math.round(lot.surface * prixM2DVF) : 0
                              return (
                                <tr key={i}>
                                  <td style={{ fontWeight: 600 }}>{i + 1}</td>
                                  <td>{lot.type || 'NC'}</td>
                                  <td>{lot.surface ? `${lot.surface} m²` : 'NC'}</td>
                                  <td style={{ color: '#7a6a60' }}>{prixM2DVF ? `${prixM2DVF.toLocaleString('fr-FR')} \u20AC` : '-'}</td>
                                  <td><input type="number" value={(prixReventeLots[i] !== undefined ? prixReventeLots[i] : prixEstime) || ''} onChange={e => setPrixReventeLots(prev => ({ ...prev, [i]: Number(e.target.value) }))} placeholder={prixEstime ? String(prixEstime) : '0'} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', width: '110px', fontFamily: "'DM Sans', sans-serif", background: '#fff', textAlign: 'right' }} /></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table></div>
                      </div>
                    </ModalPanel>
                  </div>
                ) : undefined}
              />
            </div>
          )
        })()}

        {/* Cash Flow (only if loué) */}
        {peutCalculer && (
          <div className="section">
              <h2 className="section-title">{"Cash Flow Avant Impôt"}</h2>
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
                              <td>{"Loyer (HC)"}</td>
                              <td><CellEditable bien={enchere} champ="loyer" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setEnchere} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} /></td>
                              <td><CellEditable bien={enchere} champ="loyer" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setEnchere} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={12} /></td>
                            </tr>
                            <tr>
                              <td>{"Charges copro"}</td>
                              <td><CellEditable bien={enchere} champ="charges_copro" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setEnchere} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} /></td>
                              <td><CellEditable bien={enchere} champ="charges_copro" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setEnchere} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={12} /></td>
                            </tr>
                            <tr>
                              <td>{"Taxe foncière"}</td>
                              <td><CellEditable bien={enchere} champ="taxe_fonc_ann" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setEnchere} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1/12} /></td>
                              <td><CellEditable bien={enchere} champ="taxe_fonc_ann" suffix="" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} setBien={setEnchere} dirtyChamps={dirtyChamps} setDirtyChamps={setDirtyChamps} originalVals={originalVals} setOriginalVals={setOriginalVals} scale={1} /></td>
                            </tr>
                            <tr>
                              <td>{"Mensualité crédit"}</td>
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
                    <div style={{ fontSize: '11px', color: '#7a6a60', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{"Cash Flow Avant Impôt"}</div>
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
        {/* Score travaux */}
        <div className="section">
          <h2 className="section-title">Estimation Travaux</h2>
          {enrichData.etat_interieur ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span className="data-label" style={{ margin: 0, minWidth: '110px' }}>État intérieur</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1210' }}>{enrichData.etat_interieur}</span>
            </div>
          ) : null}
          {enchere.score_travaux ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span className="data-label" style={{ margin: 0, minWidth: '110px' }}>Score IA</span>
              <div style={{ display: 'flex', gap: '4px' }} className={isFreeBlocked ? 'val-blur' : ''}>
                {[1, 2, 3, 4, 5].map(i => {
                  const color = i <= 2 ? '#1a7a40' : i <= 3 ? '#f0a830' : '#c0392b'
                  return (
                    <div key={i} style={{
                      width: '28px', height: '10px', borderRadius: '4px',
                      background: i <= (enchere.score_travaux || 0) ? color : '#e8e2d8'
                    }} />
                  )
                })}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210' }} className={isFreeBlocked ? 'val-blur' : ''}>{enchere.score_travaux}/5</span>
              <ScoreLabel score={enchere.score_travaux} />
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#7a6a60', marginBottom: '8px' }}>Aucun score IA disponible — sélectionnez un score ci-dessous</div>
          )}
          {enchere.score_commentaire && (
            <div style={{ background: '#faf8f5', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#555', lineHeight: '1.5', fontStyle: 'italic', marginBottom: '12px' }} className={isFreeBlocked ? 'val-blur' : ''}>
              {enchere.score_commentaire}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            <span className="data-label" style={{ margin: 0, minWidth: '110px' }}>Mon estimation</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5].map(i => {
                const scoreAffiche = scorePerso || enchere.score_travaux || 0
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
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210' }}>{(scorePerso || enchere.score_travaux) ? `${scorePerso || enchere.score_travaux}/5` : 'NC'}</span>
            <ScoreLabel score={scorePerso || enchere.score_travaux} />
          </div>
          {(() => {
            const scoreUtilise = scorePerso || enchere.score_travaux
            if (!scoreUtilise || !enchere.surface) return null
            const budgetM2 = budgetTravauxM2[String(scoreUtilise)] || 0
            const totalScore = Math.round(budgetM2 * enchere.surface)
            return (
              <div style={{ background: '#fff8f0', border: '1.5px solid #f0d090', borderRadius: '12px', padding: '16px 20px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#a06010', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                      Estimation budget travaux
                    </div>
                    <div style={{ fontSize: '13px', color: '#7a6a60' }} className={isFreeBlocked ? 'val-blur' : ''}>
                      {`${budgetM2} \u20AC/m² × ${enchere.surface} m² (${scorePerso ? 'mon estimation' : 'score IA'} ${scoreUtilise}/5)`}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 800, color: '#a06010' }} className={isFreeBlocked ? 'val-blur' : ''}>
                    {totalScore.toLocaleString('fr-FR')} {'\u20AC'}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* IDR: Coûts création copropriété */}
          {isIDR && nbLotsEffectif > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <button onClick={() => setShowCoutsCopro(!showCoutsCopro)} style={{ background: 'none', border: '1px solid #e8e2d8', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#a06010', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {showCoutsCopro ? "Masquer les coûts copro" : "Estimer les coûts de création de copropriété"}
                </button>
              </div>
              <ModalPanel open={showCoutsCopro} onClose={() => setShowCoutsCopro(false)} title={"Coûts de création de copropriété"}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px 12px', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: '#7a6a60', fontWeight: 600 }}>{"État descriptif (géomètre)"}</span>
                    <input type="number" value={coutGeometreParLot} onChange={e => setCoutGeometreParLot(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', width: '90px', fontFamily: "'DM Sans', sans-serif", background: '#fff', textAlign: 'right' }} />
                    <span style={{ color: '#7a6a60' }}>{'\u20AC'} / lot</span>

                    <span style={{ color: '#7a6a60', fontWeight: 600 }}>{"Règlement de copropriété"}</span>
                    <input type="number" value={coutReglementCoproParLot} onChange={e => setCoutReglementCoproParLot(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', width: '90px', fontFamily: "'DM Sans', sans-serif", background: '#fff', textAlign: 'right' }} />
                    <span style={{ color: '#7a6a60' }}>{'\u20AC'} / lot</span>

                    <span style={{ color: '#7a6a60', fontWeight: 600 }}>Compteurs individuels</span>
                    <input type="number" value={coutCompteursParLot} onChange={e => setCoutCompteursParLot(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', width: '90px', fontFamily: "'DM Sans', sans-serif", background: '#fff', textAlign: 'right' }} />
                    <span style={{ color: '#7a6a60' }}>{'\u20AC'} / lot</span>

                    <span style={{ color: '#7a6a60', fontWeight: 600 }}>Travaux divers</span>
                    <input type="number" value={coutTravauxGlobal} onChange={e => setCoutTravauxGlobal(Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontSize: '13px', width: '90px', fontFamily: "'DM Sans', sans-serif", background: '#fff', textAlign: 'right' }} />
                    <span style={{ color: '#7a6a60' }}>{'\u20AC'} global</span>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #e8e2d8' }}>
                    <span style={{ fontSize: '12px', color: '#7a6a60' }}>{`(${coutGeometreParLot.toLocaleString('fr-FR')} + ${coutReglementCoproParLot.toLocaleString('fr-FR')} + ${coutCompteursParLot.toLocaleString('fr-FR')}) × ${nbLotsEffectif} lots + ${coutTravauxGlobal.toLocaleString('fr-FR')} \u20AC`}</span>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 800, color: '#a06010' }}>
                      {((coutGeometreParLot + coutReglementCoproParLot + coutCompteursParLot) * nbLotsEffectif + coutTravauxGlobal).toLocaleString('fr-FR')} {'\u20AC'}
                    </span>
                  </div>
              </ModalPanel>
            </div>
          )}
        </div>

        {enchere.mise_a_prix && (
          <>
            <div id="nav-financement" className="section">
              <h2 className="section-title">Simulateur de Financement</h2>
                <div>
                  <div className="param-group">
                    <label className="param-label">Montant du projet (frais adjudication inclus)</label>
                    <div className="param-input" style={{ background: '#f0ede8', color: '#1a1210', fontWeight: 700, fontSize: '16px' }}>{fmt(Math.round(montantProjet))} {'\u20AC'}</div>
                    <span className="param-hint">Base : {fmt(prixBase)} {'\u20AC'} + {fmt(Math.round(fraisEnchereMain.total))} {'\u20AC'} frais ({fraisEnchereMain.pct}%){budgetTravCalc > 0 ? ` + ${fmt(budgetTravCalc)} \u20AC travaux` : ''}</span>
                  </div>
                  <div className="param-group">
                    <label className="param-label">Apport — {apportPct} % du projet ({fmt(apportNum)} {'\u20AC'})</label>
                    <div className="slider-wrap">
                      <input type="range" className="slider" min={0} max={100} step={0.5} value={apportPct}
                        onChange={e => { const pct = Number(e.target.value); setApport(Math.round(montantProjet * pct / 100)) }} />
                      <div className="slider-labels"><span>0 %</span><span>100 %</span></div>
                    </div>
                    <input className="param-input" type="number" value={apport} onChange={e => setApport(e.target.value === '' ? '' : Number(e.target.value))} onBlur={e => { if (e.target.value === '') setApport(profil?.apport ?? 0) }} placeholder={"Montant en \u20AC"} />
                    <span className="param-hint">{"Montant emprunté"} : {fmt(montantEmprunte)} {'\u20AC'}</span>
                  </div>
                  <div className="param-group">
                    <label className="param-label">Type de cr{'\u00E9'}dit</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button type="button" onClick={() => setTypeCredit('amortissable')} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e8e2d8', background: typeCredit === 'amortissable' ? '#1a1210' : '#fff', color: typeCredit === 'amortissable' ? '#fff' : '#7a6a60', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Amortissable</button>
                      <button type="button" onClick={() => setTypeCredit('in_fine')} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e8e2d8', background: typeCredit === 'in_fine' ? '#1a1210' : '#fff', color: typeCredit === 'in_fine' ? '#fff' : '#7a6a60', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>In fine</button>
                    </div>
                    {typeCredit === 'in_fine' && <span className="param-hint">{"Intérêts seuls chaque mois, capital remboursé à la revente"}</span>}
                  </div>
                  <div className="param-group">
                    <label className="param-label">{"Taux crédit (%)"}</label>
                    <input className="param-input" type="number" step="0.01" value={taux} onChange={e => setTaux(e.target.value === '' ? '' : Number(e.target.value))} onBlur={e => { if (e.target.value === '') setTaux(profil?.taux_credit ?? 3.5) }} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">Taux assurance (%)</label>
                    <input className="param-input" type="number" step="0.01" value={tauxAssurance} onChange={e => setTauxAssurance(e.target.value === '' ? '' : Number(e.target.value))} onBlur={e => { if (e.target.value === '') setTauxAssurance(profil?.taux_assurance ?? 0.3) }} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">{"Durée"} — {duree} an{duree > 1 ? 's' : ''}</label>
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
                    <span style={{ fontSize: '12px', color: '#7a6a60' }}>{typeCredit === 'in_fine' ? "Intérêts mensuels (in fine)" : "Mensualité crédit"}</span>
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

        {enchere.mise_a_prix && (
          <div id="nav-fiscalite">
          <div className="section">
            <h2 className="section-title">Analyse Fiscale</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#7a6a60' }}>Comparer avec :</span>
                {userPlan === 'expert' ? (
                  <select className="param-input" style={{ width: 'auto' }} value={regime2} onChange={e => setRegime2(e.target.value)}>
                    {regimesDisponibles.filter(r => r.value !== regime).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="param-input" style={{ width: 'auto', background: '#f0ede8' }}>{[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime2)?.label || regime2}</span>
                    <a href="/#pricing" style={{ fontSize: '11px', color: '#c0392b', textDecoration: 'underline', whiteSpace: 'nowrap' }}>{"Tous les régimes \u2192 Expert"}</a>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#7a6a60' }}>{"Détention :"}</span>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#7a6a60' }}>{"Frais d'agence à l'achat :"}</span>
                <input type="number" step="0.5" min="0" max="10" value={fraisAgenceRevente}
                  onChange={e => setFraisAgenceRevente(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={e => { if (e.target.value === '') setFraisAgenceRevente(0) }}
                  className="param-input" style={{ width: '60px', textAlign: 'right' }} />
                <span style={{ fontSize: '12px', color: '#7a6a60' }}>%</span>
              </div>
            </div>
            <div>
              {isFreeBlocked && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff8f0', border: '1.5px solid #f0d090', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
                  <span style={{ fontSize: 13, color: '#1a1210', fontWeight: 600 }}>
                    {"Débloquez les simulations fiscales complètes"}
                  </span>
                  <a href="/mon-profil" style={{
                    display: 'inline-block', padding: '7px 18px', borderRadius: 8,
                    background: '#c0392b', color: '#fff', fontWeight: 600, fontSize: 12,
                    textDecoration: 'none', fontFamily: "'DM Sans', sans-serif"
                  }}>
                    {"Débloquer \u2192"}
                  </a>
                </div>
              )}
              <div className="pnl-grid">
                <PnlColonne titre={`${[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime)?.label || regime} (votre régime)`} bien={{ ...bienLike, prix_fai: prixBase }} financement={financement} tmi={tmi} regime={regime} otherRegime={regime2} highlight dureeRevente={dureeRevente} estimation={estimationData} budgetTravauxM2={budgetTravauxM2} scorePerso={scorePerso} fraisNotaire={fraisNotaire} fraisNotaireBase={fraisNotaireBase} apport={apportNum} fraisAgenceRevente={fraisAgenceNum} chargesUtilisateur={chargesUtilisateur} isFree={isFreeBlocked} isEnchere />
                <PnlColonne titre={[...REGIMES, ...REGIMES_IDR].find(r => r.value === regime2)?.label || regime2} bien={{ ...bienLike, prix_fai: prixBase }} financement={financement} tmi={tmi} regime={regime2} otherRegime={regime} dureeRevente={dureeRevente} estimation={estimationData} budgetTravauxM2={budgetTravauxM2} scorePerso={scorePerso} fraisNotaire={fraisNotaire} fraisNotaireBase={fraisNotaireBase} apport={apportNum} fraisAgenceRevente={fraisAgenceNum} chargesUtilisateur={chargesUtilisateur} isFree={isFreeBlocked} isEnchere />
              </div>
            </div>
          </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
