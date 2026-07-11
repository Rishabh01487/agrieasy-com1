'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo } from '@/lib/auth-fetch'
import { TRANSPORTER, SHARED, cardStyle, navStyle } from '@/lib/styles'

// Load Leaflet CSS dynamically (avoids SSR issues)
function loadLeafletCSS() {
  if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
    const link = document.createElement('link')
    link.id = 'leaflet-css'
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }
}

interface Party {
  _id: string
  farmerName?: string
  firmName?: string
  transporterCompanyName?: string
  role: string
  phone?: string
  location?: { latitude: number; longitude: number; updatedAt?: string }
}

interface Vehicle {
  _id: string
  vehicleType: string
  registrationNumber: string
  driverName?: string
  driverPhone?: string
  vehicleDisplayName?: string
}

interface BookingData {
  _id: string
  status: string
  commodity: string
  commodities?: Array<{ name: string; quantity: number; numberOfBags: number }>
  totalQuantity?: number
  quantity?: number
  pickupLocation: string
  deliveryLocation: string
  driverLocation: { latitude: number; longitude: number; updatedAt: string } | null
  trackingUpdates?: Array<{ timestamp: string; location: { latitude: number; longitude: number }; status: string }>
  estimatedArrivalTime?: string
  farmer: Party
  buyer: Party
  transporter: Party
  vehicle?: Vehicle | null
  buyerVehicle?: Vehicle | null
}

