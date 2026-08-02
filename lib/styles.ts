
// ── Shared Foundation ──────────────────────────────────────────────

export const SHARED = {
  white: '#ffffff',
  success: '#059669',
  successLight: '#d1fae5',
  error: '#dc2626',
  errorLight: '#fee2e2',
  warning: '#d97706',
  warningLight: '#fef3c7',
  info: '#2563eb',
  infoLight: '#dbeafe',
  shadow: '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)',
  shadowMd: '0 4px 6px -1px rgba(15,23,42,0.10), 0 2px 4px -2px rgba(15,23,42,0.06)',
  shadowLg: '0 10px 25px -3px rgba(15,23,42,0.12), 0 4px 6px -4px rgba(15,23,42,0.06)',
  shadowXl: '0 20px 50px -12px rgba(15,23,42,0.22)',
  radius: '16px',
  radiusSm: '10px',
  radiusLg: '20px',
  radiusXl: '28px',
  font: "var(--font-poppins), 'Poppins', 'Segoe UI', system-ui, -apple-system, sans-serif",
} as const

// ── Brand palette (Image 1 reference — warm peach + magenta + navy + gold)
//   Main bg #FAF7EE · Secondary bg #E8E4D6 · Card #EFEBDD · Muted #A8A695
//   Primary magenta #31372B · Accent navy #31372B · Gold #4A5240 · White #FFFFFF

export const BRAND = {
  // Warm peach ramp (backgrounds)
  peach50: '#FAF7EE',
  peach100: '#FAF7EE',   // main background
  peach200: '#EFEBDD',   // card / neutral
  peach300: '#E8E4D6',   // secondary background
  peach400: '#4A5240',   // warm gold accent
  peach500: '#A8A695',   // muted gray
  // Brand magenta ramp
  magenta50: '#FAF7EE',
  magenta100: '#EFEBDD',
  magenta200: '#4A5240',
  magenta300: '#4A5240',
  magenta400: '#31372B',
  magenta500: '#31372B',  // primary brand magenta
  magenta600: '#262B20',  // hover
  magenta700: '#1F2419',
  // Brand navy ramp
  navy50: '#FAF7EE',
  navy100: '#E8E4D6',
  navy200: '#A8A695',
  navy300: '#6B6E5A',
  navy400: '#4A5240',
  navy500: '#31372B',     // primary dark navy
  navy600: '#262B20',
  navy700: '#1F2419',
  // Aliases (for backwards-compat with code that referenced blue50..blue900)
  blue50: '#FAF7EE',
  blue100: '#FAF7EE',
  blue200: '#EFEBDD',
  blue300: '#E8E4D6',
  blue400: '#4A5240',
  blue500: '#31372B',
  blue600: '#31372B',
  blue700: '#262B20',
  blue800: '#31372B',
  blue900: '#1F2419',
  // Ink & text
  ink: '#31372B',
  inkSoft: '#6B6E5A',
  muted: '#A8A695',
  border: '#E8E4D6',
  borderSoft: '#FAF7EE',
  bg: '#FAF7EE',
  bgSub: '#E8E4D6',
  white: '#ffffff',
  // Gradients
  gradient: 'linear-gradient(135deg, #31372B 0%, #31372B 50%, #4A5240 100%)',
  gradientDeep: 'linear-gradient(135deg, #262B20 0%, #31372B 100%)',
  gradientSoft: 'linear-gradient(135deg, #FAF7EE 0%, #E8E4D6 100%)',
  gradientInstagram: 'linear-gradient(135deg, #31372B 0%, #31372B 35%, #4A5240 70%, #31372B 100%)',
  gradientInstagramRing:
    'linear-gradient(45deg, #31372B 0%, #31372B 25%, #4A5240 50%, #31372B 75%, #31372B 100%)',
} as const

// ── AgriPay Palette (Blue & White) ─────────────────────────────────

export const AGRI = {
  bg: '#EAEBDC',
  bgSub: '#D8D9CA',
  white: SHARED.white,
  primary: '#E98074',
  primaryHover: '#E85A4F',
  primaryLight: '#F5D5D0',
  primarySoft: '#EAEBDC',
  accent: '#E85A4F',
  text: '#5D5D5D',
  textSecondary: '#8E8D8A',
  muted: '#8E8D8A',
  border: '#D8C3A5',
  borderLight: '#EAEBDC',
  card: SHARED.white,
  green: SHARED.success,
  greenLight: '#dcfce7',
  red: SHARED.error,
  redLight: '#fef2f2',
  gold: '#D8C3A5',
  goldLight: '#EAEBDC',
  gradient: 'linear-gradient(135deg, #E98074 0%, #E85A4F 50%, #D8C3A5 100%)',
  gradientSoft: 'linear-gradient(135deg, #EAEBDC 0%, #F5D5D0 100%)',
  gradientCard: 'linear-gradient(145deg, #E98074 0%, #E85A4F 100%)',
}

