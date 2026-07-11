'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { BUYER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

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

const PRESET_COMMODITIES = [
  { name: 'Wheat', icon: '🌾' },
  { name: 'Rice', icon: '🍚' },
  { name: 'Maize', icon: '🌽' },
  { name: 'Barley', icon: '🌾' },
  { name: 'Paddy', icon: '🌱' },
  { name: 'Oilseeds', icon: '🌻' },
  { name: 'Cotton', icon: '☁️' },
  { name: 'Sugarcane', icon: '🎋' },
  { name: 'Soybean', icon: '🫘' },
  { name: 'Onion', icon: '🧅' },
  { name: 'Potato', icon: '🥔' },
  { name: 'Tomato', icon: '🍅' },
  { name: 'Mustard', icon: '🌼' },
  { name: 'Gram', icon: '🫘' },
  { name: 'Tur Dal', icon: '🫘' },
  { name: 'Vegetables', icon: '🥬' },
  { name: 'Fruits', icon: '🍎' },
  { name: 'Spices', icon: '🌶️' },
]

const UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'quintal', label: 'Quintal' },
  { value: 'ton', label: 'Ton' },
  { value: 'bags', label: 'Bags' },
]

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

// Helper — compress + upload image to Cloudinary via the signed-URL route.
async function uploadToCloudinary(file: File): Promise<string> {
  const img = new Image()
  const url = URL.createObjectURL(file)
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
  URL.revokeObjectURL(url)
  let w = img.width, h = img.height
  if (w > 1000) { h = Math.round(h * 1000 / w); w = 1000 }
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b || file), 'image/jpeg', 0.85) as unknown as void)
  const sigRes = await authFetch('/api/social/upload-signature')
  const sig = await sigRes.json()
  if (!sig.available) throw new Error('Cloudinary not configured')
  const fd = new FormData()
  fd.append('file', blob)
  fd.append('api_key', sig.apiKey)
  fd.append('timestamp', sig.timestamp.toString())
  fd.append('signature', sig.signature)
  fd.append('folder', sig.folder)
  const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd })
  const cld = await cldRes.json()
  if (!cldRes.ok || !cld.secure_url) throw new Error(cld?.error?.message || 'Upload failed')
  return cld.secure_url as string
}

// One row per selected commodity — buyer enters price + unit for each.
interface CommodityRow {
  name: string
  icon: string
  pricePerUnit: string
  unit: string
  isCustom: boolean
}

function findPresetIcon(name: string): string {
  const p = PRESET_COMMODITIES.find(c => c.name.toLowerCase() === name.toLowerCase())
  return p?.icon || '🌾'
}

