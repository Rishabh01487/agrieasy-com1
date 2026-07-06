/**
 * AgriEasy — Unified Design System
 *
 * Four module-specific palettes built on a shared foundation.
 * Every page imports from here — no more per-file color constants.
 *
 * Design principles:
 *   - AgriPay:   Deep indigo/violet fintech — trust, money, premium
 *   - AgriSocial: Warm amber/orange social — energy, community, vibrancy
 *   - Auth:      Soft gradient purple — welcoming, onboarding
 *   - Admin:     Slate dark mode — authority, clarity, data-density
 *   - Buyer:     Emerald/teal — commerce, growth, marketplace
 *   - Farmer:    Forest green — agriculture, nature, harvest
 *   - Transporter: Deep blue — logistics, reliability, movement
 */

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
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  shadowMd: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
  shadowLg: '0 10px 25px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.06)',
  shadowXl: '0 20px 50px -12px rgba(0,0,0,0.15)',
  radius: '16px',
  radiusSm: '10px',
  radiusLg: '20px',
  radiusXl: '28px',
  font: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
} as const

// ── AgriPay Palette (Deep Indigo Fintech) ─────────────────────────

export const AGRI = {
  bg: '#f5f3ff',
  bgSub: '#ede9fe',
  white: SHARED.white,
  primary: '#6d28d9',
  primaryHover: '#5b21b6',
  primaryLight: '#ede9fe',
  primarySoft: '#f5f3ff',
  accent: '#7c3aed',
  text: '#1e1b4b',
  textSecondary: '#4c1d95',
  muted: '#6b7280',
  border: '#ddd6fe',
  borderLight: '#e9e5f5',
  card: SHARED.white,
  green: SHARED.success,
  greenLight: '#dcfce7',
  red: SHARED.error,
  redLight: '#fef2f2',
  gold: '#f59e0b',
  goldLight: '#fef9c3',
  gradient: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%)',
  gradientSoft: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
  gradientCard: 'linear-gradient(145deg, #6d28d9 0%, #4c1d95 100%)',
}

// ── AgriSocial Palette (Warm Amber Social) ────────────────────────

export const SOCIAL = {
  bg: '#fffbf5',
  bgSub: '#fff7ed',
  white: SHARED.white,
  primary: '#ea580c',
  primaryHover: '#c2410c',
  primaryLight: '#fff7ed',
  primarySoft: '#fffbf5',
  accent: '#f97316',
  text: '#1c1917',
  textSecondary: '#44403c',
  muted: '#78716c',
  border: '#fed7aa',
  borderLight: '#ffedd5',
  card: SHARED.white,
  green: '#16a34a',
  greenLight: '#dcfce7',
  red: '#ef4444',
  redLight: '#fef2f2',
  gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
  gradientSoft: 'linear-gradient(135deg, #fffbf5 0%, #fff7ed 100%)',
  clips: {
    bg: '#000000',
    card: '#1a1a1a',
    text: '#f5f5f5',
    muted: '#a3a3a3',
    accent: '#ea580c',
  },
}

// ── Auth Palette (Soft Purple Welcome) ────────────────────────────

export const AUTH = {
  bg: '#faf5ff',
  white: SHARED.white,
  primary: '#7c3aed',
  primaryHover: '#6d28d9',
  primaryLight: '#ede9fe',
  text: '#1e1b4b',
  muted: '#6b7280',
  border: '#ddd6fe',
  gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 40%, #6d28d9 100%)',
  gradientBlob1: 'radial-gradient(circle at 30% 20%, rgba(124,58,237,0.15) 0%, transparent 50%)',
  gradientBlob2: 'radial-gradient(circle at 80% 80%, rgba(139,92,246,0.1) 0%, transparent 50%)',
}

// ── Admin Palette (Slate Dark Authority) ──────────────────────────

export const ADMIN = {
  bg: '#0f172a',
  bgSub: '#1e293b',
  card: '#1e293b',
  cardHover: '#263348',
  white: '#f8fafc',
  primary: '#8b5cf6',
  primaryHover: '#7c3aed',
  primaryLight: '#1e1b4b',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  muted: '#64748b',
  border: '#334155',
  borderLight: '#1e293b',
  green: '#22c55e',
  greenLight: '#14532d',
  red: '#ef4444',
  redLight: '#450a0a',
  blue: '#3b82f6',
  blueLight: '#1e3a5f',
  yellow: '#eab308',
  yellowLight: '#422006',
  gradient: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
  sidebar: '#0c1322',
  sidebarHover: '#1a2744',
  sidebarActive: '#6d28d9',
}

// ── Buyer Palette (Emerald Commerce) ──────────────────────────────

export const BUYER = {
  bg: '#f0fdf4',
  bgSub: '#dcfce7',
  white: SHARED.white,
  primary: '#059669',
  primaryHover: '#047857',
  primaryLight: '#d1fae5',
  primarySoft: '#ecfdf5',
  accent: '#10b981',
  text: '#064e3b',
  textSecondary: '#065f46',
  muted: '#6b7280',
  border: '#a7f3d0',
  borderLight: '#d1fae5',
  card: SHARED.white,
  red: SHARED.error,
  redLight: '#fef2f2',
  gold: '#d97706',
  goldLight: '#fef9c3',
  gradient: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
  gradientSoft: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
}

// ── Farmer Palette (Forest Agriculture) ───────────────────────────

export const FARMER = {
  bg: '#fefce8',
  bgSub: '#fef9c3',
  white: SHARED.white,
  primary: '#65a30d',
  primaryHover: '#4d7c0f',
  primaryLight: '#ecfccb',
  primarySoft: '#f7fee7',
  accent: '#84cc16',
  text: '#1a2e05',
  textSecondary: '#365314',
  muted: '#6b7280',
  border: '#bef264',
  borderLight: '#ecfccb',
  card: SHARED.white,
  red: SHARED.error,
  redLight: '#fef2f2',
  gold: '#d97706',
  goldLight: '#fef9c3',
  gradient: 'linear-gradient(135deg, #65a30d 0%, #84cc16 50%, #a3e635 100%)',
  gradientSoft: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
}

// ── Transporter Palette (Deep Blue Logistics) ──────────────────────

export const TRANSPORTER = {
  bg: '#eff6ff',
  bgSub: '#dbeafe',
  white: SHARED.white,
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#dbeafe',
  primarySoft: '#eff6ff',
  accent: '#3b82f6',
  text: '#1e3a5f',
  textSecondary: '#1e40af',
  muted: '#6b7280',
  border: '#93c5fd',
  borderLight: '#dbeafe',
  card: SHARED.white,
  red: SHARED.error,
  redLight: '#fef2f2',
  green: SHARED.success,
  greenLight: '#dcfce7',
  gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
  gradientSoft: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
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
  boxShadow: palette.shadow || '0 1px 4px rgba(0,0,0,0.04)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
})

export const breadcrumbNav = (palette: { primary: string; muted: string; border: string; white: string }) => ({
  background: palette.white,
  borderBottom: `1px solid ${palette.border}`,
  padding: '14px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
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