// ── AgriSocial Palette (Blue & White — Instagram-style) ───────────

export const SOCIAL = {
  bg: '#EDE8F5',
  bgSub: '#D4D8E8',
  white: SHARED.white,
  primary: '#3D52A0',
  primaryHover: '#2A3A80',
  primaryLight: '#ADBBD4',
  primarySoft: '#EDE8F5',
  accent: '#7091E6',
  text: '#1A1A1A',
  textSecondary: '#4A4A4A',
  muted: '#8697C4',
  border: '#ADBBD4',
  borderLight: '#D4D8E8',
  card: SHARED.white,
  green: '#3D52A0',
  greenLight: '#EDE8F5',
  red: '#E85A4F',
  redLight: '#fef2f2',
  gradient: 'linear-gradient(135deg, #3D52A0 0%, #7091E6 50%, #8697C4 100%)',
  gradientSoft: 'linear-gradient(135deg, #EDE8F5 0%, #ADBBD4 100%)',
  gradientRing:
    'linear-gradient(45deg, #3D52A0 0%, #7091E6 25%, #8697C4 50%, #ADBBD4 75%, #3D52A0 100%)',
  clips: {
    bg: '#0a0f1e',
    card: '#111827',
    text: '#f8fafc',
    muted: '#94a3b8',
    accent: '#7091E6',
    gradient: 'linear-gradient(135deg, #3D52A0 0%, #7091E6 50%, #8697C4 100%)',
  },
}

// ── Auth Palette (Image 1 — warm peach + magenta + navy) ──────────

export const AUTH = {
  bg: '#FAF7EE',
  white: SHARED.white,
  primary: '#31372B',
  primaryHover: '#262B20',
  primaryLight: '#EFEBDD',
  text: '#31372B',
  muted: '#A8A695',
  border: '#E8E4D6',
  gradient: 'linear-gradient(135deg, #4A5240 0%, #31372B 40%, #262B20 100%)',
  gradientBlob1: 'radial-gradient(circle at 30% 20%, rgba(49,55,43,0.18) 0%, transparent 50%)',
  gradientBlob2: 'radial-gradient(circle at 80% 80%, rgba(49,55,43,0.14) 0%, transparent 50%)',
}

// ── Admin Palette (Dark Slate — kept dark for data density) ───────

export const ADMIN = {
  bg: '#0b1220',
  bgSub: '#111a2e',
  card: '#111a2e',
  cardHover: '#1a2540',
  white: '#f8fafc',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  primaryLight: '#0c1a36',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  muted: '#64748b',
  border: '#1f2a44',
  borderLight: '#111a2e',
  green: '#22c55e',
  greenLight: '#14532d',
  red: '#ef4444',
  redLight: '#450a0a',
  blue: '#3b82f6',
  blueLight: '#1e3a5f',
  yellow: '#eab308',
  yellowLight: '#422006',
  gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
  sidebar: '#070d1a',
  sidebarHover: '#0f1a30',
  sidebarActive: '#2563eb',
}

// ── Buyer Palette (Image 1 — warm peach + magenta + navy) ──────────

export const BUYER = {
  bg: '#FAF7EE',
  bgSub: '#E8E4D6',
  white: SHARED.white,
  primary: '#31372B',
  primaryHover: '#262B20',
  primaryLight: '#EFEBDD',
  primarySoft: '#FAF7EE',
  accent: '#31372B',
  text: '#31372B',
  textSecondary: '#6B6E5A',
  muted: '#A8A695',
  border: '#E8E4D6',
  borderLight: '#FAF7EE',
  card: SHARED.white,
  red: SHARED.error,
  redLight: '#fef2f2',
  gold: '#4A5240',
  goldLight: '#FAF7EE',
  green: SHARED.success,
  greenLight: '#dcfce7',
  gradient: 'linear-gradient(135deg, #31372B 0%, #31372B 50%, #4A5240 100%)',
  gradientSoft: 'linear-gradient(135deg, #FAF7EE 0%, #E8E4D6 100%)',
}

// ── Farmer Palette (Image 1 — warm peach + magenta + navy) ─────────

export const FARMER = {
  bg: '#FAF7EE',
  bgSub: '#E8E4D6',
  white: SHARED.white,
  primary: '#31372B',
  primaryHover: '#262B20',
  primaryLight: '#EFEBDD',
  primarySoft: '#FAF7EE',
  accent: '#31372B',
  text: '#31372B',
  textSecondary: '#6B6E5A',
  muted: '#A8A695',
  border: '#E8E4D6',
  borderLight: '#FAF7EE',
  card: SHARED.white,
  red: SHARED.error,
  redLight: '#fef2f2',
  gold: '#4A5240',
  goldLight: '#FAF7EE',
  green: SHARED.success,
  greenLight: '#dcfce7',
  gradient: 'linear-gradient(135deg, #31372B 0%, #31372B 50%, #4A5240 100%)',
  gradientSoft: 'linear-gradient(135deg, #FAF7EE 0%, #E8E4D6 100%)',
}

