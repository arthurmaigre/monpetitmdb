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
  if (plan === 'expert') return "Bonjour ! Je suis Memo, votre assistant IA immobilier.\n\nJe peux vous aider sur :\n\u2022 L\u2019analyse d\u00E9taill\u00E9e de chaque bien (rendement, cashflow, estimation DVF)\n\u2022 La simulation compl\u00E8te des 7 r\u00E9gimes fiscaux avec chiffres personnalis\u00E9s\n\u2022 Les sc\u00E9narios de revente et les abattements pour dur\u00E9e de d\u00E9tention\n\u2022 La comparaison entre strat\u00E9gies (locataire en place, travaux, division, d\u00E9coupe)\n\u2022 Les montages juridiques (SCI IS, LMNP, marchand de biens)\n\nQue souhaitez-vous analyser ?"
  if (plan === 'pro') return "Bonjour ! Je suis Memo, votre assistant IA immobilier.\n\nJe peux vous expliquer :\n\u2022 Les calculs de rendement brut et net de chaque bien\n\u2022 Le cashflow et le prix cible\n\u2022 L\u2019estimation DVF et ses correcteurs\n\u2022 Votre r\u00E9gime fiscal et une comparaison avec un second r\u00E9gime\n\nPassez au plan Expert pour acc\u00E9der aux simulations fiscales compl\u00E8tes sur les 7 r\u00E9gimes.\n\nQue souhaitez-vous comprendre ?"
  return "Bonjour ! Je suis Memo, l\u2019assistant IA de Mon Petit MDB.\n\nJe peux r\u00E9pondre \u00E0 vos questions sur :\n\u2022 L\u2019investissement immobilier locatif\n\u2022 Les diff\u00E9rentes strat\u00E9gies (locataire en place, travaux, division, d\u00E9coupe)\n\u2022 Le fonctionnement de la plateforme\n\nCr\u00E9ez un compte Pro pour acc\u00E9der \u00E0 l\u2019analyse d\u00E9taill\u00E9e des biens et au simulateur fiscal."
}

function getDailyLimit(plan?: string | null): number {
  if (plan === 'expert') return Infinity
  if (plan === 'pro') return 50
  return 5
}

function getTodayKey(): string { return new Date().toISOString().slice(0, 10) }

function getDailyCount(): number {
  try {
    const raw = sessionStorage.getItem(COUNTER_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    return parsed.date === getTodayKey() ? (parsed.count || 0) : 0
  } catch { return 0 }
}

function incrementDailyCount(): void {
  try { sessionStorage.setItem(COUNTER_KEY, JSON.stringify({ date: getTodayKey(), count: getDailyCount() + 1 })) } catch {}
}

function loadHistory(): Message[] {
  try { const raw = sessionStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : [] } catch { return [] }
}

function saveHistory(messages: Message[]): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY))) } catch {}
}

export default function ChatWidget({ plan, context }: ChatWidgetProps) {
  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = loadHistory()
    setMessages(saved.length > 0 ? saved : [{ role: 'assistant', content: getWelcomeMessage(plan) }])
    setInitialized(true)
  }, [plan])

  useEffect(() => { if (initialized && messages.length > 0) saveHistory(messages) }, [messages, initialized])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150) }, [open])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    if (getDailyCount() >= getDailyLimit(plan)) {
      const upgrade = plan === 'pro' ? 'Expert' : 'Pro'
      setMessages(prev => [...prev, { role: 'user', content: trimmed }, { role: 'assistant', content: `Vous avez atteint la limite quotidienne. Passez au plan ${upgrade} pour continuer \u00E0 discuter.` }])
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
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })), plan, context }),
      })

      if (!res.ok || !res.body) throw new Error()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        const c = assistantContent
        setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: c }; return u })
      }

      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: assistantContent }; return u })
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "D\u00E9sol\u00E9, une erreur est survenue. Veuillez r\u00E9essayer." }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, plan, context])

  return (
    <>
      <style>{`
        @keyframes mdb-slide-up { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes mdb-dot-pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        @keyframes mdb-bubble-pop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .mdb-cw-panel::-webkit-scrollbar { width: 4px; }
        .mdb-cw-panel::-webkit-scrollbar-track { background: transparent; }
        .mdb-cw-panel::-webkit-scrollbar-thumb { background: #e8e2d8; border-radius: 4px; }
        @media (max-width: 767px) { .mdb-cw-container { width: 100% !important; right: 0 !important; bottom: 0 !important; border-radius: 16px 16px 0 0 !important; height: 70vh !important; } }
      `}</style>

      {/* Bulle flottante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant"
          style={{
            position: 'fixed', bottom: 24, right: 24, width: 56, height: 56,
            borderRadius: '50%', background: '#c0392b', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(192,57,43,0.35)', zIndex: 1000,
            transition: 'transform 150ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </button>
      )}

      {/* Panneau chat */}
      {open && (
        <div
          className="mdb-cw-container"
          style={{
            position: 'fixed', bottom: 24, right: 24,
            width: 340, height: 500,
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 16px 56px rgba(26,18,16,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column',
            zIndex: 1000, fontFamily: "'DM Sans', sans-serif",
            animation: 'mdb-slide-up 200ms ease-out',
            background: '#faf8f5',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1210, #2a2220)',
            padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, background: '#c0392b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15, color: '#fff' }}>Memo</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                Assistant IA immobilier
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', transition: 'all 150ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="mdb-cw-panel" style={{
            flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'mdb-bubble-pop 200ms ease-out',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, background: '#c0392b', flexShrink: 0, marginRight: 8, marginTop: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </div>
                )}
                <div style={{
                  maxWidth: '78%', padding: '10px 14px', fontSize: 13.5, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  ...(msg.role === 'user'
                    ? { background: '#1a1210', color: '#fff', borderRadius: '14px 14px 4px 14px' }
                    : { background: '#fff', color: '#1a1210', border: '1px solid #ede8e0', borderRadius: '4px 14px 14px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
                  ),
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.content === '' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: '#c0392b', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
                <div style={{
                  background: '#fff', border: '1px solid #ede8e0', borderRadius: '4px 14px 14px 14px',
                  padding: '12px 16px', display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(idx => (
                    <span key={idx} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#c0392b', display: 'inline-block',
                      animation: 'mdb-dot-pulse 1.4s infinite ease-in-out', animationDelay: `${idx * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 14px', borderTop: '1px solid #ede8e0', background: '#fff',
            display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={"Posez votre question..."}
              disabled={loading}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                border: '1.5px solid #ede8e0', fontSize: 13.5, fontFamily: "'DM Sans', sans-serif",
                background: '#faf8f5', color: '#1a1210', outline: 'none',
                transition: 'border-color 150ms ease',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#c0392b' }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#ede8e0' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Envoyer"
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: input.trim() ? '#c0392b' : '#e8e2d8',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 150ms ease, transform 150ms ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (input.trim()) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
