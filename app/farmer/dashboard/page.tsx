'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { FARMER, SHARED, cardStyle, navStyle } from '@/lib/styles'
import { useLanguage } from '@/lib/i18n/LanguageContext'
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

function StatCard({ icon, label, value, sub, href, accent, isMobile }: { icon: string; label: string; value: string | number; sub?: string; href?: string; accent?: string; isMobile?: boolean }) {
  const inner = (
    <div style={{ ...cardStyle(FARMER), padding: isMobile ? 14 : 18, display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, boxShadow: SHARED.shadowMd, transition: 'transform 0.2s, box-shadow 0.2s', cursor: href ? 'pointer' : 'default', border: `1px solid ${FARMER.borderLight}` }}>
      <div style={{ width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: 14, background: accent ? `${accent}18` : FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '1.3rem' : '1.6rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: FARMER.muted, fontSize: isMobile ? '0.66rem' : '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
        <p style={{ color: FARMER.text, fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 800, margin: '2px 0 0', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ color: FARMER.muted, fontSize: isMobile ? '0.68rem' : '0.74rem', margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

function QuickAction({ icon, label, href, color }: { icon: string; label: string; href: string; color?: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ background: FARMER.white, border: `1px solid ${FARMER.borderLight}`, borderRadius: 14, padding: '14px 8px', textAlign: 'center', transition: 'all 0.2s', boxShadow: SHARED.shadow }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: color ? `${color}18` : FARMER.primaryLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: 6 }}>{icon}</div>
        <p style={{ color: FARMER.text, fontSize: '0.76rem', fontWeight: 700, margin: 0 }}>{label}</p>
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
  const totalDemand = listings.reduce((s, l) => s + (l.quantity || 0), 0)
  const topPrice = listings.length > 0 ? Math.max(...listings.map(l => l.pricePerUnit)) : 0

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
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: isMobile ? '12px 16px' : '14px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: FARMER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🌾</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? '0.95rem' : '1.05rem', color: FARMER.text, lineHeight: 1 }}>AgriEasy</p>
              {!isMobile && <p style={{ margin: 0, fontSize: '0.7rem', color: FARMER.muted }}>Farmer/Vyapari workspace</p>}
            </div>
          </div>
          {/* On mobile: only show Location + Logout. On desktop: show all */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
            <Link href="/farmer/setup-location" style={{ color: FARMER.primary, textDecoration: 'none', padding: '7px 12px', borderRadius: 8, fontSize: isMobile ? '0.76rem' : '0.84rem', fontWeight: 700, background: FARMER.primaryLight, whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}>📍 {isMobile ? 'Location' : (profile?.farmerAddress ? 'My Location' : 'Set Location')}</Link>
            {!isMobile && (
              <>
                <Link href="/agrisocial" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: FARMER.primaryLight, whiteSpace: 'nowrap' }}>📱 AgriSocial</Link>
                <Link href="/agripay" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: FARMER.primaryLight, whiteSpace: 'nowrap' }}>💳 {t('nav.wallet')}</Link>
                <Link href="/settings" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: FARMER.primaryLight, whiteSpace: 'nowrap' }}>⚙️ {t('nav.settings')}</Link>
              </>
            )}
            <button onClick={logout} style={{ color: FARMER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '7px 12px', borderRadius: 8, fontSize: isMobile ? '0.76rem' : '0.84rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{isMobile ? 'Logout' : t('nav.logout')}</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '16px 12px 80px' : '28px 24px 60px' }}>
        {/* Hero header */}
        <div style={{ marginBottom: isMobile ? 16 : 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '1.9rem', fontWeight: 800, color: FARMER.text, letterSpacing: '-0.02em' }}>
              {profile?.farmerName ? `Jai Kisan, ${profile.farmerName.split(' ')[0]} 🌾` : 'Jai Kisan 🌾'}
            </h1>
            <p style={{ margin: '6px 0 0', color: FARMER.muted, fontSize: isMobile ? '0.82rem' : '0.95rem' }}>
              📍 {profile?.farmerAddress || 'Location not set'}
              {!isMobile && ' · showing buyers within 50 km'}
            </p>
          </div>
          <Link href="/farmer/search-buyers" style={{
            background: FARMER.primary, color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 18px', fontSize: '0.86rem', fontWeight: 700,
            textDecoration: 'none', boxShadow: `0 4px 14px ${FARMER.primary}40`,
            transition: 'all 0.2s ease', whiteSpace: 'nowrap',
            flex: isMobile ? '1 1 100%' : '0 0 auto', textAlign: 'center',
          }}>
            🔍 Search buyers →
          </Link>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: SHARED.error, fontSize: '0.88rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stat cards — 2 columns on mobile, 4 on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: isMobile ? 8 : 14, marginBottom: isMobile ? 16 : 24 }}>
          <StatCard icon="🏪" label="Nearby Buyers" value={nearbyCount} sub={isMobile ? undefined : 'Demand listings within 50 km'} href="/farmer/search-buyers" isMobile={isMobile} />
          <StatCard icon="⚖️" label="Total Demand" value={`${totalDemand.toLocaleString('en-IN')} kg`} sub={isMobile ? undefined : 'Across nearby buyers'} accent="#C05070" isMobile={isMobile} />
          <StatCard icon="📈" label="Top Price" value={`₹${topPrice}`} sub={isMobile ? undefined : 'Highest offer nearby'} accent="#10b981" isMobile={isMobile} />
          <StatCard icon="🚚" label="My Bookings" value="→" sub={isMobile ? undefined : 'Track deliveries'} href="/farmer/my-bookings" accent="#f59e0b" isMobile={isMobile} />
        </div>

        {/* Quick actions — 3 columns on mobile, 6 on desktop */}
        <div style={{ marginBottom: isMobile ? 20 : 28 }}>
          <h2 style={{ color: FARMER.text, fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 800, margin: '0 0 10px' }}>Quick actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: isMobile ? 8 : 10 }}>
            <QuickAction icon="🔍" label="Search Buyers" href="/farmer/search-buyers" color="#C05070" />
            <QuickAction icon="🚚" label="My Bookings" href="/farmer/my-bookings" color="#10b981" />
            <QuickAction icon="📍" label="Location" href="/farmer/setup-location" color="#f59e0b" />
            <QuickAction icon="📒" label="Ledger" href="/ledger" color="#dc2626" />
            <QuickAction icon="📱" label="AgriSocial" href="/agrisocial" color="#8b5cf6" />
            <QuickAction icon="💳" label="Wallet" href="/agripay" color="#06b6d4" />
          </div>
        </div>

        {/* Main content — single column on mobile, 2 columns on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 320px', gap: isMobile ? 16 : 20, alignItems: 'start' }}>
          {/* Main: Nearby buyer listings */}
          <div style={{ ...cardStyle(FARMER), border: `1px solid ${FARMER.borderLight}`, padding: isMobile ? 14 : 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${FARMER.borderLight}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 800, color: FARMER.text }}>Buyers near you</h3>
                <p style={{ margin: '4px 0 0', color: FARMER.muted, fontSize: isMobile ? '0.72rem' : '0.78rem' }}>{isMobile ? 'Tap a card to sell' : 'Sorted by distance · tap a card to view & sell'}</p>
              </div>
              <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, fontSize: '0.82rem', textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>View all →</Link>
            </div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 160, background: FARMER.bgSub, borderRadius: 12 }} />)}
              </div>
            ) : listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: FARMER.muted }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🌱</div>
                <h4 style={{ color: FARMER.text, margin: '0 0 6px', fontSize: '0.95rem' }}>No buyers nearby yet</h4>
                <p style={{ marginBottom: 14, fontSize: '0.84rem' }}>Try expanding your search radius.</p>
                <Link href="/farmer/search-buyers" style={{ display: 'inline-block', color: FARMER.primary, fontWeight: 700, textDecoration: 'none', fontSize: '0.84rem' }}>🔍 Search wider</Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: isMobile ? 10 : 12 }}>
                {listings.slice(0, isMobile ? 6 : 8).map(l => (
                  <Link key={l._id} href={`/farmer/buyer/${l.buyerId?._id || ''}?listingId=${l._id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: FARMER.white, border: `1px solid ${FARMER.borderLight}`, borderRadius: 12, padding: 12, transition: 'all 0.15s', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        {l.commodityPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.commodityPhoto} alt={l.commodity} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🌾</div>
                        )}
                        <h4 style={{ color: FARMER.text, fontWeight: 800, margin: 0, fontSize: '0.95rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.commodity}</h4>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                        <div>
                          <p style={{ color: FARMER.muted, fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Price</p>
                          <p style={{ color: FARMER.primary, fontWeight: 800, fontSize: '0.84rem', margin: 0 }}>₹{l.pricePerUnit}/{l.unit || 'kg'}</p>
                        </div>
                        <div>
                          <p style={{ color: FARMER.muted, fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Distance</p>
                          <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.84rem', margin: 0 }}>{distanceLabel(l.distanceKm)}</p>
                        </div>
                      </div>
                      <div style={{ borderTop: `1px solid ${FARMER.borderLight}`, paddingTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.85rem' }}>🏪</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.76rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.buyerId?.firmName || 'Buyer'}</p>
                          <p style={{ color: FARMER.muted, fontSize: '0.68rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {l.location || l.buyerId?.address || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: Today's market + Share harvest */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
            <div style={{ ...cardStyle(FARMER), border: `1px solid ${FARMER.borderLight}`, padding: isMobile ? 14 : 24 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 800, color: FARMER.text }}>📊 Today&apos;s market</h3>
              <p style={{ color: FARMER.muted, fontSize: isMobile ? '0.72rem' : '0.76rem', margin: '0 0 12px' }}>Top-priced commodities nearby</p>
              {topCommodities.length === 0 ? (
                <p style={{ color: FARMER.muted, fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>No data yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topCommodities.map(([name, info]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0 }}>🌾</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.82rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                        <p style={{ color: FARMER.muted, fontSize: '0.68rem', margin: 0 }}>{info.count} {info.count === 1 ? 'buyer' : 'buyers'}</p>
                      </div>
                      <p style={{ color: FARMER.primary, fontWeight: 800, fontSize: '0.86rem', margin: 0, flexShrink: 0 }}>₹{info.maxPrice}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...cardStyle(FARMER), border: `1px solid ${FARMER.borderLight}`, background: FARMER.gradientSoft, padding: isMobile ? 14 : 24 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: isMobile ? '0.88rem' : '0.95rem', fontWeight: 800, color: FARMER.text }}>📱 Share your harvest</h3>
              <p style={{ color: FARMER.muted, fontSize: isMobile ? '0.74rem' : '0.78rem', margin: '0 0 10px' }}>Post photos & videos of your farm on AgriSocial to reach more buyers.</p>
              <Link href="/agrisocial/create" style={{ display: 'inline-block', padding: '9px 18px', background: FARMER.primary, color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.82rem' }}>+ Share now</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
