'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { FARMER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

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
  pickupLocation: string
  deliveryLocation: string
}

function BookVehicleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [listingId, setListingId] = useState<string | null>(null)
  const { register, handleSubmit, watch, formState: { errors } } = useForm<BookingForm>()
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [totalCost, setTotalCost] = useState<number | null>(null)
  const [formError, setFormError] = useState('')

  const inp = inputStyle(FARMER)
  const lbl = labelStyle(FARMER)

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicles')
      if (!res.ok) return
      const data = await res.json()
      const available = (data?.data?.vehicles || data?.vehicles || []).filter((v: Vehicle) => v.availability)
      setAllVehicles(available)
      setFilteredVehicles(available)
    } catch {
      console.error('Failed to fetch vehicles')
    }
  }, [])

  useEffect(() => {
    const lid = searchParams.get('listingId')
    if (lid) setListingId(lid)
    fetchVehicles()
  }, [searchParams, fetchVehicles])

  const pickupDate = watch('pickupDate')
  const pickupTime = watch('pickupTime')
  const vehicleId = watch('vehicleId')
  const distance = watch('estimatedDistance')

  useEffect(() => {
    if (pickupDate && pickupTime) {
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
    setFormError('')
    try {
      if (!listingId) {
        setFormError('No listing selected. Please go back to Search Buyers and select a listing.')
        setSubmitting(false)
        return
      }

      const pickupDateTime = new Date(`${data.pickupDate}T${data.pickupTime}`).toISOString()
      const response = await authFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          vehicleId: data.vehicleId,
          quantity: parseFloat(data.quantity.toString()),
          estimatedDistance: parseFloat(data.estimatedDistance.toString()),
          pickupDateTime,
          pickupLocation: data.pickupLocation,       // FIX: was farmerAddress
          deliveryLocation: data.deliveryLocation,   // FIX: was missing entirely
        }),
      })
      if (response.ok) {
        router.push('/farmer/my-bookings')
      } else {
        const errData = await response.json().catch(() => ({}))
        setFormError(errData.error || 'Failed to book vehicle. Please try again.')
      }
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <Link href="/farmer/dashboard" style={{ color: FARMER.primary, fontWeight: 800, textDecoration: 'none', fontSize: '1.1rem' }}>AgriEasy</Link>
          <span style={{ color: FARMER.muted }}>›</span>
          <span style={{ color: FARMER.text, fontWeight: 600, fontSize: '0.9rem' }}>Book a Vehicle</span>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: FARMER.textSecondary, fontWeight: 800, fontSize: '1.6rem', marginBottom: '8px' }}>Book a Vehicle</h2>
        <p style={{ color: FARMER.muted, marginBottom: '28px' }}>Set your pickup details and select a vehicle.</p>

        {formError && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>{formError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Date & Time */}
            <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, gridColumn: '1 / -1', transition: 'all 0.2s ease' }}>
              <h3 style={{ color: FARMER.textSecondary, fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>
                Step 1 — When do you need the vehicle?
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={lbl}>Pickup Date</label>
                  <input type="date" {...register('pickupDate', { required: 'Please select a date' })}
                    min={new Date().toISOString().split('T')[0]} style={inp} />
                  {errors.pickupDate && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.pickupDate.message}</p>}
                </div>
                <div>
                  <label style={lbl}>Preferred Pickup Time</label>
                  <input type="time" {...register('pickupTime', { required: 'Please select a time' })} style={inp} />
                  {errors.pickupTime && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.pickupTime.message}</p>}
                </div>
              </div>
              {pickupDate && pickupTime && (
                <div style={{ marginTop: '14px', padding: '10px 14px', background: FARMER.primaryLight, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: FARMER.textSecondary, fontWeight: 600, fontSize: '0.875rem' }}>
                    Showing {filteredVehicles.length} vehicle(s) available on {new Date(pickupDate).toDateString()} at {pickupTime}
                  </span>
                </div>
              )}
            </div>

            {/* Select Vehicle */}
            <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, gridColumn: '1 / -1', transition: 'all 0.2s ease' }}>
              <h3 style={{ color: FARMER.textSecondary, fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>Step 2 — Select Vehicle</h3>
              {filteredVehicles.length === 0 ? (
                <p style={{ color: FARMER.muted }}>No vehicles available. Please select a date and time first.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '12px', marginBottom: '12px' }}>
                  {filteredVehicles.map(v => (
                    <label key={v._id} style={{ cursor: 'pointer' }}>
                      <input type="radio" value={v._id} {...register('vehicleId', { required: 'Please select a vehicle' })} style={{ display: 'none' }} />
                      <div style={{
                        border: `2px solid ${watch('vehicleId') === v._id ? FARMER.primary : FARMER.border}`,
                        borderRadius: '12px', padding: '14px',
                        background: watch('vehicleId') === v._id ? FARMER.primaryLight : FARMER.white,
                        transition: 'all 0.2s ease'
                      }}>
                        <div style={{ fontWeight: 700, color: FARMER.primary, marginBottom: '4px' }}>{v.vehicleType.toUpperCase()}</div>
                        <div style={{ fontSize: '0.78rem', color: FARMER.text, fontFamily: 'monospace' }}>{v.registrationNumber}</div>
                        <div style={{ fontSize: '0.8rem', color: FARMER.muted, marginTop: '6px' }}>Capacity: {v.capacity} kg</div>
                        <div style={{ fontSize: '0.85rem', color: FARMER.textSecondary, fontWeight: 700, marginTop: '2px' }}>₹{v.pricePerKm}/km</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {errors.vehicleId && <p style={{ color: SHARED.error, fontSize: '0.8rem' }}>{errors.vehicleId.message}</p>}
            </div>

            {/* Shipment Details */}
            <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, gridColumn: '1 / -1', transition: 'all 0.2s ease' }}>
              <h3 style={{ color: FARMER.textSecondary, fontWeight: 700, margin: '0 0 16px', fontSize: '1rem' }}>Step 3 — Shipment Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={lbl}>Quantity (kg)</label>
                  <input type="number" {...register('quantity', { required: 'Quantity is required' })} placeholder="e.g., 2000" style={inp} />
                  {errors.quantity && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.quantity.message}</p>}
                </div>
                <div>
                  <label style={lbl}>Distance to Buyer (km)</label>
                  <input type="number" step="0.1" {...register('estimatedDistance', { required: 'Distance is required' })} placeholder="e.g., 45" style={inp} />
                  {errors.estimatedDistance && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.estimatedDistance.message}</p>}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={lbl}>Pickup Location (Your Farm Address)</label>
                <input type="text" {...register('pickupLocation', { required: 'Pickup address is required' })} placeholder="e.g., Village Rampur, Tehsil Kasganj, UP" style={inp} />
                {errors.pickupLocation && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.pickupLocation.message}</p>}
              </div>
              <div>
                <label style={lbl}>Delivery Location (Buyer Address)</label>
                <input type="text" {...register('deliveryLocation', { required: 'Delivery address is required' })} placeholder="e.g., Mandi, District Name, State" style={inp} />
                {errors.deliveryLocation && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.deliveryLocation.message}</p>}
              </div>
            </div>
          </div>

          {totalCost !== null && (
            <div style={{ background: FARMER.primaryLight, border: `1px solid ${FARMER.border}`, borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: FARMER.textSecondary, fontWeight: 600 }}>Estimated Total Cost</span>
              <span style={{ color: FARMER.primary, fontWeight: 800, fontSize: '1.4rem' }}>₹{totalCost.toFixed(2)}</span>
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            width: '100%', padding: '14px', background: submitting ? FARMER.muted : FARMER.primary,
            color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem',
            fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(101,163,13,0.25)', transition: 'all 0.2s ease',
          }}>
            {submitting ? 'Confirming Booking…' : 'Confirm Booking'}
          </button>
          <Link href="/farmer/dashboard" style={{ display: 'block', textAlign: 'center', marginTop: '14px', color: FARMER.muted, textDecoration: 'none', fontSize: '0.875rem' }}>← Back to Dashboard</Link>
        </form>
      </div>
      <style>{`input:focus, select:focus { border-color: ${FARMER.primary} !important; box-shadow: 0 0 0 3px rgba(101,163,13,0.1) !important; }`}</style>
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