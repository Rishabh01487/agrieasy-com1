'use client'

import { useEffect, useState } from 'react'
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
    driverLicense: string
}

const typeLabel: Record<string, string> = {
    'mini-truck': '🚛 Mini Truck',
    'pickup-van': '🛻 Pickup Van',
    truck: '🚚 Truck',
    'tractor-trolley': '🚜 Tractor Trolley',
    tempo: '🚐 Tempo',
}

export default function ManageVehicles() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [toggling, setToggling] = useState<string | null>(null)

    const fetchVehicles = async () => {
        setLoading(true)
        setError('')
        const { userId } = getUserInfo()
        if (!userId) { setError('Not logged in'); setLoading(false); return }
        try {
            const res = await authFetch(`/api/vehicles?transporterId=${userId}`)
            if (!res.ok) {
                const json = await res.json().catch(() => null)
                setError(json?.error || 'Failed to load vehicles.')
                return
            }
            const json = await res.json()
            setVehicles(json?.data?.vehicles || json?.vehicles || [])
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    useEffect(() => { fetchVehicles() }, [])

    const toggleAvailability = async (vehicleId: string, current: boolean) => {
        setToggling(vehicleId)
        setError('')
        try {
            const res = await authFetch('/api/vehicles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleId, availability: !current }),
            })
            if (!res.ok) {
                const json = await res.json().catch(() => null)
                setError(json?.error || 'Failed to update availability.')
                return
            }
            setVehicles(prev => prev.map(v => v._id === vehicleId ? { ...v, availability: !current } : v))
        } catch { setError('Network error. Please try again.') } finally { setToggling(null) }
    }

    const availStyle = getStatusStyle('available')
    const unavailStyle = getStatusStyle('unavailable')

    return (
        <div style={{ minHeight: '100vh', background: TRANSPORTER.bg, fontFamily: SHARED.font }}>
            <nav style={{ ...navStyle(TRANSPORTER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                        <Link href="/transporter/dashboard" style={{ color: TRANSPORTER.primary, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
                        <span style={{ color: TRANSPORTER.muted }}>›</span>
                        <span style={{ color: TRANSPORTER.text, fontWeight: 600, fontSize: '0.9rem' }}>My Fleet</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Link href="/transporter/add-vehicle" style={{ background: TRANSPORTER.primary, color: '#fff', padding: '8px 18px', borderRadius: '10px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(37,99,235,0.25)', transition: 'all 0.2s ease' }}>+ Add Vehicle</Link>
                        <Link href="/transporter/dashboard" style={{ color: TRANSPORTER.primary, background: TRANSPORTER.primaryLight, border: `1px solid ${TRANSPORTER.border}`, padding: '8px 16px', borderRadius: '10px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease' }}>← Dashboard</Link>
                    </div>
                </div>
            </nav>

            <div style={{ maxWidth: '900px', margin: '36px auto', padding: '0 24px' }}>
                <h2 style={{ color: TRANSPORTER.textSecondary, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>🚛 My Fleet</h2>
                <p style={{ color: TRANSPORTER.muted, marginBottom: '28px', fontSize: '0.9rem' }}>Manage all your registered vehicles and drivers.</p>

                {error && <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: SHARED.error, fontWeight: 600 }}>⚠️ {error}</div>}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: TRANSPORTER.muted }}>Loading vehicles…</div>
                ) : vehicles.length === 0 ? (
                    <div style={{ ...cardStyle(TRANSPORTER), boxShadow: SHARED.shadowMd, padding: '48px', textAlign: 'center', transition: 'all 0.2s ease' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚛</div>
                        <h3 style={{ color: TRANSPORTER.textSecondary, fontWeight: 700, marginBottom: '8px' }}>No vehicles registered yet</h3>
                        <p style={{ color: TRANSPORTER.muted, marginBottom: '20px' }}>Add your first vehicle to start getting bookings from farmers.</p>
                        <Link href="/transporter/add-vehicle" style={{ background: TRANSPORTER.primary, color: '#fff', padding: '12px 28px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, boxShadow: '0 4px 14px rgba(37,99,235,0.25)', transition: 'all 0.2s ease' }}>+ Register First Vehicle</Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {vehicles.map(v => (
                            <div key={v._id} style={{ ...cardStyle(TRANSPORTER), boxShadow: SHARED.shadowMd, display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap', transition: 'all 0.2s ease' }}>
                                {/* Vehicle info */}
                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 800, color: TRANSPORTER.textSecondary, fontSize: '1rem' }}>{typeLabel[v.vehicleType] || v.vehicleType}</span>
                                        <span style={{ background: v.availability ? availStyle.bg : unavailStyle.bg, color: v.availability ? availStyle.color : unavailStyle.color, padding: '2px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {v.availability ? '✅ Available' : '❌ Unavailable'}
                                        </span>
                                    </div>
                                    <p style={{ color: TRANSPORTER.muted, fontSize: '0.875rem', margin: '0 0 4px' }}>🔢 Reg: <strong style={{ color: TRANSPORTER.text }}>{v.registrationNumber}</strong></p>
                                    <p style={{ color: TRANSPORTER.muted, fontSize: '0.875rem', margin: '0 0 4px' }}>📦 Capacity: <strong style={{ color: TRANSPORTER.text }}>{v.capacity} kg</strong></p>
                                    <p style={{ color: TRANSPORTER.muted, fontSize: '0.875rem', margin: 0 }}>💰 ₹{v.pricePerKm}/km</p>
                                </div>

                                {/* Driver info */}
                                <div style={{ flex: '1', minWidth: '200px', background: TRANSPORTER.primaryLight, borderRadius: '12px', padding: '12px 16px', border: `1px solid ${TRANSPORTER.border}` }}>
                                    <p style={{ color: TRANSPORTER.textSecondary, fontWeight: 700, fontSize: '0.85rem', margin: '0 0 6px' }}>👤 Driver</p>
                                    <p style={{ color: TRANSPORTER.text, fontSize: '0.875rem', margin: '0 0 3px', fontWeight: 600 }}>{v.driverName}</p>
                                    <p style={{ color: TRANSPORTER.muted, fontSize: '0.8rem', margin: '0 0 3px' }}>📞 {v.driverPhone}</p>
                                    <p style={{ color: TRANSPORTER.muted, fontSize: '0.8rem', margin: 0 }}>🪪 License: {v.driverLicense}</p>
                                </div>

                                {/* Toggle button */}
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <button onClick={() => toggleAvailability(v._id, v.availability)} disabled={toggling === v._id}
                                        style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: v.availability ? SHARED.errorLight : SHARED.successLight, color: v.availability ? SHARED.error : SHARED.success, opacity: toggling === v._id ? 0.6 : 1, transition: 'all 0.2s ease' }}>
                                        {toggling === v._id ? '…' : v.availability ? 'Mark Unavailable' : 'Mark Available'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}