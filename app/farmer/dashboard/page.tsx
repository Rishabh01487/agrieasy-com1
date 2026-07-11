'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { FARMER, SHARED, cardStyle, navStyle } from '@/lib/styles'
import { DashboardSkeleton } from '@/app/components/DashboardSkeleton'
import { useIsMobile } from '@/lib/use-is-mobile'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  unit?: string
  pricePerUnit: number
  priceDate?: string
  createdAt: string
  commodityPhoto?: string
  quality?: string
  paymentConditions?: string
  location?: string
  distanceKm?: number | null
  buyerId: { _id: string; firmName: string; address: string; shopPhoto?: string }
}

interface FarmerProfile {
  farmerName?: string
  farmerAddress?: string
  hasSetupLocation: boolean
  location?: { latitude: number; longitude: number } | null
  upiId?: string
}

function distanceLabel(km: number | null | undefined): string {
  if (km == null) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export default function FarmerDashboard() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [listings, setListings] = useState<Listing[]>([])
  const [profile, setProfile] = useState<FarmerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkingLocation, setCheckingLocation] = useState(true)

  useEffect(() => {
    const { userId } = getUserInfo()
    if (!userId) {
      router.replace('/auth/login')
      return
    }

    const init = async () => {
      try {
        const profileRes = await authFetch('/api/farmer/profile')
        if (profileRes.ok) {
          const data = await profileRes.json()
          const p = data?.data?.profile || data?.profile
          if (p) {
            setProfile(p)
            if (!p.hasSetupLocation || !p.location?.latitude) {
              router.replace('/farmer/setup-location')
              return
            }
          }
        }
      } catch { /* ignore */ }
      setCheckingLocation(false)

      try {
        const p = profile
        const params = new URLSearchParams()
        if (p?.location?.latitude) {
          params.set('farmerLat', String(p.location.latitude))
          params.set('farmerLng', String(p.location.longitude))
          params.set('radiusKm', '50')
          params.set('sortBy', 'distance')
        }
        const qs = params.toString()
        const response = await authFetch(`/api/listings${qs ? '?' + qs : ''}`)
        if (!response.ok) {
          setError('Failed to load buyer demand')
          return
        }
        const data = await response.json()
        setListings(data?.data?.listings || data?.listings || [])
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const nearbyCount = listings.length
  const topPrice = listings.length > 0 ? Math.max(...listings.map(l => l.pricePerUnit)) : 0

  const byCommodity = listings.reduce<Record<string, { count: number; maxPrice: number }>>((acc, l) => {
    const c = l.commodity
    if (!acc[c]) acc[c] = { count: 0, maxPrice: 0 }
    acc[c].count += 1
    acc[c].maxPrice = Math.max(acc[c].maxPrice, l.pricePerUnit)
    return acc
  }, {})
  const topCommodities = Object.entries(byCommodity).sort((a, b) => b[1].maxPrice - a[1].maxPrice).slice(0, 5)

  if (checkingLocation) {
    return (
      <DashboardSkeleton
        role="farmer"
        primary={FARMER.primary}
        primaryLight={FARMER.primaryLight}
        bg={FARMER.bg}
        bgSub={FARMER.bgSub}
        border={FARMER.border}
        text={FARMER.text}
        muted={FARMER.muted}
        gradient={FARMER.gradient}
      />
    )
  }

  return (
    <div className="dashboard-content" style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font, color: FARMER.text }}>
      {/* Clean nav — just logo + name + logout */}
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: FARMER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>🌾</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: FARMER.text, lineHeight: 1 }}>AgriEasy</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: FARMER.muted }}>Farmer</p>
            </div>
          </div>
          <button onClick={logout} style={{ color: FARMER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: isMobile ? '16px 12px 80px' : '24px 20px 60px' }}>
        {/* Welcome — location + main CTA */}
        <div style={{
          background: FARMER.gradient,
          borderRadius: 16, padding: isMobile ? 18 : 24,
          marginBottom: 16, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
          boxShadow: `0 8px 24px ${FARMER.primary}30`,
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {profile?.farmerName ? `Jai Kisan, ${profile.farmerName.split(' ')[0]} 🌾` : 'Jai Kisan 🌾'}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '0.86rem', opacity: 0.9 }}>
              📍 {profile?.farmerAddress || 'Location not set'}
            </p>
          </div>
          <Link href="/farmer/search-buyers" style={{
            background: '#fff', color: FARMER.primary, border: 'none',
            borderRadius: 12, padding: '11px 22px', fontSize: '0.9rem', fontWeight: 800,
            textDecoration: 'none', whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          }}>
            🔍 Find Buyers →
          </Link>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: SHARED.error, fontSize: '0.86rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* 2 stat cards — only what matters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Link href="/farmer/search-buyers" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: `1px solid ${FARMER.borderLight}`, boxShadow: SHARED.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${FARMER.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🏪</div>
                <div>
                  <p style={{ margin: 0, color: FARMER.muted, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>Nearby Buyers</p>
                  <p style={{ margin: '2px 0 0', color: FARMER.text, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{nearbyCount}</p>
                  <p style={{ margin: '2px 0 0', color: FARMER.muted, fontSize: '0.7rem' }}>within 50 km</p>
                </div>
              </div>
            </div>
          </Link>
          <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: `1px solid ${FARMER.borderLight}`, boxShadow: SHARED.shadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#10b98115', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>📈</div>
              <div>
                <p style={{ margin: 0, color: FARMER.muted, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>Top Price</p>
                <p style={{ margin: '2px 0 0', color: '#059669', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>₹{topPrice}</p>
                <p style={{ margin: '2px 0 0', color: FARMER.muted, fontSize: '0.7rem' }}>best offer / unit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nearby buyers — main content */}
        <div style={{ ...cardStyle(FARMER), border: `1px solid ${FARMER.borderLight}`, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${FARMER.borderLight}` }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: FARMER.text }}>Buyers near you</h3>
            <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700 }}>View all →</Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 10 }} />)}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: FARMER.muted }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🌱</div>
              <p style={{ fontSize: '0.86rem', margin: '0 0 12px' }}>No buyers nearby yet. Try widening your search.</p>
              <Link href="/farmer/search-buyers" style={{ display: 'inline-block', color: '#fff', background: FARMER.primary, padding: '9px 18px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.84rem' }}>🔍 Search Buyers</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listings.slice(0, isMobile ? 5 : 8).map(l => (
                <Link key={l._id} href={`/farmer/buyer/${l.buyerId?._id || ''}?listingId=${l._id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, border: `1px solid ${FARMER.borderLight}`, background: FARMER.white, transition: 'all 0.15s' }}>
                    {l.commodityPhoto ? (
                      <img src={l.commodityPhoto} alt={l.commodity} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🌾</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{l.commodity}</p>
                      <p style={{ color: FARMER.muted, fontSize: '0.74rem', margin: '2px 0 0' }}>
                        <span style={{ color: FARMER.primary, fontWeight: 700 }}>₹{l.pricePerUnit}/{l.unit || 'kg'}</span>
                        {' · '}🏪 {l.buyerId?.firmName || 'Buyer'}
                        {' · '}📍 {distanceLabel(l.distanceKm)}
                      </p>
                    </div>
                    <span style={{ color: FARMER.primary, fontSize: '1.2rem', flexShrink: 0 }}>›</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Today's market — compact, no sidebar */}
        {topCommodities.length > 0 && (
          <div style={{ ...cardStyle(FARMER), border: `1px solid ${FARMER.borderLight}` }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 800, color: FARMER.text }}>📊 Today&apos;s market</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topCommodities.map(([name, info]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🌾</div>
                  <span style={{ flex: 1, color: FARMER.text, fontWeight: 600, fontSize: '0.84rem' }}>{name}</span>
                  <span style={{ color: FARMER.muted, fontSize: '0.72rem' }}>{info.count} buyer{info.count !== 1 ? 's' : ''}</span>
                  <span style={{ color: FARMER.primary, fontWeight: 800, fontSize: '0.86rem' }}>₹{info.maxPrice}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
