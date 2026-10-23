'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import {
  MH, mhPageBg, mhCardStyle, mhPrimaryBtn, mhSecondaryBtn, mhNavStyle, mhInput, mhLabel, mhPill,
  WheatIcon, MapPinIcon, DollarSignIcon, ClockIcon, SearchIcon, StoreIcon, ArrowLeftIcon,
  HandshakeIcon, TruckIcon, AlertTriangleIcon, ArrowRightIcon,
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
  { value: 'distance', label: 'Nearest first', icon: <MapPinIcon size={12} /> },
  { value: 'price-high', label: 'Highest price', icon: <DollarSignIcon size={12} /> },
  { value: 'price-low', label: 'Lowest price', icon: <DollarSignIcon size={12} /> },
  { value: 'recent', label: 'Most recent', icon: <ClockIcon size={12} /> },
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
    <div style={mhPageBg}>
      <nav style={mhNavStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${MH.navy}, ${MH.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MH.cream, border: `1px solid ${MH.gold}` }}>
              <WheatIcon size={16} />
            </div>
            <Link href="/farmer/dashboard" style={{ color: MH.navy, fontWeight: 800, textDecoration: 'none', fontSize: '1rem' }}>AgriEasy</Link>
            <span style={{ color: MH.gold }}>›</span>
            <span style={{ color: MH.navy, fontWeight: 700, fontSize: '0.92rem' }}>Search Buyers</span>
          </div>
          <Link href="/farmer/dashboard" style={{ ...mhSecondaryBtn, padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeftIcon size={14} /> Dashboard
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 60px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: MH.navy, fontWeight: 800, fontSize: '1.7rem', margin: '0 0 6px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <HandshakeIcon size={26} style={{ color: MH.deepPink }} /> Find buyers
          </h1>
          <p style={{ color: MH.pinkGray, margin: 0, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {profile?.farmerAddress ? (
              <>
                <MapPinIcon size={14} style={{ color: MH.deepPink }} /> From <strong style={{ color: MH.navy }}>{profile.farmerAddress}</strong>
                <span>·</span>
              </>
            ) : null}
            Filter by distance, price, commodity, quality & payment terms.
          </p>
        </div>

        {/* Filter bar */}
        <div style={{ ...mhCardStyle({ doubleLine: true, padding: 18 }), marginBottom: 20 }}>
          {/* Row 1 — distance + sort */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={mhLabel}>Search Radius</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RADIUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRadiusKm(opt.value)}
                    style={mhPill(radiusKm === opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={mhLabel}>Sort By</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSortBy(opt.value)}
                    style={mhPill(sortBy === opt.value)}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2 — text/number filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={mhLabel}>Commodity</label>
              <input type="text" value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="e.g., Wheat" style={mhInput} />
            </div>
            <div>
              <label style={mhLabel}>Min Price (₹)</label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0" style={mhInput} />
            </div>
            <div>
              <label style={mhLabel}>Max Price (₹)</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Any" style={mhInput} />
            </div>
            <div>
              <label style={mhLabel}>Quality</label>
              <input type="text" value={quality} onChange={e => setQuality(e.target.value)} placeholder="e.g., Grade-A" style={mhInput} />
            </div>
          </div>

          {/* Row 3 — payment conditions + actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr auto auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={mhLabel}>Payment Conditions</label>
              <input type="text" value={paymentConditions} onChange={e => setPaymentConditions(e.target.value)} placeholder="e.g., advance, COD, on delivery" style={mhInput} />
            </div>
            <button onClick={handleFilter} style={{ ...mhPrimaryBtn(), padding: '12px 22px', borderRadius: 10, fontSize: '0.88rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <SearchIcon size={14} /> Search
            </button>
            <button onClick={handleClear} style={{ ...mhSecondaryBtn, padding: '12px 16px', borderRadius: 10, fontSize: '0.84rem' }}>
              Clear
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ marginLeft: 'auto', color: MH.pinkGray, fontSize: '0.78rem' }}>
              {loading ? 'Searching…' : `${listings.length} ${listings.length === 1 ? 'result' : 'results'}`}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ background: MH.errorLight, border: `1px solid ${MH.gold}`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: MH.deepPink, fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangleIcon size={16} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} style={{ height: 240, background: `${MH.gold}22`, borderRadius: 14 }} />)}
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: MH.pinkGray }}>
            <div style={{ fontSize: '3rem', marginBottom: 12, color: MH.pink, display: 'flex', justifyContent: 'center' }}><SearchIcon size={40} /></div>
            <h4 style={{ color: MH.navy, margin: '0 0 6px', fontSize: '1rem' }}>No matching buyers</h4>
            <p style={{ fontSize: '0.86rem', margin: '0 0 14px' }}>Try widening your radius or removing some filters.</p>
            <button onClick={handleClear} style={{ ...mhSecondaryBtn, borderRadius: 10, padding: '10px 20px', fontSize: '0.86rem' }}>
              Clear all filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {listings.map(l => (
              <div key={l._id} style={{ ...mhCardStyle({ doubleLine: true, padding: 16 }), display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Top row: shop photo + commodity */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {l.commodityPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.commodityPhoto} alt={l.commodity} style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: `1px solid ${MH.gold}` }} />
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: 12, background: `${MH.pink}18`, color: MH.deepPink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <WheatIcon size={24} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ color: MH.navy, fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{l.commodity}</h3>
                    <p style={{ color: MH.pinkGray, fontSize: '0.72rem', margin: '2px 0 0' }}>
                      {l.priceDate ? `Price as of ${new Date(l.priceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : `Posted ${new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: MH.deepPink, fontWeight: 800, fontSize: '1.15rem', margin: 0, lineHeight: 1 }}>₹{l.pricePerUnit}</p>
                    <p style={{ color: MH.pinkGray, fontSize: '0.68rem', margin: 0 }}>per {l.unit || 'kg'}</p>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '10px 0', borderTop: `1px solid ${MH.gold}`, borderBottom: `1px solid ${MH.gold}` }}>
                  <div>
                    <p style={{ color: MH.pinkGray, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MapPinIcon size={10} /> Distance
                    </p>
                    <p style={{ color: MH.navy, fontWeight: 700, fontSize: '0.82rem', margin: 0 }}>{distanceLabel(l.distanceKm)}</p>
                  </div>
                  <div>
                    <p style={{ color: MH.pinkGray, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Quality</p>
                    <p style={{ color: MH.navy, fontWeight: 600, fontSize: '0.82rem', margin: 0 }}>{l.quality || 'Standard'}</p>
                  </div>
                  <div>
                    <p style={{ color: MH.pinkGray, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Qty</p>
                    <p style={{ color: MH.navy, fontWeight: 600, fontSize: '0.82rem', margin: 0 }}>{l.quantity ? `${l.quantity} ${l.unit || 'kg'}` : 'Any'}</p>
                  </div>
                </div>

                {/* Buyer info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: MH.deepPink, display: 'inline-flex', marginTop: 1 }}><StoreIcon size={16} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: MH.navy, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{l.buyerId?.firmName || 'Buyer'}</p>
                    <p style={{ color: MH.pinkGray, fontSize: '0.74rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MapPinIcon size={10} /> {l.location || l.buyerId?.address || 'Address not provided'}
                    </p>
                    {l.paymentConditions && (
                      <p style={{ color: MH.pinkGray, fontSize: '0.72rem', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <DollarSignIcon size={10} /> {l.paymentConditions}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/farmer/buyer/${l.buyerId?._id || ''}?listingId=${l._id}`)}
                  style={{ ...mhPrimaryBtn(), marginTop: 'auto', borderRadius: 10, padding: '11px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <TruckIcon size={14} /> View & Sell to this Buyer <ArrowRightIcon size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
