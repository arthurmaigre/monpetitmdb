'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { calculerCashflow, calculerMensualite } from '@/lib/calculs'

const REGIMES = [
  { value: 'micro_foncier', label: 'Micro-foncier' },
  { value: 'reel', label: 'Reel' },
  { value: 'lmnp', label: 'LMNP' },
  { value: 'sci_is', label: 'SCI IS' },
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

  // Pas de donnée
  if (valeur === null || valeur === undefined) {
    if (!userToken) return <span style={{ color: '#c0b0a0', fontStyle: 'italic', fontSize: '13px' }}>NC</span>
    return (
      <input type="number" defaultValue="" placeholder="NC"
        style={{ width: '90px', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: '#faf8f5', outline: 'none' }}
        onBlur={e => { if (e.target.value) onUpdate(champ, Number(e.target.value)) }}
        onFocus={e => e.target.style.borderColor = '#c0392b'} />
    )
  }

  // Donnée verte (validée) — non éditable sauf clic droit
  if (statut?.statut === 'vert' && !forceEdit) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <span
          onContextMenu={e => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setShowMenu(true) }}
          style={{ fontWeight: 600, color: '#1a7a40', cursor: 'context-menu', borderBottom: '2px solid #1a7a40', paddingBottom: '1px' }}
          title="Clic droit pour modifier">
          {valeur}{suffix}
        </span>
        {showMenu && (
          <div ref={menuRef} style={{ position: 'fixed', top: menuPos.y, left: menuPos.x, background: '#fff', border: '1.5px solid #e8e2d8', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '8px', zIndex: 1000, minWidth: '220px' }}>
            <div style={{ fontSize: '12px', color: '#9a8a80', padding: '6px 10px', borderBottom: '1px solid #f0ede8', marginBottom: '4px' }}>
              Valide par 2+ utilisateurs
            </div>
            <button
              onClick={() => { setShowMenu(false); if (window.confirm('Cette donnee a ete validee par plusieurs utilisateurs. Etes-vous sur de vouloir la modifier ?')) setForceEdit(true) }}
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

  // Donnée jaune (1 user) ou force edit — éditable
  if (statut?.statut === 'jaune' || forceEdit) {
    return (
      <input type="number" defaultValue={valeur || ''} placeholder="NC"
        style={{ width: '90px', padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${forceEdit ? '#c0392b' : '#f0c040'}`, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', background: forceEdit ? '#fff8f7' : '#fffdf0', outline: 'none' }}
        onBlur={e => { if (e.target.value && e.target.value !== String(valeur)) { onUpdate(champ, Number(e.target.value)); setForceEdit(false) } }}
        onFocus={e => e.target.style.borderColor = '#c0392b'} />
    )
  }

  // Donnée scrapée — lecture seule
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
        <span
          onContextMenu={e => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setShowMenu(true) }}
          style={{ fontWeight: 600, color: '#1a7a40', cursor: 'context-menu', borderBottom: '2px solid #1a7a40', paddingBottom: '1px' }}
          title="Clic droit pour modifier">
          {valeur}
        </span>
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

function PnlColonne({ titre, bien, financement, tmi, regime, highlight = false }: any) {
  const { prix_fai, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann } = bien
  const { montantEmprunte, tauxCredit, tauxAssurance, dureeAns } = financement

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
  } else if (regime === 'sci_is') {
    const chargesDeductibles = chargesCoproAnn + taxeFoncAnn + interetsAnn + assuranceAnn + amort
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

  function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }

  function Row({ label, value, rouge = false, bold = false, tiret = false, info = '' }: any) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>
        <span style={{ fontSize: '13px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {info && <span title={info} style={{ cursor: 'help', fontSize: '11px', color: '#b0a898', border: '1px solid #b0a898', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</span>}
        </span>
        <span style={{ fontSize: '14px', fontWeight: bold ? 700 : 500, color: tiret ? '#c0b0a0' : rouge ? '#c0392b' : '#1a1210' }}>
          {tiret ? '-' : value}
        </span>
      </div>
    )
  }

  return (
    <div style={{ background: highlight ? '#fff8f0' : '#fff', border: highlight ? '2px solid #f0d090' : '1.5px solid #ede8e0', borderRadius: '14px', padding: '20px 24px', flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: '#1a1210' }}>{titre}</div>
      <Row label="Loyer brut annuel" value={`${fmt(loyerAnnuel)} €`} />
      <Row label="Charges recup. annuelles" value={type_loyer === 'CC' ? `-${fmt(chargesRecAnn)} €` : `+${fmt(chargesRecAnn)} €`} />
      <Row label="Charges copro" value={`-${fmt(chargesCoproAnn)} €`} rouge />
      <Row label="Taxe fonciere" value={`-${fmt(taxeFoncAnn)} €`} rouge />
      <Row label="Interets emprunt" value={`-${fmt(interetsAnn)} €`} rouge />
      <Row label="Assurance emprunteur" value={`-${fmt(assuranceAnn)} €`} rouge />
      <Row label="Amortissement" value={`-${fmt(amort)} €`} rouge tiret={!hasAmort} info="L'amortissement fiscal est possible uniquement en LMNP et SCI IS" />
      <Row label="Resultat imposable" value={`${fmt(revenuImposable)} €`} bold />
      <Row label="Impot" value={`-${fmt(impot)} €`} rouge bold />
      <div style={{ marginTop: '12px', background: cashflowNetMensuel >= 0 ? '#d4f5e0' : '#fde8e8', borderRadius: '10px', padding: '12px 16px' }}>
        <div style={{ fontSize: '11px', color: '#9a8a80', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cashflow net</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', fontWeight: 800, color: cashflowNetMensuel >= 0 ? '#1a7a40' : '#c0392b' }}>
            {cashflowNetMensuel >= 0 ? '+' : ''}{fmt(cashflowNetMensuel)} €/mois
          </span>
          <span style={{ fontSize: '13px', color: cashflowNetAnnuel >= 0 ? '#1a7a40' : '#c0392b', fontWeight: 600 }}>
            {cashflowNetAnnuel >= 0 ? '+' : ''}{fmt(cashflowNetAnnuel)} €/an
          </span>
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
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

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
      // Recharger les statuts
      const editsRes = await fetch(`/api/biens/${id}/edits`)
      const editsData = await editsRes.json()
      setChampsStatut(editsData.champs || {})
    }
  }

  if (loading) return <Layout><p style={{ textAlign: 'center', padding: '80px', color: '#9a8a80' }}>Chargement...</p></Layout>
  if (!bien) return <Layout><p style={{ textAlign: 'center', padding: '80px', color: '#9a8a80' }}>Bien introuvable</p></Layout>

  const peutCalculer = bien.loyer && bien.prix_fai

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
        .pnl-grid { display: flex; gap: 20px; }
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
                  <span className="prix-label" style={{ marginTop: '10px' }}>Prix cible</span>
                  <span className="prix-cible-val">{fmt(resultatFAI.prix_cible)} €</span>
                  <span className={`ecart-badge ${ecartNegatif ? 'ecart-neg' : 'ecart-pos'}`}>
                    {Number(ecartPct) > 0 ? '+' : ''}{ecartPct} %
                  </span>
                </>
              )}
            </div>
            {bien.url && <a href={bien.url} target="_blank" rel="noopener noreferrer" className="lbc-btn">Voir sur Leboncoin</a>}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Informations du bien</h2>
          <div className="data-grid">
            <div className="data-item">
              <span className="data-label">Loyer</span>
              <CellEditable bien={bien} champ="loyer" suffix=" €/mois" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
            </div>
            <div className="data-item">
              <span className="data-label">Type loyer</span>
              <CellTypeLoyer bien={bien} userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
            </div>
            <div className="data-item">
              <span className="data-label">Charges rec.</span>
              <CellEditable bien={bien} champ="charges_rec" suffix=" €/mois" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
            </div>
            <div className="data-item">
              <span className="data-label">Charges copro</span>
              <CellEditable bien={bien} champ="charges_copro" suffix=" €/mois" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
            </div>
            <div className="data-item">
              <span className="data-label">Taxe fonciere</span>
              <CellEditable bien={bien} champ="taxe_fonc_ann" suffix=" €/an" userToken={userToken} champsStatut={champsStatut} onUpdate={handleUpdate} />
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
            <div className="legende-item"><div className="legende-dot" style={{ background: '#f0c040' }}></div>Renseigné par 1 utilisateur — modifiable</div>
            <div className="legende-item"><div className="legende-dot" style={{ background: '#1a7a40' }}></div>Valide par 2+ utilisateurs — clic droit pour modifier</div>
          </div>
          {!userToken && <p style={{ fontSize: '12px', color: '#b0a898', marginTop: '12px', fontStyle: 'italic' }}>Connectez-vous pour completer les donnees manquantes</p>}
        </div>

        {!peutCalculer ? (
          <div className="section"><div className="nc-warning">Le loyer ou le prix est manquant — impossible de calculer.</div></div>
        ) : (
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

            <div className="section">
              <h2 className="section-title">Analyse fiscale</h2>
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#9a8a80' }}>Comparer avec :</span>
                <select className="param-input" style={{ width: 'auto' }} value={regime2} onChange={e => setRegime2(e.target.value)}>
                  {REGIMES.filter(r => r.value !== regime).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="pnl-grid">
                <PnlColonne titre={`${REGIMES.find(r => r.value === regime)?.label} (votre regime)`} bien={bien} financement={financement} tmi={tmi} regime={regime} highlight />
                <PnlColonne titre={REGIMES.find(r => r.value === regime2)?.label} bien={bien} financement={financement} tmi={tmi} regime={regime2} />
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}