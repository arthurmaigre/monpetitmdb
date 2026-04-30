'use client'
import { useState, useEffect } from 'react'
import { setDraft, clearDraft } from '@/lib/drafts'

export interface ChampStatut {
  statut: 'vert' | 'jaune'
  valeur: string
}

interface CellEditableProps {
  bienId: string
  champ: string
  /** Valeur courante dans le parent (déjà mergée avec le brouillon au mount) */
  dbVal: number | null
  /** Présence d'un brouillon localStorage chargé (non null = brouillon actif) */
  draftVal?: number | null
  /** Statut de validation communautaire */
  statut?: ChampStatut | null
  /** Donnée issue du scraping SE ou de l'extraction IA */
  isSourceData?: boolean
  /** Callback quand la valeur change (pour mettre à jour les calculs dans le parent) */
  onValueChange?: (champ: string, val: number | null) => void
  /** Callback pour soumettre en base */
  onSubmit: (champ: string, val: number) => Promise<void>
  userToken?: string
  suffix?: string
  /** Facteur d'échelle : 1 = direct, 12 = annuel→mensuel affiché, 1/12 = mensuel→annuel stocké */
  scale?: number
}

/** Modal plein-écran réutilisable */
function AlertModal({ title, message, confirmLabel = 'Modifier quand même', onCancel, onConfirm }: {
  title: string; message: string; confirmLabel?: string
  onCancel: () => void; onConfirm: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 32px', maxWidth: '400px', width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1210', marginBottom: '12px', fontFamily: "'DM Sans', sans-serif" }}>{title}</div>
        <div style={{ fontSize: '14px', color: '#7a6a60', lineHeight: 1.6, marginBottom: '24px', fontFamily: "'DM Sans', sans-serif" }}>{message}</div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #e8e2d8', background: '#fff', color: '#7a6a60', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Annuler</button>
          <button onClick={onConfirm} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#c0392b', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

const PencilSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7a6a60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
)

