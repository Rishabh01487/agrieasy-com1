'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { BUYER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

interface BuyerVehicle {
  _id: string
  vehicleType: string
  vehicleDisplayName?: string
  registrationNumber: string
  capacityKg: number
  driverName?: string
  driverPhone?: string
  freightType: 'free' | 'flat' | 'per_km'
  freightAmount: number
  availability: string
  notes?: string
  baseLocation?: string
}

const VEHICLE_TYPES = [
  { value: 'mini-truck', label: '🛺 Mini Truck' },
  { value: 'pickup-van', label: '🚙 Pickup Van' },
  { value: 'truck', label: '🚚 Truck' },
  { value: 'tractor-trolley', label: '🚜 Tractor Trolley' },
  { value: 'tempo', label: '🚐 Tempo' },
  { value: 'tractor', label: '🚜 Tractor' },
  { value: 'other', label: '🚗 Other' },
]

const FREIGHT_TYPES = [
  { value: 'free', label: '🆓 Free (I absorb the freight)' },
  { value: 'flat', label: '💵 Flat fee per trip' },
  { value: 'per_km', label: '📏 Per km rate' },
]

const inp = inputStyle(BUYER)
const lbl = labelStyle(BUYER)

interface VehicleForm {
  vehicleType: string
  vehicleDisplayName: string
  registrationNumber: string
  capacityKg: string
  driverName: string
  driverPhone: string
  freightType: string
  freightAmount: string
  availability: string
  notes: string
  baseLocation: string
}

const emptyForm: VehicleForm = {
  vehicleType: 'mini-truck',
  vehicleDisplayName: '',
  registrationNumber: '',
  capacityKg: '',
  driverName: '',
  driverPhone: '',
  freightType: 'free',
  freightAmount: '0',
  availability: 'available',
  notes: '',
  baseLocation: '',
}

function freightLabel(v: BuyerVehicle): string {
  if (v.freightType === 'free') return 'FREE'
  if (v.freightType === 'flat') return `₹${v.freightAmount} flat`
  return `₹${v.freightAmount}/km`
}

