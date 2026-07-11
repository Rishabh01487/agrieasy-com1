'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { FARMER, SHARED, cardStyle, navStyle, inputStyle, labelStyle } from '@/lib/styles'

interface BookingCommodity {
  name: string
  quantity: number
  numberOfBags: number
  pricePerUnit: number
}

interface Booking {
  _id: string
  status: 'pending' | 'confirmed' | 'in-transit' | 'delivered' | 'cancelled'
  commodities?: BookingCommodity[]
  totalQuantity?: number
  quantity?: number  // legacy
  estimatedDistance?: number
  pickupLocation?: string
  deliveryLocation?: string
  estimatedArrivalTime?: string
  // Driver counter-offer
  driverResponse?: 'pending' | 'accepted' | 'counter-offered' | 'rejected'
  driverOfferedTime?: string
  driverNote?: string
  // Payment
  paymentStatus?: 'unpaid' | 'billed' | 'pending' | 'paid' | 'failed'
  paymentMethod?: string
  paymentAmount?: number
  billAmount?: number
  paidAt?: string
  freightAmount?: number
  freightType?: string
  buyerId?: { _id: string; firmName?: string; phone?: string }
  listingId?: { commodity: string; pricePerUnit: number } | null
  vehicleId?: { vehicleType: string; registrationNumber: string } | null
  buyerVehicleId?: { vehicleType: string; registrationNumber: string; vehicleDisplayName?: string } | null
}

