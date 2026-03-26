'use client'

import { theme } from '@/lib/theme'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  href?: string
}

const styles: Record<Variant, { bg: string; color: string; border: string; hoverBg: string }> = {
  primary:   { bg: theme.colors.primary, color: '#fff', border: 'none', hoverBg: '#96281b' },
  secondary: { bg: 'transparent', color: theme.colors.ink, border: `1.5px solid ${theme.colors.sand}`, hoverBg: theme.colors.bgHover },
  ghost:     { bg: 'transparent', color: theme.colors.ink, border: '1.5px solid transparent', hoverBg: theme.colors.bgHover },
  danger:    { bg: theme.colors.error, color: '#fff', border: 'none', hoverBg: '#c0392b' },
}

const sizes: Record<Size, { padding: string; fontSize: string; minHeight: string }> = {
  sm: { padding: '8px 16px', fontSize: theme.fontSizes.sm, minHeight: '36px' },
  md: { padding: '10px 24px', fontSize: theme.fontSizes.base, minHeight: '44px' },
  lg: { padding: '14px 32px', fontSize: '15px', minHeight: '48px' },
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, style, href, ...props }, ref) => {
    const v = styles[variant]
    const s = sizes[size]
    const isDisabled = disabled || loading

    const buttonStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: s.padding,
      fontSize: s.fontSize,
      minHeight: s.minHeight,
      fontFamily: theme.fonts.body,
      fontWeight: 600,
      lineHeight: 1,
      color: v.color,
      background: isDisabled ? theme.colors.sand : v.bg,
      border: v.border,
      borderRadius: theme.radii.sm,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.6 : 1,
      transition: `all ${theme.transitions.fast}`,
      textDecoration: 'none',
      whiteSpace: 'nowrap',
      ...style,
    }

    if (href && !isDisabled) {
      return (
        <a
          href={href}
          style={buttonStyle}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = v.hoverBg }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = v.bg }}
        >
          {loading && <Spinner />}
          {children}
        </a>
      )
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={buttonStyle}
        onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.background = v.hoverBg }}
        onMouseLeave={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.background = isDisabled ? theme.colors.sand : v.bg }}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

function Spinner() {
  return (
    <span style={{
      width: 14, height: 14,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTop: '2px solid #fff',
      borderRadius: '50%',
      animation: 'btn-spin 0.6s linear infinite',
      display: 'inline-block',
      flexShrink: 0,
    }}>
      <style>{`@keyframes btn-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}

export default Button
