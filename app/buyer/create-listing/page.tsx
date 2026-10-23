'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import {
  MH, mhPageBg, mhCardStyle, mhPrimaryBtn, mhSecondaryBtn, mhNavStyle, mhInput, mhLabel, mhPill,
  WheatIcon, ShoppingCartIcon, AlertTriangleIcon, CheckIcon, CameraIcon,
  HourglassIcon, MapPinIcon, PlusIcon, XIcon, ArrowLeftIcon,
} from '@/lib/madhubani'

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
  'Wheat', 'Rice', 'Maize', 'Barley', 'Paddy', 'Oilseeds', 'Cotton', 'Sugarcane',
  'Soybean', 'Onion', 'Potato', 'Tomato', 'Mustard', 'Gram', 'Tur Dal',
  'Vegetables', 'Fruits', 'Spices',
]

const UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'quintal', label: 'Quintal' },
  { value: 'ton', label: 'Ton' },
  { value: 'bags', label: 'Bags' },
]

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
        style={mhInput}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
      />
      {showDropdown && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: MH.white, border: `1.5px solid ${MH.gold}`, borderRadius: '10px', zIndex: 100, boxShadow: '0 10px 25px -3px rgba(26,26,62,0.12)', overflow: 'hidden', marginTop: '4px' }}>
          {suggestions.map(s => (
            <button key={s.place_id} type="button" onMouseDown={() => { onChange(s.shortLabel || s.display_name); setSuggestions([]); setShowDropdown(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: MH.navy, fontSize: '0.85rem', borderBottom: `1px solid ${MH.cream}` }}>
              <MapPinIcon size={14} style={{ color: MH.deepPink, flexShrink: 0 }} /> {s.shortLabel || s.display_name}
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
  const sigRes = await authFetch('/api/social/upload-signature?kind=image')
  const sig = await sigRes.json()
  if (!sig.available) throw new Error('Cloudinary not configured')
  const fd = new FormData()
  fd.append('file', blob)
  fd.append('api_key', sig.apiKey)
  fd.append('timestamp', sig.timestamp.toString())
  fd.append('signature', sig.signature)
  fd.append('folder', sig.folder)
  // SECURITY: forward signed params — Cloudinary rejects uploads that omit signed params.
  fd.append('resource_type', sig.resourceType)
  fd.append('allowed_formats', sig.allowedFormats)
  const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd })
  const cld = await cldRes.json()
  if (!cldRes.ok || !cld.secure_url) throw new Error(cld?.error?.message || 'Upload failed')
  return cld.secure_url as string
}

// One row per selected commodity — buyer enters price + unit for each.
interface CommodityRow {
  name: string
  pricePerUnit: string
  unit: string
  isCustom: boolean
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

  const addPreset = (name: string) => {
    if (presetSelectedNames.has(name.toLowerCase())) {
      // Remove if already selected
      setRows(prev => prev.filter(r => r.name.toLowerCase() !== name.toLowerCase()))
    } else {
      setRows(prev => [...prev, { name, pricePerUnit: '', unit: 'kg', isCustom: false }])
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
    setRows(prev => [...prev, { name: v, pricePerUnit: '', unit: 'kg', isCustom: true }])
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
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const submitLabel = rows.length === 0
    ? 'Add Commodities'
    : rows.length === 1
      ? 'Add Commodity'
      : `Add ${rows.length} Commodities`

  return (
    <div style={mhPageBg}>
      <nav style={mhNavStyle}>
        <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${MH.navy}, ${MH.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MH.cream, border: `1px solid ${MH.gold}` }}>
              <ShoppingCartIcon size={16} />
            </div>
            <Link href="/buyer/dashboard" style={{ color: MH.navy, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: MH.gold }}>›</span>
            <span style={{ color: MH.navy, fontWeight: 600, fontSize: '0.9rem' }}>Add Commodities</span>
          </div>
          <Link href="/buyer/dashboard" style={{ ...mhSecondaryBtn, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeftIcon size={14} /> Dashboard
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '820px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ ...mhCardStyle({ doubleLine: true }) }}>
          <h2 style={{ color: MH.navy, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <WheatIcon size={24} style={{ color: MH.deepPink }} /> Add Commodities
          </h2>
          <p style={{ color: MH.pinkGray, marginBottom: '24px', fontSize: '0.9rem' }}>
            Pick one or more commodities you buy at your shop. <strong style={{ color: MH.navy }}>Each commodity gets its own price</strong> — set today&apos;s rates, and you can update any of them any time.
          </p>

          {error && (
            <div style={{ background: MH.errorLight, border: `1px solid ${MH.gold}`, borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: MH.deepPink, fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangleIcon size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={{ background: MH.successLight, border: `1px solid ${MH.success}`, borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: MH.success, fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckIcon size={16} /> {success}
            </div>
          )}

          {/* Step 1: Pick commodities */}
          <div style={{ marginBottom: 22 }}>
            <label style={mhLabel}>Step 1 — Pick commodities</label>
            <p style={{ color: MH.pinkGray, fontSize: '0.78rem', margin: '0 0 10px' }}>Tap to select. You can pick multiple — each will get its own price row below.</p>

            {/* Preset chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_COMMODITIES.map(name => {
                const isSelected = presetSelectedNames.has(name.toLowerCase())
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => addPreset(name)}
                    style={mhPill(isSelected)}
                  >
                    <WheatIcon size={12} /> {name}
                    {isSelected && <CheckIcon size={12} />}
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
                style={{ ...mhInput, flex: 1 }}
              />
              <button
                type="button"
                onClick={addCustom}
                disabled={!customInput.trim()}
                style={{
                  ...mhPrimaryBtn({ disabled: !customInput.trim() }),
                  padding: '0 18px', borderRadius: 12,
                  fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                }}
              >
                <PlusIcon size={14} /> Add
              </button>
            </div>
          </div>

          {/* Step 2: Per-commodity price rows */}
          {rows.length > 0 && (
            <div style={{ marginBottom: 22, padding: 16, background: `${MH.gold}1F`, borderRadius: 12, border: `1px solid ${MH.gold}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ ...mhLabel, margin: 0 }}>Step 2 — Set price for each commodity</label>
                {rows.length > 1 && (
                  <span style={{ background: MH.pink, color: MH.white, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
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
                    background: MH.white,
                    borderRadius: 10,
                    border: `1px solid ${MH.gold}`,
                  }}>
                    {/* Icon + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ color: MH.deepPink, display: 'inline-flex' }}><WheatIcon size={20} /></span>
                      <span style={{ color: MH.navy, fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                      </span>
                    </div>
                    {/* Price input */}
                    <div>
                      <label style={{ ...mhLabel, fontSize: '0.65rem', marginBottom: 2 }}>Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={r.pricePerUnit}
                        onChange={e => updateRow(idx, { pricePerUnit: e.target.value })}
                        placeholder="e.g., 2200"
                        style={{ ...mhInput, padding: '8px 12px', fontSize: '0.85rem' }}
                      />
                    </div>
                    {/* Unit select */}
                    <div>
                      <label style={{ ...mhLabel, fontSize: '0.65rem', marginBottom: 2 }}>Unit</label>
                      <select
                        value={r.unit}
                        onChange={e => updateRow(idx, { unit: e.target.value })}
                        style={{ ...mhInput, padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </div>
                    {/* Computed preview */}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, color: MH.pinkGray, fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' }}>Rate</p>
                      <p style={{ margin: '2px 0 0', color: MH.deepPink, fontWeight: 800, fontSize: '0.9rem' }}>
                        {r.pricePerUnit ? `₹${r.pricePerUnit}/${r.unit}` : '—'}
                      </p>
                    </div>
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      aria-label={`Remove ${r.name}`}
                      style={{
                        background: MH.errorLight, color: MH.deepPink,
                        border: `1px solid ${MH.deepPink}`, borderRadius: 8,
                        width: 32, height: 32, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Shared fields */}
          <div style={{ borderTop: `1px dashed ${MH.gold}`, paddingTop: 18, marginTop: 4 }}>
            <p style={{ color: MH.pinkGray, fontSize: '0.78rem', margin: '0 0 14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Step 3 — Shared details (apply to all commodities above)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={mhLabel}>Price Date</label>
                <input
                  type="date"
                  value={priceDate}
                  onChange={e => setPriceDate(e.target.value)}
                  style={mhInput}
                />
                <p style={{ color: MH.pinkGray, fontSize: '0.76rem', margin: '4px 0 0' }}>
                  The date these prices apply to. You can update any commodity&apos;s price any day.
                </p>
              </div>

              {/* Commodity photo upload (optional) */}
              <div>
                <label style={{ ...mhLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <WheatIcon size={12} style={{ color: MH.deepPink }} /> Commodity Photo (optional, shared)
                </label>
                <p style={{ color: MH.pinkGray, fontSize: '0.78rem', margin: '0 0 10px' }}>Add a photo — e.g., a sample of the grade / quality you want. Applied to all commodities in this batch.</p>
                {commodityPhoto ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={commodityPhoto} alt="commodity" style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 10, border: `1.5px solid ${MH.gold}` }} />
                    <button type="button" onClick={() => setCommodityPhoto('')} style={{ position: 'absolute', top: 6, right: 6, background: MH.navy, color: MH.cream, border: `1px solid ${MH.gold}`, borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <XIcon size={12} />
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 200, height: 150, border: `2px dashed ${MH.gold}`, borderRadius: 10, cursor: 'pointer', gap: 6, background: MH.cream, color: MH.deepPink, transition: 'border-color 0.2s' }}>
                    <span style={{ display: 'inline-flex' }}>{uploading ? <HourglassIcon size={24} /> : <CameraIcon size={24} />}</span>
                    <span style={{ color: MH.pinkGray, fontSize: '0.78rem', fontWeight: 600 }}>{uploading ? 'Uploading…' : 'Upload photo'}</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCommodityPhotoUpload} disabled={uploading} />
                  </label>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={mhLabel}>Quantity Needed (optional)</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g., 5000 (applies to all)" style={mhInput} />
                </div>
                <div>
                  <label style={mhLabel}>Quality Grade</label>
                  <input type="text" value={quality} onChange={e => setQuality(e.target.value)} placeholder="e.g., Grade-A" style={mhInput} />
                </div>
              </div>

              <div>
                <label style={mhLabel}>Payment Conditions</label>
                <textarea
                  value={paymentConditions}
                  onChange={e => setPaymentConditions(e.target.value)}
                  placeholder="e.g., 50% advance, balance on delivery"
                  rows={2}
                  style={{ ...mhInput, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={mhLabel}>
                  Firm Location / Address{' '}
                  <span style={{ color: MH.pinkGray, fontWeight: 400 }}>(start typing — suggestions appear)</span>
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
              ...mhPrimaryBtn({ disabled: loading || uploading || rows.length === 0 }),
              marginTop: 22,
              width: '100%',
              padding: '13px',
              fontSize: '1rem',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? <><HourglassIcon size={16} /> Publishing…</> : <><CheckIcon size={16} /> {submitLabel}</>}
          </button>
        </div>
      </div>
      <style>{`input:focus, select:focus, textarea:focus { border-color: ${MH.deepPink} !important; box-shadow: 0 0 0 3px rgba(212,93,126,0.18) !important; }`}</style>
    </div>
  )
}
