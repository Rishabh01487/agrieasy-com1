'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import {
  MH, mhPageBg, mhCardStyle, mhPrimaryBtn, mhSecondaryBtn, mhNavStyle, mhInput, mhLabel,
  ShoppingCartIcon, WheatIcon, SearchIcon, EditIcon, AlertTriangleIcon, CheckIcon,
  CameraIcon, HourglassIcon, TrashIcon, XIcon, MapPinIcon, ArrowLeftIcon,
} from '@/lib/madhubani'

interface Listing {
  _id: string
  commodity: string
  quantity?: number
  unit?: string
  pricePerUnit: number
  priceDate?: string
  commodityPhoto?: string
  quality?: string
  paymentConditions?: string
  firmLocation?: string
  location?: string
  createdAt: string
  updatedAt?: string
}

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

function toDateInputValue(d?: string): string {
  if (!d) return new Date().toISOString().slice(0, 10)
  const date = new Date(d)
  if (isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function EditListing() {
  const params = useParams()
  const router = useRouter()
  const listingId = params.id as string
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [commodity, setCommodity] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kg')
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [priceDate, setPriceDate] = useState('')
  const [quality, setQuality] = useState('')
  const [paymentConditions, setPaymentConditions] = useState('')
  const [commodityPhoto, setCommodityPhoto] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await authFetch('/api/listings/' + listingId)
        if (!res.ok) {
          setError('Failed to load listing')
          return
        }
        const data = await res.json()
        const found = data?.data?.listing || data?.listing
        if (!found) { setError('Listing not found'); return }
        setListing(found)
        setCommodity(found.commodity)
        setQuantity(found.quantity?.toString() || '')
        setUnit(found.unit || 'kg')
        setPricePerUnit(found.pricePerUnit?.toString() || '')
        setPriceDate(toDateInputValue(found.priceDate || found.createdAt))
        setQuality(found.quality || '')
        setPaymentConditions(found.paymentConditions || '')
        setCommodityPhoto(found.commodityPhoto || '')
      } catch {
        setError('Failed to load listing')
      } finally {
        setLoading(false)
      }
    }
    if (listingId) void fetchListing()
  }, [listingId])

  const handleCommodityPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const url = await uploadToCloudinary(file)
      setCommodityPhoto(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!commodity || !pricePerUnit) { setError('Commodity and price are required'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const res = await authFetch('/api/listings/' + listingId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity,
          quantity: quantity ? parseFloat(quantity) : 0,
          unit,
          pricePerUnit: parseFloat(pricePerUnit),
          priceDate: priceDate ? new Date(priceDate).toISOString() : new Date().toISOString(),
          quality,
          paymentConditions,
          commodityPhoto,
        }),
      })
      if (!res.ok) {
        let msg = 'Failed to update listing'
        try {
          const json = await res.json()
          msg = json?.error?.message || json?.error || msg
        } catch { /* response not JSON */ }
        setError(msg)
      } else {
        const data = await res.json()
        const updated = data?.data?.listing || data?.listing
        if (updated) {
          setListing(updated)
          setPriceDate(toDateInputValue(updated.priceDate || updated.createdAt))
        }
        setSuccess('Saved successfully')
        setTimeout(() => setSuccess(''), 2500)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this commodity from your price-list? This cannot be undone.')) return
    setDeleting(true); setError('')
    try {
      const res = await authFetch('/api/listings/' + listingId, { method: 'DELETE' })
      if (!res.ok) {
        let msg = 'Failed to delete listing'
        try {
          const json = await res.json()
          msg = json?.error?.message || json?.error || msg
        } catch { /* noop */ }
        setError(msg)
      } else {
        router.push('/buyer/dashboard')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally { setDeleting(false) }
  }

  if (loading) {
    return (
      <div style={{ ...mhPageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MH.navy, fontWeight: 700 }}>
        Loading listing…
      </div>
    )
  }

  if (error && !listing) {
    return (
      <div style={{ ...mhPageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ color: MH.pink, display: 'flex' }}><SearchIcon size={44} /></div>
        <p style={{ color: MH.pinkGray }}>{error}</p>
        <Link href="/buyer/dashboard" style={{ ...mhSecondaryBtn, padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeftIcon size={14} /> Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div style={mhPageBg}>
      <nav style={mhNavStyle}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${MH.navy}, ${MH.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MH.cream, border: `1px solid ${MH.gold}` }}>
              <ShoppingCartIcon size={16} />
            </div>
            <Link href="/buyer/dashboard" style={{ color: MH.navy, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: MH.gold }}>›</span>
            <span style={{ color: MH.navy, fontWeight: 600, fontSize: '0.9rem' }}>Edit Commodity</span>
          </div>
          <Link href="/buyer/dashboard" style={{ ...mhSecondaryBtn, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeftIcon size={14} /> Dashboard
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ ...mhCardStyle({ doubleLine: true }) }}>
          <h2 style={{ color: MH.navy, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <EditIcon size={22} style={{ color: MH.deepPink }} /> Edit Commodity
          </h2>
          <p style={{ color: MH.pinkGray, marginBottom: '28px', fontSize: '0.9rem' }}>
            Update today&apos;s price, change the date, or swap the commodity photo.
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={mhLabel}>Commodity Type</label>
              <input type="text" value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="e.g., Wheat" style={mhInput} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={mhLabel}>Price Per Unit (₹)</label>
                <input type="number" step="0.01" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} style={mhInput} />
              </div>
              <div>
                <label style={mhLabel}>Unit</label>
                <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...mhInput, cursor: 'pointer' }}>
                  <option value="kg">kg</option>
                  <option value="quintal">Quintal</option>
                  <option value="ton">Ton</option>
                  <option value="bags">Bags</option>
                </select>
              </div>
            </div>

            <div>
              <label style={mhLabel}>Price Date</label>
              <input type="date" value={priceDate} onChange={e => setPriceDate(e.target.value)} style={mhInput} />
              <p style={{ color: MH.pinkGray, fontSize: '0.76rem', margin: '4px 0 0' }}>
                Update this when you change the price — farmers see the latest date.
              </p>
            </div>

            {/* Commodity photo upload */}
            <div>
              <label style={{ ...mhLabel, display: 'flex', alignItems: 'center', gap: 6 }}>
                <WheatIcon size={12} style={{ color: MH.deepPink }} /> Commodity Photo
              </label>
              <p style={{ color: MH.pinkGray, fontSize: '0.78rem', margin: '0 0 10px' }}>Optional — a photo of the commodity / quality grade you want.</p>
              {commodityPhoto ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={commodityPhoto} alt="commodity" style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 10, border: `1.5px solid ${MH.gold}` }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ ...mhSecondaryBtn, padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {uploading ? <HourglassIcon size={14} /> : <EditIcon size={14} />} {uploading ? 'Uploading…' : 'Replace'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCommodityPhotoUpload} disabled={uploading} />
                    </label>
                    <button type="button" onClick={() => setCommodityPhoto('')} disabled={uploading} style={{ padding: '8px 14px', background: MH.errorLight, color: MH.deepPink, border: `1px solid ${MH.deepPink}`, borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <XIcon size={14} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 200, height: 150, border: `2px dashed ${MH.gold}`, borderRadius: 10, cursor: 'pointer', gap: 6, background: MH.cream, color: MH.deepPink, transition: 'border-color 0.2s' }}>
                  <span style={{ display: 'inline-flex' }}>{uploading ? <HourglassIcon size={24} /> : <CameraIcon size={24} />}</span>
                  <span style={{ color: MH.pinkGray, fontSize: '0.78rem', fontWeight: 600 }}>{uploading ? 'Uploading…' : 'Upload photo'}</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCommodityPhotoUpload} disabled={uploading} />
                </label>
              )}
            </div>

            {/* Optional fields */}
            <div style={{ borderTop: `1px dashed ${MH.gold}`, paddingTop: 18, marginTop: 4 }}>
              <p style={{ color: MH.pinkGray, fontSize: '0.78rem', margin: '0 0 14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Optional details</p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={mhLabel}>Quantity Needed</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g., 5000 (optional)" style={mhInput} />
                </div>
                <div>
                  <label style={mhLabel}>Quality Grade</label>
                  <input type="text" value={quality} onChange={e => setQuality(e.target.value)} placeholder="e.g., Grade-A" style={mhInput} />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={mhLabel}>Payment Conditions</label>
                <textarea value={paymentConditions} onChange={e => setPaymentConditions(e.target.value)} rows={2}
                  style={{ ...mhInput, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ background: MH.cream, borderRadius: 12, padding: '14px 18px', border: `1px solid ${MH.gold}` }}>
              <label style={{ color: MH.pinkGray, fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: '4px' }}>
                <MapPinIcon size={12} style={{ color: MH.deepPink }} /> Firm Location
              </label>
              <p style={{ color: MH.navy, fontWeight: 600, margin: 0 }}>{listing?.location || listing?.firmLocation || '—'}</p>
              {listing?.updatedAt && (
                <p style={{ color: MH.pinkGray, fontSize: '0.72rem', margin: '6px 0 0' }}>
                  Last updated: {new Date(listing.updatedAt).toLocaleString('en-IN')}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={handleSave} disabled={saving || uploading}
                style={{ ...mhPrimaryBtn({ disabled: saving || uploading }), flex: 1, minWidth: 180, padding: '13px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (saving || uploading) ? 0.7 : 1 }}>
                {saving ? <><HourglassIcon size={16} /> Saving…</> : <><CheckIcon size={16} /> Save Changes</>}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ padding: '13px 22px', background: MH.errorLight, color: MH.deepPink, border: `1px solid ${MH.deepPink}`, borderRadius: 12, fontSize: '0.92rem', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <TrashIcon size={14} /> {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`input:focus, select:focus, textarea:focus { border-color: ${MH.deepPink} !important; box-shadow: 0 0 0 3px rgba(212,93,126,0.18) !important; }`}</style>
    </div>
  )
}
