'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { TRANSPORTER, SHARED, cardStyle, navStyle, inputStyle, labelStyle } from '@/lib/styles'

interface BookingCommodity {
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
  // Driver counter-offer
  driverResponse?: 'pending' | 'accepted' | 'counter-offered' | 'rejected'
  driverOfferedTime?: string
  // Payment
  paymentStatus?: string
  paymentMethod?: string
  paymentAmount?: number
  billAmount?: number
  farmerId?: { _id: string; farmerName?: string; phone?: string; address?: string; email?: string }
  buyerId?: { _id: string; firmName?: string; phone?: string; address?: string }
  vehicleId?: { _id: string; vehicleType: string; registrationNumber: string; driverName?: string; driverPhone?: string } | null
}

const STATUS_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  pending: { label: 'Pending — awaiting your acceptance', bg: '#fef3c7', color: '#92400e', icon: '⏳' },
  confirmed: { label: 'Accepted — ready to dispatch', bg: '#dbeafe', color: '#1e40af', icon: '✅' },
  'in-transit': { label: 'Vehicle dispatched', bg: '#e0e7ff', color: '#3730a3', icon: '🚚' },
  delivered: { label: 'Delivered', bg: '#d1fae5', color: '#065f46', icon: '📦' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', color: '#991b1b', icon: '❌' },
}

const inp = inputStyle(TRANSPORTER)
const lbl = labelStyle(TRANSPORTER)

