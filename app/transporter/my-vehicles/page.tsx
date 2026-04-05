'use client'

import { useEffect, useState } from 'react'
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
    driverLicense: string
}

const C = {
    bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
    brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280', border: '#ddd6fe',
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
        const transporterId = localStorage.getItem('userId')
        if (!transporterId) { setError('Not logged in'); setLoading(false); return }
        try {
            const res = await fetch(`/api/vehicles?transporterId=${transporterId}`)
            const json = await res.json()
            if (!res.ok) { setError(json.error || 'Failed to load'); return }
            setVehicles(json.vehicles || [])
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    useEffect(() => { fetchVehicles() }, [])

    const toggleAvailability = async (vehicleId: string, current: boolean) => {
        setToggling(vehicleId)
        try {
            await fetch('/api/vehicles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleId, availability: !current }),
            })
            setVehicles(prev => prev.map(v => v._id === vehicleId ? { ...v, availability: !current } : v))
        } catch { setError('Failed to update') } finally { setToggling(null) }
    }

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                        <Link href="/transporter/dashboard" style={{ color: C.brinjal, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
                        <span style={{ color: C.muted }}>›</span>
                        <span style={{ color: C.text, fontWeight: 600, fontSize: '0.9rem' }}>My Fleet</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Link href="/transporter/add-vehicle" style={{ background: C.brinjal, color: '#fff', padding: '8px 18px', borderRadius: '10px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 700 }}>+ Add Vehicle</Link>
                        <Link href="/transporter/dashboard" style={{ color: C.brinjal, background: C.brLight, border: `1px solid ${C.brMid}`, padding: '8px 16px', borderRadius: '10px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>← Dashboard</Link>
                    </div>
                </div>
            </nav>

            <div style={{ maxWidth: '900px', margin: '36px auto', padding: '0 24px' }}>
                <h2 style={{ color: C.brDark, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>🚛 My Fleet</h2>
                <p style={{ color: C.muted, marginBottom: '28px', fontSize: '0.9rem' }}>Manage all your registered vehicles and drivers.</p>

                {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#dc2626', fontWeight: 600 }}>⚠️ {error}</div>}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: C.muted }}>Loading vehicles…</div>
                ) : vehicles.length === 0 ? (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚛</div>
                        <h3 style={{ color: C.brDark, fontWeight: 700, marginBottom: '8px' }}>No vehicles registered yet</h3>
                        <p style={{ color: C.muted, marginBottom: '20px' }}>Add your first vehicle to start getting bookings from farmers.</p>
                        <Link href="/transporter/add-vehicle" style={{ background: C.brinjal, color: '#fff', padding: '12px 28px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700 }}>+ Register First Vehicle</Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {vehicles.map(v => (
                            <div key={v._id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)', display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                {/* Vehicle info */}
                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 800, color: C.brDark, fontSize: '1rem' }}>{typeLabel[v.vehicleType] || v.vehicleType}</span>
                                        <span style={{ background: v.availability ? '#dcfce7' : '#fee2e2', color: v.availability ? '#16a34a' : '#dc2626', padding: '2px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700 }}>
                                            {v.availability ? '✅ Available' : '❌ Unavailable'}
                                        </span>
                                    </div>
                                    <p style={{ color: C.muted, fontSize: '0.875rem', margin: '0 0 4px' }}>🔢 Reg: <strong style={{ color: C.text }}>{v.registrationNumber}</strong></p>
                                    <p style={{ color: C.muted, fontSize: '0.875rem', margin: '0 0 4px' }}>📦 Capacity: <strong style={{ color: C.text }}>{v.capacity} kg</strong></p>
                                    <p style={{ color: C.muted, fontSize: '0.875rem', margin: 0 }}>💰 ₹{v.pricePerKm}/km</p>
                                </div>

                                {/* Driver info */}
                                <div style={{ flex: '1', minWidth: '200px', background: C.brLight, borderRadius: '12px', padding: '12px 16px', border: `1px solid ${C.brMid}` }}>
                                    <p style={{ color: C.brDark, fontWeight: 700, fontSize: '0.85rem', margin: '0 0 6px' }}>👤 Driver</p>
                                    <p style={{ color: C.text, fontSize: '0.875rem', margin: '0 0 3px', fontWeight: 600 }}>{v.driverName}</p>
                                    <p style={{ color: C.muted, fontSize: '0.8rem', margin: '0 0 3px' }}>📞 {v.driverPhone}</p>
                                    <p style={{ color: C.muted, fontSize: '0.8rem', margin: 0 }}>🪪 License: {v.driverLicense}</p>
                                </div>

                                {/* Toggle button */}
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <button onClick={() => toggleAvailability(v._id, v.availability)} disabled={toggling === v._id}
                                        style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: v.availability ? '#fee2e2' : '#dcfce7', color: v.availability ? '#dc2626' : '#16a34a', opacity: toggling === v._id ? 0.6 : 1 }}>
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
