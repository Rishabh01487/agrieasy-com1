'use client'

import { SHARED } from '@/lib/styles'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  )
}

interface DashboardSkeletonProps {
  role: 'farmer' | 'buyer' | 'transporter'
  primary: string
  primaryLight: string
  bg: string
  bgSub: string
  border: string
  text: string
  muted: string
  gradient: string
}

export function DashboardSkeleton({ role, primary, primaryLight, bg, bgSub, border, text, muted, gradient }: DashboardSkeletonProps) {
  const roleIcon = role === 'farmer' ? '🌾' : role === 'buyer' ? '🛒' : '🚛'
  const roleLabel = role === 'farmer' ? 'Farmer workspace' : role === 'buyer' ? 'Buyer workspace' : 'Transporter workspace'

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: SHARED.font, color: text }}>
      {/* Nav — static, shows immediately */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        borderBottom: `1px solid ${border}`,
        padding: '14px 24px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>{roleIcon}</div>
          <div>
            <Skeleton width={80} height={14} style={{ marginBottom: 2 }} />
            <Skeleton width={60} height={10} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={70} height={32} borderRadius={8} />
          <Skeleton width={70} height={32} borderRadius={8} />
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px' }}>
        {/* Hero header skeleton */}
        <div style={{ marginBottom: 24 }}>
          <Skeleton width={200} height={30} style={{ marginBottom: 8 }} />
          <Skeleton width={280} height={16} />
        </div>

        {/* Stat cards skeleton — 4 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              background: '#fff', borderRadius: 16, padding: 18,
              border: `1px solid ${border}`, boxShadow: SHARED.shadow,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <Skeleton width={52} height={52} borderRadius={14} />
              <div style={{ flex: 1 }}>
                <Skeleton width={60} height={10} style={{ marginBottom: 4 }} />
                <Skeleton width={80} height={22} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions skeleton */}
        <div style={{ marginBottom: 28 }}>
          <Skeleton width={100} height={18} style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{
                background: '#fff', borderRadius: 14, padding: '16px 12px',
                border: `1px solid ${border}`, boxShadow: SHARED.shadow,
                textAlign: 'center', minWidth: 80,
              }}>
                <Skeleton width={48} height={48} borderRadius={12} style={{ margin: '0 auto 8px' }} />
                <Skeleton width={50} height={10} style={{ margin: '0 auto' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: 24,
          border: `1px solid ${border}`, boxShadow: SHARED.shadowMd,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${border}` }}>
            <div>
              <Skeleton width={140} height={18} style={{ marginBottom: 4 }} />
              <Skeleton width={100} height={12} />
            </div>
            <Skeleton width={100} height={32} borderRadius={10} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                borderRadius: 10, border: `1px solid ${border}`, background: bg,
              }}>
                <Skeleton width={48} height={48} borderRadius={10} />
                <div style={{ flex: 1 }}>
                  <Skeleton width={120} height={14} style={{ marginBottom: 4 }} />
                  <Skeleton width={200} height={12} />
                </div>
                <Skeleton width={50} height={24} borderRadius={8} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
