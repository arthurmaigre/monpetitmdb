interface Props {
  prixFai: number
  estimationPrix: number | null
  scoreTravaux?: number | null
  surface?: number
  fraisNotairePct?: number     // default 7.5%
  fraisAgencePct?: number      // default 5%
  budgetTravauxM2?: Record<string, number>
  size?: 'sm' | 'md'
}

export default function PlusValueBadge({
  prixFai, estimationPrix, scoreTravaux, surface,
  fraisNotairePct = 7.5, fraisAgencePct = 5,
  budgetTravauxM2 = { '1': 200, '2': 500, '3': 800, '4': 1200, '5': 1800 },
  size = 'md'
}: Props) {
  if (!estimationPrix || !prixFai) return (
    <span style={{
      display: 'inline-block',
      fontSize: size === 'sm' ? '11px' : '12px',
      fontWeight: 600, color: '#bbb',
      background: '#f0ede8', padding: size === 'sm' ? '3px 8px' : '4px 10px',
      borderRadius: '14px', whiteSpace: 'nowrap',
    }}>PV NC</span>
  )

  // PV brute = prix revente net vendeur - prix achat - frais notaire - travaux
  const fraisAgence = estimationPrix * fraisAgencePct / 100
  const netVendeur = estimationPrix - fraisAgence
  const fraisNotaire = prixFai * fraisNotairePct / 100
  const budgetTravaux = scoreTravaux && surface
    ? (budgetTravauxM2[String(scoreTravaux)] || 0) * surface
    : 0
  const pvBrute = netVendeur - prixFai - fraisNotaire - budgetTravaux
  const pvPct = (pvBrute / prixFai) * 100

  const isPositif = pvPct >= 0
  const colors = isPositif
    ? { bg: '#d4f5e0', color: '#1a7a40' }
    : { bg: '#fde8e8', color: '#c0392b' }

  return (
    <span style={{
      display: 'inline-block',
      fontSize: size === 'sm' ? '11px' : '12px',
      fontWeight: 600,
      color: colors.color,
      background: colors.bg,
      padding: size === 'sm' ? '3px 8px' : '4px 10px',
      borderRadius: '14px',
      whiteSpace: 'nowrap',
    }}>
      {isPositif ? '+' : ''}{pvPct.toFixed(1)}% PV
    </span>
  )
}
