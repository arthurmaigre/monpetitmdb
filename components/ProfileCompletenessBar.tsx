type Profile = {
  prenom?: string | null
  nom?: string | null
  tmi?: number | null
  regime?: string | null
  apport?: number | null
  taux_credit?: number | null
  duree_ans?: number | null
  strategie_mdb?: string | null
  plan?: string | null
}

type Step = {
  key: keyof Profile | 'identity'
  points: number
  label: string
  done: boolean
  hint: string
}

function CheckIcon({ done }: { done: boolean }) {
  return done ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="#27ae60" />
      <path d="M5 8l2.2 2.4L11 5.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7.5" stroke="#d0c8c0" />
    </svg>
  )
}

export default function ProfileCompletenessBar({ profile, showUpgradeCta }: { profile: Profile | null; showUpgradeCta?: boolean }) {
  if (!profile) return null

  const steps: Step[] = [
    {
      key: 'identity',
      points: 10,
      label: 'Prénom et nom',
      done: !!(profile.prenom && profile.nom),
      hint: 'Renseignez votre prénom et nom',
    },
    {
      key: 'tmi',
      points: 25,
      label: 'Tranche d\'imposition (TMI)',
      done: profile.tmi != null,
      hint: 'Ajoutez votre TMI pour des calculs précis',
    },
    {
      key: 'regime',
      points: 20,
      label: 'Régime fiscal',
      done: !!(profile.regime),
      hint: 'Indiquez votre régime fiscal principal',
    },
    {
      key: 'apport',
      points: 15,
      label: 'Apport disponible',
      done: profile.apport != null && profile.apport > 0,
      hint: 'Renseignez votre apport disponible',
    },
    {
      key: 'taux_credit',
      points: 10,
      label: 'Taux de crédit',
      done: profile.taux_credit != null && profile.taux_credit > 0,
      hint: 'Ajoutez votre taux de crédit actuel',
    },
    {
      key: 'duree_ans',
      points: 10,
      label: 'Durée de financement',
      done: profile.duree_ans != null && profile.duree_ans > 0,
      hint: 'Précisez la durée de financement souhaitée',
    },
    {
      key: 'strategie_mdb',
      points: 10,
      label: 'Stratégie principale',
      done: !!(profile.strategie_mdb),
      hint: 'Choisissez votre stratégie principale',
    },
  ]

  const score = steps.reduce((acc, s) => acc + (s.done ? s.points : 0), 0)
  const firstMissing = steps.find(s => !s.done)

  const barColor =
    score >= 80 ? '#27ae60' :
    score >= 50 ? '#f39c12' :
    '#e74c3c'

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e8e0d8',
      borderRadius: 14,
      padding: '18px 22px',
      marginBottom: 24,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1210' }}>
          Complétude du profil
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: barColor, lineHeight: 1 }}>
          {score}<span style={{ fontSize: 13, fontWeight: 600, color: '#9a8a82' }}>/100</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ position: 'relative', height: 7, background: '#f0ebe6', borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${score}%`,
          background: barColor,
          borderRadius: 4,
          transition: 'width 0.5s ease, background 0.5s ease',
        }} />
      </div>

      {/* Message contextuel */}
      {firstMissing && (
        <p style={{ fontSize: 13, color: '#7a6a60', margin: '0 0 14px' }}>
          {firstMissing.hint}
        </p>
      )}
      {!firstMissing && (
        <p style={{ fontSize: 13, color: '#27ae60', fontWeight: 600, margin: '0 0 14px' }}>
          Profil complet — vos simulations sont entièrement personnalisées.
        </p>
      )}

      {/* Chips des étapes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {steps.map(s => (
          <div key={String(s.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20,
            background: s.done ? '#f0faf4' : '#faf8f6',
            border: `1px solid ${s.done ? '#b6e5c8' : '#e8e0d8'}`,
            fontSize: 12, color: s.done ? '#1a7a40' : '#9a8a82',
            fontWeight: s.done ? 600 : 400,
          }}>
            <CheckIcon done={s.done} />
            {s.label}
          </div>
        ))}
      </div>

      {/* CTA upgrade pour Free */}
      {showUpgradeCta && (
        <div style={{
          marginTop: 16, paddingTop: 14,
          borderTop: '1px solid #f0ebe6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
        }}>
          <div style={{ fontSize: 13, color: '#7a6a60' }}>
            Ces paramètres s'activent automatiquement dans le simulateur avec le plan Pro.
          </div>
          <a href="/mon-profil" style={{
            display: 'inline-block', padding: '9px 20px', borderRadius: 10,
            background: '#c0392b', color: '#fff', fontWeight: 600, fontSize: 13,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Activer avec Pro — 19 €/mois
          </a>
        </div>
      )}
    </div>
  )
}
