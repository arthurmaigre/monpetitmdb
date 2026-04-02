'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { theme } from '@/lib/theme'

interface AddressSuggestion {
  label: string
  name: string
  city: string
  postcode: string
  context: string
  lat: number
  lng: number
}

interface AddressAutocompleteProps {
  value?: string
  placeholder?: string
  label?: string
  style?: React.CSSProperties
  onSelect: (addr: { adresse: string; ville: string; code_postal: string; latitude: number; longitude: number }) => void
  onChange?: (value: string) => void
}

export default function AddressAutocomplete({ value = '', placeholder, label, style, onSelect, onChange }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Sync external value
  useEffect(() => { setQuery(value) }, [value])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    try {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`)
      if (!res.ok) return
      const data = await res.json()
      const results: AddressSuggestion[] = (data.features || []).map((f: any) => ({
        label: f.properties.label,
        name: f.properties.name,
        city: f.properties.city,
        postcode: f.properties.postcode,
        context: f.properties.context,
        lat: f.geometry?.coordinates?.[1] ?? 0,
        lng: f.geometry?.coordinates?.[0] ?? 0,
      }))
      setSuggestions(results)
      setOpen(results.length > 0)
      setActiveIdx(-1)
    } catch { /* silent */ }
  }, [])

  function handleChange(val: string) {
    setQuery(val)
    onChange?.(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250)
  }

  function handleSelect(s: AddressSuggestion) {
    setQuery(s.label)
    setOpen(false)
    setSuggestions([])
    onSelect({
      adresse: s.name,
      ville: s.city,
      code_postal: s.postcode,
      latitude: s.lat,
      longitude: s.lng,
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(prev => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const borderColor = focused ? theme.colors.primary : theme.colors.sand

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <span style={{ fontSize: theme.fontSizes.sm, fontWeight: 600, color: theme.colors.muted, letterSpacing: '0.04em' }}>
          {label}
        </span>
      )}
      <input
        type="text"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { setFocused(true); if (suggestions.length > 0) setOpen(true) }}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || '12 rue de la Paix, Paris'}
        autoComplete="off"
        style={{
          padding: '10px 12px',
          borderRadius: theme.radii.sm,
          border: `1.5px solid ${borderColor}`,
          fontFamily: theme.fonts.body,
          fontSize: theme.fontSizes.base,
          background: theme.colors.bgInput,
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
          transition: `border-color ${theme.transitions.fast}`,
          ...style,
        }}
      />
      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: label ? '62px' : '44px', left: 0, right: 0, zIndex: 20,
          background: '#fff', borderRadius: theme.radii.sm, border: `1px solid ${theme.colors.sand}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', listStyle: 'none', margin: 0, padding: '4px 0',
          maxHeight: '220px', overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                background: i === activeIdx ? theme.colors.sandLight : '#fff',
                transition: `background ${theme.transitions.fast}`,
              }}
            >
              <div style={{ fontSize: theme.fontSizes.base, color: theme.colors.ink, fontWeight: 500 }}>{s.name}</div>
              <div style={{ fontSize: theme.fontSizes.sm, color: theme.colors.muted, marginTop: '1px' }}>
                {s.postcode} {s.city} {'\u2014'} {s.context}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
