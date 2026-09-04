'use client'

import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { AUTH, SHARED, inputStyle, labelStyle } from '@/lib/styles'

type Role = 'farmer' | 'buyer' | 'transporter'

type FormData = {
  name: string
  email: string
  password: string
  phone: string
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

/**
 * Generate a strong random password that meets the server-side regex:
 * min 8 chars + uppercase + lowercase + digit.
 * Used for Google users — they never see this; it's just to satisfy the
 * User schema's required password field and the strict passwordSchema regex.
 */
function generateGooglePassword(): string {
  return 'Google_Oauth_' + Math.random().toString(36).slice(2, 10) + Date.now() + 'X9'
}

/** Normalize phone: strip +91, spaces, dashes — keep only 10 digits. */
function normalizePhone(raw: string): string {
  return (raw || '').replace(/[\s\-()]/g, '').replace(/^(\+91|91)/, '')
}

const PENDING_REG_KEY = 'pendingGoogleRegistration'

/**
 * Save role + phone to sessionStorage before triggering Google OAuth,
 * so AuthSync can auto-register the user after OAuth completes — no
 * second form needed.
 */
function savePendingRegistration(role: Role, phone: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PENDING_REG_KEY, JSON.stringify({ role, phone, ts: Date.now() }))
  } catch {}
}

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [role, setRole] = useState<Role>('farmer')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [address, setAddress] = useState('')
  const [isGoogleUser, setIsGoogleUser] = useState(false)
  const [googleEmail, setGoogleEmail] = useState('')
  const [googleName, setGoogleName] = useState('')
  // Phone for one-click Google signup — collected BEFORE OAuth, so the user
  // only needs to fill it once. After OAuth, AuthSync auto-registers using
  // this stored value.
  const [googlePhone, setGooglePhone] = useState('')
  const [googlePhoneError, setGooglePhoneError] = useState('')
  const { register: formRegister, handleSubmit, formState: { errors }, setValue } = useForm<FormData>()

  useEffect(() => {
    const g = searchParams.get('google')
    if (g === '1') {
      const email = searchParams.get('email') || ''
      const name = searchParams.get('name') || ''
      setIsGoogleUser(true)
      setGoogleEmail(email)
      setGoogleName(name)
      if (email) setValue('email', email)
      if (name) setValue('name', name)
    }
    const r = searchParams.get('role') as Role | null
    if (r && ['farmer', 'buyer', 'transporter'].includes(r)) setRole(r)
  }, [searchParams, setValue])

  /** Validate phone for one-click Google signup. */
  function validateGooglePhone(): boolean {
    const clean = normalizePhone(googlePhone)
    if (!clean) {
      setGooglePhoneError('Phone number is required')
      return false
    }
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setGooglePhoneError('Enter a valid 10-digit Indian mobile number (starts with 6-9)')
      return false
    }
    setGooglePhoneError('')
    return true
  }

  /** Trigger Google OAuth, but first save role + phone to sessionStorage
   *  so AuthSync can auto-register the user when they come back. */
  const handleGoogleSignup = async () => {
    if (!validateGooglePhone()) return
    savePendingRegistration(role, normalizePhone(googlePhone))
    // callbackUrl: '/auth/login' — AuthSync runs on this page and detects
    // the pending registration, auto-creates the user, then redirects to
    // the dashboard. User sees ZERO additional forms.
    await signIn('google', { callbackUrl: '/auth/login' })
  }

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    setError('')

    // Address is REQUIRED for manual users, OPTIONAL (i.e. hidden) for Google users
    if (!isGoogleUser && !address.trim()) {
      setError('Please enter your address')
      setIsLoading(false)
      return
    }

    // Client-side Aadhar validation (only for manual farmer registration)
    if (role === 'farmer' && !isGoogleUser) {
      const cleanAadhar = (data.aadhar || '').replace(/\s/g, '')
      if (!cleanAadhar) {
        setError('Aadhar number is required for manual farmer registration')
        setIsLoading(false)
        return
      }
      if (!/^\d{12}$/.test(cleanAadhar)) {
        setError('Aadhar must be exactly 12 digits (e.g. 1234 5678 9012)')
        setIsLoading(false)
        return
      }
    }

    // Password validation (manual users only)
    if (!isGoogleUser) {
      if (!data.password) {
        setError('Password is required')
        setIsLoading(false)
        return
      }
      if (data.password.length < 8) {
        setError('Password must be at least 8 characters')
        setIsLoading(false)
        return
      }
      if (!/[A-Z]/.test(data.password)) {
        setError('Password must contain at least one uppercase letter')
        setIsLoading(false)
        return
      }
      if (!/[a-z]/.test(data.password)) {
        setError('Password must contain at least one lowercase letter')
        setIsLoading(false)
        return
      }
      if (!/[0-9]/.test(data.password)) {
        setError('Password must contain at least one digit')
        setIsLoading(false)
        return
      }
    }

    try {
      const password = isGoogleUser ? generateGooglePassword() : data.password

      const body: Record<string, any> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role,
        address: address.trim() || '',
        password,
        isGoogleUser,
      }
      if (role === 'buyer') { body.firmName = data.firmName; body.gstin = data.gstin }
      if (role === 'farmer' && !isGoogleUser) {
        body.aadhaarNumber = (data.aadhar || '').replace(/\s/g, '')
      }
      if (role === 'transporter') {
        body.transporterCompanyName = data.companyName
        body.transporterGstin = data.transporterGstin
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        const apiMsg = json?.error?.message || json?.error || json?.message
        const details = json?.error?.details
        let errMsg = typeof apiMsg === 'string' ? apiMsg : 'Registration failed. Please try again.'
        if (Array.isArray(details) && details.length > 0) {
          errMsg = details.map((d: any) => `${d.field}: ${d.message}`).join(' • ')
        }
        setError(errMsg)
        setIsLoading(false)
        return
      }

      // After registration:
      // - Google users: AuthSync should already have detected the pending
      //   registration and auto-registered them via the one-click flow.
      //   Reaching this fallback form means they didn't use the one-click
      //   flow (e.g. cleared sessionStorage, or came directly to this URL).
      //   Send them to /auth/login — AuthSync will detect the now-registered
      //   user and redirect to dashboard.
      // - Manual users: send to /auth/login with success message.
      router.push('/auth/login?role=' + role + (isGoogleUser ? '&google=1' : '') + '&registered=1')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

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
          <p style={{ color: AUTH.muted, fontSize: '0.875rem', fontFamily: SHARED.font }}>Join AgriEasy as a farmer, buyer, or transporter</p>
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
              {r === 'farmer' ? 'Farmer/Vyapari' : r === 'buyer' ? 'Buyer' : 'Transporter'}
            </button>
          ))}
        </div>

        {/* Google one-click signup section.
            For NON-Google users (first visit): show phone + Google button.
              - User picks role (above), enters phone, clicks Google
              - We save role+phone to sessionStorage, then trigger OAuth
              - AuthSync auto-registers them when they return → dashboard
              - NO second form, NO second OAuth
            For Google users (came back via ?google=1, e.g. cleared sessionStorage):
              - Show the fallback manual form below
              - Hide this section */}
        {!isGoogleUser && (
          <>
            <div style={{
              background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '14px',
              padding: '14px 16px', marginBottom: '14px',
            }}>
              <p style={{ margin: 0, marginBottom: '10px', fontSize: '0.83rem', fontWeight: 700, color: '#1e40af', fontFamily: SHARED.font }}>
                ⚡ One-click Google sign-up
              </p>
              <label style={{ ...lbl, fontSize: '0.8rem', color: '#1e40af' }}>Phone Number <span style={{ color: '#3b82f6' }}>(required for Google sign-up)</span></label>
              <input
                type="tel"
                value={googlePhone}
                onChange={e => { setGooglePhone(e.target.value); if (googlePhoneError) setGooglePhoneError('') }}
                placeholder="+91 XXXXX XXXXX"
                style={{ ...inp, marginTop: '4px' }}
              />
              {googlePhoneError && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', fontFamily: SHARED.font }}>{googlePhoneError}</p>}
              <button
                onClick={handleGoogleSignup}
                type="button"
                disabled={isLoading}
                style={{
                  width: '100%', padding: '11px', borderRadius: '12px',
                  background: AUTH.bg, border: `1.5px solid ${AUTH.border}`,
                  color: AUTH.text, fontSize: '0.93rem', fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '10px', marginTop: '10px',
                  fontFamily: SHARED.font,
                  transition: 'background 0.2s, border-color 0.2s',
                  opacity: isLoading ? 0.7 : 1,
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google → one-click
              </button>
              <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: AUTH.muted, fontFamily: SHARED.font }}>
                Google gives us your name + email. We use the phone you entered above to register you in one click — no second form.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '1px', background: AUTH.border }} />
              <span style={{ color: AUTH.muted, fontSize: '0.78rem', fontFamily: SHARED.font }}>or register manually</span>
              <div style={{ flex: 1, height: '1px', background: AUTH.border }} />
            </div>
          </>
        )}

        {/* Google registration banner — only for the fallback Google form */}
        {isGoogleUser && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#16a34a', fontSize: '0.82rem', fontWeight: 600, fontFamily: SHARED.font, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✅</span>
            <span>Complete your registration with <strong style={{ fontWeight: 700 }}>{googleEmail}</strong></span>
          </div>
        )}

        {/* Fallback Google form (shown only when ?google=1 in URL).
            Most users won't see this — the one-click flow above handles
            everything via sessionStorage. */}
        {isGoogleUser && (
          <>
            <button
              onClick={() => signIn('google', { callbackUrl: '/auth/login' })}
              type="button"
              style={{
                width: '100%', padding: '11px', borderRadius: '12px',
                background: AUTH.bg, border: `1.5px solid ${AUTH.border}`,
                color: AUTH.text, fontSize: '0.93rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '10px', marginBottom: '16px',
                fontFamily: SHARED.font,
                transition: 'background 0.2s, border-color 0.2s',
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Use a different Google account
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '1px', background: AUTH.border }} />
              <span style={{ color: AUTH.muted, fontSize: '0.78rem', fontFamily: SHARED.font }}>or complete the form below</span>
              <div style={{ flex: 1, height: '1px', background: AUTH.border }} />
            </div>
          </>
        )}

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 600, fontFamily: SHARED.font }}>
            ⚠️ {error}
          </div>
        )}

        {/* Manual form (always visible for non-Google users, fallback form for Google users) */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={lbl}>Full Name</label>
            <input type="text" {...formRegister('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })} placeholder="e.g., Rishabh Gupta" style={inp} disabled={isGoogleUser && !!googleName} />
            {errors.name && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.name.message}</p>}
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input type="email" {...formRegister('email', { required: 'Email is required' })} placeholder="you@example.com" style={inp} disabled={isGoogleUser} />
            {errors.email && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.email.message}</p>}
          </div>
          {/* Password — hidden for Google users */}
          {!isGoogleUser && (
            <div>
              <label style={lbl}>Password</label>
              <input type="password" {...formRegister('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} placeholder="Min 8 chars, with A-Z, a-z, 0-9" style={inp} />
              {errors.password && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.password.message}</p>}
              <p style={{ color: AUTH.muted, fontSize: '0.72rem', marginTop: '4px', fontFamily: SHARED.font }}>Must contain uppercase, lowercase, and a digit.</p>
            </div>
          )}
          <div>
            <label style={lbl}>Phone</label>
            <input type="tel" {...formRegister('phone', { required: 'Phone is required' })} placeholder="+91 XXXXX XXXXX" style={inp} />
            {errors.phone && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.phone.message}</p>}
          </div>

          {/* Address — REQUIRED for manual users, HIDDEN for Google users (not even optional) */}
          {!isGoogleUser && (
            <div>
              <label style={lbl}>Address <span style={{ color: AUTH.muted, fontWeight: 400, fontSize: '0.78rem' }}>(start typing — suggestions will appear)</span></label>
              <AddressAutocomplete value={address} onChange={setAddress} placeholder="Village, City, State…" />
              {!address && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>Address is required</p>}
            </div>
          )}

          {role === 'buyer' && (
            <>
              <div>
                <label style={lbl}>Firm Name</label>
                <input type="text" {...formRegister('firmName', { required: 'Firm name is required' })} placeholder="Your company name" style={inp} />
                {errors.firmName && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.firmName.message}</p>}
              </div>
              <div>
                <label style={lbl}>GSTIN</label>
                <input type="text" {...formRegister('gstin', { required: 'GSTIN is required' })} placeholder="22AAAAA0000A1Z5" style={inp} />
                {errors.gstin && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.gstin.message}</p>}
              </div>
            </>
          )}

          {/* Aadhar — hidden for Google users */}
          {role === 'farmer' && !isGoogleUser && (
            <div>
              <label style={lbl}>Aadhar Number</label>
              <input type="text" {...formRegister('aadhar', { required: 'Aadhar is required' })} placeholder="XXXX XXXX XXXX" style={inp} />
              {errors.aadhar && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.aadhar.message}</p>}
              <p style={{ color: AUTH.muted, fontSize: '0.72rem', marginTop: '4px', fontFamily: SHARED.font }}>12 digits. Required for manual registration, skipped for Google users.</p>
            </div>
          )}
          {role === 'farmer' && isGoogleUser && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '8px 12px', marginBottom: '4px', color: '#92400e', fontSize: '0.78rem', fontFamily: SHARED.font }}>
              ℹ️ Aadhar and Address are not required for Google sign-up. You can add them later from your profile.
            </div>
          )}

          {role === 'transporter' && (
            <>
              <div>
                <label style={lbl}>Company / Firm Name</label>
                <input type="text" {...formRegister('companyName', { required: 'Company name is required' })} placeholder="e.g., Gupta Transport Co." style={inp} />
                {errors.companyName && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '3px', fontFamily: SHARED.font }}>{errors.companyName.message}</p>}
              </div>
              <div>
                <label style={lbl}>GSTIN (if applicable)</label>
                <input type="text" {...formRegister('transporterGstin')} placeholder="22AAAAA0000A1Z5 (optional)" style={inp} />
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

export default function Register() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: AUTH.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AUTH.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading…</div>}>
      <RegisterContent />
    </Suspense>
  )
}
