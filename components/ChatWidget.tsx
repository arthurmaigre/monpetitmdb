'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ChatWidgetProps {
  plan?: 'free' | 'pro' | 'expert' | null
  context?: {
    type_bien?: string
    ville?: string
    prix_fai?: number
    loyer?: number
    surface?: number
    rendement_brut?: number
    estimation_prix_total?: number
    score_travaux?: number
    strategie_mdb?: string
    dpe?: string
    charges_copro?: number
    taxe_fonc_ann?: number
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'mdb_chat_history'
const COUNTER_KEY = 'mdb_chat_count'
const MAX_HISTORY = 20

function getWelcomeMessage(plan?: string | null): string {
  if (plan === 'expert') {
    return "Bonjour ! Je suis votre assistant fiscal expert. Je ma\u00EEtrise les 7 r\u00E9gimes fiscaux et peux faire des simulations chiffr\u00E9es. Comment puis-je vous aider ?"
  }
  if (plan === 'pro') {
    return "Bonjour ! Je peux vous expliquer tous les calculs et strat\u00E9gies de votre analyse. Que souhaitez-vous comprendre ?"
  }
  return "Bonjour ! Je suis l'assistant Mon Petit MDB. Posez-moi vos questions sur l'investissement immobilier."
}

function getDailyLimit(plan?: string | null): number {
  if (plan === 'expert') return Infinity
  if (plan === 'pro') return 50
  return 5
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getDailyCount(): number {
  try {
    const raw = sessionStorage.getItem(COUNTER_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    if (parsed.date !== getTodayKey()) return 0
    return parsed.count || 0
  } catch {
    return 0
  }
}

function incrementDailyCount(): void {
  try {
    const count = getDailyCount() + 1
    sessionStorage.setItem(COUNTER_KEY, JSON.stringify({ date: getTodayKey(), count }))
  } catch {}
}

function loadHistory(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveHistory(messages: Message[]): void {
  try {
    const trimmed = messages.slice(-MAX_HISTORY)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {}
}

export default function ChatWidget({ plan, context }: ChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize messages from sessionStorage + welcome
  useEffect(() => {
    const saved = loadHistory()
    if (saved.length > 0) {
      setMessages(saved)
    } else {
      setMessages([{ role: 'assistant', content: getWelcomeMessage(plan) }])
    }
    setInitialized(true)
  }, [plan])

  // Save history whenever messages change
  useEffect(() => {
    if (initialized && messages.length > 0) {
      saveHistory(messages)
    }
  }, [messages, initialized])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const getUpgradePlan = useCallback((): string => {
    if (plan === 'pro') return 'Expert'
    return 'Pro'
  }, [plan])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const limit = getDailyLimit(plan)
    if (getDailyCount() >= limit) {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: `Limite atteinte. Passez au plan ${getUpgradePlan()} pour continuer.` }
      ])
      setInput('')
      return
    }

    const userMsg: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    incrementDailyCount()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          plan,
          context,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Erreur serveur')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      // Add placeholder assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantContent += chunk
        const currentContent = assistantContent
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: currentContent }
          return updated
        })
      }

      // Final update with complete content
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
        return updated
      })
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "D\u00E9sol\u00E9, une erreur est survenue. Veuillez r\u00E9essayer." }
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, plan, context, getUpgradePlan])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <style>{`
        @keyframes mdb-chat-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mdb-chat-dots {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @media (max-width: 767px) {
          .mdb-chat-panel {
            width: calc(100vw - 16px) !important;
            right: 8px !important;
            left: 8px !important;
            bottom: 8px !important;
          }
        }
      `}</style>

      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant Mon Petit MDB"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#c0392b',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(192, 57, 43, 0.35)',
            transition: 'transform 150ms ease, box-shadow 150ms ease',
            zIndex: 1000,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="mdb-chat-panel"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 400,
            maxWidth: 'calc(100vw - 32px)',
            height: 500,
            maxHeight: 'calc(100vh - 48px)',
            background: '#faf8f5',
            borderRadius: 16,
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000,
            animation: 'mdb-chat-slide-up 250ms ease-out',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: '#1a1210',
              color: '#fff',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15 }}>
              Assistant Mon Petit MDB
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer l'assistant"
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'none'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    fontSize: 14,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    ...(msg.role === 'user'
                      ? {
                          background: '#1a1210',
                          color: '#fff',
                          borderRadius: '16px 16px 4px 16px',
                        }
                      : {
                          background: '#fff',
                          color: '#1a1210',
                          border: '1px solid #e8e2d8',
                          borderRadius: '16px 16px 16px 4px',
                        }),
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #e8e2d8',
                    borderRadius: '16px 16px 16px 4px',
                    padding: '12px 18px',
                    display: 'flex',
                    gap: 5,
                    alignItems: 'center',
                  }}
                >
                  {[0, 1, 2].map(idx => (
                    <span
                      key={idx}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#9a8a80',
                        display: 'inline-block',
                        animation: 'mdb-chat-dots 1.4s infinite ease-in-out both',
                        animationDelay: `${idx * 0.16}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              borderTop: '1px solid #e8e2d8',
              padding: 12,
              display: 'flex',
              gap: 8,
              background: '#fff',
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"Posez votre question..."}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: '1.5px solid #e8e2d8',
                outline: 'none',
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                color: '#1a1210',
                background: '#faf8f5',
                transition: 'border-color 150ms ease',
              }}
              onFocus={e => {
                (e.target as HTMLInputElement).style.borderColor = '#c0392b'
              }}
              onBlur={e => {
                (e.target as HTMLInputElement).style.borderColor = '#e8e2d8'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Envoyer le message"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: 'none',
                background: loading || !input.trim() ? '#e8e2d8' : '#c0392b',
                color: '#fff',
                cursor: loading || !input.trim() ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 150ms ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </>
  )
}
