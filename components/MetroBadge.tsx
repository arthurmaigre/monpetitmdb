import { METROPOLE_LABELS } from '@/lib/constants'
import { theme } from '@/lib/theme'

interface Props {
  metropole: string
  size?: 'sm' | 'md'
}

export default function MetroBadge({ metropole, size = 'md' }: Props) {
  const label = METROPOLE_LABELS[metropole] || metropole
  return (
    <span style={{
      display: 'inline-block',
      fontSize: size === 'sm' ? theme.fontSizes.xs : theme.fontSizes.sm,
      fontWeight: 600,
      color: '#6a4a2a',
      background: '#f5e8d4',
      padding: size === 'sm' ? `${theme.spacing[1]} ${theme.spacing[2]}` : `${theme.spacing[1]} ${theme.spacing[3]}`,
      borderRadius: theme.radii.sm,
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
