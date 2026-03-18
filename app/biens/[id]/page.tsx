'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { calculerCashflow, calculerMensualite, calculerRevente, calculerCapitalRestantDu } from '@/lib/calculs'

const REGIMES = [
  { value: 'micro_foncier', label: 'Micro-foncier' },
  { value: 'reel', label: 'Reel' },
  { value: 'lmnp', label: 'LMNP' },
  { value: 'sci_is', label: 'SCI IS' },
  { value: 'marchand_de_biens', label: 'Marchand de biens' },
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
            <div style={{ fontSize: '12px', color: '#9a8a80', padding: '6px 10px', borderBottom: '1px solid #f0ede8', marginBottom: '4px' }}>Valide par 2+ utilisateurs</div>
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

  return <span style={{ fontWeight: 600, color: '#1a1210' }}>{valeur}{suffix}</span>
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
            <div style={{ fontSize: '12px', color: '#9a8a80', padding: '6px 10px', borderBottom: '1px solid #f0ede8', marginBottom: '4px' }}>Valide par 2+ utilisateurs</div>
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

function PnlColonne({ titre, bien, financement, tmi, regime, highlight = false, dureeRevente, estimation, budgetTravauxM2, scorePerso, fraisNotaire, apport, fraisAgenceRevente = 5 }: any) {
  const { prix_fai, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann } = bien
  const { montantEmprunte, tauxCredit, tauxAssurance, dureeAns } = financement
  const isTravauxLourds = bien.strategie_mdb === 'Travaux lourds'
  const hasLoyer = loyer && loyer > 0

  const loyerAnnuel = (loyer || 0) * 12
  const chargesRecAnn = (charges_rec || 0) * 12
  const chargesCoproAnn = charges_copro || 0
  const taxeFoncAnn = taxe_fonc_ann || 0
  const interetsAnn = montantEmprunte * tauxCredit / 100
  const assuranceAnn = montantEmprunte * (tauxAssurance / 100)
  const amortImmo = prix_fai * 0.85 / 30
  const amortMobilier = prix_fai * 0.10 / 10
  const amortLMNP = amortImmo + amortMobilier
  const amortSCI = prix_fai * 0.85 / 30
  const hasAmort = regime === 'lmnp' || regime === 'sci_is'
  const amort = regime === 'lmnp' ? amortLMNP : regime === 'sci_is' ? amortSCI : 0

  let revenuImposable = 0
  let impot = 0

  if (regime === 'micro_foncier') {
    revenuImposable = loyerAnnuel * 0.70
    impot = revenuImposable * (tmi / 100 + 0.172)
  } else if (regime === 'reel') {
    const chargesDeductibles = chargesCoproAnn + taxeFoncAnn + interetsAnn + assuranceAnn
    revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impot = revenuImposable * (tmi / 100 + 0.172)
  } else if (regime === 'lmnp') {
    const chargesDeductibles = chargesCoproAnn + taxeFoncAnn + interetsAnn + assuranceAnn + amort
    revenuImposable = Math.max(0, loyerAnnuel - chargesDeductibles)
    impot = revenuImposable * (tmi / 100)
  } else if (regime === 'sci_is' || regime === 'marchand_de_biens') {
    // SCI IS et MdB : IS 15% / 25%, charges deductibles + amortissement (SCI IS seulement)
    const amortRegime = regime === 'sci_is' ? amort : 0
    const chargesDeductibles = chargesCoproAnn + taxeFoncAnn + interetsAnn + assuranceAnn + amortRegime
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
  const scoreUtilise = scorePerso || bien.score_travaux
  const budgetTravaux = isTravauxLourds && scoreUtilise && bien.surface
    ? (budgetTravauxM2?.[String(scoreUtilise)] || 0) * bien.surface : 0
  const fraisNotairePct = regime === 'marchand_de_biens' ? 2.5 : (fraisNotaire || 7.5)
  const fraisNotaireMontant = Math.round(prix_fai * fraisNotairePct / 100)

  // PV brute = revente - achat - notaire - travaux
  const pvBrute = Math.max(0, prixRevente - prix_fai - fraisNotaireMontant - budgetTravaux)

  // Fiscalite PV selon regime
  let irPV = 0, psPV = 0, tvaMarge = 0, chargesSocMdb = 0, isPV = 0, pfuPV = 0
  if (regime === 'micro_foncier' || regime === 'reel') {
    irPV = pvBrute * 0.19
    psPV = pvBrute * 0.172
  } else if (regime === 'lmnp') {
    const amortsCumules = ((prix_fai * 0.85 / 30) + (prix_fai * 0.10 / 10)) * dur
    const pvReintegree = Math.max(0, pvBrute + amortsCumules)
    irPV = pvReintegree * 0.19
    psPV = pvReintegree * 0.172
  } else if (regime === 'sci_is') {
    const amortCumule = (prix_fai * 0.85 / 30) * dur
    const vnc = prix_fai - amortCumule
    const pvSCI = Math.max(0, prixRevente - vnc - budgetTravaux)
    isPV = pvSCI <= 42500 ? pvSCI * 0.15 : 42500 * 0.15 + (pvSCI - 42500) * 0.25
  } else if (regime === 'marchand_de_biens') {
    // MdB toujours a l'IS : TVA sur marge + IS sur benefice
    const marge = Math.max(0, prixReventeBrut - prix_fai)
    tvaMarge = marge * 0.20
    const benefice = Math.max(0, prixRevente - prix_fai - budgetTravaux - fraisNotaireMontant - tvaMarge)
    isPV = benefice <= 42500 ? benefice * 0.15 : 42500 * 0.15 + (benefice - 42500) * 0.25
  }
  const totalFiscPV = Math.round(irPV + psPV + tvaMarge + isPV)
  const pvNette = Math.round(pvBrute - totalFiscPV)

  // Cashflow locatif net cumule
  const cashflowCumule = hasLoyer && !isTravauxLourds ? Math.round(cashflowNetAnnuel * dur) : 0

  // Capital restant du
  const crd = calculerCapitalRestantDu(montantEmprunte, tauxCredit, dureeAns, dur)

  // Bilan = produit revente - CRD - fiscalite PV + cashflow cumule - apport - frais notaire - travaux
  const produitRevente = prixRevente - crd
  const capitalInvesti = (apport || 0) + fraisNotaireMontant + budgetTravaux
  const profitNet = Math.round(produitRevente - capitalInvesti - totalFiscPV + cashflowCumule)
  const rendementTotal = capitalInvesti > 0 ? Math.round(profitNet / capitalInvesti * 1000) / 10 : 0
  const rendementAnnualise = capitalInvesti > 0 && dur > 0 ? Math.round((Math.pow(1 + profitNet / capitalInvesti, 1 / dur) - 1) * 1000) / 10 : 0

  const hasRevente = prixReventeBrut > 0

  function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }

  function Row({ label, value, rouge = false, bold = false, tiret = false, info = '', vert = false }: any) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>
        <span style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {info && <span title={info} style={{ cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</span>}
        </span>
        <span style={{ fontSize: '14px', fontWeight: bold ? 700 : 500, color: tiret ? '#c0b0a0' : rouge ? '#c0392b' : vert ? '#1a7a40' : '#1a1210' }}>
          {tiret ? '-' : value}
        </span>
      </div>
    )
  }

  function SectionLabel({ label }: { label: string }) {
    return <div style={{ fontSize: '11px', fontWeight: 700, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '20px', marginBottom: '8px', paddingBottom: '6px', borderBottom: '2px solid #f0ede8' }}>{label}</div>
  }

  return (
    <div style={{ background: highlight ? '#fff8f0' : '#fff', border: highlight ? '2px solid #f0d090' : '1.5px solid #ede8e0', borderRadius: '14px', padding: '20px 24px', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: '#1a1210' }}>{titre}</div>

      {/* === PARTIE LOCATIVE (annuelle) === */}
      {hasLoyer && !isTravauxLourds && (
        <>
          <SectionLabel label="Revenus locatifs (annuel)" />
          <Row label="Loyer brut annuel" value={`${fmt(loyerAnnuel)} \u20AC`} />
          <Row label="Charges recup. annuelles" value={type_loyer === 'CC' ? `-${fmt(chargesRecAnn)} \u20AC` : `+${fmt(chargesRecAnn)} \u20AC`} />
          <Row label="Charges copro" value={`-${fmt(chargesCoproAnn)} \u20AC`} rouge />
          <Row label="Taxe fonciere" value={`-${fmt(taxeFoncAnn)} \u20AC`} rouge />
          <Row label="Interets emprunt" value={`-${fmt(interetsAnn)} \u20AC`} rouge />
          <Row label="Assurance emprunteur" value={`-${fmt(assuranceAnn)} \u20AC`} rouge />
          <Row label="Amortissement" value={`-${fmt(amort)} \u20AC`} rouge tiret={!hasAmort} info={regime === 'marchand_de_biens' ? "Pas d'amortissement en MdB : les biens sont du stock (actif circulant), pas des immobilisations" : "Amortissement fiscal uniquement en LMNP et SCI IS"} />
          <Row label="Resultat imposable" value={`${fmt(revenuImposable)} \u20AC`} bold />
          <Row label="Impot" value={`-${fmt(impot)} \u20AC`} rouge bold />
          <div style={{ marginTop: '12px', background: cashflowNetMensuel >= 0 ? '#d4f5e0' : '#fde8e8', borderRadius: '10px', padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: '#9a8a80', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cashflow net</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 800, color: cashflowNetMensuel >= 0 ? '#1a7a40' : '#c0392b' }}>
                {cashflowNetMensuel >= 0 ? '+' : ''}{fmt(cashflowNetMensuel)} {'\u20AC'}/mois
              </span>
              <span style={{ fontSize: '13px', color: cashflowNetAnnuel >= 0 ? '#1a7a40' : '#c0392b', fontWeight: 600 }}>
                {cashflowNetAnnuel >= 0 ? '+' : ''}{fmt(cashflowNetAnnuel)} {'\u20AC'}/an
              </span>
            </div>
          </div>
        </>
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
          <Row label={budgetTravaux > 0 ? `Travaux (score ${scoreUtilise})` : 'Travaux'} value={budgetTravaux > 0 ? `-${fmt(budgetTravaux)} \u20AC` : `0 \u20AC`} rouge={budgetTravaux > 0} />
          <Row label="Plus-value brute" value={`${pvBrute > 0 ? '+' : ''}${fmt(pvBrute)} \u20AC`} bold vert={pvBrute > 0} rouge={pvBrute <= 0} />

          {/* Fiscalite PV */}
          {(regime === 'micro_foncier' || regime === 'reel' || regime === 'lmnp') && (
            <>
              <Row label="IR sur PV (19%)" value={`-${fmt(Math.round(irPV))} \u20AC`} rouge />
              <Row label={`Pr\u00e9l. sociaux (17.2%)`} value={`-${fmt(Math.round(psPV))} \u20AC`} rouge />
              {regime === 'lmnp' && <Row label={`R\u00e9int\u00e9gration amortissements`} value="" info="Amortissements d\u00e9duits r\u00e9int\u00e9gr\u00e9s dans la base imposable (r\u00e9forme 2025)" tiret />}
            </>
          )}
          {regime === 'sci_is' && (
            <Row label="IS sur PV (15% / 25%)" value={`-${fmt(Math.round(isPV))} \u20AC`} rouge info="PV reste dans la SCI, pas de flat tax sur dividendes" />
          )}
          {regime === 'marchand_de_biens' && (
            <>
              <Row label="TVA sur marge (20%)" value={`-${fmt(Math.round(tvaMarge))} \u20AC`} rouge />
              <Row label="IS sur b{'\u00e9'}n{'\u00e9'}fice (15% / 25%)" value={`-${fmt(Math.round(isPV))} \u20AC`} rouge />
            </>
          )}
          <Row label="Plus-value nette" value={`${pvNette >= 0 ? '+' : ''}${fmt(pvNette)} \u20AC`} bold vert={pvNette >= 0} rouge={pvNette < 0} />

          {/* BILAN FINAL */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', background: profitNet >= 0 ? '#d4f5e0' : '#fde8e8', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#9a8a80', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {`Bilan sur ${dur} an${dur > 1 ? 's' : ''}`}
            </div>
            {cashflowCumule !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: '#555' }}>Cashflow locatif net cumul{'\u00e9'}</span>
                <span style={{ fontWeight: 600, color: cashflowCumule >= 0 ? '#1a7a40' : '#c0392b' }}>{cashflowCumule >= 0 ? '+' : ''}{fmt(cashflowCumule)} {'\u20AC'}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
              <span style={{ color: '#555' }}>Plus-value nette</span>
              <span style={{ fontWeight: 600, color: pvNette >= 0 ? '#1a7a40' : '#c0392b' }}>{pvNette >= 0 ? '+' : ''}{fmt(pvNette)} {'\u20AC'}</span>
            </div>
            <div style={{ borderTop: '2px solid rgba(0,0,0,0.1)', paddingTop: '8px' }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 800, color: profitNet >= 0 ? '#1a7a40' : '#c0392b', marginBottom: '4px' }}>
                {profitNet >= 0 ? '+' : ''}{fmt(profitNet)} {'\u20AC'}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: profitNet >= 0 ? '#1a7a40' : '#c0392b' }}>
                <span>Rdt total : {rendementTotal > 0 ? '+' : ''}{rendementTotal}%</span>
                <span>Rdt annualis{'\u00e9'} : {rendementAnnualise > 0 ? '+' : ''}{rendementAnnualise}%/an</span>
              </div>
            </div>
          </div>
        </>
      )}
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

    msg += `Investisseur, je me permets de vous contacter au sujet de votre ${typeBien} \u00e0 ${localisation} affich\u00e9 \u00e0 ${prixFmt} euros.\n\n`
    msg += `J'\u00e9tudie ce bien dans le cadre d'un projet de r\u00e9novation et j'aurais besoin de quelques \u00e9l\u00e9ments pour chiffrer les travaux et finaliser mon analyse.\n\n`
  } else {
    // --- Strat\u00e9gie Locataire en place ---
    if (!bien.loyer) manquants.push("le montant du loyer actuel (hors charges)")
    if (!bien.charges_copro) manquants.push("les charges de copropri\u00e9t\u00e9")
    if (!bien.taxe_fonc_ann) manquants.push("la taxe fonci\u00e8re annuelle")
    if (!bien.charges_rec) manquants.push("les charges r\u00e9cup\u00e9rables")
    if (!bien.adresse) manquants.push("l'adresse exacte du bien")
    manquants.push("les travaux vot\u00e9s ou \u00e0 pr\u00e9voir dans la copropri\u00e9t\u00e9, et si oui le montant chiffr\u00e9")

    msg += `Investisseur locatif, je me permets de vous contacter au sujet de votre ${typeBien} \u00e0 ${localisation} affich\u00e9 \u00e0 ${prixFmt} euros.\n\n`
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
  const match = url.match(/\/(\d+)\/?$/)
  return match ? `https://www.leboncoin.fr/reply/${match[1]}` : url
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
    brouillon: { bg: '#f0ede8', color: '#9a8a80', label: 'Brouillon' },
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
        <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#9a8a80' }}>x</button>
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
          {copied ? 'Message copi\u00e9 ! Collez-le dans Leboncoin' : 'Copier et contacter sur Leboncoin'}
        </button>

        {userToken && (
          <>
            <button onClick={handleSaveDraft} style={{
              padding: '10px 20px', borderRadius: '10px',
              border: '1.5px solid #e8e2d8', background: '#fff',
              fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 500,
              color: '#9a8a80', cursor: 'pointer'
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
        {"Le bouton copie le message et ouvre directement la page de contact Leboncoin. Il ne reste plus qu'\u00e0 coller le message et envoyer."}
      </p>
      {!userToken && <p style={{ fontSize: '12px', color: '#b0a898', marginTop: '6px', fontStyle: 'italic' }}>Connectez-vous pour sauvegarder le message et suivre son statut</p>}
    </div>
  )
}

function EstimationSection({ bienId, prixFai, onEstimationLoaded }: { bienId: string, prixFai: number, onEstimationLoaded?: (est: any) => void }) {
  const [estimation, setEstimation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  useEffect(() => {
    loadEstimation()
  }, [bienId])

  function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }

  const confianceColors: Record<string, { bg: string, color: string }> = {
    A: { bg: '#d4f5e0', color: '#1a7a40' },
    B: { bg: '#d4ddf5', color: '#2a4a8a' },
    C: { bg: '#fff8f0', color: '#a06010' },
    D: { bg: '#fde8e8', color: '#c0392b' },
  }

  if (loading) {
    return (
      <div className="section">
        <h2 className="section-title">{"Estimation march\u00e9 DVF"}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#9a8a80', fontSize: '13px' }}>
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
        <h2 className="section-title">{"Estimation march\u00e9 DVF"}</h2>
        <div className="nc-warning">{error || "Estimation impossible \u2014 donn\u00e9es insuffisantes ou pas de transactions comparables"}</div>
      </div>
    )
  }

  const ecart = estimation.ecart_prix_fai_pct
  const ecartPositif = ecart > 0
  const conf = confianceColors[estimation.confiance] || confianceColors.D
  const prixFaiPos = prixFai ? Math.max(0, Math.min(100, (prixFai - estimation.prix_bas) / (estimation.prix_haut - estimation.prix_bas) * 100)) : 50

  return (
    <div className="section">
      <h2 className="section-title">{"Estimation march\u00e9 DVF"}</h2>

      {/* --- Bloc principal : 3 colonnes --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0', marginBottom: '24px' }}>

        {/* Colonne gauche : Prix FAI */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Prix demand{'\u00E9'}</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 800, color: '#1a1210' }}>{fmt(prixFai)} {'\u20AC'}</div>
        </div>

        {/* Colonne centrale : Ecart */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1.5px solid #f0ede8', borderRight: '1.5px solid #f0ede8' }}>
          <div style={{
            padding: '10px 20px', borderRadius: '12px',
            background: ecartPositif ? '#fde8e8' : '#d4f5e0',
          }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 800, color: ecartPositif ? '#c0392b' : '#1a7a40', textAlign: 'center' }}>
              {ecart > 0 ? '+' : ''}{ecart}%
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#9a8a80', marginTop: '6px', textAlign: 'center' }}>
            {ecartPositif ? 'Au-dessus du march\u00e9' : 'En dessous du march\u00e9'}
          </div>
        </div>

        {/* Colonne droite : Estimation */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            {"Estimation march\u00e9"}
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: '26px', fontWeight: 800, color: ecartPositif ? '#1a7a40' : '#1a1210' }}>{fmt(estimation.prix_total)} {'\u20AC'}</div>
          <div style={{ fontSize: '12px', color: '#9a8a80', marginTop: '4px' }}>{fmt(estimation.prix_m2_corrige)} {'\u20AC'}/m{'\u00B2'}</div>
        </div>
      </div>

      {/* --- Fourchette de prix --- */}
      <div style={{ background: '#faf8f5', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#9a8a80' }}>Fourchette</span>
          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: conf.bg, color: conf.color }}>
            Confiance {estimation.confiance} ({'\u00B1'}{estimation.marge_pct}%)
          </span>
        </div>
        <div style={{ position: 'relative', height: '10px', background: '#e8e2d8', borderRadius: '5px', marginBottom: '4px' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: '5px', background: 'linear-gradient(90deg, #d4f5e0, #fff8f0, #fde8e8)', width: '100%' }} />
          {/* Marqueur estimation (centre) */}
          <div style={{
            position: 'absolute', top: '-3px', left: '50%', transform: 'translateX(-50%)',
            width: '3px', height: '16px', borderRadius: '2px', background: '#1a1210'
          }} />
          {/* Marqueur prix FAI */}
          <div style={{
            position: 'absolute', top: '-5px',
            left: `${prixFaiPos}%`, transform: 'translateX(-50%)',
            width: '20px', height: '20px', borderRadius: '50%',
            background: ecartPositif ? '#c0392b' : '#1a7a40',
            border: '3px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#b0a898', marginTop: '6px' }}>
          <span>{fmt(estimation.prix_bas)} {'\u20AC'}</span>
          <span style={{ color: '#9a8a80', fontWeight: 500 }}>{fmt(estimation.prix_total)} {'\u20AC'}</span>
          <span>{fmt(estimation.prix_haut)} {'\u20AC'}</span>
        </div>
      </div>

      {/* --- Correcteurs + meta --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        {estimation.corrections && estimation.corrections.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9a8a80', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{"Correcteurs appliqu\u00E9s"}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {estimation.corrections.map((c: any, i: number) => (
                <span key={i} style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                  background: c.multiplicateur >= 1 ? '#d4f5e0' : '#fde8e8',
                  color: c.multiplicateur >= 1 ? '#1a7a40' : '#c0392b'
                }} title={c.raison}>
                  {c.facteur} {c.multiplicateur >= 1 ? '+' : ''}{Math.round((c.multiplicateur - 1) * 100)}%
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontSize: '11px', color: '#b0a898', textAlign: 'right' }}>
          <div>{estimation.nb_comparables} transactions comparables</div>
          <div>Rayon : {estimation.rayon_m}m</div>
          <div style={{ marginTop: '4px', fontStyle: 'italic' }}>Source : DVF (donn{'\u00E9'}es notariales)</div>
          <button
            onClick={() => loadEstimation(true)}
            disabled={loading}
            style={{ marginTop: '8px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: '#9a8a80', background: '#f5f2ed', border: '1px solid #e8e2d8', borderRadius: '6px', cursor: 'pointer' }}
          >
            {loading ? 'Recalcul...' : 'Recalculer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FicheBienPage() {
  const params = useParams()
  const id = params.id as string
  const [bien, setBien] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profil, setProfil] = useState<any>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [champsStatut, setChampsStatut] = useState<Record<string, { valeur: string, statut: 'jaune' | 'vert' }>>({})
  const [scorePerso, setScorePerso] = useState<number | null>(null)

  const [baseCalc, setBaseCalc] = useState<'fai' | 'cible'>('fai')
  const [apport, setApport] = useState(20000)
  const [taux, setTaux] = useState(3.5)
  const [tauxAssurance, setTauxAssurance] = useState(0.3)
  const [duree, setDuree] = useState(20)
  const [fraisNotaire, setFraisNotaire] = useState(7.5)
  const [tmi, setTmi] = useState(30)
  const [regime, setRegime] = useState('micro_foncier')
  const [objectifCashflow, setObjectifCashflow] = useState(0)
  const [regime2, setRegime2] = useState('reel')
  const [budgetTravauxM2, setBudgetTravauxM2] = useState<Record<string, number>>({ '1': 200, '2': 500, '3': 800, '4': 1200, '5': 1800 })
  const [estimationData, setEstimationData] = useState<any>(null)
  const [dureeRevente, setDureeRevente] = useState<number>(5)
  const [fraisAgenceRevente, setFraisAgenceRevente] = useState<number>(5)

  useEffect(() => {
    async function load() {
      const [bienRes, editsRes, sessionRes] = await Promise.all([
        fetch(`/api/biens/${id}`),
        fetch(`/api/biens/${id}/edits`),
        supabase.auth.getSession()
      ])
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
          if (p.apport) setApport(p.apport)
          if (p.taux_credit) setTaux(p.taux_credit)
          if (p.taux_assurance != null) setTauxAssurance(p.taux_assurance)
          if (p.duree_ans) setDuree(p.duree_ans)
          if (p.frais_notaire) setFraisNotaire(p.frais_notaire)
          if (p.tmi) setTmi(p.tmi)
          if (p.regime) setRegime(p.regime)
          if (p.objectif_cashflow != null) setObjectifCashflow(p.objectif_cashflow)
          if (p.budget_travaux_m2) setBudgetTravauxM2(p.budget_travaux_m2)
        }
        // Charger le score perso depuis la watchlist
        const wRes = await fetch('/api/watchlist', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const wData = await wRes.json()
        const wItem = (wData.watchlist || []).find((w: any) => String(w.bien_id) === String(id))
        if (wItem?.score_travaux_perso) setScorePerso(wItem.score_travaux_perso)
      }
      setLoading(false)
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

  async function handleContactUpdate(statut: string, message: string) {
    if (!userToken) return
    await fetch(`/api/biens/${id}/contact`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ message_contact: message, message_statut: statut })
    })
    setBien((prev: any) => ({ ...prev, message_contact: message, message_statut: statut, message_date: new Date().toISOString() }))
  }

  if (loading) return <Layout><p style={{ textAlign: 'center', padding: '80px', color: '#9a8a80' }}>Chargement...</p></Layout>
  if (!bien) return <Layout><p style={{ textAlign: 'center', padding: '80px', color: '#9a8a80' }}>Bien introuvable</p></Layout>

  const peutCalculer = bien.loyer && bien.prix_fai
  const isTravauxLourds = bien.strategie_mdb === 'Travaux lourds'

  const resultatFAI = peutCalculer ? calculerCashflow(
    { prix_fai: bien.prix_fai, loyer: bien.loyer, type_loyer: bien.type_loyer, charges_rec: bien.charges_rec || 0, charges_copro: bien.charges_copro || 0, taxe_fonc_ann: bien.taxe_fonc_ann || 0, surface: bien.surface },
    { apport, tauxCredit: taux, tauxAssurance, dureeAns: duree, fraisNotaire, objectifCashflow },
    { tmi, regime: regime as any }
  ) : null

  const prixBase = baseCalc === 'fai' ? bien.prix_fai : (resultatFAI?.prix_cible || bien.prix_fai)
  const montantProjet = prixBase * (1 + fraisNotaire / 100)
  const montantEmprunte = Math.max(0, montantProjet - apport)
  const apportPct = montantProjet > 0 ? Math.round(apport / montantProjet * 1000) / 10 : 0
  const ecartPct = resultatFAI ? ((resultatFAI.prix_cible - bien.prix_fai) / bien.prix_fai * 100).toFixed(1) : null
  const ecartNegatif = Number(ecartPct) <= 0

  const mensualiteCredit = calculerMensualite(montantEmprunte, taux, duree)
  const mensualiteAss = montantEmprunte * (tauxAssurance / 100) / 12
  const mensualiteTotale = mensualiteCredit + mensualiteAss

  const chargesRec = bien.charges_rec || 0
  const chargesCoproMens = (bien.charges_copro || 0) / 12
  const taxeFoncMens = (bien.taxe_fonc_ann || 0) / 12
  const loyerNet = bien.type_loyer === 'CC'
    ? bien.loyer - chargesRec - chargesCoproMens - taxeFoncMens
    : bien.loyer + chargesRec - chargesCoproMens - taxeFoncMens
  const cashflowBrut = loyerNet - mensualiteTotale

  function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }
  const financement = { montantEmprunte, tauxCredit: taux, tauxAssurance, dureeAns: duree }

  return (
    <Layout>
      <style>{`
        .fiche-wrap { max-width: 1200px; margin: 0 auto; padding: 40px 48px; }
        .back-link { display: inline-block; margin-bottom: 24px; font-size: 13px; color: #9a8a80; text-decoration: none; }
        .back-link:hover { color: #1a1210; }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
        .fiche-photo { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 16px; }
        .fiche-photo-empty { width: 100%; aspect-ratio: 16/9; border-radius: 16px; background: #ede8e0; display: flex; align-items: center; justify-content: center; color: #b0a898; }
        .fiche-info { display: flex; flex-direction: column; gap: 14px; }
        .fiche-title { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 800; color: #1a1210; }
        .fiche-sub { font-size: 14px; color: #9a8a80; margin-top: -8px; }
        .fiche-tags { display: flex; gap: 8px; flex-wrap: wrap; }
        .tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #f0ede8; color: #9a8a80; }
        .tag-strat { background: #d4ddf5; color: #2a4a8a; }
        .tag-statut { background: #d4f5e0; color: #1a7a40; }
        .prix-bloc { display: flex; flex-direction: column; gap: 3px; }
        .prix-label { font-size: 11px; font-weight: 600; color: #9a8a80; text-transform: uppercase; letter-spacing: 0.06em; }
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
        .data-item { display: flex; flex-direction: column; gap: 6px; }
        .data-label { font-size: 11px; font-weight: 600; color: #9a8a80; text-transform: uppercase; letter-spacing: 0.06em; }
        .data-value { font-size: 14px; font-weight: 600; color: #1a1210; }
        .data-value.nc { color: #c0b0a0; font-style: italic; font-weight: 400; font-size: 13px; }
        .simu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .param-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 16px; }
        .param-label { font-size: 11px; font-weight: 600; color: #9a8a80; text-transform: uppercase; letter-spacing: 0.06em; }
        .param-input { padding: 9px 13px; border-radius: 9px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; background: #faf8f5; color: #1a1210; outline: none; width: 100%; box-sizing: border-box; }
        .param-input:focus { border-color: #c0392b; }
        .param-hint { font-size: 11px; color: #b0a898; }
        .toggle-row { display: flex; gap: 8px; }
        .toggle-btn { flex: 1; padding: 8px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; background: #faf8f5; color: #9a8a80; transition: all 0.15s; }
        .toggle-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .slider-wrap { padding: 4px 0; }
        .slider { width: 100%; accent-color: #c0392b; cursor: pointer; }
        .slider-labels { display: flex; justify-content: space-between; font-size: 11px; color: #b0a898; margin-top: 2px; }
        .results-table { width: 100%; border-collapse: collapse; }
        .results-table thead th { font-size: 11px; font-weight: 600; color: #9a8a80; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 12px; text-align: right; border-bottom: 2px solid #f0ede8; }
        .results-table thead th:first-child { text-align: left; }
        .results-table tbody tr { border-bottom: 1px solid #f0ede8; }
        .results-table tbody td { padding: 10px 12px; font-size: 14px; text-align: right; }
        .results-table tbody td:first-child { text-align: left; color: #555; font-size: 13px; }
        .results-total td { font-weight: 700; background: #f7f4f0; }
        .cashflow-row td:not(:first-child) { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 800; }
        .pnl-grid { display: flex; gap: 20px; align-items: stretch; }
        .nc-warning { background: #fff8f0; border: 1.5px solid #f0d090; border-radius: 12px; padding: 16px 20px; color: #a06010; font-size: 13px; }
        .profil-bar { background: #f7f4f0; border-radius: 10px; padding: 10px 16px; font-size: 12px; color: #9a8a80; margin-top: 16px; }
        .legende { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
        .legende-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #9a8a80; }
        .legende-dot { width: 10px; height: 10px; border-radius: 50%; }
      `}</style>

      <div className="fiche-wrap">
        <a href="/biens" className="back-link">Retour aux biens</a>

        <div className="hero-grid">
          <div>
            {bien.photo_url ? <img src={bien.photo_url} alt="" className="fiche-photo" /> : <div className="fiche-photo-empty">Pas de photo</div>}
          </div>
          <div className="fiche-info">
            <h1 className="fiche-title">{bien.type_bien} {bien.nb_pieces} - {bien.surface} m2</h1>
            <p className="fiche-sub">{bien.quartier ? `${bien.quartier} - ` : ''}{bien.ville} - {bien.metropole}</p>
            <div className="fiche-tags">
              {bien.strategie_mdb && <span className="tag tag-strat">{bien.strategie_mdb}</span>}
              {bien.statut && <span className="tag tag-statut">{bien.statut}</span>}
              {bien.prix_m2 && <span className="tag">{fmt(bien.prix_m2)} €/m2</span>}
            </div>
            <div className="prix-bloc">
              <span className="prix-label">Prix FAI</span>
              <span className="prix-fai">{fmt(bien.prix_fai)} €</span>
              {resultatFAI && (
                <>
                  {ecartNegatif ? (
                    <>
                      <span className="prix-label" style={{ marginTop: '10px' }}>Prix cible</span>
                      <span className="prix-cible-val">{fmt(resultatFAI.prix_cible)} €</span>
                      <span className="ecart-badge ecart-neg">{ecartPct} %</span>
                    </>
                  ) : (
                    <div style={{ marginTop: '10px', background: '#d4f5e0', borderRadius: '12px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#1a7a40', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Bien avec cashflow positif</div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 800, color: '#1a7a40' }}>+{fmt(cashflowBrut)} €/mois</div>
                    </div>
                  )}
                </>
              )}
            </div>
            {bien.url && <a href={bien.url} target="_blank" rel="noopener noreferrer" className="lbc-btn">Voir sur Leboncoin</a>}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">{"Caract\u00e9ristiques du bien"}</h2>
          <div className="data-grid">
            <div className="data-item">
              <span className="data-label">{`Ann\u00e9e de construction`}</span>
              <span className={`data-value ${!bien.annee_construction ? 'nc' : ''}`}>{bien.annee_construction || 'NC'}</span>
            </div>
            <div className="data-item">
              <span className="data-label">DPE</span>
              {bien.dpe ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '8px', fontWeight: 700, fontSize: '16px', color: '#fff',
                  background: { A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0e034', E: '#f0a830', F: '#eb6a2a', G: '#e42a1e' }[bien.dpe] || '#9a8a80'
                }}>{bien.dpe}</span>
              ) : <span className="data-value nc">NC</span>}
            </div>
            <div className="data-item">
              <span className="data-label">Surface</span>
              <span className="data-value">{bien.surface ? `${bien.surface} m\u00b2` : 'NC'}</span>
            </div>
            {(bien.type_bien || '').toLowerCase().includes('maison') && (
              <div className="data-item">
                <span className="data-label">Terrain</span>
                <span className={`data-value ${!bien.surface_terrain ? 'nc' : ''}`}>{bien.surface_terrain ? `${bien.surface_terrain} m\u00b2` : 'NC'}</span>
              </div>
            )}
            <div className="data-item">
              <span className="data-label">{`Pi\u00e8ces`}</span>
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
              <span className="data-label">{`\u00c9tage`}</span>
              <span className={`data-value ${!bien.etage ? 'nc' : ''}`}>{bien.etage || 'NC'}</span>
            </div>
            <div className="data-item">
              <span className="data-label">Chauffage</span>
              <span className={`data-value ${!bien.type_chauffage ? 'nc' : ''}`}>{[bien.type_chauffage, bien.mode_chauffage].filter(Boolean).join(' / ') || 'NC'}</span>
            </div>
          </div>
        </div>

        <EstimationSection bienId={id} prixFai={bien.prix_fai} onEstimationLoaded={setEstimationData} />

        {bien.strategie_mdb === 'Travaux lourds' ? (
          <div className="section">
            <h2 className="section-title">Diagnostic travaux</h2>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span className="data-label" style={{ margin: 0, minWidth: '110px' }}>Score IA</span>
                <div style={{ display: 'flex', gap: '4px' }}>
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
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210' }}>{bien.score_travaux ? `${bien.score_travaux}/5` : 'NC'}</span>
              </div>
              {bien.score_commentaire && (
                <div style={{ background: '#faf8f5', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#555', lineHeight: '1.5', fontStyle: 'italic', marginBottom: '12px' }}>
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
                  {scorePerso && scorePerso !== bien.score_travaux && <span style={{ fontSize: '11px', color: '#b0a898', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleScorePerso(scorePerso)}>{"R\u00e9initialiser au score IA"}</span>}
                </div>
              )}
            </div>
            {(() => {
              const scoreUtilise = scorePerso || bien.score_travaux
              if (!scoreUtilise || !bien.surface) return null
              const budgetM2 = budgetTravauxM2[String(scoreUtilise)] || 0
              const total = Math.round(budgetM2 * bien.surface)
              return (
                <div style={{ background: '#fff8f0', border: '1.5px solid #f0d090', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#a06010', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{"Estimation budget travaux"}</div>
                      <div style={{ fontSize: '13px', color: '#9a8a80' }}>
                        {`${budgetM2} \u20AC/m\u00b2 \u00d7 ${bien.surface} m\u00b2 (${scorePerso ? 'mon estimation' : 'score IA'} ${scoreUtilise}/5)`}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: '24px', fontWeight: 800, color: '#a06010' }}>
                      {total.toLocaleString('fr-FR')} {'\u20AC'}
                    </div>
                  </div>
                </div>
              )
            })()}
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">{`Taxe fonci\u00e8re`}</span>
                <CellEditable bien={bien} champ="taxe_fonc_ann" suffix={` \u20AC/an`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
              </div>
              {!(bien.type_bien || '').toLowerCase().includes('maison') && (
                <div className="data-item">
                  <span className="data-label">Charges copro</span>
                  <CellEditable bien={bien} champ="charges_copro" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
                </div>
              )}
              <div className="data-item">
                <span className="data-label">{`Budget \u00e9nergie`}</span>
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
              <div className="legende-item"><div className="legende-dot" style={{ background: '#f0c040' }}></div>{`Renseign\u00e9 par 1 utilisateur \u2014 modifiable`}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#1a7a40' }}></div>{`Valid\u00e9 par 2+ utilisateurs \u2014 clic droit pour modifier`}</div>
            </div>
            {!userToken && <p style={{ fontSize: '12px', color: '#b0a898', marginTop: '12px', fontStyle: 'italic' }}>{`Connectez-vous pour compl\u00e9ter les donn\u00e9es manquantes`}</p>}
          </div>
        ) : (
          <div className="section">
            <h2 className="section-title">{"Donn\u00e9es locatives"}</h2>
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
                <span className="data-label">{`Charges r\u00e9cup.`}</span>
                <CellEditable bien={bien} champ="charges_rec" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
              </div>
              <div className="data-item">
                <span className="data-label">Charges copro</span>
                <CellEditable bien={bien} champ="charges_copro" suffix={` \u20AC/mois`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
              </div>
              <div className="data-item">
                <span className="data-label">{`Taxe fonci\u00e8re`}</span>
                <CellEditable bien={bien} champ="taxe_fonc_ann" suffix={` \u20AC/an`} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
              </div>
              <div className="data-item">
                <span className="data-label">Profil locataire</span>
                <span className={`data-value ${!bien.profil_locataire ? 'nc' : ''}`}>{bien.profil_locataire || 'NC'}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Fin de bail</span>
                <span className={`data-value ${!bien.fin_bail ? 'nc' : ''}`}>{bien.fin_bail || 'NC'}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Rendement brut</span>
                <span className="data-value" style={{ color: '#c0392b' }}>{bien.rendement_brut ? `${(bien.rendement_brut * 100).toFixed(2)} %` : 'NC'}</span>
              </div>
            </div>
            <div className="legende">
              <div className="legende-item"><div className="legende-dot" style={{ background: '#f0c040' }}></div>{`Renseign\u00e9 par 1 utilisateur \u2014 modifiable`}</div>
              <div className="legende-item"><div className="legende-dot" style={{ background: '#1a7a40' }}></div>{`Valid\u00e9 par 2+ utilisateurs \u2014 clic droit pour modifier`}</div>
            </div>
            {!userToken && <p style={{ fontSize: '12px', color: '#b0a898', marginTop: '12px', fontStyle: 'italic' }}>{`Connectez-vous pour compl\u00e9ter les donn\u00e9es manquantes`}</p>}
          </div>
        )}

        <div id="contact" className="section">
          <h2 className="section-title">{"R\u00e9cup\u00e9rer les donn\u00e9es manquantes"}</h2>
          <ContactVendeur bien={bien} userToken={userToken} onStatusUpdate={handleContactUpdate} />
        </div>

        {!peutCalculer && !isTravauxLourds && (
          <div className="section"><div className="nc-warning">Le loyer ou le prix est manquant — impossible de calculer.</div></div>
        )}
        {peutCalculer && (
          <>
            <div className="section">
              <h2 className="section-title">Simulateur de financement</h2>
              <div className="simu-grid">
                <div>
                  <div className="param-group">
                    <label className="param-label">Base de calcul</label>
                    <div className="toggle-row">
                      <button className={`toggle-btn ${baseCalc === 'fai' ? 'active' : ''}`} onClick={() => setBaseCalc('fai')}>Prix FAI</button>
                      <button className={`toggle-btn ${baseCalc === 'cible' ? 'active' : ''}`} onClick={() => setBaseCalc('cible')}>Prix cible</button>
                    </div>
                  </div>
                  <div className="param-group">
                    <label className="param-label">Montant du projet (frais notaire inclus)</label>
                    <input className="param-input" type="number" value={Math.round(montantProjet)} readOnly style={{ background: '#f0ede8', color: '#9a8a80' }} />
                    <span className="param-hint">Base : {fmt(prixBase)} € + {fraisNotaire}% notaire</span>
                  </div>
                  <div className="param-group">
                    <label className="param-label">Apport — {apportPct} % du projet ({fmt(apport)} €)</label>
                    <div className="slider-wrap">
                      <input type="range" className="slider" min={0} max={100} step={0.5} value={apportPct}
                        onChange={e => { const pct = Number(e.target.value); setApport(Math.round(montantProjet * pct / 100)) }} />
                      <div className="slider-labels"><span>0 %</span><span>100 %</span></div>
                    </div>
                    <input className="param-input" type="number" value={apport} onChange={e => setApport(Number(e.target.value))} placeholder="Montant en €" />
                    <span className="param-hint">Montant emprunte : {fmt(montantEmprunte)} €</span>
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
                      <tr>
                        <td>Mensualite credit</td>
                        <td style={{ color: '#c0392b', fontWeight: 600 }}>{fmt(mensualiteCredit)} €</td>
                        <td style={{ color: '#c0392b' }}>{fmt(mensualiteCredit * 12)} €</td>
                      </tr>
                      <tr>
                        <td>Mensualite assurance</td>
                        <td style={{ color: '#c0392b', fontWeight: 600 }}>{fmt(mensualiteAss)} €</td>
                        <td style={{ color: '#c0392b' }}>{fmt(mensualiteAss * 12)} €</td>
                      </tr>
                      <tr className="results-total">
                        <td>Total mensualite</td>
                        <td style={{ color: '#c0392b', fontWeight: 700 }}>{fmt(mensualiteTotale)} €</td>
                        <td style={{ color: '#c0392b', fontWeight: 600 }}>{fmt(mensualiteTotale * 12)} €</td>
                      </tr>
                      <tr style={{ height: '12px' }}><td colSpan={3}></td></tr>
                      <tr className="cashflow-row">
                        <td style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600 }}>Cashflow brut</td>
                        <td style={{ color: cashflowBrut >= 0 ? '#1a7a40' : '#c0392b' }}>{cashflowBrut >= 0 ? '+' : ''}{fmt(cashflowBrut)} €</td>
                        <td style={{ color: cashflowBrut >= 0 ? '#1a7a40' : '#c0392b', fontSize: '16px' }}>{cashflowBrut >= 0 ? '+' : ''}{fmt(cashflowBrut * 12)} €</td>
                      </tr>
                    </tbody>
                  </table>
                  {profil && <div className="profil-bar">Parametres pre-remplis depuis votre profil — modifiables dans Mon profil</div>}
                </div>
              </div>
            </div>

          </>
        )}

        {bien.prix_fai && (
          <div className="section">
            <h2 className="section-title">{`Analyse fiscale & sc\u00e9nario revente`}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#9a8a80' }}>Comparer avec :</span>
                <select className="param-input" style={{ width: 'auto' }} value={regime2} onChange={e => setRegime2(e.target.value)}>
                  {REGIMES.filter(r => r.value !== regime).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#9a8a80' }}>{`D\u00e9tention :`}</span>
                {[1, 2, 3, 4, 5].map(d => (
                  <button key={d} onClick={() => setDureeRevente(d)} style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    border: dureeRevente === d ? '2px solid #c0392b' : '1.5px solid #e8e2d8',
                    background: dureeRevente === d ? '#fde8e8' : '#faf8f5',
                    color: dureeRevente === d ? '#c0392b' : '#9a8a80',
                  }}>
                    {d} an{d > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#9a8a80' }}>Frais agence revente :</span>
                <input type="number" step="0.5" min="0" max="10" value={fraisAgenceRevente}
                  onChange={e => setFraisAgenceRevente(Number(e.target.value))}
                  className="param-input" style={{ width: '60px', textAlign: 'right' }} />
                <span style={{ fontSize: '12px', color: '#9a8a80' }}>%</span>
              </div>
            </div>
            <div className="pnl-grid">
              <PnlColonne titre={`${REGIMES.find(r => r.value === regime)?.label} (votre regime)`} bien={bien} financement={financement} tmi={tmi} regime={regime} highlight dureeRevente={dureeRevente} estimation={estimationData} budgetTravauxM2={budgetTravauxM2} scorePerso={scorePerso} fraisNotaire={fraisNotaire} apport={apport} fraisAgenceRevente={fraisAgenceRevente} />
              <PnlColonne titre={REGIMES.find(r => r.value === regime2)?.label} bien={bien} financement={financement} tmi={tmi} regime={regime2} dureeRevente={dureeRevente} estimation={estimationData} budgetTravauxM2={budgetTravauxM2} scorePerso={scorePerso} fraisNotaire={fraisNotaire} apport={apport} fraisAgenceRevente={fraisAgenceRevente} />
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}