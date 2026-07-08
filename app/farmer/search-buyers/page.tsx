'use client'

import { useState, useEffect } from 'react'
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
  quality?: string
  paymentConditions?: string
  location?: string
  shopPhoto?: string
  buyerId: { _id: string; firmName: string; address: string; phone?: string }
  createdAt: string
}

export default function SearchBuyers() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commodity, setCommodity] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'price-high' | 'price-low' | 'qty-high'>('price-high')

  const inp = inputStyle(FARMER)
  const lbl = labelStyle(FARMER)

  const fetchListings = async (commodityFilter?: string, maxPriceFilter?: string) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (commodityFilter) params.set('commodity', commodityFilter)
      if (maxPriceFilter) params.set('maxPrice', maxPriceFilter)
      const qs = params.toString()
      const res = await authFetch(`/api/listings${qs ? '?' + qs : ''}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to fetch listings')
        return
      }
      const data = await res.json()
      setListings(data?.data?.listings || data?.listings || [])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchListings() }, [])

  const handleFilter = () => {
    void fetchListings(commodity, maxPrice)
  }

  const handleClear = () => {
    setCommodity('')
    setMaxPrice('')
    void fetchListings()
  }

  // Apply local sort
  const sorted = [...listings].sort((a, b) => {
    if (sortBy === 'price-high') return b.pricePerUnit - a.pricePerUnit
    if (sortBy === 'price-low') return a.pricePerUnit - b.pricePerUnit
    if (sortBy === 'qty-high') return b.quantity - a.quantity
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

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
          <p style={{ color: FARMER.muted, margin: 0, fontSize: '0.92rem' }}>Browse active buyer demand, compare prices, and book transport for your harvest.</p>
        </div>

        {/* Filter bar */}
        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, marginBottom: 20, border: `1px solid ${FARMER.borderLight}`, padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={lbl}>Commodity</label>
              <input type="text" value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="e.g., Wheat, Rice…" style={inp} />
            </div>
            <div>
              <label style={lbl}>Max Price (₹/unit)</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="e.g., 2500" style={inp} />
            </div>
            <button onClick={handleFilter} style={{ background: FARMER.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', whiteSpace: 'nowrap', boxShadow: `0 4px 14px ${FARMER.primary}40`, transition: 'all 0.2s ease' }}>
              🔍 Search
            </button>
            <button onClick={handleClear} style={{ background: FARMER.bg, color: FARMER.textSecondary, border: `1px solid ${FARMER.border}`, borderRadius: 10, padding: '12px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem', transition: 'all 0.2s ease' }}>
              Clear
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ color: FARMER.muted, fontSize: '0.78rem', fontWeight: 600 }}>Sort by:</span>
            {([['price-high', '💰 Highest price'], ['price-low', '💵 Lowest price'], ['qty-high', '⚖️ Largest qty'], ['recent', '⏱ Most recent']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setSortBy(k)} style={{ padding: '5px 12px', borderRadius: 100, border: `1px solid ${sortBy === k ? FARMER.primary : FARMER.border}`, background: sortBy === k ? FARMER.primary : FARMER.white, color: sortBy === k ? '#fff' : FARMER.textSecondary, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>{label}</button>
            ))}
            <span style={{ marginLeft: 'auto', color: FARMER.muted, fontSize: '0.78rem' }}>{listings.length} {listings.length === 1 ? 'result' : 'results'}</span>
          </div>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: SHARED.error, fontSize: '0.88rem', fontWeight: 600 }}>{error}</div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} style={{ height: 220, background: FARMER.bgSub, borderRadius: 14 }} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: FARMER.muted }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
            <h4 style={{ color: FARMER.text, margin: '0 0 6px', fontSize: '1rem' }}>No matching listings</h4>
            <p style={{ fontSize: '0.86rem', margin: 0 }}>Try adjusting your filters or clearing them.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {sorted.map(l => (
              <div key={l._id} style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, display: 'flex', flexDirection: 'column', gap: 10, padding: 16, border: `1px solid ${FARMER.borderLight}`, transition: 'all 0.2s' }}>
                {l.shopPhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.shopPhoto} alt="shop" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🌾</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ color: FARMER.text, fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{l.commodity}</h3>
                    <p style={{ color: FARMER.muted, fontSize: '0.72rem', margin: 0 }}>{new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: FARMER.primary, fontWeight: 800, fontSize: '1.15rem', margin: 0, lineHeight: 1 }}>₹{l.pricePerUnit}</p>
                    <p style={{ color: FARMER.muted, fontSize: '0.68rem', margin: 0 }}>per {l.unit || 'unit'}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '10px 0', borderTop: `1px solid ${FARMER.borderLight}`, borderBottom: `1px solid ${FARMER.borderLight}` }}>
                  <div>
                    <p style={{ color: FARMER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Quantity</p>
                    <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.92rem', margin: 0 }}>{l.quantity} {l.unit || 'kg'}</p>
                  </div>
                  <div>
                    <p style={{ color: FARMER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Quality</p>
                    <p style={{ color: FARMER.text, fontWeight: 600, fontSize: '0.86rem', margin: 0 }}>{l.quality || 'Standard'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: '1rem', marginTop: 1 }}>🏪</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{l.buyerId?.firmName || 'Buyer'}</p>
                    <p style={{ color: FARMER.muted, fontSize: '0.76rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {l.buyerId?.address || l.location || 'Address not provided'}</p>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/farmer/book-vehicle?listingId=${l._id}`)}
                  style={{ marginTop: 'auto', background: FARMER.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', boxShadow: `0 4px 14px ${FARMER.primary}40`, transition: 'all 0.2s ease' }}
                >
                  🚚 Book Vehicle for this Buyer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