const inp = inputStyle(FARMER)
const lbl = labelStyle(FARMER)

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const [trackingId, setTrackingId] = useState<string | null>(null)

  const fetchBookings = async () => {
    try {
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

  useEffect(() => { void fetchBookings() }, [])

  const respondToCounterOffer = async (id: string, accept: boolean) => {
    setActing(id)
    try {
      const res = await authFetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accept ? { acceptDriverOffer: true } : { rejectDriverOffer: true }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Failed to respond')
        return
      }
      void fetchBookings()
    } catch {
      setError('Network error')
    } finally {
      setActing(null)
    }
  }

  const openMaps = (address: string) => {
    const query = encodeURIComponent(address || 'India')
    window.open(`https://maps.google.com/?q=${query}`, '_blank')
  }

  const statusStyle = (status: string): React.CSSProperties => {
    const colors: Record<string, { bg: string; color: string }> = {
      pending: { bg: '#fef3c7', color: '#92400e' },
      confirmed: { bg: '#dbeafe', color: '#1e40af' },
      'in-transit': { bg: '#e0e7ff', color: '#3730a3' },
      delivered: { bg: '#d1fae5', color: '#065f46' },
      cancelled: { bg: '#fee2e2', color: '#991b1b' },
    }
    const c = colors[status] || { bg: '#f3f4f6', color: '#374151' }
    return { display: 'inline-block', padding: '4px 12px', borderRadius: '100px', background: c.bg, color: c.color, border: `1px solid ${c.bg}`, fontSize: '0.78rem', fontWeight: 700 }
  }

  const totalValue = (b: Booking) => {
    if (b.commodities && b.commodities.length > 0) {
      return b.commodities.reduce((s, c) => s + (c.quantity || 0) * (c.pricePerUnit || 0), 0)
    }
    return (b.quantity || 0) * (b.listingId?.pricePerUnit || 0)
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

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: FARMER.textSecondary, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 8px' }}>My Bookings</h2>
        <p style={{ color: FARMER.muted, marginBottom: '28px' }}>Track your commodity sales, vehicle dispatches, and payments.</p>

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
              src={`https://maps.google.com/maps?q=${encodeURIComponent(bookings.find(b => b._id === trackingId)?.pickupLocation || 'India')}&output=embed`}
              width="100%" height="300" style={{ border: 0, borderRadius: '12px' }} loading="lazy"
              allowFullScreen
              title="Vehicle Location"
            />
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: FARMER.muted }}>Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div style={{ ...cardStyle(FARMER), textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
            <p style={{ marginBottom: 16, color: FARMER.muted }}>No bookings yet.</p>
            <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, fontWeight: 600, textDecoration: 'none' }}>Find buyers →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bookings.map(b => (
              <div key={b._id} style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, border: `1px solid ${FARMER.borderLight}` }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: FARMER.text }}>
                      {(b.commodities && b.commodities.length > 0 ? b.commodities[0].name : b.listingId?.commodity) || 'Commodity'}
                      {b.commodities && b.commodities.length > 1 && <span style={{ color: FARMER.muted, fontWeight: 600, fontSize: '0.85rem' }}> +{b.commodities.length - 1} more</span>}
                    </h3>
                    {b.buyerId?.firmName && <p style={{ margin: '2px 0 0', color: FARMER.muted, fontSize: '0.8rem' }}>🏪 {b.buyerId.firmName}</p>}
                  </div>
                  <span style={statusStyle(b.status)}>{b.status}</span>
                </div>

                {/* Driver counter-offer banner */}
                {b.driverResponse === 'counter-offered' && b.status === 'pending' && (
                  <div style={{ padding: 12, background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10, marginBottom: 12 }}>
                    <p style={{ margin: 0, color: '#92400e', fontSize: '0.86rem', fontWeight: 800 }}>⏱ Driver proposed a new pickup time!</p>
                    <p style={{ margin: '4px 0 0', color: '#92400e', fontSize: '0.82rem' }}>
                      {b.driverOfferedTime ? new Date(b.driverOfferedTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                    </p>
                    {b.driverNote && <p style={{ margin: '4px 0 0', color: '#92400e', fontSize: '0.78rem' }}>📝 {b.driverNote}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => respondToCounterOffer(b._id, true)}
                        disabled={acting === b._id}
                        style={{ flex: 1, padding: '9px 14px', background: FARMER.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                      >
                        ✅ Accept new time
                      </button>
                      <button
                        onClick={() => respondToCounterOffer(b._id, false)}
                        disabled={acting === b._id}
                        style={{ flex: 1, padding: '9px 14px', background: SHARED.errorLight, color: SHARED.error, border: '1px solid #fca5a5', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                      >
                        Keep original time
                      </button>
                    </div>
                  </div>
                )}

                {/* Commodity details */}
                {b.commodities && b.commodities.length > 0 && (
                  <div style={{ marginBottom: 10, padding: 10, background: FARMER.bgSub, borderRadius: 8 }}>
                    {b.commodities.map((c, i) => (
                      <p key={i} style={{ margin: '2px 0', color: FARMER.text, fontSize: '0.82rem' }}>
                        🌾 {c.name}: {c.quantity} kg · {c.numberOfBags} bags · ₹{c.pricePerUnit}/kg = ₹{(c.quantity * c.pricePerUnit).toLocaleString('en-IN')}
                      </p>
                    ))}
                  </div>
                )}

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, color: FARMER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Qty</p>
                    <p style={{ margin: '2px 0 0', color: FARMER.text, fontWeight: 700, fontSize: '0.88rem' }}>{(b.totalQuantity || b.quantity || 0).toLocaleString('en-IN')} kg</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: FARMER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Value</p>
                    <p style={{ margin: '2px 0 0', color: FARMER.primary, fontWeight: 800, fontSize: '0.88rem' }}>₹{totalValue(b).toLocaleString('en-IN')}</p>
                  </div>
                  {b.freightAmount !== undefined && b.freightAmount > 0 && (
                    <div>
                      <p style={{ margin: 0, color: FARMER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Freight</p>
                      <p style={{ margin: '2px 0 0', color: FARMER.text, fontWeight: 700, fontSize: '0.88rem' }}>₹{b.freightAmount.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ margin: 0, color: FARMER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Pickup</p>
                    <p style={{ margin: '2px 0 0', color: FARMER.text, fontWeight: 600, fontSize: '0.82rem' }}>
                      {b.estimatedArrivalTime ? new Date(b.estimatedArrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </p>
                  </div>
                </div>

                {/* Vehicle info */}
                {(b.vehicleId || b.buyerVehicleId) && (
                  <div style={{ marginBottom: 10, padding: 10, background: FARMER.white, borderRadius: 8, border: `1px solid ${FARMER.borderLight}` }}>
                    <p style={{ margin: 0, color: FARMER.text, fontSize: '0.82rem' }}>
                      🚚 {b.vehicleId?.vehicleType || b.buyerVehicleId?.vehicleType} · {b.vehicleId?.registrationNumber || b.buyerVehicleId?.registrationNumber}
                    </p>
                  </div>
                )}

                {/* Payment status */}
                {b.status === 'delivered' && (
                  <div style={{ padding: 10, borderRadius: 8, marginBottom: 10,
                    background: b.paymentStatus === 'paid' ? SHARED.successLight : b.paymentStatus === 'billed' || b.paymentStatus === 'pending' ? '#fef3c7' : SHARED.errorLight,
                    border: `1px solid ${b.paymentStatus === 'paid' ? '#6ee7b7' : b.paymentStatus === 'billed' || b.paymentStatus === 'pending' ? '#fde68a' : '#fca5a5'}`,
                  }}>
                    {b.paymentStatus === 'paid' ? (
                      <p style={{ margin: 0, color: SHARED.success, fontSize: '0.84rem', fontWeight: 700 }}>
                        ✅ Paid ₹{(b.paymentAmount || 0).toLocaleString('en-IN')} via {b.paymentMethod}
                        {b.paidAt && ` on ${new Date(b.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </p>
                    ) : b.paymentStatus === 'billed' ? (
                      <p style={{ margin: 0, color: '#92400e', fontSize: '0.84rem', fontWeight: 700 }}>
                        💰 Buyer billed ₹{(b.billAmount || 0).toLocaleString('en-IN')} — awaiting payment
                      </p>
                    ) : b.paymentStatus === 'pending' ? (
                      <p style={{ margin: 0, color: '#92400e', fontSize: '0.84rem', fontWeight: 700 }}>
                        ⏳ UPI payment in progress
                      </p>
                    ) : (
                      <p style={{ margin: 0, color: SHARED.error, fontSize: '0.84rem', fontWeight: 700 }}>
                        ⏳ Awaiting buyer to weigh & bill
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    href={`/tracking?bookingId=${b._id}`}
                    style={{ background: FARMER.primaryLight, color: FARMER.primary, border: `1px solid ${FARMER.border}`, borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s ease' }}
                  >
                    📍 Track
                  </Link>
                  <button
                    onClick={() => openMaps(b.pickupLocation || 'India')}
                    style={{ background: SHARED.successLight, color: '#166534', border: '1px solid #86efac', borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    Maps
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`input:focus { border-color: ${FARMER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}
