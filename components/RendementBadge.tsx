import { theme } from '@/lib/theme'

interface Props {
  rendement: number | null
  size?: 'sm' | 'md'
}

export default function RendementBadge({ rendement, size = 'md' }: Props) {
  const padY = size === 'sm' ? theme.spacing[1] : theme.spacing[1]
  const padX = size === 'sm' ? theme.spacing[2] : theme.spacing[3]

  if (!rendement) return (
    <span style={{
      display: 'inline-block',
      fontSize: size === 'sm' ? theme.fontSizes.xs : theme.fontSizes.sm,
      fontWeight: 600,
      color: theme.colors.textTertiary,
      background: theme.colors.bgHover,
      padding: `${padY} ${padX}`,
      borderRadius: theme.radii.sm,
      whiteSpace: 'nowrap',
    }}>NC</span>
  )

  const pct = rendement * 100
  const colors = pct >= 7
    ? { bg: theme.colors.successLight, color: theme.colors.success }
    : pct >= 5
    ? { bg: theme.colors.warningLight, color: theme.colors.warning }
    : { bg: theme.colors.errorLight, color: theme.colors.error }

  return (
    <span style={{
      display: 'inline-block',
      fontSize: size === 'sm' ? theme.fontSizes.xs : theme.fontSizes.sm,
      fontWeight: 600,
      color: colors.color,
      background: colors.bg,
      padding: `${padY} ${padX}`,
      borderRadius: theme.radii.sm,
      whiteSpace: 'nowrap',
    }}>
      {pct.toFixed(2)} %
    </span>
  )
}
