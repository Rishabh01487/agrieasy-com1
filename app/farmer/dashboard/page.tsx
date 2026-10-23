'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useIsMobile } from '@/lib/use-is-mobile'
import {
  MH, mhPageBg, mhCardStyle, mhPrimaryBtn, mhSecondaryBtn, mhNavStyle,
  WheatIcon, MapPinIcon, SmartphoneIcon, CreditCardIcon, SettingsIcon,
  StoreIcon, ScaleIcon, TrendingUpIcon, TruckIcon, SearchIcon,
  BookIcon, BarChartIcon, SproutIcon, AlertTriangleIcon, ArrowRightIcon, LogOutIcon,
} from '@/lib/madhubani'

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

function StatCard({ icon, label, value, sub, href, isMobile }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; href?: string; isMobile?: boolean }) {
  const inner = (
    <div style={{ ...mhCardStyle({ doubleLine: true, padding: isMobile ? 14 : 18 }), display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, cursor: href ? 'pointer' : 'default' }}>
      <div style={{ width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: 14, background: `${MH.pink}18`, color: MH.deepPink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: MH.pinkGray, fontSize: isMobile ? '0.66rem' : '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
        <p style={{ color: MH.navy, fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 800, margin: '2px 0 0', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ color: MH.pinkGray, fontSize: isMobile ? '0.68rem' : '0.74rem', margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

function QuickAction({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ ...mhCardStyle({ padding: '14px 8px' }), textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${MH.pink}14`, color: MH.deepPink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>{icon}</div>
        <p style={{ color: MH.navy, fontSize: '0.76rem', fontWeight: 700, margin: 0 }}>{label}</p>
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
      // Wait for AuthSync (Google Sign-In) to populate localStorage
      const timeout = setTimeout(() => {
        const retry = getUserInfo()
        if (!retry.userId) {
          router.replace('/auth/login')
        } else {
          window.location.reload()
        }
      }, 3000)
      return () => clearTimeout(timeout)
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
      <div style={{ ...mhPageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MH.navy, fontWeight: 700 }}>
        Loading your workspace…
      </div>
    )
  }

  return (
    <div style={mhPageBg}>
      {/* Nav */}
      <nav style={{ ...mhNavStyle, padding: isMobile ? '12px 16px' : '14px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${MH.navy}, ${MH.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MH.cream, border: `1px solid ${MH.gold}` }}>
              <WheatIcon size={16} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? '0.95rem' : '1.05rem', color: MH.navy, lineHeight: 1 }}>AgriEasy</p>
              {!isMobile && <p style={{ margin: 0, fontSize: '0.7rem', color: MH.pinkGray }}>Farmer/Vyapari workspace</p>}
            </div>
          </div>
          {/* On mobile: only show Location + Logout. On desktop: show all */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
            <Link href="/farmer/setup-location" style={{ ...mhSecondaryBtn, color: MH.navy, padding: '7px 12px', borderRadius: 8, fontSize: isMobile ? '0.76rem' : '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <MapPinIcon size={14} /> {isMobile ? 'Location' : (profile?.farmerAddress ? 'My Location' : 'Set Location')}
            </Link>
            {!isMobile && (
              <>
                <Link href="/agrisocial" style={{ ...mhSecondaryBtn, color: MH.navy, padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  <SmartphoneIcon size={14} /> AgriSocial
                </Link>
                <Link href="/agripay" style={{ ...mhSecondaryBtn, color: MH.navy, padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  <CreditCardIcon size={14} /> {t('nav.wallet')}
                </Link>
                <Link href="/settings" style={{ ...mhSecondaryBtn, color: MH.navy, padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                  <SettingsIcon size={14} /> {t('nav.settings')}
                </Link>
              </>
            )}
            <button onClick={logout} style={{ color: MH.white, background: MH.deepPink, border: `1px solid ${MH.gold}`, padding: '7px 12px', borderRadius: 8, fontSize: isMobile ? '0.76rem' : '0.84rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <LogOutIcon size={14} />{isMobile ? '' : ` ${t('nav.logout')}`}
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '16px 12px 80px' : '28px 24px 60px' }}>
        {/* Hero header */}
        <div style={{ marginBottom: isMobile ? 16 : 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '1.9rem', fontWeight: 800, color: MH.navy, letterSpacing: '-0.02em' }}>
              {profile?.farmerName ? `Jai Kisan, ${profile.farmerName.split(' ')[0]}` : 'Jai Kisan'}
            </h1>
            <p style={{ margin: '6px 0 0', color: MH.pinkGray, fontSize: isMobile ? '0.82rem' : '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPinIcon size={14} style={{ color: MH.deepPink }} />
              <span>{profile?.farmerAddress || 'Location not set'}</span>
              {!isMobile && <span> · showing buyers within 50 km</span>}
            </p>
          </div>
          <Link href="/farmer/search-buyers" style={{
            ...mhPrimaryBtn(),
            padding: '10px 18px', fontSize: '0.86rem',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
            whiteSpace: 'nowrap',
            flex: isMobile ? '1 1 100%' : '0 0 auto', textAlign: 'center', justifyContent: 'center',
          }}>
            <SearchIcon size={16} /> Search buyers <ArrowRightIcon size={14} />
          </Link>
        </div>

        {error && (
          <div style={{ background: MH.errorLight, border: `1px solid ${MH.gold}`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: MH.deepPink, fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangleIcon size={16} /> {error}
          </div>
        )}

        {/* Stat cards — 2 columns on mobile, 4 on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: isMobile ? 8 : 14, marginBottom: isMobile ? 16 : 24 }}>
          <StatCard icon={<StoreIcon size={20} />} label="Nearby Buyers" value={nearbyCount} sub={isMobile ? undefined : 'Demand listings within 50 km'} href="/farmer/search-buyers" isMobile={isMobile} />
          <StatCard icon={<ScaleIcon size={20} />} label="Total Demand" value={`${totalDemand.toLocaleString('en-IN')} kg`} sub={isMobile ? undefined : 'Across nearby buyers'} isMobile={isMobile} />
          <StatCard icon={<TrendingUpIcon size={20} />} label="Top Price" value={`₹${topPrice}`} sub={isMobile ? undefined : 'Highest offer nearby'} isMobile={isMobile} />
          <StatCard icon={<TruckIcon size={20} />} label="My Bookings" value="→" sub={isMobile ? undefined : 'Track deliveries'} href="/farmer/my-bookings" isMobile={isMobile} />
        </div>

        {/* Quick actions — 3 columns on mobile, 6 on desktop */}
        <div style={{ marginBottom: isMobile ? 20 : 28 }}>
          <h2 style={{ color: MH.navy, fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 800, margin: '0 0 10px' }}>Quick actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: isMobile ? 8 : 10 }}>
            <QuickAction icon={<SearchIcon size={20} />} label="Search Buyers" href="/farmer/search-buyers" />
            <QuickAction icon={<TruckIcon size={20} />} label="My Bookings" href="/farmer/my-bookings" />
            <QuickAction icon={<MapPinIcon size={20} />} label="Location" href="/farmer/setup-location" />
            <QuickAction icon={<BookIcon size={20} />} label="Ledger" href="/ledger" />
            <QuickAction icon={<SmartphoneIcon size={20} />} label="AgriSocial" href="/agrisocial" />
            <QuickAction icon={<CreditCardIcon size={20} />} label="Wallet" href="/agripay" />
          </div>
        </div>

        {/* Main content — single column on mobile, 2 columns on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 320px', gap: isMobile ? 16 : 20, alignItems: 'start' }}>
          {/* Main: Nearby buyer listings */}
          <div style={{ ...mhCardStyle({ doubleLine: true, padding: isMobile ? 14 : 24 }) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${MH.gold}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 800, color: MH.navy }}>Buyers near you</h3>
                <p style={{ margin: '4px 0 0', color: MH.pinkGray, fontSize: isMobile ? '0.72rem' : '0.78rem' }}>{isMobile ? 'Tap a card to sell' : 'Sorted by distance · tap a card to view & sell'}</p>
              </div>
              <Link href="/farmer/search-buyers" style={{ color: MH.deepPink, fontSize: '0.82rem', textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>View all <ArrowRightIcon size={12} /></Link>
            </div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 160, background: `${MH.gold}22`, borderRadius: 12 }} />)}
              </div>
            ) : listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: MH.pinkGray }}>
                <div style={{ marginBottom: 10, color: MH.pink, display: 'flex', justifyContent: 'center' }}><SproutIcon size={36} /></div>
                <h4 style={{ color: MH.navy, margin: '0 0 6px', fontSize: '0.95rem' }}>No buyers nearby yet</h4>
                <p style={{ marginBottom: 14, fontSize: '0.84rem' }}>Try expanding your search radius.</p>
                <Link href="/farmer/search-buyers" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: MH.deepPink, fontWeight: 700, textDecoration: 'none', fontSize: '0.84rem' }}>
                  <SearchIcon size={14} /> Search wider
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: isMobile ? 10 : 12 }}>
                {listings.slice(0, isMobile ? 6 : 8).map(l => (
                  <Link key={l._id} href={`/farmer/buyer/${l.buyerId?._id || ''}?listingId=${l._id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: MH.white, border: `1px solid ${MH.gold}`, borderRadius: 12, padding: 12, transition: 'all 0.15s', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        {l.commodityPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.commodityPhoto} alt={l.commodity} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${MH.pink}18`, color: MH.deepPink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <WheatIcon size={16} />
                          </div>
                        )}
                        <h4 style={{ color: MH.navy, fontWeight: 800, margin: 0, fontSize: '0.95rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.commodity}</h4>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                        <div>
                          <p style={{ color: MH.pinkGray, fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Price</p>
                          <p style={{ color: MH.deepPink, fontWeight: 800, fontSize: '0.84rem', margin: 0 }}>₹{l.pricePerUnit}/{l.unit || 'kg'}</p>
                        </div>
                        <div>
                          <p style={{ color: MH.pinkGray, fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Distance</p>
                          <p style={{ color: MH.navy, fontWeight: 700, fontSize: '0.84rem', margin: 0 }}>{distanceLabel(l.distanceKm)}</p>
                        </div>
                      </div>
                      <div style={{ borderTop: `1px solid ${MH.gold}`, paddingTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: MH.deepPink, display: 'inline-flex' }}><StoreIcon size={14} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: MH.navy, fontWeight: 700, fontSize: '0.76rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.buyerId?.firmName || 'Buyer'}</p>
                          <p style={{ color: MH.pinkGray, fontSize: '0.68rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPinIcon size={10} /> {l.location || l.buyerId?.address || '—'}
                          </p>
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
            <div style={{ ...mhCardStyle({ padding: isMobile ? 14 : 24 }) }}>
              <h3 style={{ margin: '0 0 10px', fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 800, color: MH.navy, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChartIcon size={16} style={{ color: MH.deepPink }} /> Today&apos;s market
              </h3>
              <p style={{ color: MH.pinkGray, fontSize: isMobile ? '0.72rem' : '0.76rem', margin: '0 0 12px' }}>Top-priced commodities nearby</p>
              {topCommodities.length === 0 ? (
                <p style={{ color: MH.pinkGray, fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>No data yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topCommodities.map(([name, info]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${MH.pink}18`, color: MH.deepPink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <WheatIcon size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: MH.navy, fontWeight: 700, fontSize: '0.82rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                        <p style={{ color: MH.pinkGray, fontSize: '0.68rem', margin: 0 }}>{info.count} {info.count === 1 ? 'buyer' : 'buyers'}</p>
                      </div>
                      <p style={{ color: MH.deepPink, fontWeight: 800, fontSize: '0.86rem', margin: 0, flexShrink: 0 }}>₹{info.maxPrice}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...mhCardStyle({ padding: isMobile ? 14 : 24, background: `linear-gradient(135deg, ${MH.cream} 0%, ${MH.white} 100%)` }) }}>
              <h3 style={{ margin: '0 0 6px', fontSize: isMobile ? '0.88rem' : '0.95rem', fontWeight: 800, color: MH.navy, display: 'flex', alignItems: 'center', gap: 8 }}>
                <SmartphoneIcon size={16} style={{ color: MH.deepPink }} /> Share your harvest
              </h3>
              <p style={{ color: MH.pinkGray, fontSize: isMobile ? '0.74rem' : '0.78rem', margin: '0 0 10px' }}>Post photos & videos of your farm on AgriSocial to reach more buyers.</p>
              <Link href="/agrisocial/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', ...mhPrimaryBtn(), textDecoration: 'none', fontSize: '0.82rem' }}>
                <SmartphoneIcon size={14} /> Share now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
