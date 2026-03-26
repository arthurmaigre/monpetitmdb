'use client'

import { theme } from '@/lib/theme'
import { InputHTMLAttributes, forwardRef, useState } from 'react'

type Variant = 'default' | 'search' | 'inline'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: Variant
  label?: string
  hint?: string
  error?: string
  suffix?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', label, hint, error, suffix, style, id, ...props }, ref) => {
    const [focused, setFocused] = useState(false)
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    const borderColor = error
      ? theme.colors.error
      : focused
        ? theme.colors.primary
        : theme.colors.sand

    const inputStyle: React.CSSProperties = {
      width: '100%',
      padding: variant === 'inline' ? '6px 10px' : '10px 14px',
      fontSize: theme.fontSizes.base,
      fontFamily: theme.fonts.body,
      color: theme.colors.ink,
      background: variant === 'inline' ? 'transparent' : theme.colors.bgInput,
      border: `1.5px solid ${borderColor}`,
      borderRadius: theme.radii.sm,
      outline: 'none',
      transition: `border-color ${theme.transitions.fast}`,
      minHeight: variant === 'inline' ? '32px' : '44px',
      boxSizing: 'border-box' as const,
      ...style,
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: theme.fontSizes.sm,
              fontWeight: 600,
              color: theme.colors.muted,
              fontFamily: theme.fonts.body,
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {variant === 'search' && (
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.muted}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
          <input
            ref={ref}
            id={inputId}
            style={{
              ...inputStyle,
              paddingLeft: variant === 'search' ? '36px' : inputStyle.padding,
              paddingRight: suffix ? '40px' : inputStyle.padding,
            }}
            onFocus={e => { setFocused(true); props.onFocus?.(e) }}
            onBlur={e => { setFocused(false); props.onBlur?.(e) }}
            {...props}
          />
          {suffix && (
            <span style={{
              position: 'absolute', right: '12px',
              fontSize: theme.fontSizes.sm, color: theme.colors.muted,
              pointerEvents: 'none',
            }}>
              {suffix}
            </span>
          )}
        </div>
        {hint && !error && (
          <span style={{ fontSize: '11px', color: theme.colors.muted }}>{hint}</span>
        )}
        {error && (
          <span style={{ fontSize: '11px', color: theme.colors.error }}>{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