export default function TransporterTrackingPage() {
  const params = useParams()
  const bookingId = params.bookingId as string

  const [booking, setBooking] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sharing, setSharing] = useState(true)
  const [lastShared, setLastShared] = useState<Date | null>(null)
  const [map, setMap] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [routeLine, setRouteLine] = useState<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)

  useEffect(() => {
    loadLeafletCSS()
    import('leaflet').then((L) => {
      leafletRef.current = L.default || L
    })

    if (!bookingId) {
      setLoading(false)
      setError('No booking ID provided.')
      return
    }

    void fetchBooking()
    const interval = setInterval(fetchBooking, 10000) // refresh every 10s
    return () => clearInterval(interval)
  }, [bookingId])

  const fetchBooking = async () => {
    try {
      const res = await authFetch(`/api/location?bookingId=${bookingId}`)
      if (res.ok) {
        const d = await res.json()
        setBooking(d?.data?.booking || d?.booking || null)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d?.error?.message || d?.error || 'Failed to load tracking data')
      }
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  // Initialize/update map when booking data changes
  useEffect(() => {
    if (!booking || !leafletRef.current || !mapContainerRef.current) return
    const L = leafletRef.current

    let m = map
    if (!m) {
      m = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(m)
      setMap(m)
    }

    // Clear existing markers + route line
    markers.forEach(mk => m.removeLayer(mk))
    if (routeLine) m.removeLayer(routeLine)
    const newMarkers: any[] = []

    const makeIcon = (emoji: string, color: string, label?: string) =>
      L.divIcon({
        html: `<div style="background:${color};color:#fff;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.3rem;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>${label ? `<div style="background:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:700;color:${color};margin-top:2px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.2);">${label}</div>` : ''}`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })

    // Farmer location (pickup) — green
    if (booking.farmer?.location?.latitude) {
      const mk = L.marker(
        [booking.farmer.location.latitude, booking.farmer.location.longitude],
        { icon: makeIcon('🌾', '#10b981', 'PICKUP') }
      ).addTo(m).bindPopup(`<b>Farmer (Pickup)</b><br/>${booking.farmer.farmerName || 'Farmer'}<br/>${booking.pickupLocation}`)
      newMarkers.push(mk)
    }

    // Buyer location (delivery) — orange
    if (booking.buyer?.location?.latitude) {
      const mk = L.marker(
        [booking.buyer.location.latitude, booking.buyer.location.longitude],
        { icon: makeIcon('🛒', '#f59e0b', 'DELIVERY') }
      ).addTo(m).bindPopup(`<b>Buyer (Delivery)</b><br/>${booking.buyer.firmName || 'Buyer'}<br/>${booking.deliveryLocation}`)
      newMarkers.push(mk)
    }

    // Driver/transporter LIVE location — blue
    if (booking.driverLocation?.latitude) {
      const mk = L.marker(
        [booking.driverLocation.latitude, booking.driverLocation.longitude],
        { icon: makeIcon('🚛', '#2563eb', 'YOU') }
      ).addTo(m).bindPopup(`<b>Your vehicle (Live)</b><br/>Last update: ${new Date(booking.driverLocation.updatedAt).toLocaleTimeString('en-IN')}`)
      newMarkers.push(mk)

      // Draw a polyline from current driver position → delivery location
      if (booking.buyer?.location?.latitude) {
        const line = L.polyline(
          [
            [booking.driverLocation.latitude, booking.driverLocation.longitude],
            [booking.buyer.location.latitude, booking.buyer.location.longitude],
          ],
          { color: '#2563eb', weight: 3, opacity: 0.6, dashArray: '8, 8' }
        ).addTo(m)
        setRouteLine(line)
      }
    }

    // Also draw the tracking history as a faint trail
    if (Array.isArray(booking.trackingUpdates) && booking.trackingUpdates.length > 1) {
      const trail = L.polyline(
        booking.trackingUpdates.map((t: any) => [t.location.latitude, t.location.longitude]),
        { color: '#3b82f6', weight: 2, opacity: 0.3 }
      ).addTo(m)
      // Don't store as routeLine (it would be removed on next refresh);
      // just let it accumulate — capped at 20 entries server-side.
      void trail
    }

    setMarkers(newMarkers)

    // Fit bounds to show all markers
    if (newMarkers.length > 0) {
      const group = L.featureGroup(newMarkers)
      m.fitBounds(group.getBounds(), { padding: [50, 50] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking])

  // Transporter: share their live location every 15s (when sharing is on)
  useEffect(() => {
    if (!sharing || !bookingId) return

    const updateLocation = async () => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser. Use a mobile device or modern browser.')
        setSharing(false)
        return
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await authFetch('/api/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                bookingId,
              }),
            })
            setLastShared(new Date())
            // Immediately refetch so the map updates
            void fetchBooking()
          } catch (err) {
            console.warn('Location update failed:', err)
          }
        },
        (err) => {
          console.warn('Geolocation error:', err.message)
          if (err.code === err.PERMISSION_DENIED) {
            setError('Location permission denied. Please allow location access in your browser settings to share your live position with the farmer.')
            setSharing(false)
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }

    updateLocation() // immediate
    const interval = setInterval(updateLocation, 15000) // every 15s
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharing, bookingId])

  const { userRole } = getUserInfo()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: TRANSPORTER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TRANSPORTER.primary, fontWeight: 700, fontFamily: SHARED.font }}>
        Loading live tracking…
      </div>
    )
  }

  const vehicle = booking?.vehicle || booking?.buyerVehicle

  return (
    <div style={{ minHeight: '100vh', background: TRANSPORTER.bg, fontFamily: SHARED.font, color: TRANSPORTER.text }}>
      <nav style={{ ...navStyle(TRANSPORTER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/transporter/bookings" style={{ color: TRANSPORTER.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← Bookings</Link>
            <span style={{ color: TRANSPORTER.muted }}>›</span>
            <span style={{ fontWeight: 700, color: TRANSPORTER.text, fontSize: '0.95rem' }}>📍 Live Tracking</span>
          </div>
          <Link href="/transporter/dashboard" style={{ color: TRANSPORTER.primary, background: TRANSPORTER.primaryLight, border: `1px solid ${TRANSPORTER.border}`, padding: '6px 14px', borderRadius: 8, textDecoration: 'none', fontSize: '0.84rem', fontWeight: 700 }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px 60px' }}>
        <h1 style={{ color: TRANSPORTER.text, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 6px' }}>📍 Live Vehicle Tracking</h1>
        <p style={{ color: TRANSPORTER.muted, fontSize: '0.92rem', margin: '0 0 20px' }}>
          {booking ? (
            <>
              {booking.commodity || 'Goods'} · {(booking.totalQuantity || booking.quantity || 0).toLocaleString('en-IN')} kg ·{' '}
              <span style={{ color: booking.status === 'in-transit' ? TRANSPORTER.primary : TRANSPORTER.muted, fontWeight: 700 }}>
                {booking.status}
              </span>
            </>
          ) : 'Loading…'}
        </p>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: SHARED.error, fontSize: '0.86rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Sharing status banner */}
        <div style={{
          background: sharing ? '#dbeafe' : '#fef3c7',
          border: `1px solid ${sharing ? '#93c5fd' : '#fde68a'}`,
          borderRadius: 12, padding: '14px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '1.6rem' }}>{sharing ? '📡' : '⏸️'}</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ margin: 0, color: sharing ? '#1e40af' : '#92400e', fontWeight: 800, fontSize: '0.92rem' }}>
              {sharing ? 'Live location sharing is ON' : 'Location sharing is paused'}
            </p>
            <p style={{ margin: '2px 0 0', color: sharing ? '#1e40af' : '#92400e', fontSize: '0.78rem' }}>
              {sharing
                ? (lastShared ? `Last shared ${lastShared.toLocaleTimeString('en-IN')} · auto-refresh every 15s` : 'Sharing your position now…')
                : 'The farmer and buyer cannot see your location. Tap resume to start sharing.'}
            </p>
          </div>
          <button
            onClick={() => setSharing(!sharing)}
            style={{
              padding: '8px 18px', borderRadius: 10, border: 'none',
              background: sharing ? '#fef3c7' : TRANSPORTER.primary,
              color: sharing ? '#92400e' : '#fff',
              fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {sharing ? '⏸ Pause' : '▶ Resume'}
          </button>
        </div>

        {booking && (
          <>
            {/* Map */}
            <div ref={mapContainerRef} style={{ width: '100%', height: 420, borderRadius: 12, border: `1px solid ${TRANSPORTER.border}`, marginBottom: 16, zIndex: 0 }} />

            {/* Trip summary card */}
            <div style={{ ...cardStyle(TRANSPORTER), marginBottom: 14, boxShadow: SHARED.shadowMd }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 800, color: TRANSPORTER.text }}>📦 Trip summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
                <div>
                  <p style={{ margin: 0, color: TRANSPORTER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Pickup</p>
                  <p style={{ margin: '2px 0 0', color: TRANSPORTER.text, fontWeight: 600 }}>🌾 {booking.pickupLocation}</p>
                </div>
                <div>
                  <p style={{ margin: 0, color: TRANSPORTER.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Delivery</p>
                  <p style={{ margin: '2px 0 0', color: TRANSPORTER.text, fontWeight: 600 }}>🛒 {booking.deliveryLocation}</p>
                </div>
              </div>
              {booking.estimatedArrivalTime && (
                <p style={{ margin: '10px 0 0', color: TRANSPORTER.text, fontSize: '0.82rem', fontWeight: 600 }}>
                  📅 Pickup scheduled: {new Date(booking.estimatedArrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>

            {/* Party cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {/* Farmer (pickup) */}
              {booking.farmer && (
                <div style={{ background: TRANSPORTER.white, border: `1px solid ${TRANSPORTER.borderLight}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '1.4rem' }}>🌾</span>
                    <div>
                      <p style={{ color: TRANSPORTER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Farmer (Pickup)</p>
                      <p style={{ color: TRANSPORTER.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{booking.farmer.farmerName || 'Farmer'}</p>
                    </div>
                  </div>
                  <p style={{ color: TRANSPORTER.muted, fontSize: '0.76rem', margin: 0 }}>📞 {booking.farmer.phone || '—'}</p>
                  <p style={{ color: TRANSPORTER.muted, fontSize: '0.76rem', margin: '2px 0 0' }}>📍 {booking.pickupLocation}</p>
                </div>
              )}

              {/* Vehicle */}
              {vehicle && (
                <div style={{ background: TRANSPORTER.white, border: `1px solid ${TRANSPORTER.borderLight}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '1.4rem' }}>🚛</span>
                    <div>
                      <p style={{ color: TRANSPORTER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Your Vehicle</p>
                      <p style={{ color: TRANSPORTER.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{vehicle.vehicleType}</p>
                    </div>
                  </div>
                  <p style={{ color: TRANSPORTER.muted, fontSize: '0.76rem', margin: 0, fontFamily: 'monospace' }}>{vehicle.registrationNumber}</p>
                  <p style={{ color: TRANSPORTER.muted, fontSize: '0.76rem', margin: '2px 0 0' }}>👤 Driver: {vehicle.driverName || '—'} · 📞 {vehicle.driverPhone || '—'}</p>
                </div>
              )}

              {/* Buyer (delivery) */}
              {booking.buyer && (
                <div style={{ background: TRANSPORTER.white, border: `1px solid ${TRANSPORTER.borderLight}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '1.4rem' }}>🛒</span>
                    <div>
                      <p style={{ color: TRANSPORTER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Buyer (Delivery)</p>
                      <p style={{ color: TRANSPORTER.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{booking.buyer.firmName || 'Buyer'}</p>
                    </div>
                  </div>
                  <p style={{ color: TRANSPORTER.muted, fontSize: '0.76rem', margin: 0 }}>📞 {booking.buyer.phone || '—'}</p>
                  <p style={{ color: TRANSPORTER.muted, fontSize: '0.76rem', margin: '2px 0 0' }}>📍 {booking.deliveryLocation}</p>
                </div>
              )}
            </div>

            {/* Driver live location card */}
            {booking.driverLocation && (
              <div style={{ background: '#dbeafe', border: '1.5px solid #93c5fd', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: '1.4rem' }}>🚛</span>
                  <div>
                    <p style={{ margin: 0, color: '#1e40af', fontWeight: 800, fontSize: '0.92rem' }}>Your live position</p>
                    <p style={{ margin: '2px 0 0', color: '#1e40af', fontSize: '0.76rem' }}>
                      Last updated: {new Date(booking.driverLocation.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                <p style={{ margin: 0, color: '#1e40af', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                  📍 {booking.driverLocation.latitude.toFixed(5)}, {booking.driverLocation.longitude.toFixed(5)}
                </p>
              </div>
            )}

            {/* Tracking history (last few pings) */}
            {Array.isArray(booking.trackingUpdates) && booking.trackingUpdates.length > 0 && (
              <div style={{ ...cardStyle(TRANSPORTER), marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '0.92rem', fontWeight: 800, color: TRANSPORTER.text }}>📜 Tracking history ({booking.trackingUpdates.length})</h3>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {booking.trackingUpdates.slice().reverse().map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: i < booking.trackingUpdates!.length - 1 ? `1px solid ${TRANSPORTER.borderLight}` : 'none', fontSize: '0.78rem' }}>
                      <span style={{ color: TRANSPORTER.muted, fontFamily: 'monospace', flexShrink: 0 }}>
                        {new Date(t.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ color: TRANSPORTER.textSecondary, fontFamily: 'monospace' }}>
                        {t.location.latitude.toFixed(4)}, {t.location.longitude.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tip card */}
            <div style={{ background: TRANSPORTER.gradientSoft, border: `1px solid ${TRANSPORTER.border}`, borderRadius: 12, padding: 14, fontSize: '0.84rem', color: TRANSPORTER.text }}>
              <p style={{ margin: 0, fontWeight: 700, color: TRANSPORTER.text, marginBottom: 6 }}>💡 Tips for accurate tracking:</p>
              <ul style={{ margin: 0, paddingLeft: 18, color: TRANSPORTER.textSecondary }}>
                <li>Keep this page open while driving — your phone will share its GPS every 15 seconds.</li>
                <li>Allow location permission when your browser asks. If denied, the farmer won't see your position.</li>
                <li>Use a phone (not a desktop) for the most accurate GPS coordinates.</li>
                <li>The farmer sees your live position, your route to the delivery, and your last 20 location pings.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
