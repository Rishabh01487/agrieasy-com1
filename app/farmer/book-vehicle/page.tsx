'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo } from '@/lib/auth-fetch'
import { FARMER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

interface Vehicle {
  _id: string
  vehicleType: string
  registrationNumber: string
  capacity: number
  capacityUnit?: string
  pricePerKm: number
  availability?: boolean
  driverName?: string
  driverPhone?: string
  transporterId?: { transporterCompanyName?: string }
  availableFrom?: string | null
}

interface BuyerVehicle {
  _id: string
  vehicleType: string
  vehicleDisplayName?: string
  registrationNumber: string
  capacityKg: number
  driverName?: string
  driverPhone?: string
  freightType: 'free' | 'flat' | 'per_km'
  freightAmount: number
  availability: string
  notes?: string
  availableFrom?: string | null
}

interface SellItem {
  listingId: string
  name: string
  quantity: number
  numberOfBags: number
  pricePerUnit: number
  unit: string
}

interface Payload {
  buyerId: string
  buyerName: string
  deliveryLocation: string
  commodities: SellItem[]
  totalQuantityKg: number
}

interface FarmerProfile {
  farmerAddress?: string
  location?: { latitude: number; longitude: number } | null
}

const inp = inputStyle(FARMER)
const lbl = labelStyle(FARMER)

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  'mini-truck': '🛺 Mini Truck',
  'pickup-van': '🚙 Pickup Van',
  'truck': '🚚 Truck',
  'tractor-trolley': '🚜 Tractor Trolley',
  'tempo': '🚐 Tempo',
  'tractor': '🚜 Tractor',
  'other': '🚗 Other',
}

function freightLabel(v: BuyerVehicle, distanceKm: number): { cost: number; label: string } {
  if (v.freightType === 'free') return { cost: 0, label: 'FREE' }
  if (v.freightType === 'flat') return { cost: v.freightAmount, label: `₹${v.freightAmount} flat` }
  // per_km
  const cost = Math.round(v.freightAmount * distanceKm)
  return { cost, label: `₹${v.freightAmount}/km × ${distanceKm}km` }
}

// Returns a human-readable label for when a vehicle becomes available again.
// Returns null if the vehicle is available immediately.
function availableFromLabel(availableFrom?: string | null): { label: string; badge: string } | null {
  if (!availableFrom) return null
  const d = new Date(availableFrom)
  if (isNaN(d.getTime())) return null
  if (d.getTime() <= Date.now()) return null
  const now = new Date()
  const isSameDay = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (isSameDay) return { label: `Available from ${time} today`, badge: `⏱ ${time}` }
  if (isTomorrow) return { label: `Available from ${time} tomorrow`, badge: `⏱ tmrw ${time}` }
  return {
    label: `Available from ${d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}`,
    badge: `⏱ ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${time}`,
  }
}

function BookVehicleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [payload, setPayload] = useState<Payload | null>(null)
  const [parseError, setParseError] = useState('')
  const [transporterVehicles, setTransporterVehicles] = useState<Vehicle[]>([])
  const [buyerVehicles, setBuyerVehicles] = useState<BuyerVehicle[]>([])
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Booking form state
  const [pickupLocation, setPickupLocation] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [estimatedDistance, setEstimatedDistance] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)  // transporter vehicle
  const [selectedBuyerVehicleId, setSelectedBuyerVehicleId] = useState<string | null>(null)  // buyer vehicle

  // Decode payload from URL
  useEffect(() => {
    const encoded = searchParams.get('payload')
    if (!encoded) {
      setParseError('Missing commodity selection. Please go back and pick commodities to sell.')
      setLoading(false)
      return
    }
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))))
      setPayload(decoded)
      setDeliveryLocation(decoded.deliveryLocation || '')
    } catch {
      setParseError('Could not decode your commodity selection. Please go back.')
      setLoading(false)
    }
  }, [searchParams])

  // Fetch farmer profile (for pickup location)
  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch('/api/farmer/profile')
        if (res.ok) {
          const data = await res.json()
          const p = data?.data?.profile || data?.profile
          if (p) {
            setFarmerProfile(p)
            setPickupLocation(p.farmerAddress || '')
          }
        }
      } catch { /* ignore */ }
    })()
  }, [])

  // Fetch both transporter vehicles and buyer's own vehicles in parallel
  useEffect(() => {
    if (!payload) return
    const fetchAll = async () => {
      try {
        // Transporter vehicles — filter by capacity (total kg the farmer needs)
        const minCap = Math.ceil(payload.totalQuantityKg)
        const tvRes = await fetch(`/api/vehicles?minCapacity=${minCap}`)
        let tvs: Vehicle[] = []
        if (tvRes.ok) {
          const data = await tvRes.json()
          tvs = (data?.data?.vehicles || data?.vehicles || []).filter((v: Vehicle) => v.availability !== false)
        }

        // Buyer's own vehicles
        let bvs: BuyerVehicle[] = []
        const bvRes = await fetch(`/api/buyer-vehicles?buyerId=${payload.buyerId}`)
        if (bvRes.ok) {
          const data = await bvRes.json()
          bvs = data?.data?.vehicles || data?.vehicles || []
        }

        setTransporterVehicles(tvs)
        setBuyerVehicles(bvs)
      } catch {
        setError('Failed to load vehicles.')
      } finally {
        setLoading(false)
      }
    }
    void fetchAll()
  }, [payload])

  const totalQuantityKg = payload?.totalQuantityKg || 0
  const totalBags = payload?.commodities.reduce((s, c) => s + (c.numberOfBags || 0), 0) || 0
  const totalValue = payload?.commodities.reduce((s, c) => s + (c.quantity * c.pricePerUnit), 0) || 0
  const distanceNum = parseFloat(estimatedDistance) || 0

  // Compute freight cost for the selected vehicle
  const selectedVehicle = transporterVehicles.find(v => v._id === selectedVehicleId)
  const selectedBuyerVehicle = buyerVehicles.find(v => v._id === selectedBuyerVehicleId)
  const freightCost = useMemo(() => {
    if (selectedBuyerVehicle) {
      const f = freightLabel(selectedBuyerVehicle, distanceNum)
      return { cost: f.cost, label: f.label, type: selectedBuyerVehicle.freightType }
    }
    if (selectedVehicle && distanceNum > 0) {
      return { cost: Math.round(selectedVehicle.pricePerKm * distanceNum), label: `₹${selectedVehicle.pricePerKm}/km × ${distanceNum}km`, type: 'transporter' as const }
    }
    return null
  }, [selectedVehicle, selectedBuyerVehicle, distanceNum])

  const onSubmit = async () => {
    setError('')
    if (!payload) { setError('Missing commodity selection.'); return }
    if (!pickupLocation) { setError('Please enter your pickup location.'); return }
    if (!deliveryLocation) { setError('Delivery location missing.'); return }
    if (!pickupDate || !pickupTime) { setError('Please choose pickup date & time.'); return }
    if (!selectedVehicleId && !selectedBuyerVehicleId) { setError('Please select a vehicle.'); return }
    if (!distanceNum) { setError('Please enter the distance to the buyer.'); return }

    setSubmitting(true)
    try {
      const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`).toISOString()
      const body: Record<string, unknown> = {
        commodities: payload.commodities.map(c => ({
          listingId: c.listingId,
          name: c.name,
          quantity: c.quantity,
          numberOfBags: c.numberOfBags,
          pricePerUnit: c.pricePerUnit,
        })),
        buyerId: payload.buyerId,
        pickupLocation,
        deliveryLocation,
        estimatedDistance: distanceNum,
        pickupDateTime,
      }
      if (selectedBuyerVehicleId) body.buyerVehicleId = selectedBuyerVehicleId
      if (selectedVehicleId) body.vehicleId = selectedVehicleId

      const res = await authFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Failed to book vehicle')
        setSubmitting(false)
        return
      }
      router.push('/farmer/my-bookings')
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  if (parseError) {
    return (
      <div style={{ minHeight: '100vh', background: FARMER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: SHARED.font }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <p style={{ color: FARMER.muted }}>{parseError}</p>
        <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, fontWeight: 700, textDecoration: 'none' }}>← Back to Search Buyers</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href={payload ? `/farmer/buyer/${payload.buyerId}` : '/farmer/search-buyers'} style={{ color: FARMER.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← Back</Link>
          <span style={{ color: FARMER.muted }}>›</span>
          <span style={{ color: FARMER.text, fontWeight: 600, fontSize: '0.9rem' }}>Book Vehicle</span>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: FARMER.text, fontWeight: 800, fontSize: '1.6rem', marginBottom: '6px' }}>🚚 Book a Vehicle</h2>
        <p style={{ color: FARMER.muted, marginBottom: '24px' }}>
          Choose a vehicle that can carry <strong>{totalQuantityKg.toLocaleString('en-IN')} kg</strong> across {payload?.commodities.length || 0} commodities.
        </p>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: SHARED.error, fontSize: '0.86rem', fontWeight: 600 }}>⚠️ {error}</div>
        )}

        {/* Order summary */}
        {payload && (
          <div style={{ ...cardStyle(FARMER), marginBottom: 20, background: FARMER.gradientSoft }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 800, color: FARMER.text }}>📦 Your shipment to {payload.buyerName}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <div>
                <p style={{ color: FARMER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Commodities</p>
                <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.92rem', margin: '2px 0 0' }}>{payload.commodities.length}</p>
              </div>
              <div>
                <p style={{ color: FARMER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Total Weight</p>
                <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.92rem', margin: '2px 0 0' }}>{totalQuantityKg.toLocaleString('en-IN')} kg</p>
              </div>
              <div>
                <p style={{ color: FARMER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Total Bags</p>
                <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.92rem', margin: '2px 0 0' }}>{totalBags}</p>
              </div>
              <div>
                <p style={{ color: FARMER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Approx Value</p>
                <p style={{ color: FARMER.primary, fontWeight: 700, fontSize: '0.92rem', margin: '2px 0 0' }}>₹{totalValue.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${FARMER.border}` }}>
              {payload.commodities.map((c, i) => (
                <p key={i} style={{ margin: '2px 0', color: FARMER.textSecondary, fontSize: '0.82rem' }}>
                  • {c.name}: {c.quantity} {c.unit} ({c.numberOfBags} bags) × ₹{c.pricePerUnit} = ₹{(c.quantity * c.pricePerUnit).toLocaleString('en-IN')}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Pickup details */}
        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, marginBottom: 16 }}>
          <h3 style={{ color: FARMER.text, fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>Step 1 — Pickup details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Pickup Date</label>
              <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={inp} />
            </div>
            <div>
              <label style={lbl}>Pickup Time</label>
              <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Pickup Location (your farm address)</label>
            <input type="text" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} placeholder="e.g., Village Rampur, Tehsil Kasganj, UP" style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Delivery Location (buyer's shop)</label>
              <input type="text" value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} style={inp} readOnly={!!payload?.deliveryLocation} />
            </div>
            <div>
              <label style={lbl}>Distance (km)</label>
              <input type="number" step="0.1" value={estimatedDistance} onChange={e => setEstimatedDistance(e.target.value)} placeholder="e.g., 45" style={inp} />
            </div>
          </div>
          <p style={{ color: FARMER.muted, fontSize: '0.76rem', margin: '8px 0 0' }}>
            Enter the distance so we can calculate freight cost accurately.
          </p>
        </div>

        {/* Step 2 — Buyer's own vehicles (priority placement) */}
        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, marginBottom: 16, border: `1.5px solid ${FARMER.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h3 style={{ color: FARMER.text, fontWeight: 700, margin: 0, fontSize: '1rem' }}>Step 2 — {payload?.buyerName}&apos;s own vehicles</h3>
            {buyerVehicles.length > 0 && (
              <span style={{ background: FARMER.primaryLight, color: FARMER.primary, fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                {buyerVehicles.length} available
              </span>
            )}
          </div>
          {buyerVehicles.length === 0 ? (
            <p style={{ color: FARMER.muted, fontSize: '0.84rem', margin: 0 }}>
              This buyer hasn&apos;t added any vehicles. You can use a transporter vehicle below.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {buyerVehicles.map(v => {
                const isSelected = selectedBuyerVehicleId === v._id
                const f = freightLabel(v, distanceNum)
                const af = availableFromLabel(v.availableFrom)
                return (
                  <button
                    key={v._id}
                    type="button"
                    onClick={() => { setSelectedBuyerVehicleId(isSelected ? null : v._id); setSelectedVehicleId(null) }}
                    style={{
                      textAlign: 'left', cursor: 'pointer', padding: 12,
                      border: `2px solid ${isSelected ? FARMER.primary : FARMER.borderLight}`,
                      borderRadius: 12, background: isSelected ? FARMER.primaryLight : FARMER.white,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: FARMER.text, fontSize: '0.86rem' }}>
                        {VEHICLE_TYPE_LABELS[v.vehicleType] || v.vehicleType}
                      </span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {v.freightType === 'free' && (
                          <span style={{ background: '#dcfce7', color: '#065f46', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>FREE</span>
                        )}
                        {af && (
                          <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.66rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }} title={af.label}>
                            {af.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ color: FARMER.muted, fontSize: '0.74rem', margin: '0 0 4px' }}>{v.vehicleDisplayName || v.registrationNumber}</p>
                    <p style={{ color: FARMER.text, fontSize: '0.78rem', margin: '0 0 6px' }}>Capacity: {v.capacityKg.toLocaleString('en-IN')} kg</p>
                    <p style={{ color: FARMER.primary, fontWeight: 700, fontSize: '0.82rem', margin: 0 }}>{f.label}</p>
                    {af && <p style={{ color: '#92400e', fontSize: '0.7rem', margin: '4px 0 0', fontWeight: 600 }}>{af.label}</p>}
                    {v.notes && <p style={{ color: FARMER.muted, fontSize: '0.7rem', margin: '4px 0 0' }}>{v.notes}</p>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Step 3 — Transporter vehicles */}
        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, marginBottom: 20 }}>
          <h3 style={{ color: FARMER.text, fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>Step 3 — Transporter vehicles</h3>
          {loading ? (
            <p style={{ color: FARMER.muted, fontSize: '0.84rem' }}>Loading vehicles that can carry {totalQuantityKg.toLocaleString('en-IN')} kg…</p>
          ) : transporterVehicles.length === 0 ? (
            <p style={{ color: FARMER.muted, fontSize: '0.84rem' }}>
              No transporter vehicles available for {totalQuantityKg.toLocaleString('en-IN')} kg right now. Try the buyer&apos;s own vehicle above.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {transporterVehicles.map(v => {
                const isSelected = selectedVehicleId === v._id
                const af = availableFromLabel(v.availableFrom)
                return (
                  <button
                    key={v._id}
                    type="button"
                    onClick={() => { setSelectedVehicleId(isSelected ? null : v._id); setSelectedBuyerVehicleId(null) }}
                    style={{
                      textAlign: 'left', cursor: 'pointer', padding: 12,
                      border: `2px solid ${isSelected ? FARMER.primary : FARMER.borderLight}`,
                      borderRadius: 12, background: isSelected ? FARMER.primaryLight : FARMER.white,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: FARMER.text, fontSize: '0.86rem' }}>
                        {VEHICLE_TYPE_LABELS[v.vehicleType] || v.vehicleType}
                      </span>
                      {af && (
                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.66rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }} title={af.label}>
                          {af.badge}
                        </span>
                      )}
                    </div>
                    <p style={{ color: FARMER.muted, fontSize: '0.74rem', margin: '0 0 4px', fontFamily: 'monospace' }}>{v.registrationNumber}</p>
                    <p style={{ color: FARMER.text, fontSize: '0.78rem', margin: '0 0 4px' }}>Capacity: {v.capacity.toLocaleString('en-IN')} {v.capacityUnit || 'kg'}</p>
                    <p style={{ color: FARMER.primary, fontWeight: 700, fontSize: '0.82rem', margin: 0 }}>₹{v.pricePerKm}/km</p>
                    {af && <p style={{ color: '#92400e', fontSize: '0.7rem', margin: '4px 0 0', fontWeight: 600 }}>{af.label}</p>}
                    {distanceNum > 0 && (
                      <p style={{ color: FARMER.muted, fontSize: '0.72rem', margin: '4px 0 0' }}>
                        ≈ ₹{Math.round(v.pricePerKm * distanceNum).toLocaleString('en-IN')} for {distanceNum} km
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Freight summary + CTA */}
        {freightCost && (
          <div style={{ background: FARMER.primaryLight, border: `1px solid ${FARMER.border}`, borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.92rem', margin: 0 }}>Freight cost</p>
              <p style={{ color: FARMER.muted, fontSize: '0.76rem', margin: '2px 0 0' }}>{freightCost.label}</p>
            </div>
            <p style={{ color: freightCost.cost === 0 ? '#065f46' : FARMER.primary, fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>
              {freightCost.cost === 0 ? 'FREE' : `₹${freightCost.cost.toLocaleString('en-IN')}`}
            </p>
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={submitting || !selectedVehicleId && !selectedBuyerVehicleId}
          style={{
            width: '100%', padding: 14,
            background: (submitting || (!selectedVehicleId && !selectedBuyerVehicleId)) ? FARMER.muted : FARMER.primary,
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: '1rem', fontWeight: 700,
            cursor: (submitting || (!selectedVehicleId && !selectedBuyerVehicleId)) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          {submitting ? 'Confirming Booking…' : '✅ Confirm Booking'}
        </button>
        <Link href={payload ? `/farmer/buyer/${payload.buyerId}` : '/farmer/dashboard'} style={{ display: 'block', textAlign: 'center', marginTop: 12, color: FARMER.muted, textDecoration: 'none', fontSize: '0.84rem' }}>← Back</Link>
      </div>
      <style>{`input:focus { border-color: ${FARMER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}

export default function BookVehicle() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: FARMER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: FARMER.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading…</div>}>
      <BookVehicleContent />
    </Suspense>
  )
}
