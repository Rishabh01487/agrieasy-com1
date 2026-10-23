'use client'

/**
 * Madhubani-art shared UI kit — palette + Feather-style SVG icons + style
 * helpers used across the farmer & buyer dashboards.
 *
 * Palette (matches the AgriSocial feed / PWA install / Cookie consent):
 *   navy      #1A1A3E  (primary — headings, buttons, active states)
 *   pink      #D45D7E  (accent — highlights, badges, gradients)
 *   gold      #D4A574  (borders, dividers, decorative elements)
 *   cream     #FFF8F0  (backgrounds, cards)
 *   deepPink  #B83A5C  (secondary accent)
 *   pinkGray  #8B6B7A  (subtitle / muted text)
 */

import type { CSSProperties, ReactNode, SVGProps } from 'react'

export const MH = {
  navy: '#1A1A3E',
  pink: '#D45D7E',
  gold: '#D4A574',
  cream: '#FFF8F0',
  deepPink: '#B83A5C',
  pinkGray: '#8B6B7A',
  white: '#FFFFFF',
  error: '#B83A5C',
  errorLight: '#FBE6EC',
  success: '#3F7D5E',
  successLight: '#E4F0E8',
  warning: '#C2822B',
  warningLight: '#FBEFD9',
} as const

/* ── Page background — cream with a subtle Madhubani paper texture ── */
export const mhPageBg: CSSProperties = {
  minHeight: '100vh',
  background: `
    repeating-linear-gradient(45deg, transparent 0 4px, rgba(212,165,116,0.04) 4px 5px),
    ${MH.cream}
  `,
  fontFamily: "var(--font-poppins), 'Poppins', 'Segoe UI', system-ui, sans-serif",
  color: MH.navy,
}

/* ── Card — white/cream with gold double-line (kohbar) border ── */
export function mhCardStyle(opts?: {
  doubleLine?: boolean
  padding?: number | string
  background?: string
}): CSSProperties {
  const doubleLine = opts?.doubleLine ?? false
  return {
    background: opts?.background ?? MH.white,
    border: `1px solid ${MH.gold}`,
    borderRadius: '16px',
    padding: opts?.padding ?? '24px',
    boxShadow: doubleLine
      ? `0 4px 14px rgba(26,26,62,0.08), inset 0 0 0 2px ${MH.cream}, inset 0 0 0 3px ${MH.gold}`
      : '0 4px 14px rgba(26,26,62,0.08)',
    transition: 'box-shadow 0.2s, transform 0.15s',
  }
}

/* ── Primary button — navy → pink gradient with gold border ── */
export const mhPrimaryBtn = (opts?: { disabled?: boolean }): CSSProperties => ({
  background: opts?.disabled
    ? MH.pinkGray
    : `linear-gradient(135deg, ${MH.navy}, ${MH.pink})`,
  color: MH.cream,
  border: `1px solid ${MH.gold}`,
  borderRadius: '10px',
  fontWeight: 700,
  cursor: opts?.disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
})

/* ── Secondary button — cream with gold border, navy text ── */
export const mhSecondaryBtn: CSSProperties = {
  background: MH.cream,
  color: MH.navy,
  border: `1px solid ${MH.gold}`,
  borderRadius: '10px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
}

/* ── Pill / badge — pink with white text, OR cream with navy text ── */
export function mhPill(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 100,
    background: active ? MH.pink : MH.cream,
    color: active ? MH.white : MH.navy,
    border: `1.5px solid ${active ? MH.deepPink : MH.gold}`,
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
  }
}

/* ── Input — cream tinted with gold border ── */
export const mhInput: CSSProperties = {
  width: '100%',
  padding: '13px 16px',
  border: `1.5px solid ${MH.gold}`,
  borderRadius: '12px',
  fontSize: '0.95rem',
  color: MH.navy,
  background: MH.white,
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
}

/* ── Label — pink-gray uppercase ── */
export const mhLabel: CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: MH.pinkGray,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
}

/* ── Section divider — gold line with a small diamond in the center ── */
export function mhDivider(): ReactNode {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '16px 0',
      color: MH.gold,
    }}>
      <div style={{ flex: 1, height: 1, background: MH.gold }} />
      <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>◇</span>
      <div style={{ flex: 1, height: 1, background: MH.gold }} />
    </div>
  )
}

/* ── Nav bar — cream translucent with gold bottom border ── */
export const mhNavStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  background: 'rgba(255,248,240,0.92)',
  borderBottom: `1px solid ${MH.gold}`,
  padding: '14px 24px',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 1px 4px rgba(26,26,62,0.04)',
}

/* ── Madhubani top decorative strip (same motif as PWA / Cookie consent) ── */
export function MadhubaniStrip({ patternId = 'mh-strip' }: { patternId?: string }) {
  return (
    <svg
      width="100%"
      height={6}
      aria-hidden="true"
      style={{ display: 'block', position: 'absolute', top: 0, left: 0, right: 0 }}
    >
      <defs>
        <pattern id={patternId} patternUnits="userSpaceOnUse" width="4" height="6">
          <rect width="4" height="6" fill={MH.cream} />
          <rect width="4" height="0.5" fill={MH.gold} />
          <rect y="5.5" width="4" height="0.5" fill={MH.gold} />
          <polygon points="0,5.5 1,0.5 2,5.5" fill={MH.navy} />
          <polygon points="2,0.5 3,5.5 4,0.5" fill={MH.pink} />
        </pattern>
      </defs>
      <rect width="100%" height="6" fill={`url(#${patternId})`} />
    </svg>
  )
}

