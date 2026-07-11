'use client'

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react'
import { SHARED } from '@/lib/styles'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }

const ToastContext = createContext<{ show: (message: string, type?: ToastType) => void }>({ show: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{ position: 'fixed', bottom: 80, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 9999, pointerEvents: 'none', fontFamily: SHARED.font }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#059669' : '#1e293b',
            color: '#fff', padding: '10px 20px', borderRadius: 100,
            fontSize: '0.84rem', fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            maxWidth: '90vw', textAlign: 'center',
            animation: 'toastSlideUp 0.3s ease-out',
          }}>
            {t.type === 'error' ? '⚠️ ' : t.type === 'success' ? '✅ ' : 'ℹ️ '}{t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes toastSlideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </ToastContext.Provider>
  )
}
