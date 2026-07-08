'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { AUTH, SHARED, inputStyle, labelStyle } from '@/lib/styles'

type FormData = {
  name: string
  role: 'farmer' | 'buyer' | 'transporter'
  email: string
  password: string
  phone: string
  address: string
  firmName?: string
  gstin?: string
  aadhar?: string
  companyName?: string
  transporterGstin?: string
}

interface NominatimAddress {
  city?: string
  town?: string
  village?: string
  county?: string
  state_district?: string
  state?: string
  country?: string
}
interface NominatimResult {
  place_id: number
  display_name: string
  address?: NominatimAddress
  shortLabel?: string
}

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
      // Build short clean label: city/town/village, district, state, India
      const enriched = data.map(item => {
        const a = item.address || {}
        const parts = [
          a.city || a.town || a.village,
          a.state_district || a.county,
          a.state,
          'India',
        ].filter(Boolean)
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
        placeholder={placeholder || 'Type your address…'}
        style={inputStyle({ border: AUTH.border, text: AUTH.text, bg: '#faf5ff' })}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
      />
      {showDropdown && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: AUTH.white, border: `1.5px solid ${AUTH.border}`, borderRadius: '12px', zIndex: 100, boxShadow: '0 4px 16px rgba(109,40,217,0.12)', overflow: 'hidden', marginTop: '4px' }}>
          {suggestions.map(s => (
            <button key={s.place_id} type="button" onMouseDown={() => { onChange(s.shortLabel || s.display_name); setSuggestions([]); setShowDropdown(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: AUTH.text, fontSize: '0.85rem', borderBottom: `1px solid ${AUTH.bg}`, fontFamily: SHARED.font, transition: 'background 0.15s' }}>
              📍 {s.shortLabel || s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Register() {
  const router = useRouter()
  const [role, setRole] = useState<'farmer' | 'buyer' | 'transporter'>('farmer')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [address, setAddress] = useState('')
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    setError('')
    if (!address.trim()) { setError('Please enter your address'); setIsLoading(false); return }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          role,
          address,
          aadhaarNumber: data.aadhar,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        // API returns { success: false, error: { code, message, details } }
        // details is an array of {field, message} for validation errors
        const apiMsg = json?.error?.message || json?.error || json?.message
        const details = json?.error?.details
        let errMsg = typeof apiMsg === 'string' ? apiMsg : 'Registration failed. Please try again.'
        // If there are field-level validation details, show them
        if (Array.isArray(details) && details.length > 0) {
          errMsg = details.map((d: any) => `${d.field}: ${d.message}`).join(' • ')
        }
        setError(errMsg)
        setIsLoading(false)
        return
      }
      router.push('/auth/login?role=' + role + '&registered=1')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Keep react-hook-form address in sync
  useEffect(() => { setValue('address', address) }, [address, setValue])

  const lbl = labelStyle({ text: AUTH.text, muted: AUTH.muted })
  const inp = inputStyle({ border: AUTH.border, text: AUTH.text, bg: '#faf5ff' })

  return (
    <div style={{ minHeight: '100vh', background: AUTH.bg, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px', fontFamily: SHARED.font, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: AUTH.gradientBlob1, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: AUTH.gradientBlob2, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, background: AUTH.white, borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '460px', boxShadow: SHARED.shadowXl, border: `1px solid transparent`, backgroundImage: `linear-gradient(${AUTH.white}, ${AUTH.white}), ${AUTH.gradient}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
        <Link href="/" style={{ color: AUTH.muted, textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px', fontFamily: SHARED.font }}>← Back to home</Link>

        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <img src="/icons/icon-192.png" alt="logo" style={{ width: '52px', height: '52px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 2px 12px rgba(109,40,217,0.2)' }} />
          <h2 style={{ color: AUTH.text, fontSize: '1.5rem', fontWeight: 800, margin: 0, marginBottom: '5px', fontFamily: SHARED.font }}>Create Account</h2>
          <p style={{ color: AUTH.muted, fontSize: '0.875rem', fontFamily: SHARED.font }}>Join farmers &amp; buyers on AgriEasy</p>
        </div>

        {/* Role selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          {(['farmer', 'buyer', 'transporter'] as const).map(r => (
            <button key={r} onClick={() => setRole(r)} type="button" style={{
              flex: 1, padding: '10px 6px', borderRadius: '12px', cursor: 'pointer',
              background: role === r ? AUTH.primaryLight : AUTH.bg,
              border: `1.5px solid ${role === r ? AUTH.primary : AUTH.border}`,
              color: role === r ? AUTH.primary : AUTH.muted,
              fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              fontFamily: SHARED.font,
            }}>
              {r === 'farmer' ? '🌾' : r === 'buyer' ? '🛒' : '🚛'}{' '}
              {r === 'farmer' ? 'Farmer' : r === 'buyer' ? 'Buyer' : 'Transporter'}
            </button>
          ))}
        </div>

        {/* Google Sign Up */}
        <button onClick={() => signIn('google', { callbackUrl: `/${role}/dashboard` })} style={{ width: '100%', padding: '11px', borderRadius: '12px', background: AUTH.bg, border: `1.5px solid ${AUTH.border}`, color: AUTH.text, fontSize: '0.93rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px', fontFamily: SHARED.font, transition: 'background 0.2s, border-color 0.2s' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign up with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: AUTH.border }} />
          <span style={{ color: AUTH.muted, fontSize: '0.78rem', fontFamily: SHARED.font }}>or register with email</span>
          <div style={{ flex: 1, height: '1px', background: AUTH.border }} />
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 600, fontFamily: SHARED.font }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={lbl}>Full Name</label>
            <input type="text" {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })} placeholder="e.g., Rishabh Gupta" style={inp} />
            {errors.name && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.name.message}</p>}
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input type="email" {...register('email', { required: 'Email is required' })} placeholder="you@example.com" style={inp} />
            {errors.email && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.email.message}</p>}
          </div>
          <div>
            <label style={lbl}>Password</label>
            <input type="password" {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 characters' } })} placeholder="Min 8 characters" style={inp} />
            {errors.password && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.password.message}</p>}
          </div>
          <div>
            <label style={lbl}>Phone</label>
            <input type="text" {...register('phone', { required: 'Phone is required' })} placeholder="+91 XXXXX XXXXX" style={inp} />
            {errors.phone && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.phone.message}</p>}
          </div>
          <div>
            <label style={lbl}>Address <span style={{ color: AUTH.muted, fontWeight: 400 }}>(start typing — suggestions will appear)</span></label>
            <AddressAutocomplete value={address} onChange={setAddress} placeholder="Village, City, State…" />
            {!address && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>Address is required</p>}
          </div>

          {role === 'buyer' && (
            <>
              <div>
                <label style={lbl}>Firm Name</label>
                <input type="text" {...register('firmName', { required: 'Firm name is required' })} placeholder="Your company name" style={inp} />
                {errors.firmName && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.firmName.message}</p>}
              </div>
              <div>
                <label style={lbl}>GSTIN</label>
                <input type="text" {...register('gstin', { required: 'GSTIN is required' })} placeholder="22AAAAA0000A1Z5" style={inp} />
                {errors.gstin && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.gstin.message}</p>}
              </div>
            </>
          )}
          {role === 'farmer' && (
            <div>
              <label style={lbl}>Aadhar Number</label>
              <input type="text" {...register('aadhar', { required: 'Aadhar is required' })} placeholder="XXXX XXXX XXXX" style={inp} />
              {errors.aadhar && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.aadhar.message}</p>}
            </div>
          )}

          {role === 'transporter' && (
            <>
              <div>
                <label style={lbl}>Company / Firm Name</label>
                <input type="text" {...register('companyName', { required: 'Company name is required' })} placeholder="e.g., Gupta Transport Co." style={inp} />
                {errors.companyName && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.companyName.message}</p>}
              </div>
              <div>
                <label style={lbl}>GSTIN (if applicable)</label>
                <input type="text" {...register('transporterGstin')} placeholder="22AAAAA0000A1Z5 (optional)" style={inp} />
              </div>
            </>
          )}

          <button type="submit" disabled={isLoading} style={{ padding: '13px', background: AUTH.gradient, color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '0.97rem', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, marginTop: '4px', fontFamily: SHARED.font, boxShadow: '0 4px 14px rgba(124,58,237,0.35)', transition: 'transform 0.15s, box-shadow 0.2s' }}>
            {isLoading ? 'Creating account…' : `Create ${role === 'farmer' ? '🌾 Farmer' : role === 'buyer' ? '🛒 Buyer' : '🚛 Transporter'} Account`}
          </button>
        </form>

        <p style={{ color: AUTH.muted, textAlign: 'center', marginTop: '18px', fontSize: '0.875rem', fontFamily: SHARED.font }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: AUTH.primary, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
      <style>{`input:focus, textarea:focus { border-color: ${AUTH.primary} !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.12) !important; transition: border-color 0.2s, box-shadow 0.2s; }`}</style>
    </div>
  )
}