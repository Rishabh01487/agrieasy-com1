'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { BUYER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  unit?: string
  pricePerUnit: number
  quality?: string
  paymentConditions?: string
  firmLocation?: string
  createdAt: string
}

const commodities = ['Wheat', 'Rice', 'Maize', 'Barley', 'Paddy', 'Oilseeds', 'Cotton', 'Sugarcane', 'Soybean']

export default function EditListing() {
  const params = useParams()
  const router = useRouter()
  const listingId = params.id as string
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [commodity, setCommodity] = useState('')
  const [quantity, setQuantity] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [quality, setQuality] = useState('')
  const [paymentConditions, setPaymentConditions] = useState('')

  const inp = inputStyle(BUYER)
  const lbl = labelStyle(BUYER)

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await authFetch('/api/listings/' + listingId)
        if (!res.ok) {
          setError('Failed to load listing')
          return
        }
        const data = await res.json()
        const found = data.listing
        if (!found) { setError('Listing not found'); return }
        setListing(found)
        setCommodity(found.commodity)
        setQuantity(found.quantity.toString())
        setPricePerUnit(found.pricePerUnit.toString())
        setQuality(found.quality || '')
        setPaymentConditions(found.paymentConditions || '')
      } catch {
        setError('Failed to load listing')
      } finally {
        setLoading(false)
      }
    }
    if (listingId) void fetchListing()
  }, [listingId])

  const handleSave = async () => {
    if (!commodity || !quantity || !pricePerUnit) { setError('Commodity, quantity, and price are required'); return }
    setSaving(true); setError('')
    try {
      const res = await authFetch('/api/listings/' + listingId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commodity, quantity: parseFloat(quantity), pricePerUnit: parseFloat(pricePerUnit), quality, paymentConditions }),
      })
      if (!res.ok) {
        let msg = 'Failed to update listing'
        try {
          const json = await res.json()
          msg = json.error || msg
        } catch { /* response not JSON */ }
        setError(msg)
      } else {
        router.push('/buyer/dashboard')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BUYER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BUYER.primary, fontWeight: 700, fontFamily: SHARED.font }}>
        Loading listing…
      </div>
    )
  }

  if (error && !listing) {
    return (
      <div style={{ minHeight: '100vh', background: BUYER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: SHARED.font }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <p style={{ color: BUYER.muted }}>{error}</p>
        <Link href="/buyer/dashboard" style={{ color: BUYER.primary, fontWeight: 700, textDecoration: 'none' }}>← Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/buyer/dashboard" style={{ color: BUYER.primary, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: BUYER.muted }}>›</span>
            <span style={{ color: BUYER.text, fontWeight: 600, fontSize: '0.9rem' }}>Edit Listing</span>
          </div>
          <Link href="/buyer/dashboard" style={{ color: BUYER.primary, background: BUYER.primaryLight, border: `1px solid ${BUYER.border}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ ...cardStyle(BUYER), boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
          <h2 style={{ color: BUYER.textSecondary, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>✏️ Edit Listing</h2>
          <p style={{ color: BUYER.muted, marginBottom: '28px', fontSize: '0.9rem' }}>Update your commodity demand listing.</p>

          {error && (
            <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={lbl}>Commodity Type</label>
              <select value={commodity} onChange={e => setCommodity(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {commodities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div>
                <label style={lbl}>Quantity Needed</label>
                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Unit</label>
                <input type="text" value={listing?.unit || 'kg'} readOnly style={{ ...inp, background: BUYER.bg, color: BUYER.muted }} />
              </div>
            </div>

            <div>
              <label style={lbl}>Price Per Unit (₹)</label>
              <input type="number" step="0.01" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} style={inp} />
            </div>

            <div>
              <label style={lbl}>Quality Grade</label>
              <input type="text" value={quality} onChange={e => setQuality(e.target.value)} style={inp} />
            </div>

            <div>
              <label style={lbl}>Payment Conditions</label>
              <textarea value={paymentConditions} onChange={e => setPaymentConditions(e.target.value)} rows={3}
                style={{ ...inp, resize: 'vertical', fontFamily: SHARED.font }} />
            </div>

            <div style={{ background: BUYER.bg, borderRadius: '12px', padding: '14px 18px', border: `1px solid ${BUYER.border}` }}>
              <label style={{ color: BUYER.muted, fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Firm Location</label>
              <p style={{ color: BUYER.text, fontWeight: 600, margin: 0 }}>{listing?.firmLocation || '—'}</p>
            </div>

            <button onClick={handleSave} disabled={saving}
              style={{ padding: '13px', background: saving ? BUYER.muted : BUYER.primary, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 14px rgba(5,150,105,0.25)', transition: 'all 0.2s ease' }}>
              {saving ? 'Saving…' : '✅ Save Changes'}
            </button>
          </div>
        </div>
      </div>
      <style>{`input:focus, select:focus, textarea:focus { border-color: ${BUYER.primary} !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.1) !important; }`}</style>
    </div>
  )
}