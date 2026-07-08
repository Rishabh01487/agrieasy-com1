'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { TRANSPORTER, SHARED, cardStyle, navStyle, getStatusStyle } from '@/lib/styles'

interface Vehicle {
  _id: string
  vehicleType: string
  registrationNumber: string
  capacity: number
  pricePerKm: number
  availability: boolean
  driverName: string
  driverPhone: string
}

export default function TransporterDashboard() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const { userId } = getUserInfo()
    if (!userId) {
      router.replace('/auth/login')
      return
    }
    const fetchVehicles = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await authFetch(`/api/vehicles?transporterId=${userId}`)
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          setError(data?.error || 'Failed to load vehicles.')
          setLoading(false)
          return
        }
        const data = await response.json()
        setVehicles(data.vehicles || [])
      } catch (err) {
        setError('Network error. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchVehicles()
  }, [router])

  const handleToggleAvailability = async (vehicleId: string, current: boolean) => {
    try {
      const response = await authFetch('/api/vehicles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, availability: !current }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error || 'Failed to update availability.')
        return
      }
      setVehicles(prev => prev.map(v => v._id === vehicleId ? { ...v, availability: !current } : v))
    } catch (err) {
      setError('Network error. Please try again.')
    }
  }

  const available = vehicles.filter(v => v.availability).length

  const card = {
    ...cardStyle(TRANSPORTER),
    boxShadow: SHARED.shadowMd,
    transition: 'all 0.2s ease',
  }

  return (
    <div style={{ minHeight: '100vh', background: TRANSPORTER.bg, fontFamily: SHARED.font, color: TRANSPORTER.text }}>
      <nav style={{ ...navStyle(TRANSPORTER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
            <span style={{ fontWeight: 800, fontSize: '1.15rem', background: TRANSPORTER.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AgriEasy</span>
            <span style={{ background: TRANSPORTER.primaryLight, color: TRANSPORTER.primary, border: `1px solid ${TRANSPORTER.border}`, borderRadius: '100px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700, boxShadow: SHARED.shadow }}>🚛 Transporter</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/transporter/my-vehicles" style={{ color: TRANSPORTER.primary, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: TRANSPORTER.primaryLight, transition: 'all 0.2s ease' }}>🚛 My Fleet</Link>
            <Link href="/transporter/add-vehicle" style={{ color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: TRANSPORTER.primary, boxShadow: '0 4px 14px rgba(37,99,235,0.25)', transition: 'all 0.2s ease' }}>+ Add Vehicle</Link>
            <Link href="/agrisocial" style={{ color: TRANSPORTER.primary, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: TRANSPORTER.primaryLight, transition: 'all 0.2s ease' }}>📱 AgriSocial</Link>
            <button onClick={logout} style={{ color: TRANSPORTER.red, padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: SHARED.errorLight, border: '1px solid #fca5a5', cursor: 'pointer', transition: 'all 0.2s ease' }}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: TRANSPORTER.textSecondary }}>On the road! 🚛</h2>
          <p style={{ margin: '6px 0 0', color: TRANSPORTER.muted }}>Manage your fleet and connect with farmers needing transport.</p>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: TRANSPORTER.muted }}>Loading vehicles…</div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: 'Total Vehicles', value: vehicles.length, icon: '🚛' },
                { label: 'Available Now', value: available, icon: '✅' },
                { label: 'On Trip / Inactive', value: vehicles.length - available, icon: '🔄' },
              ].map(c => (
                <div key={c.label} style={card}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{c.icon}</div>
                  <div style={{ color: TRANSPORTER.muted, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{c.label}</div>
                  <div style={{ color: TRANSPORTER.textSecondary, fontWeight: 800, fontSize: '2rem' }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Fleet table */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: TRANSPORTER.textSecondary }}>Your Fleet</h3>
                <Link href="/transporter/add-vehicle" style={{ background: TRANSPORTER.primary, color: '#fff', borderRadius: '8px', padding: '7px 18px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(37,99,235,0.25)', transition: 'all 0.2s ease' }}>+ Add Vehicle</Link>
              </div>

              {vehicles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: TRANSPORTER.muted }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚛</div>
                  <p style={{ marginBottom: '16px' }}>No vehicles yet. Add your first one!</p>
                  <Link href="/transporter/add-vehicle" style={{ color: TRANSPORTER.primary, fontWeight: 600, textDecoration: 'none' }}>Add Vehicle →</Link>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${TRANSPORTER.border}` }}>
                        {['Type', 'Reg. Number', 'Driver', 'Capacity', 'Price/km', 'Status', 'Action'].map(h => (
                          <th key={h} style={{ color: TRANSPORTER.textSecondary, fontWeight: 700, fontSize: '0.8rem', textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map(v => (
                        <tr key={v._id} style={{ borderBottom: `1px solid ${TRANSPORTER.bg}` }}>
                          <td style={{ color: TRANSPORTER.primary, padding: '12px 14px', fontWeight: 700 }}>{v.vehicleType}</td>
                          <td style={{ color: TRANSPORTER.text, padding: '12px 14px', fontFamily: 'monospace' }}>{v.registrationNumber}</td>
                          <td style={{ color: TRANSPORTER.text, padding: '12px 14px', fontSize: '0.85rem' }}>{v.driverName || '—'}</td>
                          <td style={{ color: TRANSPORTER.muted, padding: '12px 14px' }}>{v.capacity} kg</td>
                          <td style={{ color: TRANSPORTER.muted, padding: '12px 14px' }}>₹{v.pricePerKm}/km</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              display: 'inline-block', padding: '4px 12px', borderRadius: '100px',
                              background: v.availability ? SHARED.successLight : SHARED.errorLight,
                              color: v.availability ? SHARED.success : SHARED.error,
                              fontSize: '0.78rem', fontWeight: 700,
                              border: `1px solid ${v.availability ? '#86efac' : '#fca5a5'}`
                            }}>
                              {v.availability ? '● Available' : '○ Inactive'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <button
                              onClick={() => handleToggleAvailability(v._id, v.availability)}
                              style={{ background: TRANSPORTER.primaryLight, color: TRANSPORTER.primary, border: `1px solid ${TRANSPORTER.border}`, borderRadius: '6px', padding: '5px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
                            >
                              Toggle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}