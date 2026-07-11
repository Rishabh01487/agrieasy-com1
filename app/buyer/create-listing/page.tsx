'use client'

import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { BUYER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

type FormData = {
  quantity?: number
  unit: string
  pricePerUnit: number
  priceDate: string
  quality?: string
  paymentConditions?: string
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

// Multi-select commodity picker — chip toggles for preset commodities,
// plus an input to add a custom commodity on the fly.
function CommodityPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [customInput, setCustomInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Determine which preset chips to show vs. custom ones added by the buyer
  const presetNames = new Set(PRESET_COMMODITIES.map(c => c.name.toLowerCase()))
  const customSelected = selected.filter(c => !presetNames.has(c.toLowerCase()))
  const presetSelected = new Set(
    selected.filter(c => presetNames.has(c.toLowerCase())).map(c => c.toLowerCase())
  )

  const toggle = (name: string) => {
    const lower = name.toLowerCase()
    if (presetSelected.has(lower)) {
      // Remove (case-insensitive match)
      onChange(selected.filter(c => c.toLowerCase() !== lower))
    } else {
      onChange([...selected, name])
    }
  }

  const addCustom = () => {
    const v = customInput.trim()
    if (!v) return
    // Prevent duplicates (case-insensitive)
    if (selected.some(c => c.toLowerCase() === v.toLowerCase())) {
      setCustomInput('')
      return
    }
    onChange([...selected, v])
    setCustomInput('')
    inputRef.current?.focus()
  }

  const removeCustom = (name: string) => {
    onChange(selected.filter(c => c !== name))
  }

  return (
    <div>
      {/* Selected count badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ margin: 0, color: BUYER.muted, fontSize: '0.78rem' }}>
          Tap to select — you can pick multiple.
        </p>
        {selected.length > 0 && (
          <span style={{ background: BUYER.primary, color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
            {selected.length} selected
          </span>
        )}
      </div>

      {/* Preset commodity chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {PRESET_COMMODITIES.map(c => {
          const isSelected = presetSelected.has(c.name.toLowerCase())
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => toggle(c.name)}
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

      {/* Custom-add input */}
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
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

      {/* Custom-added chips (removable) */}
      {customSelected.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 6px', color: BUYER.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your custom commodities
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {customSelected.map(name => (
              <span
                key={name}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 100,
                  background: BUYER.primaryLight, color: BUYER.primary,
                  border: `1px solid ${BUYER.border}`, fontSize: '0.82rem', fontWeight: 700,
                }}
              >
                🌾 {name}
                <button
                  type="button"
                  onClick={() => removeCustom(name)}
                  style={{
                    background: 'none', border: 'none', color: BUYER.muted,
                    cursor: 'pointer', padding: 0, fontSize: '0.9rem', lineHeight: 1,
                  }}
                  aria-label={`Remove ${name}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CreateListing() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>()
  const [loading, setLoading] = useState(false)
  const [firmLocation, setFirmLocation] = useState('')
  const [error, setError] = useState('')
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([])
  const [commodityPhoto, setCommodityPhoto] = useState('')
  const [uploading, setUploading] = useState(false)
  // Default priceDate to today (YYYY-MM-DD for the date input)
  const todayStr = new Date().toISOString().slice(0, 10)

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

  const onSubmit = async (data: FormData) => {
    setError('')
    if (selectedCommodities.length === 0) {
      setError('Please select at least one commodity.')
      return
    }
    if (!firmLocation.trim()) {
      setError('Please enter your firm location.')
      return
    }
    setLoading(true)

    const payload = {
      unit: data.unit,
      pricePerUnit: parseFloat(data.pricePerUnit.toString()),
      quantity: data.quantity ? parseFloat(data.quantity.toString()) : 0,
      priceDate: data.priceDate ? new Date(data.priceDate).toISOString() : new Date().toISOString(),
      quality: data.quality || '',
      paymentConditions: data.paymentConditions || '',
      location: firmLocation,
      commodityPhoto,
    }

    // Create one listing per selected commodity. Run sequentially so a 429
    // (rate-limit) on the POST route doesn't kill the whole batch — partial
    // success is better than all-or-nothing.
    const failed: string[] = []
    for (const commodity of selectedCommodities) {
      try {
        const res = await authFetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, commodity }),
        })
        if (!res.ok) {
          let msg = `Failed to add ${commodity}`
          try {
            const json = await res.json()
            const apiMsg = json?.error?.message || json?.error
            if (Array.isArray(json?.error?.details) && json.error.details.length > 0) {
              msg = `${commodity}: ${json.error.details.map((d: any) => d.message).join(', ')}`
            } else if (typeof apiMsg === 'string') {
              msg = `${commodity}: ${apiMsg}`
            }
          } catch { /* response not JSON */ }
          failed.push(msg)
        }
      } catch {
        failed.push(`${commodity}: network error`)
      }
    }

    setLoading(false)

    if (failed.length === selectedCommodities.length) {
      // All failed — show errors, stay on page
      setError(failed.join(' • '))
      return
    }
    if (failed.length > 0) {
      // Partial success — show which failed, but still redirect
      // (the dashboard will reflect what did get created)
      console.warn('Some commodities failed:', failed)
    }
    router.push('/buyer/dashboard')
  }

  // keep react-hook-form in sync with the date default
  useEffect(() => { setValue('priceDate', todayStr as unknown as never) }, [setValue, todayStr])

  const submitLabel = selectedCommodities.length === 0
    ? '✅ Add Commodity'
    : selectedCommodities.length === 1
      ? '✅ Add Commodity'
      : `✅ Add ${selectedCommodities.length} Commodities`

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/buyer/dashboard" style={{ color: BUYER.primary, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: BUYER.muted }}>›</span>
            <span style={{ color: BUYER.text, fontWeight: 600, fontSize: '0.9rem' }}>Add Commodity</span>
          </div>
          <Link href="/buyer/dashboard" style={{ color: BUYER.primary, background: BUYER.primaryLight, border: `1px solid ${BUYER.border}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ ...cardStyle(BUYER), boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
          <h2 style={{ color: BUYER.textSecondary, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px' }}>🌾 Add Commodities</h2>
          <p style={{ color: BUYER.muted, marginBottom: '28px', fontSize: '0.9rem' }}>
            Pick one or more commodities you buy at your shop. Set today&apos;s price — you can update it any time.
          </p>

          {error && (
            <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={lbl}>Commodities</label>
              <CommodityPicker selected={selectedCommodities} onChange={setSelectedCommodities} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={lbl}>Price Per Unit (₹)</label>
                <input type="number" step="0.01" {...register('pricePerUnit', { required: 'Price is required' })} placeholder="e.g., 2200" style={inp} />
                {errors.pricePerUnit && <p style={{ color: SHARED.error, fontSize: '0.8rem', marginTop: '4px' }}>{errors.pricePerUnit.message}</p>}
              </div>
              <div>
                <label style={lbl}>Unit</label>
                <select {...register('unit')} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="kg">kg</option>
                  <option value="quintal">Quintal</option>
                  <option value="ton">Ton</option>
                  <option value="bags">Bags</option>
                </select>
              </div>
            </div>

            <div>
              <label style={lbl}>Price Date</label>
              <input
                type="date"
                defaultValue={todayStr}
                {...register('priceDate')}
                style={inp}
              />
              <p style={{ color: BUYER.muted, fontSize: '0.76rem', margin: '4px 0 0' }}>
                The date this price applies to. You can update it any day.
              </p>
            </div>

            {/* Commodity photo upload (optional) */}
            <div>
              <label style={lbl}>🌾 Commodity Photo (optional)</label>
              <p style={{ color: BUYER.muted, fontSize: '0.78rem', margin: '0 0 10px' }}>Add a photo of the commodity — e.g., a sample of the grade / quality you want.</p>
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

            {/* Optional fields (collapsible-ish — kept visible for clarity) */}
            <div style={{ borderTop: `1px dashed ${BUYER.border}`, paddingTop: 18, marginTop: 4 }}>
              <p style={{ color: BUYER.muted, fontSize: '0.78rem', margin: '0 0 14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Optional details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={lbl}>Quantity Needed</label>
                  <input type="number" {...register('quantity')} placeholder="e.g., 5000 (optional)" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Quality Grade</label>
                  <input type="text" {...register('quality')} placeholder="e.g., Grade-A" style={inp} />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={lbl}>Payment Conditions</label>
                <textarea {...register('paymentConditions')} placeholder="e.g., 50% advance, balance on delivery" rows={2}
                  style={{ ...inp, resize: 'vertical', fontFamily: SHARED.font }} />
              </div>
            </div>

            <div>
              <label style={lbl}>
                Firm Location / Address{' '}
                <span style={{ color: BUYER.muted, fontWeight: 400 }}>(start typing — suggestions appear)</span>
              </label>
              <AddressAutocomplete value={firmLocation} onChange={setFirmLocation} placeholder="e.g., APMC Market, Pune, Maharashtra" />
            </div>

            <button type="submit" disabled={loading || uploading} style={{
              padding: '13px', background: loading ? BUYER.muted : BUYER.primary, color: '#fff',
              border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: (loading || uploading) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.25)', transition: 'all 0.2s ease',
            }}>
              {loading ? 'Publishing…' : submitLabel}
            </button>
          </form>
        </div>
      </div>
      <style>{`input:focus, select:focus, textarea:focus { border-color: ${BUYER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}
