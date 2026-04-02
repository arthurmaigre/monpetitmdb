export default function TypeBienIllustration({ type, size = 64 }: { type?: string; size?: number }) {
  const s = size
  const color = '#c4b5a6'
  const light = '#d9cfc3'
  switch (type) {
    case 'Maison':
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="16" y="30" width="32" height="22" rx="2" fill={light} />
          <path d="M10 32L32 14L54 32" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="26" y="38" width="12" height="14" rx="1.5" fill={color} />
          <rect x="30" y="42" width="4" height="4" rx="0.5" fill={light} />
          <rect x="19" y="34" width="6" height="6" rx="1" fill="#fff" opacity="0.6" />
          <rect x="39" y="34" width="6" height="6" rx="1" fill="#fff" opacity="0.6" />
          <rect x="42" y="18" width="5" height="14" rx="1" fill={color} />
        </svg>
      )
    case 'Immeuble':
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="14" y="10" width="36" height="44" rx="2" fill={light} />
          <rect x="18" y="14" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="29" y="14" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="40" y="14" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="18" y="23" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="29" y="23" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="40" y="23" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="18" y="32" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="29" y="32" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="40" y="32" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="18" y="41" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="40" y="41" width="6" height="5" rx="1" fill="#fff" opacity="0.6" />
          <rect x="28" y="42" width="8" height="12" rx="1.5" fill={color} />
        </svg>
      )
    case 'Local commercial':
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="12" y="22" width="40" height="30" rx="2" fill={light} />
          <rect x="16" y="32" width="32" height="16" rx="1.5" fill="#fff" opacity="0.6" />
          <path d="M12 22H52V18C52 16.9 51.1 16 50 16H14C12.9 16 12 16.9 12 18V22Z" fill={color} />
          <rect x="22" y="36" width="20" height="8" rx="1" fill={color} opacity="0.3" />
          <circle cx="32" cy="12" r="3" fill={color} opacity="0.5" />
        </svg>
      )
    case 'Terrain':
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <path d="M8 48C8 48 16 36 24 38C32 40 28 30 36 28C44 26 52 34 56 32" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M8 48H56V52H8V48Z" fill={light} />
          <line x1="20" y1="24" x2="20" y2="38" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="44" y1="20" x2="44" y2="34" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="20" y1="24" x2="44" y2="20" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="20" cy="24" r="2.5" fill={color} />
          <circle cx="44" cy="20" r="2.5" fill={color} />
        </svg>
      )
    case 'Parking':
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="12" y="16" width="40" height="32" rx="4" fill={light} />
          <text x="32" y="40" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontSize="24" fontWeight="700" fill={color}>P</text>
          <rect x="18" y="50" width="28" height="3" rx="1.5" fill={color} opacity="0.4" />
        </svg>
      )
    default: // Appartement, Autre
      return (
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <rect x="12" y="16" width="40" height="36" rx="2" fill={light} />
          <rect x="16" y="20" width="8" height="7" rx="1" fill="#fff" opacity="0.6" />
          <rect x="28" y="20" width="8" height="7" rx="1" fill="#fff" opacity="0.6" />
          <rect x="40" y="20" width="8" height="7" rx="1" fill="#fff" opacity="0.6" />
          <rect x="16" y="31" width="8" height="7" rx="1" fill="#fff" opacity="0.6" />
          <rect x="28" y="31" width="8" height="7" rx="1" fill="#fff" opacity="0.6" />
          <rect x="40" y="31" width="8" height="7" rx="1" fill="#fff" opacity="0.6" />
          <rect x="26" y="42" width="12" height="10" rx="1.5" fill={color} />
          <path d="M8 16L32 6L56 16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )
  }
}
