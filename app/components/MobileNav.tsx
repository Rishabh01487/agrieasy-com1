'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { SHARED } from '@/lib/styles'
import SideMenu from './SideMenu'
import OverflowMenu, { OverflowMenuItem } from './OverflowMenu'

interface MobileNavProps {
  /** Page title shown in the mobile top bar */
  title: string
  /** Optional back link (if not provided, shows ☰ menu) */
  backHref?: string
  /** Right-side action buttons (desktop only — hidden on mobile) */
  rightActions?: ReactNode
  /** Overflow menu items for the ⋮ button (mobile only) */
  overflowItems?: OverflowMenuItem[]
  /** Children render below the nav */
  children: ReactNode
  /** Optional accent color (defaults to blue) */
  accent?: string
}

/**
 * Responsive navigation wrapper:
 *
 * - Desktop (≥641px): renders a standard sticky top nav with the title on
 *   the left, right-actions on the right, optional ⋮ overflow.
 *
 * - Mobile (≤640px): renders a minimal top bar (☰ + title + ⋮) and a
 *   bottom tab bar (rendered separately by BottomTabBar in the layout).
 *   The ☰ opens a slide-in SideMenu drawer with all the nav links.
 *
 * Usage: wrap each dashboard / listing page's content in <MobileNav>.
 */
export default function MobileNav({ title, backHref, rightActions, overflowItems, children, accent = '#2563eb' }: MobileNavProps) {
  return (
    <>
      {/* SideMenu is always mounted — it renders its own trigger + drawer */}
      {!backHref && <SideMenu />}

      {/* Sticky top bar */}
      <nav
        className="mobile-nav-bar"
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 14px',
          paddingTop: 'calc(10px + env(safe-area-inset-top))',
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: SHARED.font,
        }}
      >
        {/* Left: back link (if provided) — the ☰ is rendered by SideMenu otherwise */}
        {backHref && (
          <Link href={backHref} style={{ color: accent, textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← <span className="hide-on-mobile">Back</span>
          </Link>
        )}

        {/* Title */}
        <h1 style={{
          margin: 0, flex: 1, minWidth: 0,
          fontSize: '1rem', fontWeight: 800, color: '#0f172a',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</h1>

        {/* Right actions (desktop only — hidden on mobile via CSS) */}
        <div className="hide-on-mobile" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {rightActions}
        </div>

        {/* Overflow ⋮ (mobile only) */}
        {overflowItems && overflowItems.length > 0 && (
          <div className="show-on-mobile-only">
            <OverflowMenu items={overflowItems} />
          </div>
        )}
      </nav>

      {/* Page content */}
      {children}
    </>
  )
}
