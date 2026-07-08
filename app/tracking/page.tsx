'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

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
    location?: { latitude: number; longitude: number; updatedAt?: string }
}

interface BookingData {
    _id: string
    status: string
    commodity: string
    quantity: number
    pickupLocation: string
    deliveryLocation: string
    driverLocation: { latitude: number; longitude: number; updatedAt: string } | null
    farmer: Party
    buyer: Party
    transporter: Party
}

function TrackingInner() {
    const searchParams = useSearchParams()
    const bookingId = searchParams.get('bookingId')
    const [booking, setBooking] = useState<BookingData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [userRole, setUserRole] = useState('')
    const [map, setMap] = useState<any>(null)
    const [markers, setMarkers] = useState<any[]>([])
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const leafletRef = useRef<any>(null)

    useEffect(() => {
        const { userRole } = getUserInfo()
        setUserRole(userRole || 'farmer')

        // Load Leaflet dynamically
        loadLeafletCSS()
        import('leaflet').then((L) => {
            leafletRef.current = L.default || L
        })

        if (!bookingId) {
            setLoading(false)
            setError('No booking ID provided. Go to My Bookings and click "Track" on a booking.')
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

        // Initialize map if not done yet
        let m = map
        if (!m) {
            m = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 5) // India center
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 19,
            }).addTo(m)
            setMap(m)
        }

        // Clear existing markers
        markers.forEach(mk => m.removeLayer(mk))
        const newMarkers: any[] = []

        const makeIcon = (emoji: string, color: string) =>
            L.divIcon({
                html: `<div style="background:${color};color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>`,
                className: '',
                iconSize: [36, 36],
                iconAnchor: [18, 18],
            })

        // Farmer location (pickup)
        if (booking.farmer?.location?.latitude) {
            const mk = L.marker(
                [booking.farmer.location.latitude, booking.farmer.location.longitude],
                { icon: makeIcon('🌾', '#10b981') }
            ).addTo(m).bindPopup(`<b>Farmer (Pickup)</b><br/>${booking.farmer.farmerName || booking.farmer.firmName || 'Farmer'}<br/>${booking.pickupLocation}`)
            newMarkers.push(mk)
        }

        // Buyer location (delivery)
        if (booking.buyer?.location?.latitude) {
            const mk = L.marker(
                [booking.buyer.location.latitude, booking.buyer.location.longitude],
                { icon: makeIcon('🛒', '#f59e0b') }
            ).addTo(m).bindPopup(`<b>Buyer (Delivery)</b><br/>${booking.buyer.firmName || 'Buyer'}<br/>${booking.deliveryLocation}`)
            newMarkers.push(mk)
        }

        // Driver/transporter live location
        if (booking.driverLocation?.latitude) {
            const mk = L.marker(
                [booking.driverLocation.latitude, booking.driverLocation.longitude],
                { icon: makeIcon('🚛', '#2563eb') }
            ).addTo(m).bindPopup(`<b>Vehicle (Live)</b><br/>Updated: ${new Date(booking.driverLocation.updatedAt).toLocaleTimeString('en-IN')}`)
            newMarkers.push(mk)
        } else if (booking.transporter?.location?.latitude) {
            const mk = L.marker(
                [booking.transporter.location.latitude, booking.transporter.location.longitude],
                { icon: makeIcon('🚛', '#2563eb') }
            ).addTo(m).bindPopup(`<b>Vehicle</b><br/>${booking.transporter.transporterCompanyName || 'Transporter'}`)
            newMarkers.push(mk)
        }

        setMarkers(newMarkers)

        // Fit bounds to show all markers
        if (newMarkers.length > 0) {
            const group = L.featureGroup(newMarkers)
            m.fitBounds(group.getBounds(), { padding: [50, 50] })
        }
    }, [booking, map])

    // Transporter: update their location every 15s
    useEffect(() => {
        if (userRole !== 'transporter' && userRole !== 'driver') return
        if (!bookingId) return

        const updateLocation = async () => {
            if (!navigator.geolocation) return
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
                    } catch {}
                },
                (err) => console.warn('Geolocation error:', err.message),
                { enableHighAccuracy: true, timeout: 10000 }
            )
        }

        updateLocation() // immediate
        const interval = setInterval(updateLocation, 15000) // every 15s
        return () => clearInterval(interval)
    }, [userRole, bookingId])

    if (loading) return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.primary, fontWeight: 700, fontFamily: SHARED.font }}>
            Loading tracking…
        </div>
    )

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <nav style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <Link href={userRole === 'farmer' ? '/farmer/my-bookings' : userRole === 'buyer' ? '/buyer/dashboard' : '/transporter/dashboard'} style={{ color: SOCIAL.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← Back</Link>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ fontWeight: 700, color: SOCIAL.text }}>📍 Live Tracking</span>
            </nav>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px 60px' }}>
                <h1 style={{ color: SOCIAL.text, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>📍 Live Vehicle Tracking</h1>
                <p style={{ color: SOCIAL.muted, fontSize: '0.9rem', margin: '0 0 20px' }}>
                    {booking ? `${booking.commodity || 'Goods'} · ${booking.quantity} kg · ${booking.status}` : 'Loading…'}
                </p>

                {error && (
                    <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: SHARED.error, fontSize: '0.86rem' }}>{error}</div>
                )}

                {booking && (
                    <>
                        {/* Map */}
                        <div ref={mapContainerRef} style={{ width: '100%', height: 400, borderRadius: 12, border: `1px solid ${SOCIAL.border}`, marginBottom: 16, zIndex: 0 }} />

                        {/* Party cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                            {booking.farmer && (
                                <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.borderLight}`, borderRadius: 12, padding: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: '1.4rem' }}>🌾</span>
                                        <div>
                                            <p style={{ color: SOCIAL.muted, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Farmer (Pickup)</p>
                                            <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{booking.farmer.farmerName || 'Farmer'}</p>
                                        </div>
                                    </div>
                                    <p style={{ color: SOCIAL.muted, fontSize: '0.78rem', margin: 0 }}>📍 {booking.pickupLocation}</p>
                                </div>
                            )}
                            {booking.transporter && (
                                <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.borderLight}`, borderRadius: 12, padding: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: '1.4rem' }}>🚛</span>
                                        <div>
                                            <p style={{ color: SOCIAL.muted, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Vehicle (Live)</p>
                                            <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{booking.transporter.transporterCompanyName || booking.transporter.farmerName || 'Transporter'}</p>
                                        </div>
                                    </div>
                                    <p style={{ color: SOCIAL.muted, fontSize: '0.78rem', margin: 0 }}>
                                        {booking.driverLocation?.updatedAt ? `Last update: ${new Date(booking.driverLocation.updatedAt).toLocaleTimeString('en-IN')}` : 'No location yet'}
                                    </p>
                                </div>
                            )}
                            {booking.buyer && (
                                <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.borderLight}`, borderRadius: 12, padding: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: '1.4rem' }}>🛒</span>
                                        <div>
                                            <p style={{ color: SOCIAL.muted, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Buyer (Delivery)</p>
                                            <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{booking.buyer.firmName || 'Buyer'}</p>
                                        </div>
                                    </div>
                                    <p style={{ color: SOCIAL.muted, fontSize: '0.78rem', margin: 0 }}>📍 {booking.deliveryLocation}</p>
                                </div>
                            )}
                        </div>

                        {(userRole === 'transporter' || userRole === 'driver') && (
                            <div style={{ background: SOCIAL.primaryLight, border: `1px solid ${SOCIAL.border}`, borderRadius: 10, padding: '12px 14px', fontSize: '0.84rem', color: SOCIAL.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1.2rem' }}>📡</span>
                                <span>Sharing your live location every 15 seconds so the farmer and buyer can track your vehicle. Keep this page open while driving.</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default function TrackingPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fafbfc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>Loading…</div>}>
            <TrackingInner />
        </Suspense>
    )
}
