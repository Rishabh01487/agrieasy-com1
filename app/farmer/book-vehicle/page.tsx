'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import Link from 'next/link'

interface Vehicle {
  _id: string
  vehicleType: string
  registrationNumber: string
  capacity: number
  pricePerKm: number
  availability: boolean
}

type BookingForm = {
  vehicleId: string
  quantity: number
  estimatedDistance: number
  pickupDate: string
  pickupTime: string
  farmerAddress: string
}

const C = {
  bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
  brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280', border: '#ddd6fe',
}
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: `1.5px solid ${C.border}`, borderRadius: '10px',
  fontSize: '0.95rem', color: C.text, background: C.white, outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = { display: 'block', fontWeight: 700, color: C.brDark, marginBottom: '6px', fontSize: '0.875rem' }

function BookVehicleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [listingId, setListingId] = useState<string | null>(null)
  const { register, handleSubmit, watch, formState: { errors } } = useForm<BookingForm>()
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [totalCost, setTotalCost] = useState<number | null>(null)

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicles')
      const data = await res.json()
      const available = (data.vehicles || []).filter((v: Vehicle) => v.availability)
      setAllVehicles(available)
      setFilteredVehicles(available)
    } catch {
      console.error('Failed to fetch vehicles')
    }
  }, [])

  useEffect(() => {
    setListingId(searchParams.get('listingId'))
    fetchVehicles()
  }, [searchParams, fetchVehicles])

  // Filter vehicles by time slot (frontend simulation)
  const pickupDate = watch('pickupDate')
  const pickupTime = watch('pickupTime')
  const vehicleId = watch('vehicleId')
  const distance = watch('estimatedDistance')

  useEffect(() => {
    if (pickupDate && pickupTime) {
      // In real app: fetch /api/vehicles?date=...&time=... — currently all available vehicles shown
      setFilteredVehicles(allVehicles)
    }
  }, [pickupDate, pickupTime, allVehicles])

  useEffect(() => {
    if (vehicleId && distance) {
      const v = allVehicles.find(v => v._id === vehicleId)
      if (v) setTotalCost(v.pricePerKm * parseFloat(distance.toString()))
    }
  }, [vehicleId, distance, allVehicles])

  const onSubmit = async (data: BookingForm) => {
    setSubmitting(true)
    try {
      const farmerId = localStorage.getItem('userId')
      const pickupDateTime = new Date(`${data.pickupDate}T${data.pickupTime}`).toISOString()
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          farmerId,
          listingId,
          pickupDateTime,
          estimatedDistance: parseFloat(data.estimatedDistance.toString()),
          quantity: parseFloat(data.quantity.toString()),
        }),
      })
      if (response.ok) {
        router.push('/farmer/my-bookings')
      } else {
        alert('Failed to book vehicle. Please try again.')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to book vehicle')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
      {/* Navbar */}
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <Link href="/farmer/dashboard" style={{ color: C.brinjal, fontWeight: 800, textDecoration: 'none', fontSize: '1.1rem' }}>AgriEasy</Link>
          <span style={{ color: C.muted }}>›</span>
          <span style={{ color: C.text, fontWeight: 600, fontSize: '0.9rem' }}>Book a Vehicle</span>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: C.brDark, fontWeight: 800, fontSize: '1.6rem', marginBottom: '8px' }}>🚛 Book a Vehicle</h2>
        <p style={{ color: C.muted, marginBottom: '28px' }}>Set your pickup time and we&apos;ll show only available vehicles for that slot.</p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Step 1: Date & Time */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)', gridColumn: '1 / -1' }}>
              <h3 style={{ color: C.brDark, fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>
                📅 Step 1 — When do you need the vehicle?
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={lbl}>Pickup Date</label>
                  <input type="date" {...register('pickupDate', { required: 'Please select a date' })}
                    min={new Date().toISOString().split('T')[0]} style={inp} />
                  {errors.pickupDate && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.pickupDate.message}</p>}
                </div>
                <div>
                  <label style={lbl}>Preferred Pickup Time</label>
                  <input type="time" {...register('pickupTime', { required: 'Please select a time' })} style={inp} />
                  {errors.pickupTime && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.pickupTime.message}</p>}
                </div>
              </div>
              {pickupDate && pickupTime && (
                <div style={{ marginTop: '14px', padding: '10px 14px', background: C.brLight, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>✅</span>
                  <span style={{ color: C.brDark, fontWeight: 600, fontSize: '0.875rem' }}>
                    Showing {filteredVehicles.length} vehicle(s) available on {new Date(pickupDate).toDateString()} at {pickupTime}
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Select Vehicle */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)', gridColumn: '1 / -1' }}>
              <h3 style={{ color: C.brDark, fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>🚛 Step 2 — Select Vehicle</h3>
              {filteredVehicles.length === 0 ? (
                <p style={{ color: C.muted }}>No vehicles available. Please select a date and time first.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '12px', marginBottom: '12px' }}>
                  {filteredVehicles.map(v => (
                    <label key={v._id} style={{ cursor: 'pointer' }}>
                      <input type="radio" value={v._id} {...register('vehicleId', { required: 'Please select a vehicle' })} style={{ display: 'none' }} />
                      <div style={{
                        border: `2px solid ${watch('vehicleId') === v._id ? C.brinjal : C.border}`,
                        borderRadius: '12px', padding: '14px',
                        background: watch('vehicleId') === v._id ? C.brLight : C.white,
                        transition: 'all 0.15s'
                      }}>
                        <div style={{ fontWeight: 700, color: C.brinjal, marginBottom: '4px' }}>{v.vehicleType.toUpperCase()}</div>
                        <div style={{ fontSize: '0.78rem', color: C.text, fontFamily: 'monospace' }}>{v.registrationNumber}</div>
                        <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: '6px' }}>Capacity: {v.capacity} kg</div>
                        <div style={{ fontSize: '0.85rem', color: C.brDark, fontWeight: 700, marginTop: '2px' }}>₹{v.pricePerKm}/km</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {errors.vehicleId && <p style={{ color: '#dc2626', fontSize: '0.8rem' }}>{errors.vehicleId.message}</p>}
            </div>

            {/* Step 3: Details */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)', gridColumn: '1 / -1' }}>
              <h3 style={{ color: C.brDark, fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>📦 Step 3 — Shipment Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={lbl}>Quantity (kg)</label>
                  <input type="number" {...register('quantity', { required: 'Quantity is required' })} placeholder="e.g., 2000" style={inp} />
                  {errors.quantity && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.quantity.message}</p>}
                </div>
                <div>
                  <label style={lbl}>Distance to Buyer (km)</label>
                  <input type="number" step="0.1" {...register('estimatedDistance', { required: 'Distance is required' })} placeholder="e.g., 45" style={inp} />
                  {errors.estimatedDistance && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.estimatedDistance.message}</p>}
                </div>
              </div>
              <div>
                <label style={lbl}>Your Farm / Pickup Address</label>
                <input type="text" {...register('farmerAddress', { required: 'Pickup address is required' })} placeholder="e.g., Village Rampur, Tehsil Kasganj, UP" style={inp} />
                {errors.farmerAddress && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.farmerAddress.message}</p>}
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          {totalCost !== null && (
            <div style={{ background: C.brLight, border: `1px solid ${C.brMid}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: C.brDark, fontWeight: 600 }}>Estimated Total Cost</span>
              <span style={{ color: C.brinjal, fontWeight: 800, fontSize: '1.4rem' }}>₹{totalCost.toFixed(2)}</span>
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            width: '100%', padding: '14px', background: submitting ? C.muted : C.brinjal,
            color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem',
            fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
          }}>
            {submitting ? 'Confirming Booking…' : '✅ Confirm Booking'}
          </button>
          <Link href="/farmer/dashboard" style={{ display: 'block', textAlign: 'center', marginTop: '14px', color: C.muted, textDecoration: 'none', fontSize: '0.875rem' }}>← Back to Dashboard</Link>
        </form>
      </div>
    </div>
  )
}

export default function BookVehicle() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#faf7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d28d9', fontWeight: 700 }}>Loading…</div>}>
      <BookVehicleContent />
    </Suspense>
  )
}