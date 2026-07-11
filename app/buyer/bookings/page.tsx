'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { BUYER, SHARED, cardStyle, navStyle } from '@/lib/styles'

interface BookingCommodity {
  listingId?: string
  name: string
  quantity: number
  numberOfBags: number
  pricePerUnit: number
}

interface Booking {
  _id: string
  status: 'pending' | 'confirmed' | 'in-transit' | 'delivered' | 'cancelled'
  commodities: BookingCommodity[]
  totalQuantity: number
  pickupLocation: string
  deliveryLocation: string
  estimatedDistance?: number
  freightAmount: number
  freightType: string
  driverNote?: string
  estimatedArrivalTime?: string
  actualArrivalTime?: string
  createdAt: string
  // Payment fields
  paymentStatus?: 'unpaid' | 'billed' | 'pending' | 'paid' | 'failed'
  paymentMethod?: string
  billAmount?: number
  billNote?: string
  paymentAmount?: number
  paidAt?: string
  farmerId?: { _id: string; farmerName?: string; phone?: string; address?: string; email?: string }
  vehicleId?: { _id: string; vehicleType: string; registrationNumber: string; driverName?: string; driverPhone?: string; transporterId?: { transporterCompanyName?: string } } | null
  buyerVehicleId?: { _id: string; vehicleType: string; vehicleDisplayName?: string; registrationNumber: string; driverName?: string; driverPhone?: string; freightType: string; freightAmount: number } | null
}

const STATUS_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  pending: { label: 'Pending — awaiting your confirmation', bg: '#fef3c7', color: '#92400e', icon: '⏳' },
  confirmed: { label: 'Confirmed', bg: '#dbeafe', color: '#1e40af', icon: '✅' },
  'in-transit': { label: 'Vehicle dispatched', bg: '#e0e7ff', color: '#3730a3', icon: '🚚' },
  delivered: { label: 'Delivered', bg: '#d1fae5', color: '#065f46', icon: '📦' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', color: '#991b1b', icon: '❌' },
}

