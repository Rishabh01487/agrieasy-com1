'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { FARMER, SHARED, cardStyle, navStyle, getStatusStyle } from '@/lib/styles'

interface Booking {
  _id: string
  status: string
  quantity: number
  estimatedDistance: number
  pickupLocation?: string
  deliveryLocation?: string
  estimatedArrivalTime?: string
  listingId: { commodity: string; pricePerUnit: number } | null
  vehicleId: { vehicleType: string; registrationNumber: string } | null
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trackingId, setTrackingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        // FIX: Use ?role=farmer instead of ?farmerId=<id>
        const res = await authFetch('/api/bookings?role=farmer')
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error || 'Failed to fetch bookings')
          return
        }
        const data = await res.json()
        setBookings(data?.data?.bookings || data?.bookings || [])
      } catch {
        setError('Network error. Please try again.')
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

  const statusStyle = (status: string): React.CSSProperties => {
    const s = getStatusStyle(status)
    return { display: 'inline-block', padding: '4px 12px', borderRadius: '100px', background: s.bg, color: s.color, border: `1px solid ${s.bg}`, fontSize: '0.78rem', fontWeight: 700 }
  }

  return (
    <div style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/farmer/dashboard" style={{ color: FARMER.primary, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: FARMER.muted }}>›</span>
            <span style={{ color: FARMER.text, fontWeight: 600, fontSize: '0.9rem' }}>My Bookings</span>
          </div>
          <Link href="/farmer/dashboard" style={{ color: FARMER.primary, background: FARMER.primaryLight, border: `1px solid ${FARMER.border}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: FARMER.textSecondary, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 8px' }}>My Bookings</h2>
        <p style={{ color: FARMER.muted, marginBottom: '28px' }}>Track your booked vehicles.</p>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>{error}</div>
        )}

        {/* Map embed */}
        {trackingId && (
          <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, marginBottom: '24px', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: FARMER.textSecondary, fontWeight: 700, margin: 0 }}>Pickup Location</h3>
              <button onClick={() => setTrackingId(null)} style={{ color: FARMER.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Close</button>
            </div>
            <iframe
              // FIX: Use pickupLocation instead of farmerAddress
              src={`https://maps.google.com/maps?q=${encodeURIComponent(bookings.find(b => b._id === trackingId)?.pickupLocation || 'India')}&output=embed`}
              width="100%" height="300" style={{ border: 0, borderRadius: '12px' }} loading="lazy"
              allowFullScreen
              title="Vehicle Location"
            />
            <p style={{ color: FARMER.muted, fontSize: '0.8rem', marginTop: '8px', textAlign: 'center' }}>
              Showing pickup location. Live GPS tracking requires transporter app integration.
            </p>
          </div>
        )}

        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: FARMER.muted }}>Loading bookings…</div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: FARMER.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
              <p style={{ marginBottom: '16px' }}>No bookings yet.</p>
              <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, fontWeight: 600, textDecoration: 'none' }}>Find buyers →</Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${FARMER.border}` }}>
                    {['Commodity', 'Qty', 'Vehicle', 'Pickup Time', 'Distance', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ color: FARMER.textSecondary, fontWeight: 700, fontSize: '0.78rem', textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b._id} style={{ borderBottom: `1px solid ${FARMER.bg}` }}>
                      <td style={{ color: FARMER.text, padding: '14px', fontWeight: 600 }}>{b.listingId?.commodity || '—'}</td>
                      <td style={{ color: FARMER.muted, padding: '14px' }}>{b.quantity} kg</td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ color: FARMER.primary, fontWeight: 700, fontSize: '0.875rem' }}>{b.vehicleId?.vehicleType || '—'}</div>
                        <div style={{ color: FARMER.muted, fontFamily: 'monospace', fontSize: '0.78rem' }}>{b.vehicleId?.registrationNumber || '—'}</div>
                      </td>
                      <td style={{ color: FARMER.muted, padding: '14px', fontSize: '0.85rem' }}>
                        {/* FIX: Use estimatedArrivalTime instead of pickupDateTime */}
                        {b.estimatedArrivalTime ? new Date(b.estimatedArrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </td>
                      <td style={{ color: FARMER.muted, padding: '14px' }}>{b.estimatedDistance || '—'} km</td>
                      <td style={{ padding: '14px' }}><span style={statusStyle(b.status)}>{b.status}</span></td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <Link
                            href={`/tracking?bookingId=${b._id}`}
                            style={{ background: FARMER.primaryLight, color: FARMER.primary, border: `1px solid ${FARMER.border}`, borderRadius: '6px', padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s ease' }}
                          >
                            📍 Track
                          </Link>
                          <button
                            // FIX: Use pickupLocation instead of farmerAddress
                            onClick={() => openMaps(b.pickupLocation || 'India')}
                            style={{ background: SHARED.successLight, color: '#166534', border: '1px solid #86efac', borderRadius: '6px', padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}
                          >
                            Maps
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