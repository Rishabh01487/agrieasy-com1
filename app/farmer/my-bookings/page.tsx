'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import {
  MH, mhPageBg, mhCardStyle, mhPrimaryBtn, mhSecondaryBtn, mhNavStyle,
  WheatIcon, StoreIcon, TruckIcon, MapPinIcon, ClockIcon, FileTextIcon,
  CheckIcon, HourglassIcon, DollarSignIcon, AlertTriangleIcon, InboxIcon, ArrowLeftIcon, ArrowRightIcon,
} from '@/lib/madhubani'

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
    // Madhubani palette status pills — pink for pending, navy for confirmed,
    // pink-deep for in-transit, success-green for delivered, error-pink for cancelled.
    const colors: Record<string, { bg: string; color: string; border: string }> = {
      pending: { bg: MH.warningLight, color: MH.warning, border: MH.warning },
      confirmed: { bg: `${MH.navy}14`, color: MH.navy, border: MH.navy },
      'in-transit': { bg: `${MH.pink}1F`, color: MH.deepPink, border: MH.pink },
      delivered: { bg: MH.successLight, color: MH.success, border: MH.success },
      cancelled: { bg: MH.errorLight, color: MH.deepPink, border: MH.deepPink },
    }
    const c = colors[status] || { bg: `${MH.pinkGray}1F`, color: MH.pinkGray, border: MH.pinkGray }
    return { display: 'inline-block', padding: '4px 12px', borderRadius: '100px', background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize' }
  }

  const totalValue = (b: Booking) => {
    if (b.commodities && b.commodities.length > 0) {
      return b.commodities.reduce((s, c) => s + (c.quantity || 0) * (c.pricePerUnit || 0), 0)
    }
    return (b.quantity || 0) * (b.listingId?.pricePerUnit || 0)
  }

  return (
    <div style={mhPageBg}>
      <nav style={mhNavStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${MH.navy}, ${MH.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MH.cream, border: `1px solid ${MH.gold}` }}>
              <WheatIcon size={16} />
            </div>
            <Link href="/farmer/dashboard" style={{ color: MH.navy, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: MH.gold }}>›</span>
            <span style={{ color: MH.navy, fontWeight: 600, fontSize: '0.9rem' }}>My Bookings</span>
          </div>
          <Link href="/farmer/dashboard" style={{ ...mhSecondaryBtn, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeftIcon size={14} /> Dashboard
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: MH.navy, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <TruckIcon size={24} style={{ color: MH.deepPink }} /> My Bookings
        </h2>
        <p style={{ color: MH.pinkGray, marginBottom: '28px' }}>Track your commodity sales, vehicle dispatches, and payments.</p>

        {error && (
          <div style={{ background: MH.errorLight, border: `1px solid ${MH.gold}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: MH.deepPink, fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangleIcon size={16} /> {error}
          </div>
        )}

        {/* Map embed */}
        {trackingId && (
          <div style={{ ...mhCardStyle({ doubleLine: true }), marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: MH.navy, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPinIcon size={16} style={{ color: MH.deepPink }} /> Pickup Location
              </h3>
              <button onClick={() => setTrackingId(null)} style={{ color: MH.pinkGray, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Close</button>
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
          <div style={{ textAlign: 'center', padding: '48px 0', color: MH.pinkGray }}>Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div style={{ ...mhCardStyle({ doubleLine: true }), textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ marginBottom: 12, color: MH.pink, display: 'flex', justifyContent: 'center' }}><InboxIcon size={44} /></div>
            <p style={{ marginBottom: 16, color: MH.pinkGray }}>No bookings yet.</p>
            <Link href="/farmer/search-buyers" style={{ color: MH.deepPink, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Find buyers <ArrowRightIcon size={12} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bookings.map(b => (
              <div key={b._id} style={{ ...mhCardStyle({ doubleLine: true }) }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: MH.navy, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <WheatIcon size={16} style={{ color: MH.deepPink }} />
                      {(b.commodities && b.commodities.length > 0 ? b.commodities[0].name : b.listingId?.commodity) || 'Commodity'}
                      {b.commodities && b.commodities.length > 1 && <span style={{ color: MH.pinkGray, fontWeight: 600, fontSize: '0.85rem' }}> +{b.commodities.length - 1} more</span>}
                    </h3>
                    {b.buyerId?.firmName && (
                      <p style={{ margin: '2px 0 0', color: MH.pinkGray, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <StoreIcon size={12} /> {b.buyerId.firmName}
                      </p>
                    )}
                  </div>
                  <span style={statusStyle(b.status)}>{b.status}</span>
                </div>

                {/* Driver counter-offer banner */}
                {b.driverResponse === 'counter-offered' && b.status === 'pending' && (
                  <div style={{ padding: 12, background: MH.warningLight, border: `1.5px solid ${MH.warning}`, borderRadius: 10, marginBottom: 12 }}>
                    <p style={{ margin: 0, color: MH.warning, fontSize: '0.86rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ClockIcon size={14} /> Driver proposed a new pickup time!
                    </p>
                    <p style={{ margin: '4px 0 0', color: MH.warning, fontSize: '0.82rem' }}>
                      {b.driverOfferedTime ? new Date(b.driverOfferedTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                    </p>
                    {b.driverNote && (
                      <p style={{ margin: '4px 0 0', color: MH.warning, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FileTextIcon size={12} /> {b.driverNote}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => respondToCounterOffer(b._id, true)}
                        disabled={acting === b._id}
                        style={{ ...mhPrimaryBtn(), flex: 1, padding: '9px 14px', borderRadius: 8, fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                      >
                        <CheckIcon size={14} /> Accept new time
                      </button>
                      <button
                        onClick={() => respondToCounterOffer(b._id, false)}
                        disabled={acting === b._id}
                        style={{ flex: 1, padding: '9px 14px', background: MH.errorLight, color: MH.deepPink, border: `1px solid ${MH.deepPink}`, borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                      >
                        Keep original time
                      </button>
                    </div>
                  </div>
                )}

                {/* Commodity details */}
                {b.commodities && b.commodities.length > 0 && (
                  <div style={{ marginBottom: 10, padding: 10, background: `${MH.gold}1F`, borderRadius: 8 }}>
                    {b.commodities.map((c, i) => (
                      <p key={i} style={{ margin: '2px 0', color: MH.navy, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <WheatIcon size={12} style={{ color: MH.deepPink }} /> {c.name}: {c.quantity} kg · {c.numberOfBags} bags · ₹{c.pricePerUnit}/kg = ₹{(c.quantity * c.pricePerUnit).toLocaleString('en-IN')}
                      </p>
                    ))}
                  </div>
                )}

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, color: MH.pinkGray, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Qty</p>
                    <p style={{ margin: '2px 0 0', color: MH.navy, fontWeight: 700, fontSize: '0.88rem' }}>{(b.totalQuantity || b.quantity || 0).toLocaleString('en-IN')} kg</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: MH.pinkGray, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Value</p>
                    <p style={{ margin: '2px 0 0', color: MH.deepPink, fontWeight: 800, fontSize: '0.88rem' }}>₹{totalValue(b).toLocaleString('en-IN')}</p>
                  </div>
                  {b.freightAmount !== undefined && b.freightAmount > 0 && (
                    <div>
                      <p style={{ margin: 0, color: MH.pinkGray, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Freight</p>
                      <p style={{ margin: '2px 0 0', color: MH.navy, fontWeight: 700, fontSize: '0.88rem' }}>₹{b.freightAmount.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ margin: 0, color: MH.pinkGray, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Pickup</p>
                    <p style={{ margin: '2px 0 0', color: MH.navy, fontWeight: 600, fontSize: '0.82rem' }}>
                      {b.estimatedArrivalTime ? new Date(b.estimatedArrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </p>
                  </div>
                </div>

                {/* Vehicle info */}
                {(b.vehicleId || b.buyerVehicleId) && (
                  <div style={{ marginBottom: 10, padding: 10, background: MH.white, borderRadius: 8, border: `1px solid ${MH.gold}` }}>
                    <p style={{ margin: 0, color: MH.navy, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TruckIcon size={14} style={{ color: MH.deepPink }} /> {b.vehicleId?.vehicleType || b.buyerVehicleId?.vehicleType} · {b.vehicleId?.registrationNumber || b.buyerVehicleId?.registrationNumber}
                    </p>
                  </div>
                )}

                {/* Payment status */}
                {b.status === 'delivered' && (
                  <div style={{ padding: 10, borderRadius: 8, marginBottom: 10,
                    background: b.paymentStatus === 'paid' ? MH.successLight : b.paymentStatus === 'billed' || b.paymentStatus === 'pending' ? MH.warningLight : MH.errorLight,
                    border: `1px solid ${b.paymentStatus === 'paid' ? MH.success : b.paymentStatus === 'billed' || b.paymentStatus === 'pending' ? MH.warning : MH.deepPink}`,
                  }}>
                    {b.paymentStatus === 'paid' ? (
                      <p style={{ margin: 0, color: MH.success, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckIcon size={14} /> Paid ₹{(b.paymentAmount || 0).toLocaleString('en-IN')} via {b.paymentMethod}
                        {b.paidAt && ` on ${new Date(b.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </p>
                    ) : b.paymentStatus === 'billed' ? (
                      <p style={{ margin: 0, color: MH.warning, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <DollarSignIcon size={14} /> Buyer billed ₹{(b.billAmount || 0).toLocaleString('en-IN')} — awaiting payment
                      </p>
                    ) : b.paymentStatus === 'pending' ? (
                      <p style={{ margin: 0, color: MH.warning, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HourglassIcon size={14} /> UPI payment in progress
                      </p>
                    ) : (
                      <p style={{ margin: 0, color: MH.deepPink, fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HourglassIcon size={14} /> Awaiting buyer to weigh & bill
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    href={`/tracking?bookingId=${b._id}`}
                    style={{ ...mhSecondaryBtn, borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <MapPinIcon size={14} /> Track
                  </Link>
                  <button
                    onClick={() => openMaps(b.pickupLocation || 'India')}
                    style={{ background: MH.successLight, color: MH.success, border: `1px solid ${MH.success}`, borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <MapPinIcon size={14} /> Maps
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`input:focus { border-color: ${MH.deepPink} !important; box-shadow: 0 0 0 3px rgba(212,93,126,0.18) !important; }`}</style>
    </div>
  )
}
