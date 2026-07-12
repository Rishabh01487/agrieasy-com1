'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { FARMER, SHARED, cardStyle, navStyle } from '@/lib/styles'
import { useLanguage } from '@/lib/i18n/LanguageContext'

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

function StatCard({ icon, label, value, sub, href, accent }: { icon: string; label: string; value: string | number; sub?: string; href?: string; accent?: string }) {
  const inner = (
    <div style={{ ...cardStyle(FARMER), padding: 18, display: 'flex', alignItems: 'center', gap: 14, boxShadow: SHARED.shadowMd, transition: 'transform 0.2s, box-shadow 0.2s', cursor: href ? 'pointer' : 'default', border: `1px solid ${FARMER.borderLight}` }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: accent ? `${accent}18` : FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: FARMER.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
        <p style={{ color: FARMER.text, fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ color: FARMER.muted, fontSize: '0.74rem', margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

function QuickAction({ icon, label, href, color }: { icon: string; label: string; href: string; color?: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
      <div style={{ background: FARMER.white, border: `1px solid ${FARMER.borderLight}`, borderRadius: 14, padding: '16px 12px', textAlign: 'center', transition: 'all 0.2s', boxShadow: SHARED.shadow }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: color ? `${color}18` : FARMER.primaryLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>
        <p style={{ color: FARMER.text, fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>{label}</p>
      </div>
    </Link>
  )
}

function distanceLabel(km: number | null | undefined): string {
  if (km == null) return 'Distance unknown'
  if (km < 1) return `${Math.round(km * 1000)} m away`
  return `${km.toFixed(1)} km away`
}

export default function FarmerDashboard() {
  const { t } = useLanguage()
  const router = useRouter()
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
      // First — check if the farmer has set their location.
      try {
        const profileRes = await authFetch('/api/farmer/profile')
        if (profileRes.ok) {
          const data = await profileRes.json()
          const p = data?.data?.profile || data?.profile
          if (p) {
            setProfile(p)
            if (!p.hasSetupLocation || !p.location?.latitude) {
              // First-time onboarding — send them to setup-location
              router.replace('/farmer/setup-location')
              return
            }
          }
        }
      } catch { /* ignore — proceed without profile */ }
      setCheckingLocation(false)

      // Load listings near the farmer (50 km default radius)
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
  const totalDemand = listings.reduce((s, l) => s + (l.quantity || 0), 0)
  const topPrice = listings.length > 0 ? Math.max(...listings.map(l => l.pricePerUnit)) : 0

  // Group listings by commodity
  const byCommodity = listings.reduce<Record<string, { count: number; maxPrice: number }>>((acc, l) => {
    const c = l.commodity
    if (!acc[c]) acc[c] = { count: 0, maxPrice: 0 }
    acc[c].count += 1
    acc[c].maxPrice = Math.max(acc[c].maxPrice, l.pricePerUnit)
    return acc
  }, {})
  const topCommodities = Object.entries(byCommodity).sort((a, b) => b[1].maxPrice - a[1].maxPrice).slice(0, 6)

  if (checkingLocation) {
    return (
      <div style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font, display: 'flex', alignItems: 'center', justifyContent: 'center', color: FARMER.primary, fontWeight: 700 }}>
        Loading your workspace…
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font, color: FARMER.text }}>
      {/* Nav */}
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: FARMER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>🌾</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: FARMER.text, lineHeight: 1 }}>AgriEasy</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: FARMER.muted }}>Farmer workspace</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/farmer/setup-location" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: FARMER.primaryLight, transition: 'all 0.2s ease' }}>📍 {profile?.farmerAddress ? 'My Location' : 'Set Location'}</Link>
            <Link href="/agrisocial" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: FARMER.primaryLight, transition: 'all 0.2s ease' }}>📱 AgriSocial</Link>
            <Link href="/agripay" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: FARMER.primaryLight, transition: 'all 0.2s ease' }}>💳 {t('nav.wallet')}</Link>
            <Link href="/settings" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: FARMER.primaryLight, transition: 'all 0.2s ease' }}>⚙️ {t('nav.settings')}</Link>
            <button onClick={logout} style={{ color: FARMER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>{t('nav.logout')}</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 60px' }}>
        {/* Hero header — shows farmer's location */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: FARMER.text, letterSpacing: '-0.02em' }}>
              {profile?.farmerName ? `Jai Kisan, ${profile.farmerName.split(' ')[0]} 🌾` : 'Jai Kisan 🌾'}
            </h1>
            <p style={{ margin: '6px 0 0', color: FARMER.muted, fontSize: '0.95rem' }}>
              📍 {profile?.farmerAddress || 'Location not set'} · showing buyers within 50 km
            </p>
          </div>
          <Link href="/farmer/search-buyers" style={{
            background: FARMER.primary, color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 18px', fontSize: '0.86rem', fontWeight: 700,
            textDecoration: 'none', boxShadow: `0 4px 14px ${FARMER.primary}40`,
            transition: 'all 0.2s ease',
          }}>
            🔍 Search buyers →
          </Link>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: SHARED.error, fontSize: '0.88rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 24 }}>
          <StatCard icon="🏪" label="Nearby Buyers" value={nearbyCount} sub="Demand listings within 50 km" href="/farmer/search-buyers" />
          <StatCard icon="⚖️" label="Total Demand Qty" value={`${totalDemand.toLocaleString('en-IN')} kg`} sub="Across nearby buyers" accent="#3b82f6" />
          <StatCard icon="📈" label="Top Price" value={`₹${topPrice}`} sub="Highest offer / unit nearby" accent="#10b981" />
          <StatCard icon="🚚" label="My Bookings" value="→" sub="Track vehicles & deliveries" href="/farmer/my-bookings" accent="#f59e0b" />
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: FARMER.text, fontSize: '1.05rem', fontWeight: 800, margin: '0 0 12px' }}>Quick actions</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <QuickAction icon="🔍" label="Search Buyers" href="/farmer/search-buyers" color="#3b82f6" />
            <QuickAction icon="🚚" label="My Bookings" href="/farmer/my-bookings" color="#10b981" />
            <QuickAction icon="📍" label="Update Location" href="/farmer/setup-location" color="#f59e0b" />
            <QuickAction icon="📒" label="Ledger" href="/ledger" color="#dc2626" />
            <QuickAction icon="📱" label="AgriSocial" href="/agrisocial" color="#8b5cf6" />
            <QuickAction icon="💳" label="Wallet" href="/agripay" color="#06b6d4" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start' }}>
          {/* Main: Nearby buyer listings */}
          <div style={{ ...cardStyle(FARMER), border: `1px solid ${FARMER.borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${FARMER.borderLight}` }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: FARMER.text }}>Buyers near you</h3>
                <p style={{ margin: '4px 0 0', color: FARMER.muted, fontSize: '0.78rem' }}>Sorted by distance · tap a card to view & sell</p>
              </div>
              <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, fontSize: '0.84rem', textDecoration: 'none', fontWeight: 700 }}>View all →</Link>
            </div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 160, background: FARMER.bgSub, borderRadius: 12 }} />)}
              </div>
            ) : listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: FARMER.muted }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌱</div>
                <h4 style={{ color: FARMER.text, margin: '0 0 6px', fontSize: '1rem' }}>No buyers nearby yet</h4>
                <p style={{ marginBottom: 16, fontSize: '0.86rem' }}>Try expanding your search radius in the Search Buyers page.</p>
                <Link href="/farmer/search-buyers" style={{ display: 'inline-block', color: FARMER.primary, fontWeight: 700, textDecoration: 'none', fontSize: '0.86rem' }}>🔍 Search wider</Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {listings.slice(0, 8).map(l => (
                  <Link key={l._id} href={`/farmer/buyer/${l.buyerId?._id || ''}?listingId=${l._id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: FARMER.white, border: `1px solid ${FARMER.borderLight}`, borderRadius: 12, padding: 14, transition: 'all 0.15s', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        {l.commodityPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.commodityPhoto} alt={l.commodity} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🌾</div>
                        )}
                        <h4 style={{ color: FARMER.text, fontWeight: 800, margin: 0, fontSize: '1rem', flex: 1 }}>{l.commodity}</h4>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                        <div>
                          <p style={{ color: FARMER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Price</p>
                          <p style={{ color: FARMER.primary, fontWeight: 800, fontSize: '0.86rem', margin: 0 }}>₹{l.pricePerUnit}/{l.unit || 'kg'}</p>
                        </div>
                        <div>
                          <p style={{ color: FARMER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Distance</p>
                          <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{distanceLabel(l.distanceKm)}</p>
                        </div>
                      </div>
                      <div style={{ borderTop: `1px solid ${FARMER.borderLight}`, paddingTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.9rem' }}>🏪</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.78rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.buyerId?.firmName || 'Buyer'}</p>
                          <p style={{ color: FARMER.muted, fontSize: '0.7rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {l.location || l.buyerId?.address || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar: Today's market */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...cardStyle(FARMER), border: `1px solid ${FARMER.borderLight}` }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: FARMER.text }}>📊 Today&apos;s market</h3>
              <p style={{ color: FARMER.muted, fontSize: '0.76rem', margin: '0 0 14px' }}>Top-priced commodities buyers want nearby</p>
              {topCommodities.length === 0 ? (
                <p style={{ color: FARMER.muted, fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>No data yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topCommodities.map(([name, info]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>🌾</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.84rem', margin: 0 }}>{name}</p>
                        <p style={{ color: FARMER.muted, fontSize: '0.7rem', margin: 0 }}>{info.count} {info.count === 1 ? 'buyer' : 'buyers'}</p>
                      </div>
                      <p style={{ color: FARMER.primary, fontWeight: 800, fontSize: '0.88rem', margin: 0 }}>₹{info.maxPrice}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...cardStyle(FARMER), border: `1px solid ${FARMER.borderLight}`, background: FARMER.gradientSoft }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 800, color: FARMER.text }}>📱 Share your harvest</h3>
              <p style={{ color: FARMER.muted, fontSize: '0.78rem', margin: '0 0 12px' }}>Post photos & videos of your farm on AgriSocial to reach more buyers.</p>
              <Link href="/agrisocial/create" style={{ display: 'inline-block', padding: '9px 18px', background: FARMER.primary, color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.84rem' }}>+ Share now</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
