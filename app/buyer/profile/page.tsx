'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { BUYER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

interface BuyerProfile {
  _id: string
  name?: string
  email: string
  phone: string
  role: string
  address?: string
  firmName: string
  gstin: string
  bio: string
  commoditiesInterested: string[]
  visitingCardPhoto: string
  shopPhoto: string
  profilePic: string
  createdAt?: string
}

// Helper — compress + upload an image to Cloudinary via the signed-URL route.
// Returns the secure_url on success, throws on failure.
async function uploadToCloudinary(file: File): Promise<string> {
  // Compress / resize client-side
  const img = new Image()
  const url = URL.createObjectURL(file)
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
  URL.revokeObjectURL(url)
  let w = img.width, h = img.height
  if (w > 1000) { h = Math.round(h * 1000 / w); w = 1000 }
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await new Promise<Blob>(r =>
    canvas.toBlob(b => r(b || file), 'image/jpeg', 0.85) as unknown as void
  )

  const sigRes = await authFetch('/api/social/upload-signature')
  const sig = await sigRes.json()
  if (!sig.available) throw new Error('Cloudinary not configured')
  const fd = new FormData()
  fd.append('file', blob)
  fd.append('api_key', sig.apiKey)
  fd.append('timestamp', sig.timestamp.toString())
  fd.append('signature', sig.signature)
  fd.append('folder', sig.folder)
  const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: 'POST',
    body: fd,
  })
  const cld = await cldRes.json()
  if (!cldRes.ok || !cld.secure_url) {
    throw new Error(cld?.error?.message || 'Upload failed')
  }
  return cld.secure_url as string
}