export default function TransporterBookings() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [acting, setActing] = useState<string | null>(null)
  const [dispatchNote, setDispatchNote] = useState<Record<string, string>>({})
  const [counterOfferTime, setCounterOfferTime] = useState<Record<string, { date: string; time: string; note: string }>>({})
  const [showCounterOffer, setShowCounterOffer] = useState<string | null>(null)

  const fetchBookings = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/bookings?role=transporter&limit=100')
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

  const updateStatus = async (id: string, status: 'confirmed' | 'in-transit' | 'delivered' | 'cancelled', note?: string) => {
    setActing(id)
    try {
      const body: Record<string, unknown> = { status }
      if (note !== undefined) body.driverNote = note
      const res = await authFetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const submitCounterOffer = async (id: string) => {
    const offer = counterOfferTime[id]
    if (!offer || !offer.date || !offer.time) {
      setError('Pick a date and time for your counter-offer')
      return
    }
    setActing(id)
    try {
      const offeredTime = new Date(`${offer.date}T${offer.time}`).toISOString()
      const res = await authFetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverOfferedTime: offeredTime, driverResponse: 'counter-offered', driverNote: offer.note || '' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Failed to send counter-offer')
        return
      }
      setShowCounterOffer(null)
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
    <div style={{ minHeight: '100vh', background: TRANSPORTER.bg, fontFamily: SHARED.font, color: TRANSPORTER.text }}>
      <nav style={{ ...navStyle(TRANSPORTER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: TRANSPORTER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>🚛</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: TRANSPORTER.text, lineHeight: 1 }}>AgriEasy</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: TRANSPORTER.muted }}>Vehicle Bookings</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/transporter/dashboard" style={{ color: TRANSPORTER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: TRANSPORTER.primaryLight }}>← Dashboard</Link>
            <button onClick={logout} style={{ color: TRANSPORTER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px 60px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800, color: TRANSPORTER.text, letterSpacing: '-0.02em' }}>🚛 Vehicle Bookings</h1>
          <p style={{ margin: '6px 0 0', color: TRANSPORTER.muted, fontSize: '0.92rem' }}>
            Farmers who booked your vehicles. Dispatch your driver to the pickup location.
            {pendingCount > 0 && <span style={{ color: SHARED.warning, fontWeight: 700 }}> ● {pendingCount} awaiting acceptance</span>}
            {inTransitCount > 0 && <span style={{ color: TRANSPORTER.primary, fontWeight: 700 }}> · 🚚 {inTransitCount} in transit</span>}
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
            { value: 'confirmed', label: '✅ Accepted' },
            { value: 'in-transit', label: `🚚 In Transit (${inTransitCount})` },
            { value: 'delivered', label: '📦 Delivered' },
            { value: 'cancelled', label: '❌ Cancelled' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              style={{
                padding: '7px 14px', borderRadius: 100,
                border: `1.5px solid ${filter === opt.value ? TRANSPORTER.primary : TRANSPORTER.borderLight}`,
                background: filter === opt.value ? TRANSPORTER.primary : TRANSPORTER.white,
                color: filter === opt.value ? '#fff' : TRANSPORTER.textSecondary,
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: TRANSPORTER.muted }}>Loading bookings…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...cardStyle(TRANSPORTER), textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
            <h3 style={{ color: TRANSPORTER.text, margin: '0 0 6px', fontSize: '1.05rem' }}>No vehicle bookings yet</h3>
            <p style={{ color: TRANSPORTER.muted, fontSize: '0.86rem', margin: 0 }}>
              When a farmer books one of your vehicles, you&apos;ll see it here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(b => {
              const meta = STATUS_META[b.status] || STATUS_META.pending
              return (
                <div key={b._id} style={{ ...cardStyle(TRANSPORTER), boxShadow: SHARED.shadowMd, border: `1px solid ${TRANSPORTER.borderLight}` }}>
                  {/* Top: status badge + date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 100,
                      background: meta.bg, color: meta.color, fontSize: '0.78rem', fontWeight: 700,
                    }}>
                      {meta.icon} {meta.label}
                    </span>
                    <span style={{ color: TRANSPORTER.muted, fontSize: '0.78rem' }}>
                      Booked {new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  {/* Vehicle info */}
                  {b.vehicleId && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: TRANSPORTER.primaryLight, borderRadius: 10, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: TRANSPORTER.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🚛</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: TRANSPORTER.text, fontWeight: 800, fontSize: '0.95rem' }}>
                          {b.vehicleId.vehicleType} · {b.vehicleId.registrationNumber}
                        </p>
                        <p style={{ margin: '2px 0 0', color: TRANSPORTER.muted, fontSize: '0.78rem' }}>
                          Driver: <strong>{b.vehicleId.driverName || '—'}</strong> · 📞 {b.vehicleId.driverPhone || '—'}
                        </p>
                      </div>
                      <span style={{ color: TRANSPORTER.primary, fontWeight: 800, fontSize: '0.92rem' }}>
                        ₹{b.freightAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {/* Farmer info */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, background: TRANSPORTER.bgSub, borderRadius: 10, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🌾</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, color: TRANSPORTER.text, fontWeight: 800, fontSize: '0.95rem' }}>
                        {b.farmerId?.farmerName || b.farmerId?.email || 'Farmer'}
                      </p>
                      <p style={{ margin: '2px 0 0', color: TRANSPORTER.muted, fontSize: '0.78rem' }}>
                        📞 {b.farmerId?.phone || 'No phone'} · 📍 {b.farmerId?.address || 'No address'}
                      </p>
                      <p style={{ margin: '4px 0 0', color: TRANSPORTER.text, fontSize: '0.8rem', fontWeight: 600 }}>
                        🚚 PICKUP: {b.pickupLocation}
                      </p>
                      <p style={{ margin: '2px 0 0', color: TRANSPORTER.text, fontSize: '0.8rem', fontWeight: 600 }}>
                        🏪 DELIVER TO: {b.deliveryLocation} {b.buyerId?.firmName && `(${b.buyerId.firmName})`}
                      </p>
                      {b.estimatedDistance && (
                        <p style={{ margin: '2px 0 0', color: TRANSPORTER.muted, fontSize: '0.78rem' }}>
                          ≈ {b.estimatedDistance} km · {b.totalQuantity} kg to carry
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Commodity summary */}
                  <div style={{ marginBottom: 12, padding: 10, background: TRANSPORTER.white, borderRadius: 8, border: `1px solid ${TRANSPORTER.borderLight}` }}>
                    <p style={{ margin: 0, color: TRANSPORTER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Cargo</p>
                    <p style={{ margin: 0, color: TRANSPORTER.text, fontSize: '0.85rem' }}>
                      {(b.commodities || []).map(c => `${c.name} (${c.quantity} kg, ${c.numberOfBags} bags)`).join(' · ')}
                    </p>
                  </div>

                  {/* Pickup time */}
                  {b.estimatedArrivalTime && (
                    <p style={{ margin: '0 0 12px', color: TRANSPORTER.text, fontSize: '0.82rem', fontWeight: 600 }}>
                      📅 Pickup scheduled: {new Date(b.estimatedArrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}

                  {/* Driver note */}
                  {b.driverNote && (
                    <div style={{ padding: 10, background: '#e0e7ff', borderRadius: 8, marginBottom: 12, border: '1px solid #c7d2fe' }}>
                      <p style={{ margin: 0, color: '#3730a3', fontSize: '0.8rem', fontWeight: 600 }}>📝 Your note: {b.driverNote}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {b.status === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Counter-offer status banner */}
                      {b.driverResponse === 'counter-offered' && (
                        <div style={{ padding: 10, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8 }}>
                          <p style={{ margin: 0, color: '#92400e', fontSize: '0.82rem', fontWeight: 700 }}>
                            ⏱ You counter-offered {b.driverOfferedTime ? new Date(b.driverOfferedTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''} — waiting for farmer to accept.
                          </p>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => updateStatus(b._id, 'confirmed')}
                          disabled={acting === b._id}
                          style={{ flex: 1, padding: '10px 16px', background: TRANSPORTER.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.86rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                        >
                          ✅ Accept as-is
                        </button>
                        <button
                          onClick={() => {
                            if (showCounterOffer === b._id) {
                              setShowCounterOffer(null)
                            } else {
                              const baseTime = b.estimatedArrivalTime ? new Date(b.estimatedArrivalTime) : new Date()
                              baseTime.setHours(baseTime.getHours() + 1)
                              setCounterOfferTime(prev => ({
                                ...prev,
                                [b._id]: {
                                  date: baseTime.toISOString().slice(0, 10),
                                  time: baseTime.toTimeString().slice(0, 5),
                                  note: '',
                                },
                              }))
                              setShowCounterOffer(b._id)
                            }
                          }}
                          disabled={acting === b._id}
                          style={{ padding: '10px 14px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                        >
                          ⏱ Counter-offer time
                        </button>
                        <button
                          onClick={() => updateStatus(b._id, 'cancelled')}
                          disabled={acting === b._id}
                          style={{ padding: '10px 14px', background: SHARED.errorLight, color: SHARED.error, border: '1px solid #fca5a5', borderRadius: 10, fontSize: '0.84rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                        >
                          Decline
                        </button>
                      </div>
                      {/* Counter-offer form */}
                      {showCounterOffer === b._id && (
                        <div style={{ padding: 12, background: TRANSPORTER.bgSub, borderRadius: 10, border: `1px solid ${TRANSPORTER.border}` }}>
                          <p style={{ margin: '0 0 8px', color: TRANSPORTER.text, fontSize: '0.82rem', fontWeight: 700 }}>
                            Propose a new pickup time (e.g., &quot;Available 1 hour after the farmer&apos;s time&quot;):
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                            <input
                              type="date"
                              value={counterOfferTime[b._id]?.date || ''}
                              onChange={e => setCounterOfferTime(prev => ({ ...prev, [b._id]: { ...(prev[b._id] || { date: '', time: '', note: '' }), date: e.target.value } }))}
                              min={new Date().toISOString().split('T')[0]}
                              style={{ ...inp, padding: '8px 12px', fontSize: '0.85rem' }}
                            />
                            <input
                              type="time"
                              value={counterOfferTime[b._id]?.time || ''}
                              onChange={e => setCounterOfferTime(prev => ({ ...prev, [b._id]: { ...(prev[b._id] || { date: '', time: '', note: '' }), time: e.target.value } }))}
                              style={{ ...inp, padding: '8px 12px', fontSize: '0.85rem' }}
                            />
                          </div>
                          <input
                            type="text"
                            value={counterOfferTime[b._id]?.note || ''}
                            onChange={e => setCounterOfferTime(prev => ({ ...prev, [b._id]: { ...(prev[b._id] || { date: '', time: '', note: '' }), note: e.target.value } }))}
                            placeholder="Note for farmer (optional) — e.g., My vehicle is on another trip"
                            style={{ ...inp, padding: '8px 12px', fontSize: '0.85rem', marginBottom: 8 }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => submitCounterOffer(b._id)}
                              disabled={acting === b._id}
                              style={{ flex: 1, padding: '9px 14px', background: TRANSPORTER.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                            >
                              {acting === b._id ? 'Sending…' : '✅ Send Counter-offer'}
                            </button>
                            <button
                              onClick={() => setShowCounterOffer(null)}
                              style={{ padding: '9px 14px', background: TRANSPORTER.white, color: TRANSPORTER.muted, border: `1px solid ${TRANSPORTER.border}`, borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {b.status === 'confirmed' && (
                    <div>
                      <label style={lbl}>Note for farmer (optional)</label>
                      <input
                        type="text"
                        value={dispatchNote[b._id] || ''}
                        onChange={e => setDispatchNote(prev => ({ ...prev, [b._id]: e.target.value }))}
                        placeholder="e.g., Driver leaving in 30 min, ETA 4pm"
                        style={{ ...inp, marginBottom: 10 }}
                      />
                      <button
                        onClick={() => updateStatus(b._id, 'in-transit', dispatchNote[b._id] || '')}
                        disabled={acting === b._id}
                        style={{ width: '100%', padding: '11px 16px', background: TRANSPORTER.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}
                      >
                        🚚 Dispatch Vehicle — Driver On The Way
                      </button>
                    </div>
                  )}
                  {b.status === 'in-transit' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Link
                        href={`/transporter/tracking/${b._id}`}
                        style={{ display: 'block', textAlign: 'center', padding: '11px 16px', background: TRANSPORTER.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}
                      >
                        📍 Open Live Map & Share Location
                      </Link>
                      <button
                        onClick={() => updateStatus(b._id, 'delivered')}
                        disabled={acting === b._id}
                        style={{ width: '100%', padding: '10px 16px', background: SHARED.success, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.86rem', fontWeight: 700, cursor: acting === b._id ? 'not-allowed' : 'pointer' }}
                      >
                        📦 Mark Delivered at Buyer&apos;s Shop
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <style>{`input:focus { border-color: ${TRANSPORTER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}
