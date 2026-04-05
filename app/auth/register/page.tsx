'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

type FormData = {
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

const C = {
  bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
  brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280', border: '#ddd6fe',
}
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: `1.5px solid ${C.border}`, color: C.text, fontSize: '0.9rem',
  background: C.white, outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = { color: C.brDark, fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '5px' }

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
        style={inp}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
      />
      {showDropdown && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '10px', zIndex: 100, boxShadow: '0 4px 16px rgba(109,40,217,0.12)', overflow: 'hidden', marginTop: '4px' }}>
          {suggestions.map(s => (
            <button key={s.place_id} type="button" onMouseDown={() => { onChange(s.shortLabel || s.display_name); setSuggestions([]); setShowDropdown(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: C.text, fontSize: '0.85rem', borderBottom: `1px solid ${C.bg}` }}>
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
          aadharNumber: data.aadhar,
          farmerName: role === 'farmer' ? data.email.split('@')[0] : undefined,
          transporterCompanyName: role === 'transporter' ? data.companyName : undefined,
          transporterGstin: role === 'transporter' ? data.transporterGstin : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Registration failed. Please try again.')
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

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px', fontFamily: '"Inter","Segoe UI",sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-60px', right: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-60px', left: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,181,253,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '460px', boxShadow: '0 4px 24px rgba(109,40,217,0.1)' }}>
        <Link href="/" style={{ color: C.muted, textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>← Back to home</Link>

        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <img src="/icons/icon-192.png" alt="logo" style={{ width: '52px', height: '52px', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 2px 12px rgba(109,40,217,0.2)' }} />
          <h2 style={{ color: C.brDark, fontSize: '1.5rem', fontWeight: 800, margin: 0, marginBottom: '5px' }}>Create Account</h2>
          <p style={{ color: C.muted, fontSize: '0.875rem' }}>Join farmers &amp; buyers on AgriEasy</p>
        </div>

        {/* Role selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          {(['farmer', 'buyer', 'transporter'] as const).map(r => (
            <button key={r} onClick={() => setRole(r)} type="button" style={{
              flex: 1, padding: '10px 6px', borderRadius: '12px', cursor: 'pointer',
              background: role === r ? C.brLight : C.bg,
              border: `1.5px solid ${role === r ? C.brinjal : C.border}`,
              color: role === r ? C.brinjal : C.muted,
              fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            }}>
              {r === 'farmer' ? '🌾' : r === 'buyer' ? '🛒' : '🚛'}{' '}
              {r === 'farmer' ? 'Farmer' : r === 'buyer' ? 'Buyer' : 'Transporter'}
            </button>
          ))}
        </div>

        {/* Google Sign Up */}
        <button onClick={() => signIn('google', { callbackUrl: `/${role}/dashboard` })} style={{ width: '100%', padding: '11px', borderRadius: '12px', background: C.bg, border: `1.5px solid ${C.border}`, color: C.text, fontSize: '0.93rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign up with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: C.border }} />
          <span style={{ color: C.muted, fontSize: '0.78rem' }}>or register with email</span>
          <div style={{ flex: 1, height: '1px', background: C.border }} />
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={lbl}>Email</label>
            <input type="email" {...register('email', { required: 'Email is required' })} placeholder="you@example.com" style={inp} />
            {errors.email && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px' }}>{errors.email.message}</p>}
          </div>
          <div>
            <label style={lbl}>Password</label>
            <input type="password" {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 characters' } })} placeholder="Min 8 characters" style={inp} />
            {errors.password && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px' }}>{errors.password.message}</p>}
          </div>
          <div>
            <label style={lbl}>Phone</label>
            <input type="text" {...register('phone', { required: 'Phone is required' })} placeholder="+91 XXXXX XXXXX" style={inp} />
            {errors.phone && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px' }}>{errors.phone.message}</p>}
          </div>
          <div>
            <label style={lbl}>Address <span style={{ color: C.muted, fontWeight: 400 }}>(start typing — suggestions will appear)</span></label>
            <AddressAutocomplete value={address} onChange={setAddress} placeholder="Village, City, State…" />
            {!address && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', display: 'none' }}>Address is required</p>}
          </div>

          {role === 'buyer' && (
            <>
              <div>
                <label style={lbl}>Firm Name</label>
                <input type="text" {...register('firmName', { required: 'Firm name is required' })} placeholder="Your company name" style={inp} />
                {errors.firmName && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px' }}>{errors.firmName.message}</p>}
              </div>
              <div>
                <label style={lbl}>GSTIN</label>
                <input type="text" {...register('gstin', { required: 'GSTIN is required' })} placeholder="22AAAAA0000A1Z5" style={inp} />
                {errors.gstin && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px' }}>{errors.gstin.message}</p>}
              </div>
            </>
          )}
          {role === 'farmer' && (
            <div>
              <label style={lbl}>Aadhar Number</label>
              <input type="text" {...register('aadhar', { required: 'Aadhar is required' })} placeholder="XXXX XXXX XXXX" style={inp} />
              {errors.aadhar && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px' }}>{errors.aadhar.message}</p>}
            </div>
          )}

          {role === 'transporter' && (
            <>
              <div>
                <label style={lbl}>Company / Firm Name</label>
                <input type="text" {...register('companyName', { required: 'Company name is required' })} placeholder="e.g., Gupta Transport Co." style={inp} />
                {errors.companyName && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px' }}>{errors.companyName.message}</p>}
              </div>
              <div>
                <label style={lbl}>GSTIN (if applicable)</label>
                <input type="text" {...register('transporterGstin')} placeholder="22AAAAA0000A1Z5 (optional)" style={inp} />
              </div>
            </>
          )}

          <button type="submit" disabled={isLoading} style={{ padding: '13px', background: C.brinjal, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.97rem', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, marginTop: '4px' }}>
            {isLoading ? 'Creating account…' : `Create ${role === 'farmer' ? '🌾 Farmer' : role === 'buyer' ? '🛒 Buyer' : '🚛 Transporter'} Account`}
          </button>
        </form>

        <p style={{ color: C.muted, textAlign: 'center', marginTop: '18px', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: C.brinjal, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
      <style>{`input:focus, textarea:focus { border-color: #6d28d9 !important; box-shadow: 0 0 0 3px rgba(109,40,217,0.1) !important; }`}</style>
    </div>
  )
}