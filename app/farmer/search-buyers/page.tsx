'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  pricePerUnit: number
  quality: string
  paymentConditions: string
  buyerId: { _id: string; firmName: string; phone: string; address: string }
}

const C = {
  bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
  brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280', border: '#ddd6fe',
}
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: '10px',
  fontSize: '0.95rem', color: C.text, background: C.white, outline: 'none', boxSizing: 'border-box',
}

export default function SearchBuyers() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [filtered, setFiltered] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [commodity, setCommodity] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  useEffect(() => { void fetchListings() }, [])

  const fetchListings = async () => {
    try {
      const res = await fetch('/api/listings')
      const data = await res.json()
      setListings(data.listings || [])
      setFiltered(data.listings || [])
    } catch (error) {
      console.error('Error:', error)
    } finally { setLoading(false) }
  }

  const handleFilter = useCallback(() => {
    let result = listings
    if (commodity) result = result.filter(l => l.commodity.toLowerCase().includes(commodity.toLowerCase()))
    if (maxPrice) result = result.filter(l => l.pricePerUnit <= parseFloat(maxPrice))
    setFiltered(result)
  }, [commodity, maxPrice, listings])

  useEffect(() => { void handleFilter() }, [handleFilter])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <a href="/farmer/dashboard" style={{ color: C.brinjal, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</a>
            <span style={{ color: C.muted }}>›</span>
            <span style={{ color: C.text, fontWeight: 600, fontSize: '0.9rem' }}>Search Buyers</span>
          </div>
          <a href="/farmer/dashboard" style={{ color: C.brinjal, background: C.brLight, border: `1px solid ${C.brMid}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>← Dashboard</a>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: C.brDark, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 8px' }}>🔍 Search Buyers</h2>
        <p style={{ color: C.muted, marginBottom: '24px' }}>Find buyers looking for your produce and book a vehicle to deliver.</p>

        {/* Filters */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ fontWeight: 700, color: C.brDark, fontSize: '0.875rem', display: 'block', marginBottom: '6px' }}>Commodity</label>
              <input type="text" value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="e.g., Wheat, Rice…" style={inp} />
            </div>
            <div>
              <label style={{ fontWeight: 700, color: C.brDark, fontSize: '0.875rem', display: 'block', marginBottom: '6px' }}>Max Price (₹/unit)</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="e.g., 2500" style={inp} />
            </div>
            <button onClick={handleFilter} style={{ background: C.brinjal, color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              Apply Filters
            </button>
          </div>
          <p style={{ color: C.muted, fontSize: '0.82rem', marginTop: '10px' }}>Showing {filtered.length} of {listings.length} listings</p>
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted }}>Loading buyer listings…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
            <p>No matching listings. Try adjusting your filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '18px' }}>
            {filtered.map(l => (
              <div key={l._id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ color: C.brinjal, fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>{l.commodity}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
                  {[
                    ['Quantity', `${l.quantity} kg`],
                    ['Price', `₹${l.pricePerUnit}/unit`],
                    ['Quality', l.quality || 'Not specified'],
                    ['Payment', l.paymentConditions || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                      <div style={{ color: C.text, fontWeight: 600, fontSize: '0.9rem' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '10px' }}>
                  <div style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Buyer</div>
                  <div style={{ color: C.text, fontWeight: 700 }}>{l.buyerId?.firmName}</div>
                  <div style={{ color: C.muted, fontSize: '0.82rem' }}>📞 {l.buyerId?.phone}</div>
                  <div style={{ color: C.muted, fontSize: '0.82rem' }}>📍 {l.buyerId?.address}</div>
                </div>
                <button
                  onClick={() => router.push(`/farmer/book-vehicle?listingId=${l._id}`)}
                  style={{ marginTop: '8px', background: C.brinjal, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  🚛 Book Vehicle for this Buyer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}