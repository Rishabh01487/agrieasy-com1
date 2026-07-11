'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { FARMER, SHARED, cardStyle, navStyle, inputStyle, labelStyle } from '@/lib/styles'

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
  shopPhoto?: string
  distanceKm?: number | null
  buyerId: { _id: string; firmName: string; address: string; shopPhoto?: string }
}

interface FarmerProfile {
  farmerAddress?: string
  location?: { latitude: number; longitude: number } | null
}

const RADIUS_OPTIONS = [
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
  { value: '50', label: '50 km' },
  { value: '100', label: '100 km' },
  { value: '250', label: '250 km' },
  { value: '0', label: 'Any distance' },
]

const SORT_OPTIONS = [
  { value: 'distance', label: '📍 Nearest first' },
  { value: 'price-high', label: '💰 Highest price' },
  { value: 'price-low', label: '💵 Lowest price' },
  { value: 'recent', label: '⏱ Most recent' },
]

function distanceLabel(km: number | null | undefined): string {
  if (km == null) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export default function SearchBuyers() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [profile, setProfile] = useState<FarmerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [commodity, setCommodity] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [quality, setQuality] = useState('')
  const [paymentConditions, setPaymentConditions] = useState('')
  const [radiusKm, setRadiusKm] = useState('50')
  const [sortBy, setSortBy] = useState('distance')

  const inp = inputStyle(FARMER)
  const lbl = labelStyle(FARMER)

  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch('/api/farmer/profile')
        if (res.ok) {
          const data = await res.json()
          const p = data?.data?.profile || data?.profile
          if (p) setProfile(p)
        }
      } catch { /* ignore */ }
    })()
  }, [])

  const fetchListings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (commodity) params.set('commodity', commodity)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)
      if (quality) params.set('quality', quality)
      if (paymentConditions) params.set('paymentConditions', paymentConditions)
      if (sortBy) params.set('sortBy', sortBy)
      if (profile?.location?.latitude) {
        params.set('farmerLat', String(profile.location.latitude))
        params.set('farmerLng', String(profile.location.longitude))
        if (radiusKm && radiusKm !== '0') params.set('radiusKm', radiusKm)
      }
      const qs = params.toString()
      const res = await authFetch(`/api/listings${qs ? '?' + qs : ''}`)
      if (!res.ok) {
        setError('Failed to fetch listings')
        return
      }
      const data = await res.json()
      setListings(data?.data?.listings || data?.listings || [])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [commodity, minPrice, maxPrice, quality, paymentConditions, sortBy, profile, radiusKm])

  useEffect(() => {
    if (profile === null) return
    void fetchListings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const handleFilter = () => void fetchListings()
  const handleClear = () => {
    setCommodity(''); setMinPrice(''); setMaxPrice('')
    setQuality(''); setPaymentConditions(''); setRadiusKm('50'); setSortBy('distance')
    setTimeout(() => void fetchListings(), 0)
  }

  return (
    <div style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: FARMER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.85rem' }}>🌾</div>
            <Link href="/farmer/dashboard" style={{ color: FARMER.text, fontWeight: 800, textDecoration: 'none', fontSize: '1rem' }}>AgriEasy</Link>
            <span style={{ color: FARMER.muted }}>›</span>
            <span style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.92rem' }}>Search Buyers</span>
          </div>
          <Link href="/farmer/dashboard" style={{ color: FARMER.primary, background: FARMER.primaryLight, border: `1px solid ${FARMER.border}`, padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontSize: '0.84rem', fontWeight: 700, transition: 'all 0.2s ease' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 60px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: FARMER.text, fontWeight: 800, fontSize: '1.7rem', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Find buyers 🤝</h1>
          <p style={{ color: FARMER.muted, margin: 0, fontSize: '0.92rem' }}>
            {profile?.farmerAddress ? <>📍 From <strong>{profile.farmerAddress}</strong> · </> : null}
            Filter by distance, price, commodity, quality & payment terms.
          </p>
        </div>

        {/* Filter bar */}
        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, marginBottom: 20, border: `1px solid ${FARMER.borderLight}`, padding: 18 }}>
          {/* Row 1 — distance + sort */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Search Radius</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RADIUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRadiusKm(opt.value)}
                    style={{
                      padding: '7px 12px', borderRadius: 100,
                      border: `1.5px solid ${radiusKm === opt.value ? FARMER.primary : FARMER.border}`,
                      background: radiusKm === opt.value ? FARMER.primary : FARMER.white,
                      color: radiusKm === opt.value ? '#fff' : FARMER.textSecondary,
                      fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Sort By</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortBy(opt.value)}
                    style={{
                      padding: '7px 12px', borderRadius: 100,
                      border: `1.5px solid ${sortBy === opt.value ? FARMER.primary : FARMER.border}`,
                      background: sortBy === opt.value ? FARMER.primary : FARMER.white,
                      color: sortBy === opt.value ? '#fff' : FARMER.textSecondary,
                      fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2 — text/number filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Commodity</label>
              <input type="text" value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="e.g., Wheat" style={inp} />
            </div>
            <div>
              <label style={lbl}>Min Price (₹)</label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0" style={inp} />
            </div>
            <div>
              <label style={lbl}>Max Price (₹)</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Any" style={inp} />
            </div>
            <div>
              <label style={lbl}>Quality</label>
              <input type="text" value={quality} onChange={e => setQuality(e.target.value)} placeholder="e.g., Grade-A" style={inp} />
            </div>
          </div>

          {/* Row 3 — payment conditions + actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr auto auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={lbl}>Payment Conditions</label>
              <input type="text" value={paymentConditions} onChange={e => setPaymentConditions(e.target.value)} placeholder="e.g., advance, COD, on delivery" style={inp} />
            </div>
            <button onClick={handleFilter} style={{ background: FARMER.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', whiteSpace: 'nowrap', boxShadow: `0 4px 14px ${FARMER.primary}40`, transition: 'all 0.2s ease' }}>
              🔍 Search
            </button>
            <button onClick={handleClear} style={{ background: FARMER.bg, color: FARMER.textSecondary, border: `1px solid ${FARMER.border}`, borderRadius: 10, padding: '12px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem', transition: 'all 0.2s ease' }}>
              Clear
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ marginLeft: 'auto', color: FARMER.muted, fontSize: '0.78rem' }}>
              {loading ? 'Searching…' : `${listings.length} ${listings.length === 1 ? 'result' : 'results'}`}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: SHARED.error, fontSize: '0.88rem', fontWeight: 600 }}>{error}</div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} style={{ height: 240, background: FARMER.bgSub, borderRadius: 14 }} />)}
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: FARMER.muted }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
            <h4 style={{ color: FARMER.text, margin: '0 0 6px', fontSize: '1rem' }}>No matching buyers</h4>
            <p style={{ fontSize: '0.86rem', margin: '0 0 14px' }}>Try widening your radius or removing some filters.</p>
            <button onClick={handleClear} style={{ background: FARMER.primaryLight, color: FARMER.primary, border: `1px solid ${FARMER.border}`, borderRadius: 10, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}>
              Clear all filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {listings.map(l => (
              <div key={l._id} style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, display: 'flex', flexDirection: 'column', gap: 10, padding: 16, border: `1px solid ${FARMER.borderLight}`, transition: 'all 0.2s' }}>
                {/* Top row: shop photo + commodity */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {l.commodityPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.commodityPhoto} alt={l.commodity} style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: 12, background: FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>🌾</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ color: FARMER.text, fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{l.commodity}</h3>
                    <p style={{ color: FARMER.muted, fontSize: '0.72rem', margin: '2px 0 0' }}>
                      {l.priceDate ? `Price as of ${new Date(l.priceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : `Posted ${new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: FARMER.primary, fontWeight: 800, fontSize: '1.15rem', margin: 0, lineHeight: 1 }}>₹{l.pricePerUnit}</p>
                    <p style={{ color: FARMER.muted, fontSize: '0.68rem', margin: 0 }}>per {l.unit || 'kg'}</p>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '10px 0', borderTop: `1px solid ${FARMER.borderLight}`, borderBottom: `1px solid ${FARMER.borderLight}` }}>
                  <div>
                    <p style={{ color: FARMER.muted, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Distance</p>
                    <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.82rem', margin: 0 }}>{distanceLabel(l.distanceKm)}</p>
                  </div>
                  <div>
                    <p style={{ color: FARMER.muted, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Quality</p>
                    <p style={{ color: FARMER.text, fontWeight: 600, fontSize: '0.82rem', margin: 0 }}>{l.quality || 'Standard'}</p>
                  </div>
                  <div>
                    <p style={{ color: FARMER.muted, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Qty</p>
                    <p style={{ color: FARMER.text, fontWeight: 600, fontSize: '0.82rem', margin: 0 }}>{l.quantity ? `${l.quantity} ${l.unit || 'kg'}` : 'Any'}</p>
                  </div>
                </div>

                {/* Buyer info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: '1rem', marginTop: 1 }}>🏪</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{l.buyerId?.firmName || 'Buyer'}</p>
                    <p style={{ color: FARMER.muted, fontSize: '0.74rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {l.location || l.buyerId?.address || 'Address not provided'}</p>
                    {l.paymentConditions && (
                      <p style={{ color: FARMER.muted, fontSize: '0.72rem', margin: '2px 0 0' }}>💵 {l.paymentConditions}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/farmer/buyer/${l.buyerId?._id || ''}?listingId=${l._id}`)}
                  style={{ marginTop: 'auto', background: FARMER.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', boxShadow: `0 4px 14px ${FARMER.primary}40`, transition: 'all 0.2s ease' }}
                >
                  View & Sell to this Buyer →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
