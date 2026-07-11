'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo } from '@/lib/auth-fetch'
import { FARMER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

interface NominatimAddress {
  city?: string; town?: string; village?: string
  county?: string; state_district?: string; state?: string
}
interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: NominatimAddress
  shortLabel?: string
}

const inp = inputStyle(FARMER)
const lbl = labelStyle(FARMER)

function AddressAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onPick: (r: NominatimResult) => void
  placeholder?: string
}) {
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
        placeholder={placeholder || 'Type your farm address…'}
        style={inp}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
      />
      {showDropdown && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: FARMER.white, border: `1.5px solid ${FARMER.border}`, borderRadius: '10px', zIndex: 100, boxShadow: SHARED.shadowLg, overflow: 'hidden', marginTop: '4px' }}>
          {suggestions.map(s => (
            <button
              key={s.place_id}
              type="button"
              onMouseDown={() => {
                onChange(s.shortLabel || s.display_name)
                onPick(s)
                setSuggestions([])
                setShowDropdown(false)
              }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: FARMER.text, fontSize: '0.85rem', borderBottom: `1px solid ${FARMER.bg}` }}
            >
              📍 {s.shortLabel || s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FarmerSetupLocation() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usingGps, setUsingGps] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('')

  // Pre-fill if the farmer already has a saved location (so they can edit it later)
  useEffect(() => {
    const { userId } = getUserInfo()
    if (!userId) return
    void (async () => {
      try {
        const res = await authFetch('/api/farmer/profile')
        if (res.ok) {
          const data = await res.json()
          const p = data?.data?.profile || data?.profile
          if (p) {
            if (p.farmerAddress) setAddress(p.farmerAddress)
            if (p.location?.latitude != null) setLat(p.location.latitude)
            if (p.location?.longitude != null) setLng(p.location.longitude)
          }
        }
      } catch { /* ignore */ }
    })()
  }, [])

  const useGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported by your browser.')
      return
    }
    setUsingGps(true)
    setGpsStatus('Getting your location…')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLat(latitude)
        setLng(longitude)
        setGpsStatus('Location captured! Reversing to address…')
        // Reverse-geocode so the farmer sees a readable address too
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&accept-language=en`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          if (data?.display_name) {
            const a = data.address || {}
            const parts = [a.city || a.town || a.village, a.state_district || a.county, a.state, 'India'].filter(Boolean)
            setAddress(parts.join(', ') || data.display_name)
          }
          setGpsStatus('✅ Location captured from GPS')
        } catch {
          setGpsStatus('✅ Location captured (address autofill skipped)')
        } finally {
          setUsingGps(false)
        }
      },
      (err) => {
        setGpsStatus(`GPS error: ${err.message}`)
        setUsingGps(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const onSubmit = async () => {
    setError('')
    if (!address.trim()) { setError('Please enter your farm address.'); return }
    if (lat === null || lng === null) {
      setError('Location coordinates missing. Please pick an address from the dropdown or use GPS.')
      return
    }
    setLoading(true)
    try {
      const res = await authFetch('/api/farmer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerAddress: address, latitude: lat, longitude: lng }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Failed to save location')
        setLoading(false)
        return
      }
      router.push('/farmer/dashboard')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font, color: FARMER.text }}>
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: FARMER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>🌾</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: FARMER.text, lineHeight: 1 }}>AgriEasy</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: FARMER.muted }}>Set your location</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/farmer/dashboard')}
            style={{ color: FARMER.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700 }}
          >
            Skip for now →
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Hero */}
        <div style={{
          background: FARMER.gradient,
          borderRadius: 20, padding: 28, color: '#fff',
          marginBottom: 24, boxShadow: SHARED.shadowLg,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>Welcome to AgriEasy 🌾</p>
            <h1 style={{ margin: '6px 0 0', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Let&apos;s find buyers near you
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: '0.92rem', opacity: 0.9, lineHeight: 1.5 }}>
              Tell us where your farm is. We&apos;ll show buyer shops and godowns within 50 km — and let you expand the search anytime.
            </p>
          </div>
        </div>

        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: FARMER.text }}>Your farm location</h2>
          <p style={{ margin: '0 0 20px', color: FARMER.muted, fontSize: '0.85rem' }}>
            Search for your village or town, or use GPS to auto-detect your spot.
          </p>

          {error && (
            <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: SHARED.error, fontSize: '0.86rem', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* GPS button */}
          <button
            type="button"
            onClick={useGps}
            disabled={usingGps}
            style={{
              width: '100%', padding: '11px 16px',
              background: usingGps ? FARMER.muted : FARMER.white,
              color: FARMER.primary, border: `1.5px solid ${FARMER.border}`,
              borderRadius: 12, fontSize: '0.9rem', fontWeight: 700,
              cursor: usingGps ? 'not-allowed' : 'pointer', marginBottom: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            {usingGps ? '⏳ Detecting…' : '📍 Use my current location (GPS)'}
          </button>
          {gpsStatus && (
            <p style={{ margin: '0 0 14px', color: FARMER.muted, fontSize: '0.78rem', textAlign: 'center' }}>{gpsStatus}</p>
          )}

          {/* Address autocomplete */}
          <div>
            <label style={lbl}>Farm address (village, town, district, state)</label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onPick={(r) => {
                const la = parseFloat(r.lat), lo = parseFloat(r.lon)
                if (!isNaN(la) && !isNaN(lo)) { setLat(la); setLng(lo) }
              }}
              placeholder="e.g., Village Rampur, Tehsil Kasganj, UP"
            />
          </div>

          {/* Coordinate preview */}
          {lat !== null && lng !== null && (
            <div style={{
              marginTop: 14, padding: '12px 14px',
              background: FARMER.primaryLight, borderRadius: 10,
              border: `1px solid ${FARMER.border}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: '1.2rem' }}>✅</span>
              <div>
                <p style={{ margin: 0, color: FARMER.text, fontSize: '0.85rem', fontWeight: 700 }}>Location captured</p>
                <p style={{ margin: '2px 0 0', color: FARMER.muted, fontSize: '0.74rem', fontFamily: 'monospace' }}>
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            style={{
              width: '100%', marginTop: 22, padding: '14px',
              background: loading ? FARMER.muted : FARMER.primary,
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: '1rem', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Saving…' : '✅ Save & Find Buyers'}
          </button>

          <p style={{ margin: '14px 0 0', color: FARMER.muted, fontSize: '0.76rem', textAlign: 'center' }}>
            You can change this anytime from your profile.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link href="/farmer/dashboard" style={{ color: FARMER.muted, textDecoration: 'none', fontSize: '0.84rem' }}>
            ← Back to dashboard
          </Link>
        </div>
      </div>
      <style>{`input:focus { border-color: ${FARMER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}
