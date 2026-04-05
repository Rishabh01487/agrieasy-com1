'use client'

import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

type FormData = {
  vehicleType: string
  registrationNumber: string
  capacity: number
  pricePerKm: number
  driverName: string
  driverPhone: string
  driverLicense: string
}

const C = {
  bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
  brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280', border: '#ddd6fe',
}
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: `1.5px solid ${C.border}`, color: C.text, fontSize: '0.9rem',
  background: C.white, outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = { display: 'block', fontWeight: 700, color: C.brDark, marginBottom: '6px', fontSize: '0.875rem' }

export default function AddVehicle() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    const transporterId = localStorage.getItem('userId')
    if (!transporterId) { setError('You must be logged in as a transporter.'); setLoading(false); return }
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          transporterId,
          capacity: parseFloat(data.capacity.toString()),
          pricePerKm: parseFloat(data.pricePerKm.toString()),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to add vehicle'); setLoading(false); return }
      router.push('/transporter/dashboard')
    } catch (err) {
      console.error('Error:', err)
      setError('Network error. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/transporter/dashboard" style={{ color: C.brinjal, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: C.muted }}>›</span>
            <span style={{ color: C.text, fontWeight: 600, fontSize: '0.9rem' }}>Register Vehicle</span>
          </div>
          <Link href="/transporter/dashboard" style={{ color: C.brinjal, background: C.brLight, border: `1px solid ${C.brMid}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px' }}>
        <h2 style={{ color: C.brDark, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>🚛 Register a Vehicle</h2>
        <p style={{ color: C.muted, marginBottom: '28px', fontSize: '0.9rem' }}>Add vehicle details and assign a driver. Farmers will see this vehicle when booking.</p>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Vehicle Details */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)', marginBottom: '20px' }}>
            <h3 style={{ color: C.brDark, fontWeight: 700, margin: '0 0 18px', fontSize: '1rem' }}>🚛 Vehicle Details</h3>
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
                {errors.vehicleType && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.vehicleType.message}</p>}
              </div>

              <div>
                <label style={lbl}>Vehicle Registration Number</label>
                <input type="text" {...register('registrationNumber', { required: 'Registration number is required', pattern: { value: /^[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}$|^[A-Z0-9-]+$/, message: 'Enter a valid vehicle number (e.g. UP-01-AM-2345)' } })} placeholder="e.g., UP-01-AM-2345" style={{ ...inp, textTransform: 'uppercase' }} />
                {errors.registrationNumber && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.registrationNumber.message}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Capacity (kg)</label>
                  <input type="number" {...register('capacity', { required: 'Capacity required', min: { value: 100, message: 'Min 100 kg' } })} placeholder="e.g., 5000" style={inp} />
                  {errors.capacity && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.capacity.message}</p>}
                </div>
                <div>
                  <label style={lbl}>Price Per km (₹)</label>
                  <input type="number" step="0.5" {...register('pricePerKm', { required: 'Price required', min: { value: 1, message: 'Min ₹1/km' } })} placeholder="e.g., 12" style={inp} />
                  {errors.pricePerKm && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.pricePerKm.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Driver Details */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)', marginBottom: '24px' }}>
            <h3 style={{ color: C.brDark, fontWeight: 700, margin: '0 0 18px', fontSize: '1rem' }}>👤 Assigned Driver Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>Driver Full Name</label>
                <input type="text" {...register('driverName', { required: 'Driver name is required' })} placeholder="e.g., Ramesh Kumar" style={inp} />
                {errors.driverName && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.driverName.message}</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={lbl}>Driver Phone</label>
                  <input type="text" {...register('driverPhone', { required: 'Driver phone required', pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit number' } })} placeholder="+91 XXXXXXXXXX" style={inp} />
                  {errors.driverPhone && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.driverPhone.message}</p>}
                </div>
                <div>
                  <label style={lbl}>Driving License No.</label>
                  <input type="text" {...register('driverLicense', { required: 'License number required' })} placeholder="e.g., UP01-20120012345" style={{ ...inp, textTransform: 'uppercase' }} />
                  {errors.driverLicense && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px' }}>{errors.driverLicense.message}</p>}
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px', background: loading ? C.muted : C.brinjal,
            color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem',
            fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Registering Vehicle…' : '✅ Register Vehicle & Driver'}
          </button>
        </form>
      </div>
      <style>{`input:focus, select:focus { border-color: #6d28d9 !important; box-shadow: 0 0 0 3px rgba(109,40,217,0.1) !important; }`}</style>
    </div>
  )
}