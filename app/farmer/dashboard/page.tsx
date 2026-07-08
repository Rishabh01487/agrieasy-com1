'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { FARMER, SHARED, cardStyle, navStyle } from '@/lib/styles'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  unit?: string
  pricePerUnit: number
  buyerId: { firmName: string; address: string; phone?: string }
  location?: string
  createdAt: string
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

export default function FarmerDashboard() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const { userId } = getUserInfo()
    if (!userId) {
      router.replace('/auth/login')
      return
    }
    const fetchListings = async () => {
      try {
        const response = await authFetch('/api/listings')
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          setError(data.error || 'Failed to fetch listings')
          return
        }
        const data = await response.json()
        setListings(data.listings || [])
      } catch (err) {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchListings()
  }, [router])

  const totalDemand = listings.reduce((s, l) => s + (l.quantity || 0), 0)
  const topPrice = listings.length > 0 ? Math.max(...listings.map(l => l.pricePerUnit)) : 0
  const avgPrice = listings.length > 0 ? Math.round(listings.reduce((s, l) => s + l.pricePerUnit, 0) / listings.length) : 0

  // Group listings by commodity for the "Today's market" panel
  const byCommodity = listings.reduce<Record<string, { count: number; maxPrice: number }>>((acc, l) => {
    const c = l.commodity
    if (!acc[c]) acc[c] = { count: 0, maxPrice: 0 }
    acc[c].count += 1
    acc[c].maxPrice = Math.max(acc[c].maxPrice, l.pricePerUnit)
    return acc
  }, {})
  const topCommodities = Object.entries(byCommodity).sort((a, b) => b[1].maxPrice - a[1].maxPrice).slice(0, 6)

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
            <Link href="/agrisocial" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: FARMER.primaryLight, transition: 'all 0.2s ease' }}>📱 AgriSocial</Link>
            <Link href="/agripay" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: FARMER.primaryLight, transition: 'all 0.2s ease' }}>💳 Wallet</Link>
            <button onClick={logout} style={{ color: FARMER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 60px' }}>
        {/* Hero header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: FARMER.text, letterSpacing: '-0.02em' }}>Jai Kisan 🌾</h1>
          <p style={{ margin: '6px 0 0', color: FARMER.muted, fontSize: '0.95rem' }}>
            Connect directly with buyers, sell at fair prices, and book transport — all in one place.
          </p>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: SHARED.error, fontSize: '0.88rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 24 }}>
          <StatCard icon="🛒" label="Buyer Demand" value={listings.length} sub="Active listings from buyers" href="/farmer/search-buyers" />
          <StatCard icon="⚖️" label="Total Demand Qty" value={`${totalDemand.toLocaleString('en-IN')} kg`} sub="Across all buyers" accent="#3b82f6" />
          <StatCard icon="📈" label="Top Price" value={`₹${topPrice}`} sub="Highest offer / unit" accent="#10b981" />
          <StatCard icon="📊" label="Avg Price" value={`₹${avgPrice}`} sub="Across all listings" accent="#f59e0b" />
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: FARMER.text, fontSize: '1.05rem', fontWeight: 800, margin: '0 0 12px' }}>Quick actions</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <QuickAction icon="🔍" label="Search Buyers" href="/farmer/search-buyers" color="#3b82f6" />
            <QuickAction icon="🚚" label="Book Vehicle" href="/farmer/book-vehicle" color="#10b981" />
            <QuickAction icon="📦" label="My Bookings" href="/farmer/my-bookings" color="#f59e0b" />
            <QuickAction icon="📱" label="AgriSocial" href="/agrisocial" color="#8b5cf6" />
            <QuickAction icon="💳" label="Wallet" href="/agripay" color="#06b6d4" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start' }}>
          {/* Main: Buyer listings */}
          <div style={{ ...cardStyle(FARMER), border: `1px solid ${FARMER.borderLight}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${FARMER.borderLight}` }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: FARMER.text }}>Available buyer listings</h3>
                <p style={{ margin: '4px 0 0', color: FARMER.muted, fontSize: '0.78rem' }}>Tap a card to view details & book transport</p>
              </div>
              <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, fontSize: '0.84rem', textDecoration: 'none', fontWeight: 700 }}>View all →</Link>
            </div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 140, background: FARMER.bgSub, borderRadius: 12 }} />)}
              </div>
            ) : listings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: FARMER.muted }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌱</div>
                <h4 style={{ color: FARMER.text, margin: '0 0 6px', fontSize: '1rem' }}>No buyer demand yet</h4>
                <p style={{ marginBottom: 16, fontSize: '0.86rem' }}>Check back soon — buyers post fresh demand every day.</p>
                <Link href="/farmer/search-buyers" style={{ display: 'inline-block', color: FARMER.primary, fontWeight: 700, textDecoration: 'none', fontSize: '0.86rem' }}>🔍 Search buyers</Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {listings.slice(0, 8).map(l => (
                  <Link key={l._id} href={`/farmer/buyer/${l._id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: FARMER.white, border: `1px solid ${FARMER.borderLight}`, borderRadius: 12, padding: 14, transition: 'all 0.15s', height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🌾</div>
                        <h4 style={{ color: FARMER.text, fontWeight: 800, margin: 0, fontSize: '1rem', flex: 1 }}>{l.commodity}</h4>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                        <div>
                          <p style={{ color: FARMER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Qty</p>
                          <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{l.quantity} {l.unit || 'kg'}</p>
                        </div>
                        <div>
                          <p style={{ color: FARMER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Price</p>
                          <p style={{ color: FARMER.primary, fontWeight: 800, fontSize: '0.86rem', margin: 0 }}>₹{l.pricePerUnit}/{l.unit || 'unit'}</p>
                        </div>
                      </div>
                      <div style={{ borderTop: `1px solid ${FARMER.borderLight}`, paddingTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.9rem' }}>🏪</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.78rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.buyerId?.firmName || 'Buyer'}</p>
                          <p style={{ color: FARMER.muted, fontSize: '0.7rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.buyerId?.address || l.location || '—'}</p>
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
              <p style={{ color: FARMER.muted, fontSize: '0.76rem', margin: '0 0 14px' }}>Top-priced commodities buyers want right now</p>
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
