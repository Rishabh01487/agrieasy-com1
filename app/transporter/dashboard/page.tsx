'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

const C = {
  bg: '#faf7ff',
  white: '#ffffff',
  brinjal: '#6d28d9',
  brLight: '#ede9fe',
  brMid: '#c4b5fd',
  brDark: '#4c1d95',
  text: '#1e1b4b',
  muted: '#6b7280',
  border: '#ddd6fe',
  red: '#dc2626',
  green: '#16a34a',
}

const card: React.CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 1px 8px rgba(109,40,217,0.07)',
}

export default function TransporterDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const transporterId = localStorage.getItem('userId')
        const url = transporterId ? `/api/vehicles?transporterId=${transporterId}` : '/api/vehicles'
        const response = await fetch(url)
        const data = await response.json()
        setVehicles(data.vehicles || [])
      } catch (error) {
        console.error('Error:', error)
      }
    }
    void fetchVehicles()
  }, [])

  const handleToggleAvailability = async (vehicleId: string, current: boolean) => {
    try {
      await fetch('/api/vehicles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, availability: !current }),
      })
      setVehicles(prev => prev.map(v => v._id === vehicleId ? { ...v, availability: !current } : v))
    } catch (error) {
      console.error('Toggle error:', error)
    }
  }

  const available = vehicles.filter(v => v.availability).length

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', color: C.text }}>
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: C.brinjal }}>AgriEasy</span>
            <span style={{ background: C.brLight, color: C.brinjal, border: `1px solid ${C.brMid}`, borderRadius: '100px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700 }}>🚛 Transporter</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/transporter/my-vehicles" style={{ color: C.brinjal, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: C.brLight }}>🚛 My Fleet</Link>
            <Link href="/transporter/add-vehicle" style={{ color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: C.brinjal }}>+ Add Vehicle</Link>
            <Link href="/agrisocial" style={{ color: C.brinjal, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: C.brLight }}>📱 AgriSocial</Link>
            <Link href="/" style={{ color: C.red, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: '#fee2e2', border: '1px solid #fca5a5' }}>Logout</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: C.brDark }}>On the road! 🚛</h2>
          <p style={{ margin: '6px 0 0', color: C.muted }}>Manage your fleet and connect with farmers needing transport.</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Vehicles', value: vehicles.length, icon: '🚛' },
            { label: 'Available Now', value: available, icon: '✅' },
            { label: 'On Trip / Inactive', value: vehicles.length - available, icon: '🔄' },
          ].map(c => (
            <div key={c.label} style={card}>
              <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{c.icon}</div>
              <div style={{ color: C.muted, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{c.label}</div>
              <div style={{ color: C.brDark, fontWeight: 800, fontSize: '2rem' }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Fleet table */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.brDark }}>Your Fleet</h3>
            <Link href="/transporter/add-vehicle" style={{ background: C.brinjal, color: '#fff', borderRadius: '8px', padding: '7px 18px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>+ Add Vehicle</Link>
          </div>

          {vehicles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚛</div>
              <p style={{ marginBottom: '16px' }}>No vehicles yet. Add your first one!</p>
              <Link href="/transporter/add-vehicle" style={{ color: C.brinjal, fontWeight: 600, textDecoration: 'none' }}>Add Vehicle →</Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {['Type', 'Reg. Number', 'Driver', 'Capacity', 'Price/km', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ color: C.brDark, fontWeight: 700, fontSize: '0.8rem', textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v._id} style={{ borderBottom: `1px solid ${C.bg}` }}>
                      <td style={{ color: C.brinjal, padding: '12px 14px', fontWeight: 700 }}>{v.vehicleType}</td>
                      <td style={{ color: C.text, padding: '12px 14px', fontFamily: 'monospace' }}>{v.registrationNumber}</td>
                      <td style={{ color: C.text, padding: '12px 14px', fontSize: '0.85rem' }}>{v.driverName || '—'}</td>
                      <td style={{ color: C.muted, padding: '12px 14px' }}>{v.capacity} kg</td>
                      <td style={{ color: C.muted, padding: '12px 14px' }}>₹{v.pricePerKm}/km</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: '100px',
                          background: v.availability ? '#dcfce7' : '#fee2e2',
                          color: v.availability ? C.green : C.red,
                          fontSize: '0.78rem', fontWeight: 700,
                          border: `1px solid ${v.availability ? '#86efac' : '#fca5a5'}`
                        }}>
                          {v.availability ? '● Available' : '○ Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          onClick={() => handleToggleAvailability(v._id, v.availability)}
                          style={{ background: C.brLight, color: C.brinjal, border: `1px solid ${C.brMid}`, borderRadius: '6px', padding: '5px 14px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
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
      </div>
    </div>
  )
}