/** Menu contextuel clic droit — enregistrer en base ou garder en local */
function CtxSaveMenu({ x, y, onSave, onKeepLocal, onClose }: {
  x: number; y: number
  onSave: () => void
  onKeepLocal: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const close = (e: MouseEvent) => { onClose() }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [onClose])

  return (
    <div onMouseDown={e => e.stopPropagation()} style={{
      position: 'fixed', left: x, top: y, zIndex: 9999,
      background: '#fff', borderRadius: '10px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      border: '1px solid #e8e2d8', padding: '4px', minWidth: '290px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <button onClick={onSave} style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%',
        padding: '9px 12px', border: 'none', background: 'none', cursor: 'pointer',
        borderRadius: '7px', textAlign: 'left',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f0f8f4')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
        <span style={{ color: '#1a7a40', fontSize: '15px', fontWeight: 700, lineHeight: '1.2', flexShrink: 0 }}>{'✓'}</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1210', lineHeight: '1.3' }}>Enregistrer la donnée en base</div>
          <div style={{ fontSize: '11px', color: '#7a6a60', marginTop: '2px' }}>Information vérifiée auprès du vendeur</div>
        </div>
      </button>
      <button onClick={onKeepLocal} style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%',
        padding: '9px 12px', border: 'none', background: 'none', cursor: 'pointer',
        borderRadius: '7px', textAlign: 'left',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fdf0ef')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
        <span style={{ color: '#c0392b', fontSize: '15px', fontWeight: 700, lineHeight: '1.2', flexShrink: 0 }}>{'✕'}</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1210', lineHeight: '1.3' }}>Ne pas enregistrer en base</div>
          <div style={{ fontSize: '11px', color: '#7a6a60', marginTop: '2px' }}>Données utilisées à des fins de simulation personnelles</div>
        </div>
      </button>
    </div>
  )
}

export function CellEditable({
  bienId, champ, dbVal, draftVal = null, statut = null, isSourceData = false,
  onValueChange, onSubmit, userToken, suffix = '', scale = 1,
}: CellEditableProps) {
  const [dirty, setDirty] = useState(false)
  const [originalVal, setOriginalVal] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [showValidatedModal, setShowValidatedModal] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

  const displayVal = dbVal != null ? Math.round(dbVal * scale) : null
  const localVal = displayVal != null ? String(displayVal) : ''
  const readText = displayVal != null
    ? (suffix ? `${displayVal.toLocaleString('fr-FR')}${suffix.replace(/ /g, ' ')}` : `${displayVal.toLocaleString('fr-FR')} €`)
    : null

  const hasDraft = draftVal !== null && !dirty
  const hasSourceData = isSourceData && dbVal !== null && !hasDraft
  const isVert = statut?.statut === 'vert' && !hasDraft
  const isJaune = statut?.statut === 'jaune' && !hasDraft

  const vStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'right', fontSize: '13px', fontWeight: 600 }
  const bStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }

  function startEditDirect() {
    setOriginalVal(dbVal)
    setDirty(true)
  }

  function handlePencilClick() {
    if (hasSourceData) { setShowSourceModal(true); return }
    if (isVert) { setShowValidatedModal(true); return }
    startEditDirect()
  }

  function handleChange(v: string) {
    const newDbVal = v ? Math.round(Number(v) / scale) : null
    onValueChange?.(champ, newDbVal)
    setDraft(bienId, champ, newDbVal)
  }

  async function handleSubmit() {
    if (dbVal == null) return
    setSubmitting(true)
    await onSubmit(champ, dbVal)
    clearDraft(bienId, champ)
    setDirty(false)
    setSubmitting(false)
    setCtxMenu(null)
  }

  function handleCancel() {
    setDirty(false)
    onValueChange?.(champ, originalVal)
    clearDraft(bienId, champ)
    setCtxMenu(null)
  }

  function openCtxFromEvent(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }

  function openCtxFromInput(e: React.KeyboardEvent<HTMLInputElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setCtxMenu({ x: rect.left, y: rect.bottom + 6 })
  }

  const PencilBtn = ({ title: t = 'Modifier' }: { title?: string }) => (
    <button onClick={handlePencilClick} title={t}
      style={{ background: 'none', border: 'none', outline: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', opacity: 0, transition: 'opacity 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
      <PencilSVG />
    </button>
  )

  const ctxMenuEl = ctxMenu ? (
    <CtxSaveMenu
      x={ctxMenu.x} y={ctxMenu.y}
      onSave={handleSubmit}
      onKeepLocal={() => { setCtxMenu(null); if (dirty) { setDirty(false); setOriginalVal(null) } }}
      onClose={() => setCtxMenu(null)}
    />
  ) : null

  // --- Non connecté ---
  if (!userToken) {
    if (displayVal == null) return <><span style={{ ...vStyle, color: '#c0b0a0', fontStyle: 'italic', fontWeight: 400 }}>NC</span><span /></>
    return <><span style={{ ...vStyle, color: '#7a6a60' }}>{readText}</span><span /></>
  }

  // --- Brouillon localStorage (bleu, clic droit pour choisir) ---
  if (hasDraft) {
    return (
      <>
        <span
          onContextMenu={openCtxFromEvent}
          title="Clic droit pour enregistrer ou garder en local"
          style={{ ...vStyle, color: '#2a4a8a', cursor: 'context-menu' }}>{readText}</span>
        <div style={bStyle}>
          <PencilBtn title="Modifier le brouillon" />
        </div>
        {ctxMenuEl}
      </>
    )
  }

  // --- Donnée source SE/IA (gris figé + crayon → modal) ---
  if (hasSourceData && !dirty) {
    return (
      <>
        <span style={{ ...vStyle, color: '#1a1210' }}>{readText}</span>
        <div style={bStyle}><PencilBtn title="Modifier (donnée extraite de l'annonce)" /></div>
        {showSourceModal && (
          <AlertModal
            title="Modification d'une donnée source"
            message="Attention, vous modifiez une donnée extraite de l'annonce initiale. À modifier seulement si c'est une erreur."
            confirmLabel="Modifier quand même"
            onCancel={() => setShowSourceModal(false)}
            onConfirm={() => {
              setShowSourceModal(false)
              if (userToken) fetch('/api/admin/source-overrides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
                body: JSON.stringify({ bienId, champ, ancienneValeur: dbVal }),
              }).catch(() => {})
              startEditDirect()
            }}
          />
        )}
      </>
    )
  }

  // --- Validé communauté (vert, figé + modal si modification) ---
  if (isVert && !dirty) {
    return (
      <>
        <span style={{ ...vStyle, color: '#1a7a40' }}>{readText}</span>
        <div style={bStyle}>
          <span title="Validé par la communauté" style={{ fontSize: '10px', color: '#1a7a40' }}>{'✓'}</span>
          <PencilBtn title="Modifier (donnée validée)" />
        </div>
        {showValidatedModal && (
          <AlertModal
            title="Donnée validée par la communauté"
            message="Cette donnée a été confirmée par la communauté. La modifier seulement si elle est incorrecte."
            confirmLabel="Modifier quand même"
            onCancel={() => setShowValidatedModal(false)}
            onConfirm={() => { setShowValidatedModal(false); startEditDirect() }}
          />
        )}
      </>
    )
  }

  // --- Proposé par 1 user (jaune, clic droit pour valider ou garder local) ---
  if (isJaune && !dirty) {
    return (
      <>
        <span
          onContextMenu={openCtxFromEvent}
          title="Clic droit pour enregistrer ou garder en local"
          style={{ ...vStyle, color: '#a06010', cursor: 'context-menu' }}>{readText}</span>
        <div style={bStyle}>
          <PencilBtn />
        </div>
        {ctxMenuEl}
      </>
    )
  }

  // --- Éditable (vide = rouge, dirty = bleu actif) ---
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
        onContextMenu={e => { if (localVal) openCtxFromEvent(e) }}
        onKeyDown={e => { if (e.key === 'Enter' && localVal) openCtxFromInput(e) }}
      />
      <div style={bStyle}>
        <button onClick={handleCancel} title="Annuler"
          style={{
            background: 'none', border: 'none', cursor: dirty ? 'pointer' : 'default',
            padding: '1px', display: 'flex', alignItems: 'center', color: '#c0392b', fontSize: '14px',
            visibility: dirty ? 'visible' : 'hidden',
            pointerEvents: dirty ? 'auto' : 'none', flexShrink: 0,
          }}
        >{'×'}</button>
      </div>
      {ctxMenuEl}
    </>
  )
}

