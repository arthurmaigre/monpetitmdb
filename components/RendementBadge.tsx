interface Props {
  rendement: number | null
  size?: 'sm' | 'md'
}

export default function RendementBadge({ rendement, size = 'md' }: Props) {
  if (!rendement) return (
    <span style={{
      display: 'inline-block',
      fontSize: size === 'sm' ? '11px' : '12px',
      fontWeight: 600, color: '#bbb',
      background: '#f0ede8', padding: size === 'sm' ? '3px 8px' : '4px 10px',
      borderRadius: '14px', whiteSpace: 'nowrap',
    }}>NC</span>
  )

  const pct = rendement * 100
  const colors = pct >= 7
    ? { bg: '#d4f5e0', color: '#1a7a40' }
    : pct >= 5
    ? { bg: '#fff3cd', color: '#856404' }
    : { bg: '#fde8e8', color: '#a33' }

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
      {pct.toFixed(2)} %
    </span>
  )
}