function PhotoUploader({
  label,
  hint,
  photoUrl,
  onUploaded,
  onError,
  accentColor,
}: {
  label: string
  hint: string
  photoUrl: string
  onUploaded: (url: string) => void
  onError: (msg: string) => void
  accentColor: string
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    onError('')
    try {
      const url = await uploadToCloudinary(file)
      onUploaded(url)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label style={labelStyle(BUYER)}>{label}</label>
      <p style={{ color: BUYER.muted, fontSize: '0.78rem', margin: '0 0 10px' }}>{hint}</p>
      {photoUrl ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={label}
            style={{
              width: 220, height: 150, objectFit: 'cover',
              borderRadius: 12, border: `1.5px solid ${BUYER.border}`,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '8px 14px', background: BUYER.primaryLight,
                color: BUYER.primary, border: `1px solid ${BUYER.border}`,
                borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading ? 'Uploading…' : '↻ Replace'}
            </button>
            <button
              type="button"
              onClick={() => onUploaded('')}
              disabled={uploading}
              style={{
                padding: '8px 14px', background: SHARED.errorLight,
                color: SHARED.error, border: `1px solid #fca5a5`,
                borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              ✕ Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: 220, height: 150, border: `2px dashed ${accentColor}55`, borderRadius: 12,
            cursor: uploading ? 'wait' : 'pointer', gap: 6,
            background: `${accentColor}08`, transition: 'border-color 0.2s',
          }}
        >
          <span style={{ fontSize: '1.8rem' }}>{uploading ? '⏳' : '📷'}</span>
          <span style={{ color: BUYER.muted, fontSize: '0.78rem', fontWeight: 600 }}>
            {uploading ? 'Uploading…' : 'Click to upload'}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  )
}

export default function BuyerProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<BuyerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Editable copies
  const [firmName, setFirmName] = useState('')
  const [gstin, setGstin] = useState('')
  const [bio, setBio] = useState('')
  const [visitingCardPhoto, setVisitingCardPhoto] = useState('')
  const [shopPhoto, setShopPhoto] = useState('')

  useEffect(() => {
    const { userEmail } = getUserInfo()
    if (!userEmail) {
      router.replace('/auth/login')
      return
    }
    setUserEmail(userEmail)
    const fetchProfile = async () => {
      try {
        const res = await authFetch('/api/buyer/profile')
        if (!res.ok) {
          setError('Failed to load profile')
          return
        }
        const data = await res.json()
        const p = data?.data?.profile || data?.profile
        if (!p) {
          setError('Profile data missing')
          return
        }
        setProfile(p)
        setFirmName(p.firmName || '')
        setGstin(p.gstin || '')
        setBio(p.bio || '')
        setVisitingCardPhoto(p.visitingCardPhoto || '')
        setShopPhoto(p.shopPhoto || '')
      } catch {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }
    void fetchProfile()
  }, [router])

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      const res = await authFetch('/api/buyer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmName,
          gstin,
          bio,
          visitingCardPhoto,
          shopPhoto,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Failed to save profile')
        return
      }
      const data = await res.json()
      const p = data?.data?.profile || data?.profile
      if (p) {
        setProfile(p)
      }
      setSuccess('Profile saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inp = inputStyle(BUYER)
  const lbl = labelStyle(BUYER)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BUYER.primary, fontWeight: 700 }}>
        Loading profile…
      </div>
    )
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
              <p style={{ margin: 0, fontSize: '0.7rem', color: BUYER.muted }}>Buyer profile</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/buyer/dashboard" style={{ color: BUYER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: BUYER.primaryLight }}>← Dashboard</Link>
            <Link href="/agrisocial" style={{ color: BUYER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: BUYER.primaryLight }}>📱 AgriSocial</Link>
            <button onClick={logout} style={{ color: BUYER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '28px 24px 60px' }}>
        {/* Header / hero */}
        <div style={{
          background: BUYER.gradient,
          borderRadius: 20, padding: 28, color: '#fff',
          marginBottom: 24, boxShadow: SHARED.shadowLg,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>Buyer Profile</p>
            <h1 style={{ margin: '6px 0 0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {firmName || 'Your Firm'}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '0.92rem', opacity: 0.9 }}>
              {profile?.address || 'Address not set'} {userEmail && <span style={{ opacity: 0.75 }}>· {userEmail}</span>}
            </p>
            <div style={{ display: 'flex', gap: 18, marginTop: 16, fontSize: '0.85rem' }}>
              <div>
                <p style={{ margin: 0, opacity: 0.75, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Phone</p>
                <p style={{ margin: '2px 0 0', fontWeight: 700 }}>{profile?.phone || '—'}</p>
              </div>
              <div>
                <p style={{ margin: 0, opacity: 0.75, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>GSTIN</p>
                <p style={{ margin: '2px 0 0', fontWeight: 700 }}>{gstin || '—'}</p>
              </div>
              <div>
                <p style={{ margin: 0, opacity: 0.75, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Buyer since</p>
                <p style={{ margin: '2px 0 0', fontWeight: 700 }}>
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: SHARED.error, fontSize: '0.88rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{ background: SHARED.successLight, border: '1px solid #6ee7b7', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: SHARED.success, fontSize: '0.88rem', fontWeight: 600 }}>
            ✅ {success}
          </div>
        )}

        {/* Editable details */}
        <div style={{ ...cardStyle(BUYER), marginBottom: 20, boxShadow: SHARED.shadowMd }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: BUYER.text }}>Firm details</h2>
          <p style={{ margin: '0 0 22px', color: BUYER.muted, fontSize: '0.85rem' }}>Update your firm&apos;s name, GSTIN, and a short bio that farmers will see.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={lbl}>Firm Name</label>
              <input type="text" value={firmName} onChange={e => setFirmName(e.target.value)} placeholder="e.g., Shree Ganesh Trading Co." style={inp} />
            </div>
            <div>
              <label style={lbl}>GSTIN</label>
              <input type="text" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} style={inp} />
            </div>
            <div>
              <label style={lbl}>Short Bio (optional)</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="e.g., We procure wheat, rice and pulses at APMC Pune. Payment within 48 hours of delivery." style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>
        </div>

        {/* Profile photos */}
        <div style={{ ...cardStyle(BUYER), marginBottom: 20, boxShadow: SHARED.shadowMd }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: BUYER.text }}>Profile photos</h2>
          <p style={{ margin: '0 0 22px', color: BUYER.muted, fontSize: '0.85rem' }}>
            Add a photo of your visiting card and your shop&apos;s front. Farmers can verify you before they deliver.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            <PhotoUploader
              label="🪪 Visiting card photo"
              hint="A clear photo of your business / visiting card. Helps farmers verify your identity."
              photoUrl={visitingCardPhoto}
              onUploaded={setVisitingCardPhoto}
              onError={setError}
              accentColor={BUYER.primary}
            />
            <PhotoUploader
              label="🏪 Shop photo"
              hint="A photo of your shop / warehouse front. Farmers can see where to deliver produce."
              photoUrl={shopPhoto}
              onUploaded={setShopPhoto}
              onError={setError}
              accentColor={BUYER.green}
            />
          </div>
        </div>

        {/* Save / actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/buyer/dashboard" style={{
            padding: '12px 22px', background: BUYER.white, color: BUYER.text,
            border: `1.5px solid ${BUYER.border}`, borderRadius: 12,
            fontSize: '0.92rem', fontWeight: 700, textDecoration: 'none',
          }}>
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 28px', background: saving ? BUYER.muted : BUYER.primary,
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: '0.95rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.25)', transition: 'all 0.2s ease',
            }}
          >
            {saving ? 'Saving…' : '💾 Save Profile'}
          </button>
        </div>
      </div>
      <style>{`input:focus, textarea:focus { border-color: ${BUYER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}