/** Version pour le type de loyer (select HC/CC) */
export function CellTypeLoyer({
  bienId, champ = 'type_loyer', dbVal, statut, isSourceData = false,
  onValueChange, onSubmit, userToken,
}: Omit<CellEditableProps, 'scale' | 'suffix' | 'dbVal'> & { dbVal: string | null }) {
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [showValidatedModal, setShowValidatedModal] = useState(false)

  const hasSourceData = isSourceData && dbVal !== null
  const isVert = statut?.statut === 'vert'
  const isJaune = statut?.statut === 'jaune'

  function handleSelect(v: string) {
    onValueChange?.(champ, v as any)
    if (v) onSubmit(champ, v as any)
  }

  if (!userToken) return <span style={{ color: '#7a6a60', fontSize: '13px' }}>{dbVal || 'NC'}</span>

  if (hasSourceData) {
    return (
      <>
        <span style={{ color: '#1a1210', fontSize: '13px', fontWeight: 600 }}>{dbVal}</span>
        {showSourceModal && (
          <AlertModal
            title="Modification d'une donnée source"
            message="Attention, vous modifiez une donnée extraite de l'annonce initiale. À modifier seulement si c'est une erreur."
            onCancel={() => setShowSourceModal(false)}
            onConfirm={() => { setShowSourceModal(false) }}
          />
        )}
      </>
    )
  }

  if (isVert && dbVal) return <span style={{ color: '#1a7a40', fontSize: '13px', fontWeight: 600 }}>{dbVal} {'✓'}</span>
  if (isJaune && dbVal) return <span style={{ color: '#a06010', fontSize: '13px', fontWeight: 600 }}>{dbVal}</span>

  return (
    <select defaultValue={dbVal || ''} onChange={e => { if (e.target.value) handleSelect(e.target.value) }}
      style={{ padding: '4px 8px', borderRadius: '6px', border: `1.5px solid ${dbVal ? '#e8e2d8' : '#c0392b'}`, fontFamily: "'DM Sans', sans-serif", fontSize: '12px', background: dbVal ? '#faf8f5' : '#fde8e8', outline: 'none', color: dbVal ? '#1a1210' : '#c0392b' }}>
      <option value="">NC</option>
      <option value="HC">HC</option>
      <option value="CC">CC</option>
    </select>
  )
}