// ── Transporter Palette (Image 1 — warm peach + magenta + navy) ────

export const TRANSPORTER = {
  bg: '#FAF7EE',
  bgSub: '#E8E4D6',
  white: SHARED.white,
  primary: '#31372B',
  primaryHover: '#262B20',
  primaryLight: '#EFEBDD',
  primarySoft: '#FAF7EE',
  accent: '#31372B',
  text: '#31372B',
  textSecondary: '#6B6E5A',
  muted: '#A8A695',
  border: '#E8E4D6',
  borderLight: '#FAF7EE',
  card: SHARED.white,
  red: SHARED.error,
  redLight: '#fef2f2',
  green: SHARED.success,
  greenLight: '#dcfce7',
  gradient: 'linear-gradient(135deg, #31372B 0%, #31372B 50%, #4A5240 100%)',
  gradientSoft: 'linear-gradient(135deg, #FAF7EE 0%, #E8E4D6 100%)',
}

// ── Reusable Style Presets ─────────────────────────────────────────

export const inputStyle = (palette: { border: string; text: string; bg?: string; primary?: string }): React.CSSProperties => ({
  width: '100%',
  padding: '13px 16px',
  border: `1.5px solid ${palette.border}`,
  borderRadius: '12px',
  fontSize: '0.95rem',
  color: palette.text,
  background: (palette as any).bg || SHARED.white,
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box' as const,
  fontFamily: SHARED.font,
})

export const labelStyle = (palette: { text: string; muted: string }): React.CSSProperties => ({
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: palette.muted,
  marginBottom: '6px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  fontFamily: SHARED.font,
})

export const buttonPrimary = (palette: { primary: string; primaryHover?: string }): React.CSSProperties => ({
  width: '100%',
  padding: '14px 24px',
  background: palette.primary,
  color: SHARED.white,
  border: 'none',
  borderRadius: '14px',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: SHARED.font,
  transition: 'background 0.2s, transform 0.1s',
  boxShadow: SHARED.shadow,
})

export const buttonSecondary = (palette: { primary: string; primaryLight: string; text: string }): React.CSSProperties => ({
  padding: '10px 20px',
  background: palette.primaryLight,
  color: palette.primary,
  border: `1.5px solid ${palette.primary}22`,
  borderRadius: '12px',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: SHARED.font,
})

export const cardStyle = (palette: { white: string; border: string; shadow?: string }): React.CSSProperties => ({
  background: palette.white,
  border: `1px solid ${palette.border}`,
  borderRadius: SHARED.radius,
  padding: '24px',
  boxShadow: palette.shadow || SHARED.shadow,
  transition: 'box-shadow 0.2s, transform 0.15s',
})

export const navStyle = (palette: { white: string; border: string; primary?: string; shadow?: string }): React.CSSProperties => ({
  position: 'sticky' as const,
  top: 0,
  zIndex: 50,
  background: palette.white,
  borderBottom: `1px solid ${palette.border}`,
  padding: '14px 24px',
  boxShadow: palette.shadow || '0 1px 4px rgba(15,23,42,0.04)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
})

export const breadcrumbNav = (palette: { primary: string; muted: string; border: string; white: string }) => ({
  background: palette.white,
  borderBottom: `1px solid ${palette.border}`,
  padding: '14px 24px',
  boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
})

// ── Status Colors (shared across modules) ─────────────────────────

export const STATUS = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  confirmed: { bg: '#dbeafe', color: '#1e40af', label: 'Confirmed' },
  in_transit: { bg: '#e0e7ff', color: '#3730a3', label: 'In Transit' },
  delivered: { bg: '#d1fae5', color: '#065f46', label: 'Delivered' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  returned: { bg: '#fce7f3', color: '#9d174d', label: 'Returned' },
  active: { bg: '#d1fae5', color: '#065f46', label: 'Active' },
  closed: { bg: '#f3f4f6', color: '#374151', label: 'Closed' },
  failed: { bg: '#fee2e2', color: '#991b1b', label: 'Failed' },
  success: { bg: '#d1fae5', color: '#065f46', label: 'Success' },
  available: { bg: '#d1fae5', color: '#065f46', label: 'Available' },
  unavailable: { bg: '#fee2e2', color: '#991b1b', label: 'Unavailable' },
  on_trip: { bg: '#dbeafe', color: '#1e40af', label: 'On Trip' },
} as const

export function getStatusStyle(status: string) {
  return STATUS[status as keyof typeof STATUS] || { bg: '#f3f4f6', color: '#374151', label: status }
}
