'use client'

import { useEffect, useRef, useCallback, ReactNode } from 'react'
import { theme } from '@/lib/theme'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  variant?: 'modal' | 'drawer' | 'sheet'
  width?: string
}

export default function Modal({ open, onClose, children, title, variant = 'modal', width = '480px' }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  // Focus trap
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Tab' || !contentRef.current) return

    const focusable = contentRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }, [onClose])

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        const first = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        first?.focus()
      }, 50)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocus.current?.focus()
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const isDrawer = variant === 'drawer'
  const isSheet = variant === 'sheet'

  return (
    <>
      <style>{`
        @keyframes modal-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-scale { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes drawer-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes sheet-slide { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
      {/* Overlay */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 9998, animation: 'modal-fade 200ms ease',
        }}
      />
      {/* Content */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialogue'}
        style={{
          position: 'fixed', zIndex: 9999,
          background: theme.colors.card,
          ...(isDrawer ? {
            top: 0, right: 0, bottom: 0, width, maxWidth: '90vw',
            borderRadius: `${theme.radii.lg} 0 0 ${theme.radii.lg}`,
            animation: 'drawer-slide 200ms ease',
            overflowY: 'auto' as const,
          } : isSheet ? {
            bottom: 0, left: 0, right: 0, maxHeight: '85vh',
            borderRadius: `${theme.radii.lg} ${theme.radii.lg} 0 0`,
            animation: 'sheet-slide 200ms ease',
            overflowY: 'auto' as const,
          } : {
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width, maxWidth: '90vw', maxHeight: '85vh',
            borderRadius: theme.radii.lg,
            animation: 'modal-scale 200ms ease',
            overflowY: 'auto' as const,
          }),
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        {title && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 24px 16px', borderBottom: `1px solid ${theme.colors.sand}`,
          }}>
            <h2 style={{
              fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lg,
              fontWeight: 700, color: theme.colors.ink, margin: 0,
            }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: theme.colors.muted, fontSize: '20px', padding: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: theme.radii.sm, transition: `all ${theme.transitions.fast}`,
              }}
            >
              {'\u00D7'}
            </button>
          </div>
        )}
        <div style={{ padding: title ? '16px 24px 24px' : '24px' }}>
          {children}
        </div>
      </div>
    </>
  )
}
