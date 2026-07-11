'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { TRANSPORTER, SHARED, cardStyle, navStyle } from '@/lib/styles'
import { DashboardSkeleton } from '@/app/components/DashboardSkeleton'
import { useIsMobile } from '@/lib/use-is-mobile'

interface Vehicle {
  _id: string
  vehicleType: string
  registrationNumber: string
  capacity: number
  pricePerKm: number
  availability: boolean
  driverName: string
  driverPhone: string
  availableFrom?: string | null
}

interface ActiveTrip {
  _id: string
  pickupLocation: string
  deliveryLocation: string
  totalQuantity: number
  commodities?: Array<{ name: string; quantity: number }>
  farmerId?: { farmerName?: string; phone?: string }
  buyerId?: { firmName?: string }
}

export default function TransporterDashboard() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [pendingBookings, setPendingBookings] = useState(0)
  const [inTransitBookings, setInTransitBookings] = useState(0)
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const { userId } = getUserInfo()
    if (!userId) {
      router.replace('/auth/login')
      return
    }
    const fetchAll = async () => {
      setLoading(true)
      setError('')
      try {
        const [vehiclesRes, pendingRes, inTransitRes] = await Promise.all([
          authFetch(`/api/vehicles?transporterId=${userId}`),
          authFetch('/api/bookings?role=transporter&status=pending&limit=100').catch(() => null),
          authFetch('/api/bookings?role=transporter&status=in-transit&limit=10').catch(() => null),
        ])
        if (!vehiclesRes.ok) {
          const data = await vehiclesRes.json().catch(() => null)
          setError(data?.error || 'Failed to load vehicles.')
        } else {
          const data = await vehiclesRes.json()
          setVehicles(data?.data?.vehicles || data?.vehicles || [])
        }
        if (pendingRes && pendingRes.ok) {
          const data = await pendingRes.json()
          setPendingBookings((data?.data?.bookings || data?.bookings || []).length)
        }
        if (inTransitRes && inTransitRes.ok) {
          const data = await inTransitRes.json()
          const trips = data?.data?.bookings || data?.bookings || []
          setInTransitBookings(trips.length)
          setActiveTrips(trips)
        }
      } catch (err) {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchAll()
  }, [router])

  const handleToggleAvailability = async (vehicleId: string, current: boolean) => {
    try {
      const response = await authFetch('/api/vehicles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, availability: !current }),
      })
      if (!response.ok) {
        setError('Failed to update availability.')
        return
      }
      setVehicles(prev => prev.map(v => v._id === vehicleId ? { ...v, availability: !current } : v))
    } catch (err) {
      setError('Network error. Please try again.')
    }
  }

  const available = vehicles.filter(v => v.availability).length

  if (loading) {
    return (
      <DashboardSkeleton
        role="transporter"
        primary={TRANSPORTER.primary}
        primaryLight={TRANSPORTER.primaryLight}
        bg={TRANSPORTER.bg}
        bgSub={TRANSPORTER.bgSub}
        border={TRANSPORTER.border}
        text={TRANSPORTER.text}
        muted={TRANSPORTER.muted}
        gradient={TRANSPORTER.gradient}
      />
    )
  }

  return (
    <div className="dashboard-content" style={{ minHeight: '100vh', background: TRANSPORTER.bg, fontFamily: SHARED.font, color: TRANSPORTER.text }}>
      {/* Clean nav — just logo + name + logout */}
      <nav style={{ ...navStyle(TRANSPORTER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: TRANSPORTER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>🚛</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: TRANSPORTER.text, lineHeight: 1 }}>AgriEasy</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: TRANSPORTER.muted }}>Transporter</p>
            </div>
          </div>
          <button onClick={logout} style={{ color: TRANSPORTER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: isMobile ? '16px 12px 80px' : '24px 20px 60px' }}>
        {/* Welcome — fleet summary + add vehicle CTA */}
        <div style={{
          background: TRANSPORTER.gradient,
          borderRadius: 16, padding: isMobile ? 18 : 24,
          marginBottom: 16, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
          boxShadow: `0 8px 24px ${TRANSPORTER.primary}30`,
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>On the road! 🚛</h1>
            <p style={{ margin: '6px 0 0', fontSize: '0.86rem', opacity: 0.9 }}>
              {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} · {available} available
            </p>
          </div>
          <Link href="/transporter/add-vehicle" style={{
            background: '#fff', color: TRANSPORTER.primary, border: 'none',
            borderRadius: 12, padding: '11px 22px', fontSize: '0.9rem', fontWeight: 800,
            textDecoration: 'none', whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          }}>
            + Add Vehicle
          </Link>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: SHARED.error, fontSize: '0.86rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Pending bookings alert */}
        {pendingBookings > 0 && (
          <Link href="/transporter/bookings" style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1.5px solid #f59e0b',
              borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: SHARED.shadowMd,
            }}>
              <span style={{ fontSize: '1.6rem' }}>🚚</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: '#92400e', fontWeight: 800, fontSize: '0.92rem' }}>
                  {pendingBookings} {pendingBookings === 1 ? 'farmer booked' : 'farmers booked'} your vehicle!
                </p>
                <p style={{ margin: '2px 0 0', color: '#92400e', fontSize: '0.78rem' }}>
                  Tap to accept and dispatch.
                </p>
              </div>
              <span style={{ color: '#92400e', fontWeight: 800, fontSize: '1.2rem' }}>›</span>
            </div>
          </Link>
        )}

        {/* 2 stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Link href="/transporter/bookings" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: `1px solid ${TRANSPORTER.borderLight}`, boxShadow: SHARED.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f59e0b15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>⏳</div>
                <div>
                  <p style={{ margin: 0, color: TRANSPORTER.muted, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>Pending</p>
                  <p style={{ margin: '2px 0 0', color: pendingBookings > 0 ? '#d97706' : TRANSPORTER.text, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{pendingBookings}</p>
                  <p style={{ margin: '2px 0 0', color: TRANSPORTER.muted, fontSize: '0.7rem' }}>{pendingBookings > 0 ? 'awaiting acceptance' : 'no new bookings'}</p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/transporter/bookings" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: `1px solid ${TRANSPORTER.borderLight}`, boxShadow: SHARED.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${TRANSPORTER.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🚚</div>
                <div>
                  <p style={{ margin: 0, color: TRANSPORTER.muted, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>In Transit</p>
                  <p style={{ margin: '2px 0 0', color: TRANSPORTER.primary, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{inTransitBookings}</p>
                  <p style={{ margin: '2px 0 0', color: TRANSPORTER.muted, fontSize: '0.7rem' }}>{inTransitBookings > 0 ? 'active trips' : 'no active trips'}</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Active trips */}
        {activeTrips.length > 0 && (
          <div style={{ ...cardStyle(TRANSPORTER), border: `1px solid ${TRANSPORTER.borderLight}`, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${TRANSPORTER.borderLight}` }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: TRANSPORTER.text }}>🚚 Active trips</h3>
              <span style={{ background: TRANSPORTER.primary, color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>{activeTrips.length} in transit</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeTrips.map(t => (
                <Link key={t._id} href={`/transporter/tracking/${t._id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, border: `1px solid ${TRANSPORTER.borderLight}`, background: TRANSPORTER.white, transition: 'all 0.15s' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: TRANSPORTER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🚛</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, color: TRANSPORTER.text, fontWeight: 700, fontSize: '0.86rem' }}>
                        {(t.commodities && t.commodities.length > 0) ? t.commodities.map((c: any) => c.name).join(', ') : 'Goods'} · {(t.totalQuantity || 0).toLocaleString('en-IN')} kg
                      </p>
                      <p style={{ margin: '2px 0 0', color: TRANSPORTER.muted, fontSize: '0.74rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        🌾 {t.pickupLocation} → 🛒 {t.deliveryLocation}
                      </p>
                    </div>
                    <span style={{ color: TRANSPORTER.primary, fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>📍 Track ›</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Fleet list — compact rows instead of table */}
        <div style={{ ...cardStyle(TRANSPORTER), border: `1px solid ${TRANSPORTER.borderLight}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${TRANSPORTER.borderLight}` }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: TRANSPORTER.text }}>Your fleet</h3>
            <Link href="/transporter/add-vehicle" style={{ background: TRANSPORTER.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}>+ Add</Link>
          </div>
          {vehicles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: TRANSPORTER.muted }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🚛</div>
              <p style={{ fontSize: '0.86rem', margin: '0 0 12px' }}>No vehicles yet. Add your first one!</p>
              <Link href="/transporter/add-vehicle" style={{ display: 'inline-block', color: '#fff', background: TRANSPORTER.primary, padding: '9px 18px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.84rem' }}>+ Add Vehicle</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vehicles.map(v => (
                <div key={v._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, border: `1px solid ${TRANSPORTER.borderLight}`, background: TRANSPORTER.white }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: v.availability ? '#10b98115' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🚛</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: TRANSPORTER.text, fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>{v.vehicleType} · {v.registrationNumber}</p>
                    <p style={{ color: TRANSPORTER.muted, fontSize: '0.74rem', margin: '2px 0 0' }}>
                      {v.capacity.toLocaleString('en-IN')} kg · ₹{v.pricePerKm}/km · {v.driverName || 'No driver'}
                    </p>
                  </div>
                  <button onClick={() => handleToggleAvailability(v._id, v.availability)} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                    background: v.availability ? '#d1fae5' : '#fee2e2',
                    color: v.availability ? '#065f46' : '#991b1b',
                    border: `1px solid ${v.availability ? '#86efac' : '#fca5a5'}`,
                    flexShrink: 0,
                  }}>
                    {v.availability ? '● Available' : '○ Inactive'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