export default function BuyerMyVehicles() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<BuyerVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add/edit form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<VehicleForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchVehicles = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/buyer-vehicles')
      if (!res.ok) {
        setError('Failed to load vehicles')
        return
      }
      const data = await res.json()
      setVehicles(data?.data?.vehicles || data?.vehicles || [])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const { userId } = getUserInfo()
    if (!userId) {
      router.replace('/auth/login')
      return
    }
    void fetchVehicles()
  }, [router])

  const openAddForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  const openEditForm = (v: BuyerVehicle) => {
    setForm({
      vehicleType: v.vehicleType,
      vehicleDisplayName: v.vehicleDisplayName || '',
      registrationNumber: v.registrationNumber,
      capacityKg: String(v.capacityKg),
      driverName: v.driverName || '',
      driverPhone: v.driverPhone || '',
      freightType: v.freightType,
      freightAmount: String(v.freightAmount),
      availability: v.availability,
      notes: v.notes || '',
      baseLocation: v.baseLocation || '',
    })
    setEditingId(v._id)
    setShowForm(true)
  }

  const handleSave = async () => {
    setError(''); setSuccess('')
    if (!form.registrationNumber.trim()) { setError('Registration number is required'); return }
    if (!form.capacityKg || parseFloat(form.capacityKg) <= 0) { setError('Capacity must be a positive number'); return }

    setSaving(true)
    try {
      const body = {
        vehicleType: form.vehicleType,
        vehicleDisplayName: form.vehicleDisplayName,
        registrationNumber: form.registrationNumber.toUpperCase(),
        capacityKg: parseFloat(form.capacityKg),
        driverName: form.driverName,
        driverPhone: form.driverPhone,
        freightType: form.freightType,
        freightAmount: form.freightType === 'free' ? 0 : parseFloat(form.freightAmount) || 0,
        availability: form.availability,
        notes: form.notes,
        baseLocation: form.baseLocation,
      }
      const url = editingId ? `/api/buyer-vehicles/${editingId}` : '/api/buyer-vehicles'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Failed to save vehicle')
        setSaving(false)
        return
      }
      setSuccess(editingId ? 'Vehicle updated' : 'Vehicle added')
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      setTimeout(() => setSuccess(''), 2500)
      void fetchVehicles()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle? Farmers will no longer see it.')) return
    try {
      const res = await authFetch(`/api/buyer-vehicles/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Failed to delete')
        return
      }
      void fetchVehicles()
    } catch {
      setError('Network error')
    }
  }

  const toggleAvailability = async (v: BuyerVehicle) => {
    const newStatus = v.availability === 'available' ? 'unavailable' : 'available'
    try {
      const res = await authFetch(`/api/buyer-vehicles/${v._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: newStatus }),
      })
      if (!res.ok) {
        setError('Failed to toggle availability')
        return
      }
      void fetchVehicles()
    } catch {
      setError('Network error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font, color: BUYER.text }}>
      {/* Nav */}
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: BUYER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>🛒</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: BUYER.text, lineHeight: 1 }}>AgriEasy</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: BUYER.muted }}>My Vehicles</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/buyer/dashboard" style={{ color: BUYER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: BUYER.primaryLight }}>← Dashboard</Link>
            <Link href="/buyer/profile" style={{ color: BUYER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: BUYER.primaryLight }}>👤 Profile</Link>
            <button onClick={logout} style={{ color: BUYER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 24px 60px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800, color: BUYER.text, letterSpacing: '-0.02em' }}>🚚 My Vehicles</h1>
            <p style={{ margin: '6px 0 0', color: BUYER.muted, fontSize: '0.92rem' }}>
              Add your own vehicles so farmers can use them to deliver produce to your shop. You can offer them for free, a flat fee, or per-km.
            </p>
          </div>
          <button
            onClick={openAddForm}
            style={{
              background: BUYER.primary, color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 18px', fontSize: '0.86rem', fontWeight: 700,
              cursor: 'pointer', boxShadow: `0 4px 14px ${BUYER.primary}40`,
              transition: 'all 0.2s ease',
            }}
          >
            + Add Vehicle
          </button>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: SHARED.error, fontSize: '0.88rem', fontWeight: 600 }}>⚠️ {error}</div>
        )}
        {success && (
          <div style={{ background: SHARED.successLight, border: '1px solid #6ee7b7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: SHARED.success, fontSize: '0.88rem', fontWeight: 600 }}>✅ {success}</div>
        )}

        {/* Add/Edit form */}
        {showForm && (
          <div style={{ ...cardStyle(BUYER), marginBottom: 20, boxShadow: SHARED.shadowMd, border: `1.5px solid ${BUYER.primary}40` }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: BUYER.text }}>
              {editingId ? '✏️ Edit vehicle' : '➕ Add a vehicle'}
            </h2>
            <p style={{ margin: '0 0 18px', color: BUYER.muted, fontSize: '0.82rem' }}>
              Farmers selecting your shop will see this vehicle and its freight cost.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Vehicle Type</label>
                <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                  {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Display Name (optional)</label>
                <input type="text" value={form.vehicleDisplayName} onChange={e => setForm({ ...form, vehicleDisplayName: e.target.value })} placeholder="e.g., Tata Ace" style={inp} />
              </div>
              <div>
                <label style={lbl}>Registration Number</label>
                <input type="text" value={form.registrationNumber} onChange={e => setForm({ ...form, registrationNumber: e.target.value.toUpperCase() })} placeholder="e.g., MH12AB1234" style={inp} />
              </div>
              <div>
                <label style={lbl}>Capacity (kg)</label>
                <input type="number" value={form.capacityKg} onChange={e => setForm({ ...form, capacityKg: e.target.value })} placeholder="e.g., 1500" style={inp} />
              </div>
              <div>
                <label style={lbl}>Driver Name</label>
                <input type="text" value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} placeholder="Driver's name" style={inp} />
              </div>
              <div>
                <label style={lbl}>Driver Phone</label>
                <input type="text" value={form.driverPhone} onChange={e => setForm({ ...form, driverPhone: e.target.value })} placeholder="+91 XXXXX XXXXX" style={inp} />
              </div>
              <div>
                <label style={lbl}>Freight Type</label>
                <select value={form.freightType} onChange={e => setForm({ ...form, freightType: e.target.value, freightAmount: e.target.value === 'free' ? '0' : form.freightAmount })} style={{ ...inp, cursor: 'pointer' }}>
                  {FREIGHT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{form.freightType === 'flat' ? 'Flat Amount (₹)' : form.freightType === 'per_km' ? 'Rate per km (₹)' : 'Amount (n/a for free)'}</label>
                <input
                  type="number"
                  value={form.freightAmount}
                  onChange={e => setForm({ ...form, freightAmount: e.target.value })}
                  placeholder="0"
                  disabled={form.freightType === 'free'}
                  style={{ ...inp, background: form.freightType === 'free' ? BUYER.bgSub : BUYER.white, cursor: form.freightType === 'free' ? 'not-allowed' : 'text' }}
                />
              </div>
              <div>
                <label style={lbl}>Availability</label>
                <select value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="available">✅ Available</option>
                  <option value="unavailable">⛔ Unavailable</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Base Location (optional)</label>
                <input type="text" value={form.baseLocation} onChange={e => setForm({ ...form, baseLocation: e.target.value })} placeholder="e.g., APMC Market, Pune" style={inp} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="e.g., Available Mon-Sat, 8am-6pm" style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '12px 22px',
                  background: saving ? BUYER.muted : BUYER.primary,
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: '0.92rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
                }}
              >
                {saving ? 'Saving…' : (editingId ? '✅ Update Vehicle' : '✅ Add Vehicle')}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
                style={{
                  padding: '12px 22px', background: BUYER.white, color: BUYER.textSecondary,
                  border: `1.5px solid ${BUYER.border}`, borderRadius: 10,
                  fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Vehicles list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: BUYER.muted }}>Loading vehicles…</div>
        ) : vehicles.length === 0 ? (
          <div style={{ ...cardStyle(BUYER), textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚚</div>
            <h3 style={{ color: BUYER.text, margin: '0 0 6px', fontSize: '1.05rem' }}>No vehicles added yet</h3>
            <p style={{ color: BUYER.muted, fontSize: '0.86rem', margin: '0 0 16px' }}>
              Add your own vehicle so farmers can use it for free or at a freight you set.
            </p>
            <button onClick={openAddForm} style={{ background: BUYER.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer' }}>
              + Add your first vehicle
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {vehicles.map(v => (
              <div key={v._id} style={{ ...cardStyle(BUYER), boxShadow: SHARED.shadowMd, border: `1px solid ${BUYER.borderLight}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, color: BUYER.text, fontWeight: 800, fontSize: '0.95rem' }}>
                      {VEHICLE_TYPES.find(t => t.value === v.vehicleType)?.label || v.vehicleType}
                    </p>
                    {v.vehicleDisplayName && <p style={{ margin: '2px 0 0', color: BUYER.muted, fontSize: '0.78rem' }}>{v.vehicleDisplayName}</p>}
                  </div>
                  <span style={{
                    background: v.availability === 'available' ? '#dcfce7' : '#fee2e2',
                    color: v.availability === 'available' ? '#065f46' : '#991b1b',
                    fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 100,
                  }}>
                    {v.availability === 'available' ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 0', borderTop: `1px solid ${BUYER.borderLight}`, borderBottom: `1px solid ${BUYER.borderLight}`, marginBottom: 10 }}>
                  <div>
                    <p style={{ color: BUYER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Reg. No.</p>
                    <p style={{ color: BUYER.text, fontWeight: 700, fontSize: '0.82rem', margin: 0, fontFamily: 'monospace' }}>{v.registrationNumber}</p>
                  </div>
                  <div>
                    <p style={{ color: BUYER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Capacity</p>
                    <p style={{ color: BUYER.text, fontWeight: 700, fontSize: '0.82rem', margin: 0 }}>{v.capacityKg.toLocaleString('en-IN')} kg</p>
                  </div>
                  <div>
                    <p style={{ color: BUYER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Driver</p>
                    <p style={{ color: BUYER.text, fontWeight: 600, fontSize: '0.82rem', margin: 0 }}>{v.driverName || '—'}</p>
                  </div>
                  <div>
                    <p style={{ color: BUYER.muted, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Freight</p>
                    <p style={{ color: v.freightType === 'free' ? '#065f46' : BUYER.primary, fontWeight: 800, fontSize: '0.86rem', margin: 0 }}>{freightLabel(v)}</p>
                  </div>
                </div>
                {v.notes && <p style={{ color: BUYER.muted, fontSize: '0.76rem', margin: '0 0 10px' }}>📝 {v.notes}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEditForm(v)} style={{ flex: 1, padding: '8px 12px', background: BUYER.primaryLight, color: BUYER.primary, border: `1px solid ${BUYER.border}`, borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => toggleAvailability(v)} style={{ flex: 1, padding: '8px 12px', background: BUYER.white, color: BUYER.textSecondary, border: `1px solid ${BUYER.border}`, borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                    {v.availability === 'available' ? '⛔ Mark unavailable' : '✅ Mark available'}
                  </button>
                  <button onClick={() => handleDelete(v._id)} style={{ padding: '8px 12px', background: SHARED.errorLight, color: SHARED.error, border: '1px solid #fca5a5', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`input:focus, select:focus, textarea:focus { border-color: ${BUYER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}
