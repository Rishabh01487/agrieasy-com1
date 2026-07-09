'use client'

import React from 'react'

/**
 * Sleek SVG icon set for AgriSocial — line-style, 24x24 viewBox, currentColor.
 * Inspired by Instagram/Lucide icon aesthetics: thin strokes, rounded caps,
 * minimal fill. No emojis.
 *
 * Usage:
 *   <Icon name="heart" size={24} color="#0f172a" />
 *   <Icon name="heart" size={24} color="#ef4444" filled />   // solid heart
 */

export type IconName =
  | 'heart' | 'heart-filled'
  | 'comment' | 'send' | 'bookmark' | 'bookmark-filled'
  | 'share' | 'link' | 'trash' | 'more'
  | 'search' | 'home' | 'explore' | 'reels' | 'heart-nav' | 'dm' | 'plus'
  | 'camera' | 'image' | 'video' | 'location' | 'chevron-left' | 'chevron-right'
  | 'close' | 'check' | 'eye' | 'play'

interface IconProps {
  name: IconName
  size?: number
  color?: string
  filled?: boolean
  strokeWidth?: number
  style?: React.CSSProperties
  className?: string
}

export function Icon({ name, size = 24, color = 'currentColor', filled = false, strokeWidth = 1.8, style, className }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
    className,
    'aria-hidden': true,
  }

  switch (name) {
    // ── Heart ───────────────────────────────────────────────
    case 'heart':
    case 'heart-filled':
      return (
        <svg {...common} fill={filled || name === 'heart-filled' ? color : 'none'}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )

    // ── Comment (speech bubble) ─────────────────────────────
    case 'comment':
      return (
        <svg {...common}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      )

    // ── Send / DM (paper plane) ─────────────────────────────
    case 'send':
      return (
        <svg {...common}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      )

    // ── Bookmark / Save ─────────────────────────────────────
    case 'bookmark':
    case 'bookmark-filled':
      return (
        <svg {...common} fill={filled || name === 'bookmark-filled' ? color : 'none'}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )

    // ── Share (outbound arrow) ───────────────────────────────
    case 'share':
      return (
        <svg {...common}>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )

    // ── Link (copy link) ────────────────────────────────────
    case 'link':
      return (
        <svg {...common}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )

    // ── Trash ───────────────────────────────────────────────
    case 'trash':
      return (
        <svg {...common}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      )

    // ── More (three dots horizontal) ────────────────────────
    case 'more':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
          <circle cx="5" cy="12" r="1.5" fill={color} stroke="none" />
          <circle cx="19" cy="12" r="1.5" fill={color} stroke="none" />
        </svg>
      )

    // ── Search ──────────────────────────────────────────────
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )

    // ── Home ────────────────────────────────────────────────
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )

    // ── Explore (compass) ───────────────────────────────────
    case 'explore':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      )

    // ── Reels (clapperboard) ────────────────────────────────
    case 'reels':
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <line x1="7" y1="2" x2="11" y2="6" />
          <line x1="13" y1="2" x2="17" y2="6" />
          <polygon points="10 14 14 16 10 18 10 14" fill={color} stroke="none" />
        </svg>
      )

    // ── Heart nav (outline, for activity) ───────────────────
    case 'heart-nav':
      return (
        <svg {...common}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )

    // ── DM (paper plane, slightly different) ────────────────
    case 'dm':
      return (
        <svg {...common}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      )

    // ── Plus (create) ───────────────────────────────────────
    case 'plus':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )

    // ── Camera ──────────────────────────────────────────────
    case 'camera':
      return (
        <svg {...common}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )

    // ── Image ───────────────────────────────────────────────
    case 'image':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )

    // ── Video ───────────────────────────────────────────────
    case 'video':
      return (
        <svg {...common}>
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      )

    // ── Location pin ────────────────────────────────────────
    case 'location':
      return (
        <svg {...common}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )

    // ── Chevron left ────────────────────────────────────────
    case 'chevron-left':
      return (
        <svg {...common}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      )

    // ── Chevron right ───────────────────────────────────────
    case 'chevron-right':
      return (
        <svg {...common}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )

    // ── Close (X) ───────────────────────────────────────────
    case 'close':
      return (
        <svg {...common}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )

    // ── Check ───────────────────────────────────────────────
    case 'check':
      return (
        <svg {...common}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )

    // ── Eye (views) ─────────────────────────────────────────
    case 'eye':
      return (
        <svg {...common}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )

    // ── Play ────────────────────────────────────────────────
    case 'play':
      return (
        <svg {...common} fill={color}>
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )

    default:
      return null
  }
}

/**
 * IconButton — a sleek, minimalist action button wrapping an Icon.
 * Used for like, comment, share, save, delete in feed/post pages.
 */
export function IconButton({
  name,
  size = 24,
  color = '#0f172a',
  filled = false,
  onClick,
  title,
  active = false,
  activeColor,
  badge,
  style,
}: {
  name: IconName
  size?: number
  color?: string
  filled?: boolean
  onClick?: () => void
  title?: string
  active?: boolean
  activeColor?: string
  badge?: number | string
  style?: React.CSSProperties
}) {
  const iconColor = active && activeColor ? activeColor : color
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        background: 'none',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        padding: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        position: 'relative',
        transition: 'transform 0.15s ease, background 0.15s ease',
        ...(onClick ? { ':hover': { transform: 'scale(1.1)', background: 'rgba(37,99,235,0.06)' } } : {}),
        ...style,
      }}
    >
      <Icon name={name} size={size} color={iconColor} filled={filled || active} />
      {(badge !== undefined && badge !== null && badge !== 0) && (
        <span style={{
          position: 'absolute',
          top: -2,
          right: -2,
          background: '#ef4444',
          color: '#fff',
          fontSize: '0.62rem',
          fontWeight: 800,
          borderRadius: '100px',
          padding: '1px 5px',
          minWidth: 16,
          textAlign: 'center',
          lineHeight: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}>
          {typeof badge === 'number' && badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}
