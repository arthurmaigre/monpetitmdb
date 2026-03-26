export const theme = {
  colors: {
    primary:    '#c0392b',   // rouge MDB
    ink:        '#1a1210',   // noir principal
    bg:         '#f2ece4',   // fond beige
    card:       '#ffffff',   // fond cartes
    muted:      '#7a6a60',   // texte secondaire (WCAG AA 4.5:1 sur #faf8f5)
    sand:       '#e8e2d8',   // bordures
    sandLight:  '#f7f4f0',   // fond inputs

    // Status colors
    success:      '#27ae60',
    successLight: '#eafaf1',
    warning:      '#f39c12',
    warningLight: '#fef9e7',
    error:        '#e74c3c',
    errorLight:   '#fdedec',

    // Background variants
    bgCard:   '#ffffff',
    bgInput:  '#f7f4f0',
    bgHover:  '#ede7dd',
    bgLanding: '#faf8f5',
    cream:    '#f0ebe3',

    // Text variants
    textPrimary:   '#1a1210',
    textSecondary: '#7a6a60',
    textTertiary:  '#bfb2a6',

    // Button variants
    buttonPrimary:     '#c0392b',
    buttonPrimaryHover:'#96281b',
    buttonDark:        '#1a1210',
    buttonDarkHover:   '#2a2220',

    // Input variants
    inputBorder:  '#e8e2d8',
    inputFocus:   '#c0392b',
    inputBg:      '#f7f4f0',
  },
  fonts: {
    display: "'Fraunces', serif",
    body:    "'DM Sans', sans-serif",
  },
  fontSizes: {
    xs:   '10px',
    sm:   '12px',
    base: '14px',
    md:   '16px',
    lg:   '20px',
    xl:   '24px',
    '2xl': '28px',
    '3xl': '32px',
    hero: '36px',
  },
  spacing: {
    0:  '0',
    1:  '4px',
    2:  '8px',
    3:  '12px',
    4:  '16px',
    5:  '20px',
    6:  '24px',
    8:  '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  radii: {
    sm:  '8px',
    md:  '12px',
    lg:  '16px',
    xl:  '20px',
  },
  shadows: {
    card:  '0 2px 10px rgba(0,0,0,0.06)',
    hover: '0 12px 32px rgba(0,0,0,0.12)',
    bar:   '0 2px 12px rgba(0,0,0,0.06)',
  },
  transitions: {
    fast:   '150ms ease',
    normal: '200ms ease',
    slow:   '300ms ease',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
}
