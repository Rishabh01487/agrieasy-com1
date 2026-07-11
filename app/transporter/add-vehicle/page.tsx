'use client'

import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { TRANSPORTER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

type FormData = {
  vehicleType: string
  registrationNumber: string
  capacity: number
  pricePerKm: number
  driverName: string
  driverPhone: string
  driverLicense: string
}

export default function AddVehicle() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inp = inputStyle(TRANSPORTER)
  const lbl = labelStyle(TRANSPORTER)

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    const { userId } = getUserInfo()
    if (!userId) { setError('You must be logged in as a transporter.'); setLoading(false); return }
    try {
      const res = await authFetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          capacity: parseFloat(data.capacity.toString()),
          pricePerKm: parseFloat(data.pricePerKm.toString()),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        // API returns { success: false, error: { code, message, details } }
        // OR a flat { error: 'string' } for older routes. Handle both.
        const errObj = json?.error
        let msg = 'Failed to add vehicle'
        if (typeof errObj === 'string') {
          msg = errObj
        } else if (errObj && typeof errObj === 'object') {
          msg = errObj.message || 'Validation failed'
          if (Array.isArray(errObj.details) && errObj.details.length > 0) {
            msg = errObj.details.map((d: any) => `${d.field}: ${d.message}`).join(' • ')
          }
        }
        setError(msg)
        setLoading(false)
        return
      }
      // Success — redirect to dashboard. The dashboard will re-fetch and
      // show the newly added vehicle.
      router.push('/transporter/dashboard')
    } catch (err) {
      console.error('Error:', err)
      setError('Network error. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: TRANSPORTER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(TRANSPORTER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/transporter/dashboard" style={{ color: TRANSPORTER.primary, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: TRANSPORTER.muted }}>›</span>
            <span style={{ color: TRANSPORTER.text, fontWeight: 600, fontSize: '0.9rem' }}>Register Vehicle</span>
          </div>
          <Link href="/transporter/dashboard" style={{ color: TRANSPORTER.primary, background: TRANSPORTER.primaryLight, border: `1px solid ${TRANSPORTER.border}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px' }}>
        <h2 style={{ color: TRANSPORTER.textSecondary, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>🚛 Register a Vehicle</h2>
        <p style={{ color: TRANSPORTER.muted, marginBottom: '28px', fontSize: '0.9rem' }}>Add vehicle details and assign a driver. Farmers will see this vehicle when booking.</p>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Vehicle Details */}
          <div style={{ ...cardStyle(TRANSPORTER), boxShadow: SHARED.shadowMd, marginBottom: '20px', transition: 'all 0.2s ease' }}>
            <h3 style={{ color: TRANSPORTER.textSecondary, fontWeight: 700, margin: '0 0 18px', fontSize: '1rem' }}>🚛 Vehicle Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>Vehicle Type</label>
                <select {...register('vehicleType', { required: 'Please select vehicle type' })} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">Select type…</option>
                  <option value="mini-truck">Mini Truck (up to 1.5 ton)</option>
                  <option value="tempo">Tempo / Pickup (up to 750 kg)</option>
                  <option value="pickup-van">Pickup Van</option>
                  <option value="truck">Big Truck (up to 10 ton)</option>
                  <option value="tractor-trolley">Tractor Trolley</option>
                </select>
                {errors.vehicleType && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.vehicleType.message}</p>}
              </div>

              <div>
                <label style={lbl}>Vehicle Registration Number</label>
                <input
                  type="text"
                  {...register('registrationNumber', {
                    required: 'Registration number is required',
                    validate: v => {
                      // Strip spaces/dashes and check length — same logic as server
                      const clean = v.toUpperCase().replace(/[\s-]/g, '')
                      if (!/^[A-Z0-9]{5,12}$/.test(clean)) {
                        return 'Enter a valid vehicle number (e.g. MH12AB1234, KA05ABC1234, BH22A1234)'
                      }
                      return true
                    },
                  })}
                  placeholder="e.g., MH 12 AB 1234 or KA05ABC1234"
                  style={{ ...inp, textTransform: 'uppercase' }}
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
                {errors.registrationNumber && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.registrationNumber.message}</p>}
                <p style={{ color: TRANSPORTER.muted, fontSize: '0.74rem', margin: '4px 0 0' }}>
                  Supports all-India formats — BH series, defense, single-letter series, etc. Spaces and dashes are auto-removed.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Capacity (kg)</label>
                  <input type="number" {...register('capacity', { required: 'Capacity required', min: { value: 100, message: 'Min 100 kg' } })} placeholder="e.g., 5000" style={inp} />
                  {errors.capacity && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.capacity.message}</p>}
                </div>
                <div>
                  <label style={lbl}>Price Per km (₹)</label>
                  <input type="number" step="0.5" {...register('pricePerKm', { required: 'Price required', min: { value: 1, message: 'Min ₹1/km' } })} placeholder="e.g., 12" style={inp} />
                  {errors.pricePerKm && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.pricePerKm.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Driver Details */}
          <div style={{ ...cardStyle(TRANSPORTER), boxShadow: SHARED.shadowMd, marginBottom: '24px', transition: 'all 0.2s ease' }}>
            <h3 style={{ color: TRANSPORTER.textSecondary, fontWeight: 700, margin: '0 0 18px', fontSize: '1rem' }}>👤 Assigned Driver Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>Driver Full Name</label>
                <input type="text" {...register('driverName', { required: 'Driver name is required' })} placeholder="e.g., Ramesh Kumar" style={inp} />
                {errors.driverName && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.driverName.message}</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Driver Phone</label>
                  <input type="text" {...register('driverPhone', { required: 'Driver phone required', pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit number' } })} placeholder="9876543210" style={inp} />
                  {errors.driverPhone && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.driverPhone.message}</p>}
                </div>
                <div>
                  <label style={lbl}>Driving License No.</label>
                  <input type="text" {...register('driverLicense', { required: 'License number required' })} placeholder="e.g., UP01-20120012345" style={{ ...inp, textTransform: 'uppercase' }} />
                  {errors.driverLicense && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.driverLicense.message}</p>}
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', background: loading ? TRANSPORTER.muted : TRANSPORTER.primary,
            color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem',
            fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.25)', transition: 'all 0.2s ease',
          }}>
            {loading ? 'Registering Vehicle…' : '✅ Register Vehicle & Driver'}
          </button>
        </form>
      </div>
      <style>{`input:focus, select:focus { border-color: ${TRANSPORTER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}