'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Booking {
  _id: string
  status: string
  quantity: number
  estimatedDistance: number
  pickupDateTime?: string
  estimatedArrivalTime: string
  farmerAddress?: string
  listingId: { commodity: string; pricePerUnit: number }
  vehicleId: { vehicleType: string; registrationNumber: string }
}

const C = {
  bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
  brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280', border: '#ddd6fe',
}

const statusStyle = (status: string): React.CSSProperties => {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    pending: { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
    confirmed: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
    'in-transit': { bg: C.brLight, color: C.brDark, border: C.brMid },
    delivered: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
    cancelled: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  }
  const s = map[status] || { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
  return { display: 'inline-block', padding: '4px 12px', borderRadius: '100px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: '0.78rem', fontWeight: 700 }
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [trackingId, setTrackingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const farmerId = localStorage.getItem('userId')
        const res = await fetch(`/api/bookings?farmerId=${farmerId}`)
        const data = await res.json()
        setBookings(data.bookings || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    void fetchBookings()
  }, [])

  const openMaps = (address: string) => {
    const query = encodeURIComponent(address || 'India')
    window.open(`https://maps.google.com/?q=${query}`, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/farmer/dashboard" style={{ color: C.brinjal, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: C.muted }}>›</span>
            <span style={{ color: C.text, fontWeight: 600, fontSize: '0.9rem' }}>My Bookings</span>
          </div>
          <Link href="/farmer/dashboard" style={{ color: C.brinjal, background: C.brLight, border: `1px solid ${C.brMid}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: C.brDark, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 8px' }}>📦 My Bookings</h2>
        <p style={{ color: C.muted, marginBottom: '28px' }}>Track your booked vehicles in real time.</p>

        {/* Map embed */}
        {trackingId && (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: C.brDark, fontWeight: 700, margin: 0 }}>📍 Live Tracking</h3>
              <button onClick={() => setTrackingId(null)} style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Close ✕</button>
            </div>
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(bookings.find(b => b._id === trackingId)?.farmerAddress || 'India')}&output=embed`}
              width="100%" height="300" style={{ border: 0, borderRadius: '12px' }} loading="lazy"
              allowFullScreen
              title="Vehicle Location"
            />
            <p style={{ color: C.muted, fontSize: '0.8rem', marginTop: '8px', textAlign: 'center' }}>
              Showing pickup location · Live GPS tracking requires transporter app integration
            </p>
          </div>
        )}

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>Loading bookings…</div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
              <p style={{ marginBottom: '16px' }}>No bookings yet.</p>
              <Link href="/farmer/search-buyers" style={{ color: C.brinjal, fontWeight: 600, textDecoration: 'none' }}>Find buyers →</Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {['Commodity', 'Qty', 'Vehicle', 'Pickup Time', 'Distance', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ color: C.brDark, fontWeight: 700, fontSize: '0.78rem', textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b._id} style={{ borderBottom: `1px solid ${C.bg}` }}>
                      <td style={{ color: C.text, padding: '14px', fontWeight: 600 }}>{b.listingId?.commodity || '—'}</td>
                      <td style={{ color: C.muted, padding: '14px' }}>{b.quantity} kg</td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ color: C.brinjal, fontWeight: 700, fontSize: '0.875rem' }}>{b.vehicleId?.vehicleType}</div>
                        <div style={{ color: C.muted, fontFamily: 'monospace', fontSize: '0.78rem' }}>{b.vehicleId?.registrationNumber}</div>
                      </td>
                      <td style={{ color: C.muted, padding: '14px', fontSize: '0.85rem' }}>
                        {b.pickupDateTime ? new Date(b.pickupDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </td>
                      <td style={{ color: C.muted, padding: '14px' }}>{b.estimatedDistance} km</td>
                      <td style={{ padding: '14px' }}><span style={statusStyle(b.status)}>{b.status}</span></td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setTrackingId(b._id)}
                            style={{ background: C.brLight, color: C.brinjal, border: `1px solid ${C.brMid}`, borderRadius: '6px', padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            📍 Track
                          </button>
                          <button
                            onClick={() => openMaps(b.farmerAddress || 'India')}
                            style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: '6px', padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            🗺️ Maps
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}