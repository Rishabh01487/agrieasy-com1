'use client'

import { useEffect, useState, ReactNode } from 'react'
import { SHARED } from '@/lib/styles'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  height?: 'auto' | 'tall' | 'full'
}

export default function BottomSheet({ open, onClose, title, children, height = 'auto' }: BottomSheetProps) {
  const [render, setRender] = useState(open)

  useEffect(() => {
    if (open) setRender(true)
    else {
      const t = setTimeout(() => setRender(false), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!render) return null

  const sheetHeight = height === 'full' ? '90vh' : height === 'tall' ? '70vh' : 'auto'
  const maxSheetHeight = height === 'auto' ? '85vh' : sheetHeight

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.5)',
          zIndex: 3000,
          opacity: open ? 1 : 0,
          transition: 'opacity 0.25s ease-out',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          zIndex: 3001,
          maxHeight: maxSheetHeight,
          height: sheetHeight,
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.25s ease-out',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          fontFamily: SHARED.font,
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '10px 0 6px', cursor: 'grab', flexShrink: 0,
          }}
          onClick={onClose}
        >
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: '#cbd5e1',
          }} />
        </div>

        {/* Title bar */}
        {title && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 18px 12px',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: '#f1f5f9', border: 'none', color: '#64748b',
                width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: '1rem',
              }}
            >✕</button>
          </div>
        )}

        {/* Content — scrollable */}
        <div style={{ overflowY: 'auto', padding: 14, flex: 1 }}>
          {children}
        </div>
      </div>
    </>
  )
}
