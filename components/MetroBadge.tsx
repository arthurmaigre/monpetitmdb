import { METROPOLE_LABELS } from '@/lib/constants'

interface Props {
  metropole: string
}

export default function MetroBadge({ metropole }: Props) {
  const label = METROPOLE_LABELS[metropole] || metropole
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '10px', fontWeight: 600, color: '#6a4a2a',
      background: '#f5e8d4', padding: '3px 8px', borderRadius: '20px',
      letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}