export default function BuyerBookings() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [acting, setActing] = useState<string | null>(null)

  const fetchBookings = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/bookings?role=buyer&limit=100')
      if (!res.ok) { setError('Failed to load bookings'); return }
      const data = await res.json()
      setBookings(data?.data?.bookings || data?.bookings || [])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const { userId } = getUserInfo()
    if (!userId) { router.replace('/auth/login'); return }
    void fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled' | 'delivered') => {
    setActing(id)
    try {
      const res = await authFetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Failed to update booking')
        return
      }
      void fetchBookings()
    } catch {
      setError('Network error')
    } finally {
      setActing(null)
    }
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const inTransitCount = bookings.filter(b => b.status === 'in-transit').length

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font, color: BUYER.text }}>
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: BUYER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>🛒</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: BUYER.text, lineHeight: 1 }}>AgriEasy</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: BUYER.muted }}>Incoming Bookings</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/buyer/dashboard" style={{ color: BUYER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: BUYER.primaryLight }}>← Dashboard</Link>
            <button onClick={logout} style={{ color: BUYER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px 60px' }}>
        {/* Hero */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800, color: BUYER.text, letterSpacing: '-0.02em' }}>📅 Incoming Bookings</h1>
          <p style={{ margin: '6px 0 0', color: BUYER.muted, fontSize: '0.92rem' }}>
            Farmers who want to sell to your shop. {pendingCount > 0 && <span style={{ color: SHARED.warning, fontWeight: 700 }}>● {pendingCount} awaiting confirmation</span>}
            {inTransitCount > 0 && <span style={{ color: BUYER.primary, fontWeight: 700 }}> · 🚚 {inTransitCount} on the way</span>}
          </p>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: SHARED.error, fontSize: '0.88rem', fontWeight: 600 }}>⚠️ {error}</div>
        )}

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: `All (${bookings.length})` },
            { value: 'pending', label: `⏳ Pending (${pendingCount})` },
            { value: 'confirmed', label: '✅ Confirmed' },
            { value: 'in-transit', label: '🚚 In Transit' },
            { value: 'delivered', label: '📦 Delivered' },
            { value: 'cancelled', label: '❌ Cancelled' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              style={{
                padding: '7px 14px', borderRadius: 100,
                border: `1.5px solid ${filter === opt.value ? BUYER.primary : BUYER.borderLight}`,
                background: filter === opt.value ? BUYER.primary : BUYER.white,
                color: filter === opt.value ? '#fff' : BUYER.textSecondary,
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: BUYER.muted }}>Loading bookings…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...cardStyle(BUYER), textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
            <h3 style={{ color: BUYER.text, margin: '0 0 6px', fontSize: '1.05rem' }}>No bookings yet</h3>
            <p style={{ color: BUYER.muted, fontSize: '0.86rem', margin: 0 }}>
              When a farmer books to sell to your shop, you&apos;ll see it here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(b => {
              const meta = STATUS_META[b.status] || STATUS_META.pending
              const isOwnVehicle = !!b.buyerVehicleId
              const totalValue = (b.commodities || []).reduce((s, c) => s + (c.quantity || 0) * (c.pricePerUnit || 0), 0)
              return (
                <div key={b._id} style={{ ...cardStyle(BUYER), boxShadow: SHARED.shadowMd, border: `1px solid ${BUYER.borderLight}` }}>
                  {/* Top: status badge + date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 100,
                      background: meta.bg, color: meta.color, fontSize: '0.78rem', fontWeight: 700,
                    }}>
                      {meta.icon} {meta.label}
                    </span>
                    <span style={{ color: BUYER.muted, fontSize: '0.78rem' }}>
                      Booked {new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  {/* Farmer info */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, background: BUYER.bgSub, borderRadius: 10, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: BUYER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🌾</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, color: BUYER.text, fontWeight: 800, fontSize: '0.95rem' }}>
                        {b.farmerId?.farmerName || b.farmerId?.email || 'Farmer'}
                      </p>
                      <p style={{ margin: '2px 0 0', color: BUYER.muted, fontSize: '0.78rem' }}>
                        📞 {b.farmerId?.phone || 'No phone'} · 📍 {b.farmerId?.address || 'No address'}
                      </p>
                      <p style={{ margin: '4px 0 0', color: BUYER.muted, fontSize: '0.78rem' }}>
                        Pickup: <strong>{b.pickupLocation}</strong>
                        {b.estimatedDistance && ` · ${b.estimatedDistance} km away`}
                      </p>
                    </div>
                  </div>

                  {/* Commodity list */}
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ color: BUYER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Commodities</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(b.commodities || []).map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: BUYER.white, borderRadius: 6, border: `1px solid ${BUYER.borderLight}` }}>
                          <span style={{ color: BUYER.text, fontSize: '0.85rem', fontWeight: 600 }}>🌾 {c.name}</span>
                          <span style={{ color: BUYER.textSecondary, fontSize: '0.82rem' }}>
                            {c.quantity} kg · {c.numberOfBags} bags · ₹{c.pricePerUnit}/kg
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '8px 10px', background: BUYER.primaryLight, borderRadius: 6 }}>
                      <span style={{ color: BUYER.text, fontSize: '0.82rem', fontWeight: 700 }}>Total: {b.totalQuantity} kg</span>
                      <span style={{ color: BUYER.primary, fontSize: '0.88rem', fontWeight: 800 }}>≈ ₹{totalValue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Vehicle info */}
                  {(b.vehicleId || b.buyerVehicleId) && (
                    <div style={{ padding: 12, background: isOwnVehicle ? '#fef3c7' : BUYER.bgSub, borderRadius: 10, marginBottom: 12, border: `1px solid ${isOwnVehicle ? '#fde68a' : BUYER.borderLight}` }}>
                      <p style={{ margin: 0, color: BUYER.text, fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isOwnVehicle ? '🚚 YOUR vehicle' : '🚛 Transporter vehicle'}
                        <span style={{ color: BUYER.muted, fontWeight: 500, fontSize: '0.78rem' }}>
                          {isOwnVehicle && b.buyerVehicleId?.vehicleDisplayName ? `· ${b.buyerVehicleId.vehicleDisplayName}` : ''}
                          {!isOwnVehicle && b.vehicleId?.transporterId?.transporterCompanyName ? `· ${b.vehicleId.transporterId.transporterCompanyName}` : ''}
                        </span>
                      </p>
                      <p style={{ margin: '4px 0 0', color: BUYER.muted, fontSize: '0.78rem' }}>
                        {isOwnVehicle
                          ? `${b.buyerVehicleId?.vehicleType} · ${b.buyerVehicleId?.registrationNumber} · driver ${b.buyerVehicleId?.driverName || '—'} (${b.buyerVehicleId?.driverPhone || '—'})`
                          : `${b.vehicleId?.vehicleType} · ${b.vehicleId?.registrationNumber} · driver ${b.vehicleId?.driverName || '—'} (${b.vehicleId?.driverPhone || '—'})`}
                      </p>
                      <p style={{ margin: '4px 0 0', color: BUYER.primary, fontWeight: 700, fontSize: '0.82rem' }}>
                        Freight: {b.freightType === 'free' ? 'FREE (you absorb)' : `₹${b.freightAmount.toLocaleString('en-IN')} (${b.freightType === 'flat' ? 'flat' : 'per_km'})`}
                      </p>
                      {isOwnVehicle && b.status === 'pending' && (
                        <p style={{ margin: '6px 0 0', color: SHARED.warning, fontSize: '0.78rem', fontWeight: 700 }}>
                          ⚠️ The farmer booked YOUR vehicle — you need to dispatch your driver to the pickup location.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Driver note */}
                  {b.driverNote && (
                    <div style={{ padding: 10, background: '#e0e7ff', borderRadius: 8, marginBottom: 12, border: '1px solid #c7d2fe' }}>
                      <p style={{ margin: 0, color: '#3730a3', fontSize: '0.8rem', fontWeight: 600 }}>📝 Driver note: {b.driverNote}</p>
                    </div>
                  )}

                  {/* Pickup time */}
                  {b.estimatedArrivalTime && (
                    <p style={{ margin: '0 0 12px', color: BUYER.text, fontSize: '0.82rem', fontWeight: 600 }}>
                      📅 Pickup scheduled: {new Date(b.estimatedArrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}

                  {/* Actions */}
                  {b.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => updateStatus(b._id, 'confirmed')}
                        disabled={acting === b._id}
                        style={{ flex: 1, padding: '10px 16px', background: BUYER.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.86rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                      >
                        ✅ Confirm Booking
                      </button>
                      <button
                        onClick={() => updateStatus(b._id, 'cancelled')}
                        disabled={acting === b._id}
                        style={{ padding: '10px 18px', background: SHARED.errorLight, color: SHARED.error, border: '1px solid #fca5a5', borderRadius: 10, fontSize: '0.86rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {b.status === 'in-transit' && (
                    <button
                      onClick={() => updateStatus(b._id, 'delivered')}
                      disabled={acting === b._id}
                      style={{ width: '100%', padding: '10px 16px', background: SHARED.success, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.86rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                    >
                      📦 Mark Delivered
                    </button>
                  )}
                  {b.status === 'confirmed' && !isOwnVehicle && (
                    <p style={{ margin: 0, color: BUYER.muted, fontSize: '0.78rem', textAlign: 'center' }}>
                      Waiting for transporter to dispatch the vehicle…
                    </p>
                  )}
                  {b.status === 'confirmed' && isOwnVehicle && (
                    <p style={{ margin: 0, color: SHARED.warning, fontSize: '0.78rem', textAlign: 'center', fontWeight: 600 }}>
                      Dispatch your driver to the pickup location. (Use the &quot;In Transit&quot; button once they leave.)
                    </p>
                  )}
                  {b.status === 'delivered' && (
                    <div>
                      {/* Payment status badge */}
                      {b.paymentStatus === 'paid' ? (
                        <div style={{ padding: 10, background: SHARED.successLight, border: '1px solid #6ee7b7', borderRadius: 8, marginBottom: 8 }}>
                          <p style={{ margin: 0, color: SHARED.success, fontSize: '0.82rem', fontWeight: 700 }}>
                            ✅ Paid ₹{(b.paymentAmount || 0).toLocaleString('en-IN')} via {b.paymentMethod}
                            {b.paidAt && ` on ${new Date(b.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                          </p>
                        </div>
                      ) : b.paymentStatus === 'pending' ? (
                        <div style={{ padding: 10, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 8 }}>
                          <p style={{ margin: 0, color: '#92400e', fontSize: '0.82rem', fontWeight: 700 }}>
                            ⏳ UPI payment in progress — confirm after completing in UPI app
                          </p>
                          <Link href={`/buyer/bookings/${b._id}/pay`} style={{ color: BUYER.primary, fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>
                            Confirm payment →
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/buyer/bookings/${b._id}/pay`}
                          style={{ display: 'block', width: '100%', padding: '12px 16px', background: SHARED.success, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxShadow: '0 4px 14px rgba(5,150,105,0.25)' }}
                        >
                          💰 {b.paymentStatus === 'billed' ? `Pay ₹${(b.billAmount || 0).toLocaleString('en-IN')}` : 'Bill & Pay Farmer'}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