export default function CreateListing() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [firmLocation, setFirmLocation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Commodities selected + their per-row price + unit
  const [rows, setRows] = useState<CommodityRow[]>([])

  // Custom-add input
  const [customInput, setCustomInput] = useState('')

  // Shared fields (applied to every commodity in this batch)
  const [priceDate, setPriceDate] = useState(new Date().toISOString().slice(0, 10))
  const [commodityPhoto, setCommodityPhoto] = useState('')
  const [uploading, setUploading] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [quality, setQuality] = useState('')
  const [paymentConditions, setPaymentConditions] = useState('')

  const presetSelectedNames = new Set(
    rows.filter(r => !r.isCustom).map(r => r.name.toLowerCase())
  )

  const addPreset = (name: string, icon: string) => {
    if (presetSelectedNames.has(name.toLowerCase())) {
      // Remove if already selected
      setRows(prev => prev.filter(r => r.name.toLowerCase() !== name.toLowerCase()))
    } else {
      setRows(prev => [...prev, { name, icon, pricePerUnit: '', unit: 'kg', isCustom: false }])
    }
  }

  const addCustom = () => {
    const v = customInput.trim()
    if (!v) return
    // Prevent duplicates (case-insensitive)
    if (rows.some(r => r.name.toLowerCase() === v.toLowerCase())) {
      setCustomInput('')
      return
    }
    setRows(prev => [...prev, { name: v, icon: '🌾', pricePerUnit: '', unit: 'kg', isCustom: true }])
    setCustomInput('')
  }

  const updateRow = (idx: number, patch: Partial<CommodityRow>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCommodityPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadToCloudinary(file)
      setCommodityPhoto(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async () => {
    setError('')
    if (rows.length === 0) {
      setError('Please select at least one commodity.')
      return
    }
    // Validate each row has a price
    const missingPrice = rows.find(r => !r.pricePerUnit || parseFloat(r.pricePerUnit) <= 0)
    if (missingPrice) {
      setError(`Please enter a price for ${missingPrice.name}.`)
      return
    }
    if (!firmLocation.trim()) {
      setError('Please enter your firm location.')
      return
    }

    setLoading(true)
    try {
      const res = await authFetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodities: rows.map(r => ({
            name: r.name,
            pricePerUnit: parseFloat(r.pricePerUnit),
            unit: r.unit,
          })),
          priceDate: priceDate ? new Date(priceDate).toISOString() : new Date().toISOString(),
          quantity: quantity ? parseFloat(quantity) : 0,
          quality: quality || '',
          paymentConditions: paymentConditions || '',
          location: firmLocation,
          commodityPhoto,
        }),
      })
      if (!res.ok) {
        let msg = 'Failed to create listing'
        try {
          const json = await res.json()
          const apiMsg = json?.error?.message || json?.error
          if (Array.isArray(json?.error?.details) && json.error.details.length > 0) {
            msg = json.error.details.map((d: any) => `${d.field}: ${d.message}`).join(' • ')
          } else if (typeof apiMsg === 'string') {
            msg = apiMsg
          }
        } catch { /* response not JSON */ }
        setError(msg)
        setLoading(false)
        return
      }
      // Success — bounce to dashboard
      router.push('/buyer/dashboard')
    } catch (err) {
      console.error('Error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const submitLabel = rows.length === 0
    ? '✅ Add Commodities'
    : rows.length === 1
      ? '✅ Add Commodity'
      : `✅ Add ${rows.length} Commodities`

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/buyer/dashboard" style={{ color: BUYER.primary, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: BUYER.muted }}>›</span>
            <span style={{ color: BUYER.text, fontWeight: 600, fontSize: '0.9rem' }}>Add Commodities</span>
          </div>
          <Link href="/buyer/dashboard" style={{ color: BUYER.primary, background: BUYER.primaryLight, border: `1px solid ${BUYER.border}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '820px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ ...cardStyle(BUYER), boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
          <h2 style={{ color: BUYER.textSecondary, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>🌾 Add Commodities</h2>
          <p style={{ color: BUYER.muted, marginBottom: '24px', fontSize: '0.9rem' }}>
            Pick one or more commodities you buy at your shop. <strong>Each commodity gets its own price</strong> — set today&apos;s rates, and you can update any of them any time.
          </p>

          {error && (
            <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{ background: SHARED.successLight, border: '1px solid #6ee7b7', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: SHARED.success, fontSize: '0.875rem', fontWeight: 600 }}>
              ✅ {success}
            </div>
          )}

          {/* Step 1: Pick commodities */}
          <div style={{ marginBottom: 22 }}>
            <label style={lbl}>Step 1 — Pick commodities</label>
            <p style={{ color: BUYER.muted, fontSize: '0.78rem', margin: '0 0 10px' }}>Tap to select. You can pick multiple — each will get its own price row below.</p>

            {/* Preset chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_COMMODITIES.map(c => {
                const isSelected = presetSelectedNames.has(c.name.toLowerCase())
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => addPreset(c.name, c.icon)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 100,
                      background: isSelected ? BUYER.primary : `${BUYER.primary}10`,
                      color: isSelected ? '#fff' : BUYER.text,
                      border: `1.5px solid ${isSelected ? BUYER.primary : `${BUYER.primary}30`}`,
                      fontSize: '0.84rem', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      fontFamily: SHARED.font,
                    }}
                  >
                    <span style={{ fontSize: '0.95rem' }}>{c.icon}</span>
                    {c.name}
                    {isSelected && <span style={{ marginLeft: 2 }}>✓</span>}
                  </button>
                )
              })}
            </div>

            {/* Custom add input */}
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustom()
                  }
                }}
                placeholder="Add a commodity not in the list…"
                style={{ ...inp, flex: 1 }}
              />
              <button
                type="button"
                onClick={addCustom}
                disabled={!customInput.trim()}
                style={{
                  padding: '0 18px', background: customInput.trim() ? BUYER.primary : BUYER.muted,
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontSize: '0.86rem', fontWeight: 700, cursor: customInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease', flexShrink: 0,
                }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Step 2: Per-commodity price rows */}
          {rows.length > 0 && (
            <div style={{ marginBottom: 22, padding: 16, background: BUYER.bgSub, borderRadius: 12, border: `1px solid ${BUYER.borderLight}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ ...lbl, margin: 0 }}>Step 2 — Set price for each commodity</label>
                {rows.length > 1 && (
                  <span style={{ background: BUYER.primary, color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
                    {rows.length} commodities
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map((r, idx) => (
                  <div key={`${r.name}-${idx}`} style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr 1fr 110px auto',
                    gap: 8,
                    alignItems: 'center',
                    padding: 10,
                    background: BUYER.white,
                    borderRadius: 10,
                    border: `1px solid ${BUYER.borderLight}`,
                  }}>
                    {/* Icon + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: '1.3rem' }}>{r.icon}</span>
                      <span style={{ color: BUYER.text, fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                      </span>
                    </div>
                    {/* Price input */}
                    <div>
                      <label style={{ ...lbl, fontSize: '0.65rem', marginBottom: 2 }}>Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={r.pricePerUnit}
                        onChange={e => updateRow(idx, { pricePerUnit: e.target.value })}
                        placeholder="e.g., 2200"
                        style={{ ...inp, padding: '8px 12px', fontSize: '0.85rem' }}
                      />
                    </div>
                    {/* Unit select */}
                    <div>
                      <label style={{ ...lbl, fontSize: '0.65rem', marginBottom: 2 }}>Unit</label>
                      <select
                        value={r.unit}
                        onChange={e => updateRow(idx, { unit: e.target.value })}
                        style={{ ...inp, padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </div>
                    {/* Computed preview */}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, color: BUYER.muted, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' }}>Rate</p>
                      <p style={{ margin: '2px 0 0', color: BUYER.primary, fontWeight: 800, fontSize: '0.9rem' }}>
                        {r.pricePerUnit ? `₹${r.pricePerUnit}/${r.unit}` : '—'}
                      </p>
                    </div>
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      aria-label={`Remove ${r.name}`}
                      style={{
                        background: SHARED.errorLight, color: SHARED.error,
                        border: `1px solid #fca5a5`, borderRadius: 8,
                        width: 32, height: 32, cursor: 'pointer', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Shared fields */}
          <div style={{ borderTop: `1px dashed ${BUYER.border}`, paddingTop: 18, marginTop: 4 }}>
            <p style={{ color: BUYER.muted, fontSize: '0.78rem', margin: '0 0 14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Step 3 — Shared details (apply to all commodities above)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Price Date</label>
                <input
                  type="date"
                  value={priceDate}
                  onChange={e => setPriceDate(e.target.value)}
                  style={inp}
                />
                <p style={{ color: BUYER.muted, fontSize: '0.76rem', margin: '4px 0 0' }}>
                  The date these prices apply to. You can update any commodity&apos;s price any day.
                </p>
              </div>

              {/* Commodity photo upload (optional) */}
              <div>
                <label style={lbl}>🌾 Commodity Photo (optional, shared)</label>
                <p style={{ color: BUYER.muted, fontSize: '0.78rem', margin: '0 0 10px' }}>Add a photo — e.g., a sample of the grade / quality you want. Applied to all commodities in this batch.</p>
                {commodityPhoto ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={commodityPhoto} alt="commodity" style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 10, border: `1.5px solid ${BUYER.border}` }} />
                    <button type="button" onClick={() => setCommodityPhoto('')} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 200, height: 150, border: `2px dashed ${BUYER.border}`, borderRadius: 10, cursor: 'pointer', gap: 6, background: BUYER.bg, transition: 'border-color 0.2s' }}>
                    <span style={{ fontSize: '1.8rem' }}>{uploading ? '⏳' : '📷'}</span>
                    <span style={{ color: BUYER.muted, fontSize: '0.78rem', fontWeight: 600 }}>{uploading ? 'Uploading…' : 'Upload photo'}</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCommodityPhotoUpload} disabled={uploading} />
                  </label>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={lbl}>Quantity Needed (optional)</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g., 5000 (applies to all)" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Quality Grade</label>
                  <input type="text" value={quality} onChange={e => setQuality(e.target.value)} placeholder="e.g., Grade-A" style={inp} />
                </div>
              </div>

              <div>
                <label style={lbl}>Payment Conditions</label>
                <textarea
                  value={paymentConditions}
                  onChange={e => setPaymentConditions(e.target.value)}
                  placeholder="e.g., 50% advance, balance on delivery"
                  rows={2}
                  style={{ ...inp, resize: 'vertical', fontFamily: SHARED.font }}
                />
              </div>

              <div>
                <label style={lbl}>
                  Firm Location / Address{' '}
                  <span style={{ color: BUYER.muted, fontWeight: 400 }}>(start typing — suggestions appear)</span>
                </label>
                <AddressAutocomplete value={firmLocation} onChange={setFirmLocation} placeholder="e.g., APMC Market, Pune, Maharashtra" />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || uploading || rows.length === 0}
            style={{
              marginTop: 22,
              width: '100%',
              padding: '13px',
              background: (loading || uploading || rows.length === 0) ? BUYER.muted : BUYER.primary,
              color: '#fff',
              border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
              cursor: (loading || uploading || rows.length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.25)', transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Publishing…' : submitLabel}
          </button>
        </div>
      </div>
      <style>{`input:focus, select:focus, textarea:focus { border-color: ${BUYER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}
