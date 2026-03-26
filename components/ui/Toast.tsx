'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { theme } from '@/lib/theme'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++
    setToasts(prev => [...prev.slice(-2), { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: theme.colors.successLight, border: theme.colors.success, icon: '\u2713' },
    error:   { bg: theme.colors.errorLight, border: theme.colors.error, icon: '\u2717' },
    warning: { bg: theme.colors.warningLight, border: theme.colors.warning, icon: '!' },
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = colors[t.type]
          return (
            <div
              key={t.id}
              style={{
                background: c.bg, border: `1px solid ${c.border}`,
                borderRadius: theme.radii.sm, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: theme.fontSizes.base, fontFamily: theme.fonts.body,
                color: theme.colors.ink, boxShadow: theme.shadows.hover,
                pointerEvents: 'auto', animation: 'toast-in 200ms ease-out',
                maxWidth: 360,
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: '50%', background: c.border,
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {c.icon}
              </span>
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: theme.colors.muted, fontSize: 16, padding: 4, flexShrink: 0,
                }}
                aria-label="Fermer"
              >
                {'\u00D7'}
              </button>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </ToastContext.Provider>
  )
}
