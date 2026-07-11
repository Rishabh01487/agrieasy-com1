'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { AUTH, SHARED, inputStyle, labelStyle } from '@/lib/styles'

type FormData = { identifier: string; password: string }

const roleConfig: Record<string, { icon: string; label: string }> = {
  farmer: { icon: '🌾', label: 'Farmer' },
  buyer: { icon: '🛒', label: 'Buyer' },
  transporter: { icon: '🚛', label: 'Transporter' },
}

export default function Login() {
  const router = useRouter()
  const [role, setRole] = useState('farmer')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Only allow roles that actually have a dashboard page. Reject anything
    // else (e.g. ?role=admin would otherwise redirect to a non-existent
    // /admin/dashboard after OAuth).
    const allowedRoles = ['farmer', 'buyer', 'transporter'] as const
    const paramRole = params.get('role') || 'farmer'
    setRole(allowedRoles.includes(paramRole as any) ? paramRole : 'farmer')
    if (params.get('registered') === '1') {
      setSuccess('Account created! Please sign in.')
    }
  }, [])

  const rc = roleConfig[role] || roleConfig.farmer

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: data.identifier, password: data.password }),
      })
      const json = await res.json()
      if (!res.ok) {
        const apiMsg = json?.error?.message || json?.error || json?.message
        setError(typeof apiMsg === 'string' ? apiMsg : 'Login failed. Please check your credentials.')
        setIsLoading(false)
        return
      }
      // API returns { success: true, data: { token, user: { id, email, phone, role } } }
      const payload = json.data || json
      const user = payload.user
      const token = payload.token
      if (!user || !token) {
        setError('Login succeeded but response was malformed. Please try again.')
        setIsLoading(false)
        return
      }
      localStorage.setItem('userId', user.id)
      localStorage.setItem('userEmail', user.email)
      localStorage.setItem('userRole', user.role)
      localStorage.setItem('token', token)
      // Role-aware redirect — only farmer/buyer/transporter have a /dashboard
      // route. Admin goes to /admin. Driver goes to the transporter dashboard
      const dashboardPath =
        user.role === 'admin' ? '/admin' :
        user.role === 'farmer' ? '/farmer/dashboard' :
        user.role === 'buyer' ? '/buyer/dashboard' :
        user.role === 'transporter' || user.role === 'driver' ? '/transporter/dashboard' :
        '/'
      router.push(dashboardPath)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: AUTH.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: SHARED.font, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: AUTH.gradientBlob1, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: AUTH.gradientBlob2, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, background: AUTH.white, borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: SHARED.shadowXl, border: `1px solid transparent`, backgroundImage: `linear-gradient(${AUTH.white}, ${AUTH.white}), ${AUTH.gradient}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
        <Link href="/" style={{ color: AUTH.muted, textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '24px', fontFamily: SHARED.font }}>← Back to home</Link>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/icons/icon-192.png" alt="logo" style={{ width: '56px', height: '56px', borderRadius: '14px', marginBottom: '14px', boxShadow: '0 2px 12px rgba(109,40,217,0.2)' }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: AUTH.primaryLight, border: `1px solid ${AUTH.border}`, borderRadius: '100px', padding: '5px 16px', marginBottom: '12px', fontFamily: SHARED.font }}>
            <span style={{ fontSize: '1.1rem' }}>{rc.icon}</span>
            <span style={{ color: AUTH.primary, fontWeight: 700, fontSize: '0.85rem' }}>Sign in as {rc.label}</span>
          </div>
          <h2 style={{ color: AUTH.text, fontSize: '1.55rem', fontWeight: 800, margin: 0, fontFamily: SHARED.font }}>Welcome back</h2>
          <p style={{ color: AUTH.muted, fontSize: '0.88rem', marginTop: '5px', fontFamily: SHARED.font }}>Enter your credentials to continue</p>
        </div>

        <button onClick={() => signIn('google', { callbackUrl: `/${role}/dashboard` })} style={{ width: '100%', padding: '11px', borderRadius: '12px', background: AUTH.bg, border: `1.5px solid ${AUTH.border}`, color: AUTH.text, fontSize: '0.93rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px', fontFamily: SHARED.font, transition: 'background 0.2s, border-color 0.2s' }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: AUTH.border }} />
          <span style={{ color: AUTH.muted, fontSize: '0.78rem', fontFamily: SHARED.font }}>or use email</span>
          <div style={{ flex: 1, height: '1px', background: AUTH.border }} />
        </div>

        {success && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: '#16a34a', fontSize: '0.875rem', fontWeight: 600, fontFamily: SHARED.font }}>
            ✅ {success}
          </div>
        )}

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 600, fontFamily: SHARED.font }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle({ text: AUTH.text, muted: AUTH.muted })}>Email or Phone</label>
            <input type="text" {...register('identifier', { required: 'This field is required' })} placeholder="you@example.com" style={inputStyle({ border: AUTH.border, text: AUTH.text, bg: '#faf5ff' })} />
            {errors.identifier && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', fontFamily: SHARED.font }}>{errors.identifier.message}</p>}
          </div>
          <div>
            <label style={labelStyle({ text: AUTH.text, muted: AUTH.muted })}>Password</label>
            <input type="password" {...register('password', { required: 'Password is required' })} placeholder="••••••••" style={inputStyle({ border: AUTH.border, text: AUTH.text, bg: '#faf5ff' })} />
            {errors.password && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', fontFamily: SHARED.font }}>{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isLoading} style={{ padding: '13px', background: AUTH.gradient, color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, marginTop: '4px', fontFamily: SHARED.font, boxShadow: '0 4px 14px rgba(124,58,237,0.35)', transition: 'transform 0.15s, box-shadow 0.2s' }}>
            {isLoading ? 'Signing in…' : `Sign In as ${rc.label}`}
          </button>
        </form>

        <p style={{ color: AUTH.muted, textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', fontFamily: SHARED.font }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" style={{ color: AUTH.primary, fontWeight: 700, textDecoration: 'none' }}>Register here</Link>
        </p>
      </div>
      <style>{`input:focus { border-color: ${AUTH.primary} !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.12) !important; transition: border-color 0.2s, box-shadow 0.2s; }`}</style>
    </div>
  )
}