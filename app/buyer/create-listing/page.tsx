'use client'

import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { BUYER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

type FormData = {
  commodity: string
  quantity: number
  unit: string
  pricePerUnit: number
  quality: string
  paymentConditions: string
  firmLocation: string
}

interface NominatimAddress {
  city?: string; town?: string; village?: string
  county?: string; state_district?: string; state?: string
}
interface NominatimResult {
  place_id: number
  display_name: string
  address?: NominatimAddress
  shortLabel?: string
}

const commodities = ['Wheat', 'Rice', 'Maize', 'Barley', 'Paddy', 'Oilseeds', 'Cotton', 'Sugarcane', 'Soybean']

const inp = inputStyle(BUYER)
const lbl = labelStyle(BUYER)

function AddressAutocomplete({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) { setSuggestions([]); return }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data: NominatimResult[] = await res.json()
      const enriched = data.map(item => {
        const a = item.address || {}
        const parts = [a.city || a.town || a.village, a.state_district || a.county, a.state, 'India'].filter(Boolean)
        return { ...item, shortLabel: parts.join(', ') || item.display_name }
      })
      setSuggestions(enriched)
      setShowDropdown(true)
    } catch { setSuggestions([]) }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onChange(v)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => searchAddress(v), 400)
  }

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text" value={value} onChange={handleChange}
        placeholder={placeholder || 'Type address…'}
        style={inp}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
      />
      {showDropdown && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: BUYER.white, border: `1.5px solid ${BUYER.border}`, borderRadius: '10px', zIndex: 100, boxShadow: SHARED.shadowLg, overflow: 'hidden', marginTop: '4px' }}>
          {suggestions.map(s => (
            <button key={s.place_id} type="button" onMouseDown={() => { onChange(s.shortLabel || s.display_name); setSuggestions([]); setShowDropdown(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: BUYER.text, fontSize: '0.85rem', borderBottom: `1px solid ${BUYER.bg}` }}>
              📍 {s.shortLabel || s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CreateListing() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()
  const [loading, setLoading] = useState(false)
  const [firmLocation, setFirmLocation] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    if (!firmLocation.trim()) { setError('Please enter your firm location.'); setLoading(false); return }
    try {
      const res = await authFetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          firmLocation,
          quantity: parseFloat(data.quantity.toString()),
          pricePerUnit: parseFloat(data.pricePerUnit.toString()),
        }),
      })
      if (!res.ok) {
        let msg = 'Failed to create listing'
        try {
          const json = await res.json()
          msg = json.error || msg
        } catch { /* response not JSON */ }
        setError(msg)
        setLoading(false)
        return
      }
      router.push('/buyer/dashboard')
    } catch (err) {
      console.error('Error:', err)
      setError('Network error. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/buyer/dashboard" style={{ color: BUYER.primary, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: BUYER.muted }}>›</span>
            <span style={{ color: BUYER.text, fontWeight: 600, fontSize: '0.9rem' }}>Create Listing</span>
          </div>
          <Link href="/buyer/dashboard" style={{ color: BUYER.primary, background: BUYER.primaryLight, border: `1px solid ${BUYER.border}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ ...cardStyle(BUYER), boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
          <h2 style={{ color: BUYER.textSecondary, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>📋 Create Commodity Listing</h2>
          <p style={{ color: BUYER.muted, marginBottom: '28px', fontSize: '0.9rem' }}>Post your demand so farmers can find and connect with you.</p>

          {error && (
            <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={lbl}>Commodity Type</label>
              <select {...register('commodity', { required: 'Please select a commodity' })} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">Select a commodity…</option>
                {commodities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.commodity && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.commodity.message}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div>
                <label style={lbl}>Quantity Needed</label>
                <input type="number" {...register('quantity', { required: 'Quantity is required' })} placeholder="e.g., 5000" style={inp} />
                {errors.quantity && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.quantity.message}</p>}
              </div>
              <div>
                <label style={lbl}>Unit</label>
                <select {...register('unit')} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="kg">kg</option>
                  <option value="quintal">Quintal</option>
                  <option value="ton">Ton</option>
                </select>
              </div>
            </div>

            <div>
              <label style={lbl}>Price Per Unit (₹)</label>
              <input type="number" step="0.01" {...register('pricePerUnit', { required: 'Price is required' })} placeholder="e.g., 2200" style={inp} />
              {errors.pricePerUnit && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.pricePerUnit.message}</p>}
            </div>

            <div>
              <label style={lbl}>Quality Grade</label>
              <input type="text" {...register('quality')} placeholder="e.g., Premium, Standard, Grade-A" style={inp} />
            </div>

            <div>
              <label style={lbl}>Payment Conditions</label>
              <textarea {...register('paymentConditions')} placeholder="e.g., 50% advance, balance on delivery" rows={3}
                style={{ ...inp, resize: 'vertical', fontFamily: SHARED.font }} />
            </div>

            <div>
              <label style={lbl}>
                Firm Location / Address{' '}
                <span style={{ color: BUYER.muted, fontWeight: 400 }}>(start typing — suggestions appear)</span>
              </label>
              <AddressAutocomplete value={firmLocation} onChange={setFirmLocation} placeholder="e.g., APMC Market, Pune, Maharashtra" />
            </div>

            <button type="submit" disabled={loading} style={{
              padding: '13px', background: loading ? BUYER.muted : BUYER.primary, color: '#fff',
              border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(5,150,105,0.25)', transition: 'all 0.2s ease',
            }}>
              {loading ? 'Publishing…' : '✅ Publish Listing'}
            </button>
          </form>
        </div>
      </div>
      <style>{`input:focus, select:focus, textarea:focus { border-color: ${BUYER.primary} !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.1) !important; }`}</style>
    </div>
  )
}