'use client'

/**
 * Shared category icons — Feather-style SVG icons for all AgriSocial pages.
 * Used in: feed, clips, explore, post detail, profile.
 * These replace the old emoji icons (🌾💰🔬🚜🐄🌱🌍) with consistent SVGs.
 */

type IconProps = { size?: number; className?: string }

export function FarmingIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" />
      <path d="M12 22V12" />
      <path d="M4 7l8 5 8-5" />
    </svg>
  )
}

export function TradingIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

export function TechniqueIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V2" />
      <line x1="9" y1="2" x2="15" y2="2" />
    </svg>
  )
}

export function EquipmentIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l3-3h10l3 3v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z" />
      <circle cx="7" cy="16" r="2" />
      <circle cx="17" cy="16" r="2" />
    </svg>
  )
}

export function LivestockIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M16 17h1" />
      <path d="M2 17a2.5 2.5 0 1 0 5 0" />
      <path d="M8 17h7" />
    </svg>
  )
}

export function OrganicIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c1.4 9.3-3.6 15.65-8.2 17.04" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  )
}

export function GlobeIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function TrendingIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

export function ClockIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function FollowingIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 11h-6" />
      <path d="M19 8v6" />
    </svg>
  )
}

/* ---------------------------------------------------------------- */
/* Category config — single source of truth for all pages            */
/* ---------------------------------------------------------------- */

export interface CategoryConfig {
  key: string
  label: string
  icon: React.ReactNode
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'all', label: 'All', icon: <GlobeIcon /> },
  { key: 'farming', label: 'Farming', icon: <FarmingIcon /> },
  { key: 'agritrading', label: 'Trading', icon: <TradingIcon /> },
  { key: 'technique', label: 'Technique', icon: <TechniqueIcon /> },
  { key: 'equipment', label: 'Equipment', icon: <EquipmentIcon /> },
  { key: 'livestock', label: 'Livestock', icon: <LivestockIcon /> },
  { key: 'organic', label: 'Organic', icon: <OrganicIcon /> },
]

// Map for quick lookup by key (replaces the old catIcon record)
export const catIconMap: Record<string, React.ReactNode> = {
  all: <GlobeIcon />,
  farming: <FarmingIcon />,
  agritrading: <TradingIcon />,
  technique: <TechniqueIcon />,
  equipment: <EquipmentIcon />,
  livestock: <LivestockIcon />,
  organic: <OrganicIcon />,
  weather: <ClockIcon />,  // weather doesn't have a dedicated icon; use clock
  general: <GlobeIcon />,
}

/* ---------------------------------------------------------------- */
/* Mithila-painting pill background for category icons                */
/* Use this as the background of category pills so they're not just   */
/* plain white — adds a subtle Mithila-art pattern.                   */
/* ---------------------------------------------------------------- */

export function mithilaPillBackground(active: boolean): React.CSSProperties {
  if (active) {
    // Active pill: solid brand color (the icon is white)
    return { background: '#31372B' }
  }
  // Inactive pill: subtle Mithila-inspired pattern on cream background
  return {
    background: `
      repeating-linear-gradient(45deg, transparent 0 4px, rgba(200,64,58,0.04) 4px 5px),
      repeating-linear-gradient(-45deg, transparent 0 4px, rgba(46,110,74,0.04) 4px 5px),
      linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%)
    `,
  }
}
