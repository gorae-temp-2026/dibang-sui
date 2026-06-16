// === Font ===
export const serif = { fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" } as const

// === Springs (Framer Motion) ===
export const springs = {
  snappy: { type: 'spring' as const, stiffness: 400, damping: 25 },
  smooth: { type: 'spring' as const, damping: 25, stiffness: 120 },
} as const

// === Step Enter/Exit Animation ===
export const stepEnter = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
} as const

// === Colors ===
export const colors = {
  // Text
  textPrimary: '#1A1A2E',
  textBody: '#2D2D3F',
  textHeading: '#1A1A2E',
  textMuted: '#6B6B80',
  textSubtle: '#9999AD',
  textDisabled: '#CCCCDD',

  // Accent — soft rose
  accent: '#D4687A',
  accentLight: '#E8A0AD',
  accentDisabled: '#D4B8BD',

  // Background
  bgWarm: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgAccentSubtle: 'rgba(212, 104, 122, 0.05)',
  bgButton: 'rgba(212, 104, 122, 0.08)',
  bgButtonDisabled: 'rgba(212, 104, 122, 0.03)',
  bgMuted: '#F8F6F9',

  // Border & Divider
  border: '#EAEAEF',
  borderLight: '#F0F0F5',
  borderAccent: 'rgba(212, 104, 122, 0.2)',
  borderAccentDisabled: 'rgba(212, 104, 122, 0.08)',
} as const