/* ──────────────────────────────────────────────────────────────────
 *  Feather-style SVG icons (stroke=currentColor, strokeWidth=2.2)
 * ────────────────────────────────────────────────────────────────── */

type IconProps = { size?: number; className?: string; style?: CSSProperties }

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

const iconStyle = (style?: CSSProperties): CSSProperties => ({ flexShrink: 0, ...style })

export function WheatIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M12 22V8" />
      <path d="M12 8c0-2 1-3 2.5-3.5C13 3 12 2 12 2s-1 1-2.5 2.5C11 5 12 6 12 8z" />
      <path d="M12 13c0-1.5 1-2.5 2.5-3C13 8.5 12 7.5 12 7.5s-1 1-2.5 2.5c1.5.5 2.5 1.5 2.5 3z" />
      <path d="M12 18c0-1.5 1-2.5 2.5-3C13 13.5 12 12.5 12 12.5s-1 1-2.5 2.5c1.5.5 2.5 1.5 2.5 3z" />
      <path d="M8 6c1 .8 2 1.5 2 3M16 6c-1 .8-2 1.5-2 3" />
      <path d="M7 11c1 .8 2 1.5 2 3M17 11c-1 .8-2 1.5-2 3" />
      <path d="M6 16c1 .8 2 1.5 2 3M18 16c-1 .8-2 1.5-2 3" />
    </svg>
  )
}

export function TractorIcon({ size = 18, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M3 4h9v8H3z" />
      <path d="M12 8h4l3 3v3" />
      <circle cx="7" cy="18" r="3" />
      <circle cx="17" cy="18" r="2" />
      <path d="M3 12v3a3 3 0 0 0 3 3h2" />
    </svg>
  )
}

export function ShoppingCartIcon({ size = 18, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <circle cx="9" cy="21" r="1.5" />
      <circle cx="18" cy="21" r="1.5" />
      <path d="M2 3h2.5l2.2 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21.5 7H6" />
    </svg>
  )
}

export function MapPinIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function SmartphoneIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  )
}

export function CreditCardIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </svg>
  )
}

export function SettingsIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

export function StoreIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M9 21v-6h6v6" />
    </svg>
  )
}

export function ScaleIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M12 3v18" />
      <path d="M7 21h10" />
      <path d="M5 7h14" />
      <path d="M5 7l-3 6a3 3 0 0 0 6 0L5 7z" />
      <path d="M19 7l-3 6a3 3 0 0 0 6 0l-3-6z" />
    </svg>
  )
}

export function TrendingUpIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

export function TruckIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M1 4h14v12H1z" />
      <path d="M15 8h4l3 3v5h-7" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  )
}

export function SearchIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function BookIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5v-18z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </svg>
  )
}

export function BarChartIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <line x1="3" y1="21" x2="21" y2="21" />
      <rect x="5" y="11" width="3" height="8" />
      <rect x="10.5" y="6" width="3" height="13" />
      <rect x="16" y="14" width="3" height="5" />
    </svg>
  )
}

export function SproutIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M12 22V12" />
      <path d="M12 12C12 9 9 7 5 7c0 4 3 5 7 5z" />
      <path d="M12 12c0-3 3-5 7-5 0 4-3 5-7 5z" />
    </svg>
  )
}

export function HandshakeIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M11 17l-2 2-2-2-3-3 4-4 3 3" />
      <path d="M13 17l2 2 2-2 3-3-4-4-3 3" />
      <path d="M2 9l4-4 3 2 3-2 3 2 3-2 4 4" />
      <path d="M11 13l2 2" />
    </svg>
  )
}

export function DollarSignIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

export function ClockIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  )
}

export function HourglassIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M6 2h12" />
      <path d="M6 22h12" />
      <path d="M6 2c0 5 6 7 6 10 0 3-6 5-6 10" />
      <path d="M18 2c0 5-6 7-6 10 0 3 6 5 6 10" />
    </svg>
  )
}

export function InboxIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

export function FileTextIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  )
}

export function CheckIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <polyline points="5 13 9 17 19 7" />
    </svg>
  )
}

export function CheckCircleIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

export function PlusIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function AlertTriangleIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function CameraIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

export function TrashIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

export function EditIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function UserIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function CalendarIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2.5" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  )
}

export function ListIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

export function ReceiptIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  )
}

export function XIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function XCircleIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export function WalletIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2H3z" />
      <path d="M3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path d="M21 12h-5a2 2 0 0 0 0 4h5" />
    </svg>
  )
}

export function PhoneIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export function ShareIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

export function LogOutIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function TagIcon({ size = 16, style }: IconProps) {
  return (
    <svg {...base(size)} style={iconStyle(style)} aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}
