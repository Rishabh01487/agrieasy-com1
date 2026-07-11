'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import { SHARED } from '@/lib/styles'

export interface OverflowMenuItem {
  icon?: string
  label: string
  onClick: () => void
  /** 'danger' renders red (for delete actions) */
  variant?: 'default' | 'danger'
  /** Show a divider above this item */
  divider?: boolean
}

interface OverflowMenuProps {
  items: OverflowMenuItem[]
  /** Optional trigger element; defaults to a ⋮ button */
  trigger?: ReactNode
  /** Alignment of the dropdown: 'left' or 'right' (default right) */
  align?: 'left' | 'right'
}

export default function OverflowMenu({ items, trigger, align = 'right' }: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const handleItemClick = (item: OverflowMenuItem) => {
    setOpen(false)
    setTimeout(() => item.onClick(), 100)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        aria-label="More actions"
        aria-expanded={open}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px 10px', fontSize: '1.3rem', color: '#64748b',
          borderRadius: 6, lineHeight: 1, display: 'flex', alignItems: 'center',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        {trigger || '⋮'}
      </button>

      {open && (
        <>
          {/* Mobile: bottom sheet */}
          {isMobile ? (
            <>
              <div
                onClick={() => setOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 3000 }}
              />
              <div
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0,
                  background: '#fff', borderRadius: '20px 20px 0 0',
                  zIndex: 3001, paddingBottom: 'env(safe-area-inset-bottom)',
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
                  animation: 'slideUp 0.2s ease-out',
                  fontFamily: SHARED.font,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
                </div>
                <div style={{ padding: 8 }}>
                  {items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleItemClick(item)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '14px 16px',
                        background: 'none', border: 'none',
                        borderTop: item.divider ? '1px solid #e2e8f0' : 'none',
                        cursor: 'pointer', textAlign: 'left',
                        color: item.variant === 'danger' ? '#dc2626' : '#1e293b',
                        fontSize: '0.92rem', fontWeight: 600,
                        fontFamily: SHARED.font,
                      }}
                    >
                      {item.icon && <span style={{ fontSize: '1.2rem', width: 24, textAlign: 'center' }}>{item.icon}</span>}
                      <span style={{ flex: 1 }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
            </>
          ) : (
            /* Desktop: dropdown */
            <div
              style={{
                position: 'absolute',
                top: '100%', right: align === 'right' ? 0 : 'auto', left: align === 'left' ? 0 : 'auto',
                marginTop: 4,
                minWidth: 200,
                background: '#fff',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                border: '1px solid #e2e8f0',
                padding: 6,
                zIndex: 1000,
                animation: 'popIn 0.15s ease-out',
              }}
            >
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleItemClick(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 12px',
                    background: 'none', border: 'none',
                    borderTop: item.divider ? '1px solid #e2e8f0' : 'none',
                    borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                    color: item.variant === 'danger' ? '#dc2626' : '#1e293b',
                    fontSize: '0.86rem', fontWeight: 600,
                    fontFamily: SHARED.font,
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  {item.icon && <span style={{ fontSize: '1.1rem', width: 20, textAlign: 'center' }}>{item.icon}</span>}
                  <span style={{ flex: 1 }}>{item.label}</span>
                </button>
              ))}
            </div>
          )}
          <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }`}</style>
        </>
      )}
    </div>
  )
}
