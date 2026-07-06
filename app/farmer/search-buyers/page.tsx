'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FARMER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  pricePerUnit: number
  quality: string
  paymentConditions: string
  buyerId: { _id: string; firmName: string; address: string }
}

export default function SearchBuyers() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commodity, setCommodity] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

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
      const res = await fetch(`/api/listings${qs ? '?' + qs : ''}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to fetch listings')
        return
      }
      const data = await res.json()
      setListings(data.listings || [])
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

  return (
    <div style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/farmer/dashboard" style={{ color: FARMER.primary, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: FARMER.muted }}>›</span>
            <span style={{ color: FARMER.text, fontWeight: 600, fontSize: '0.9rem' }}>Search Buyers</span>
          </div>
          <Link href="/farmer/dashboard" style={{ color: FARMER.primary, background: FARMER.primaryLight, border: `1px solid ${FARMER.border}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: FARMER.textSecondary, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 8px' }}>Search Buyers</h2>
        <p style={{ color: FARMER.muted, marginBottom: '24px' }}>Find buyers looking for your produce and book a vehicle to deliver.</p>

        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, marginBottom: '24px', transition: 'all 0.2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={lbl}>Commodity</label>
              <input type="text" value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="e.g., Wheat, Rice…" style={inp} />
            </div>
            <div>
              <label style={lbl}>Max Price (₹/unit)</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="e.g., 2500" style={inp} />
            </div>
            <button onClick={handleFilter} style={{ background: FARMER.primary, color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(101,163,13,0.25)', transition: 'all 0.2s ease' }}>
              Apply Filters
            </button>
          </div>
          <p style={{ color: FARMER.muted, fontSize: '0.82rem', marginTop: '10px' }}>Showing {listings.length} listings</p>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>{error}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: FARMER.muted }}>Loading buyer listings…</div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: FARMER.muted }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
            <p>No matching listings. Try adjusting your filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '18px' }}>
            {listings.map(l => (
              <div key={l._id} style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s ease' }}>
                <h3 style={{ color: FARMER.primary, fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>{l.commodity}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
                  {[
                    ['Quantity', `${l.quantity} kg`],
                    ['Price', `₹${l.pricePerUnit}/unit`],
                    ['Quality', l.quality || 'Not specified'],
                    ['Payment', l.paymentConditions || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color: FARMER.muted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                      <div style={{ color: FARMER.text, fontWeight: 600, fontSize: '0.9rem' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: `1px solid ${FARMER.border}`, paddingTop: '10px' }}>
                  <div style={{ color: FARMER.muted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Buyer</div>
                  <div style={{ color: FARMER.text, fontWeight: 700 }}>{l.buyerId?.firmName}</div>
                  <div style={{ color: FARMER.muted, fontSize: '0.82rem' }}>{l.buyerId?.address || '—'}</div>
                </div>
                <button
                  onClick={() => router.push(`/farmer/book-vehicle?listingId=${l._id}`)}
                  style={{ marginTop: '8px', background: FARMER.primary, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 14px rgba(101,163,13,0.25)', transition: 'all 0.2s ease' }}
                >
                  Book Vehicle for this Buyer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}