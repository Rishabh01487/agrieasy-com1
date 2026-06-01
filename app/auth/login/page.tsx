'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

type FormData = { identifier: string; password: string }

const C = {
  bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
  brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280', border: '#ddd6fe',
}
const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '10px',
  border: `1.5px solid ${C.border}`, color: C.text, fontSize: '0.95rem',
  background: C.white, outline: 'none', boxSizing: 'border-box',
}

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
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRole(params.get('role') || 'farmer')
  }, [])

  const rc = roleConfig[role] || roleConfig.farmer

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: data.identifier, password: data.password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Login failed. Please check your credentials.')
        setIsLoading(false)
        return
      }
      // Save user info to localStorage for API calls
      localStorage.setItem('userId', json.user.id)
      localStorage.setItem('userEmail', json.user.email)
      localStorage.setItem('userRole', json.user.role)
      localStorage.setItem('token', json.token)
      router.push(`/${json.user.role}/dashboard`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '"Inter","Segoe UI",sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-80px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,181,253,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, background: C.white, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 4px 24px rgba(109,40,217,0.1)' }}>
        <Link href="/" style={{ color: C.muted, textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>← Back to home</Link>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/icons/icon-192.png" alt="logo" style={{ width: '56px', height: '56px', borderRadius: '14px', marginBottom: '14px', boxShadow: '0 2px 12px rgba(109,40,217,0.2)' }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: C.brLight, border: `1px solid ${C.brMid}`, borderRadius: '100px', padding: '5px 16px', marginBottom: '12px' }}>
            <span style={{ fontSize: '1.1rem' }}>{rc.icon}</span>
            <span style={{ color: C.brinjal, fontWeight: 700, fontSize: '0.85rem' }}>Sign in as {rc.label}</span>
          </div>
          <h2 style={{ color: C.brDark, fontSize: '1.55rem', fontWeight: 800, margin: 0 }}>Welcome back</h2>
          <p style={{ color: C.muted, fontSize: '0.88rem', marginTop: '5px' }}>Enter your credentials to continue</p>
        </div>

        <button onClick={() => signIn('google', { callbackUrl: `/${role}/dashboard` })} style={{ width: '100%', padding: '11px', borderRadius: '12px', background: C.bg, border: `1.5px solid ${C.border}`, color: C.text, fontSize: '0.93rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: C.border }} />
          <span style={{ color: C.muted, fontSize: '0.78rem' }}>or use email</span>
          <div style={{ flex: 1, height: '1px', background: C.border }} />
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ color: C.brDark, fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>Email or Phone</label>
            <input type="text" {...register('identifier', { required: 'This field is required' })} placeholder="you@example.com" style={inp} />
            {errors.identifier && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{errors.identifier.message}</p>}
          </div>
          <div>
            <label style={{ color: C.brDark, fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>Password</label>
            <input type="password" {...register('password', { required: 'Password is required' })} placeholder="••••••••" style={inp} />
            {errors.password && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isLoading} style={{ padding: '13px', background: C.brinjal, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, marginTop: '4px' }}>
            {isLoading ? 'Signing in…' : `Sign In as ${rc.label}`}
          </button>
        </form>

        <p style={{ color: C.muted, textAlign: 'center', marginTop: '20px', fontSize: '0.875rem' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" style={{ color: C.brinjal, fontWeight: 700, textDecoration: 'none' }}>Register here</Link>
        </p>
      </div>
      <style>{`input:focus { border-color: #6d28d9 !important; box-shadow: 0 0 0 3px rgba(109,40,217,0.12) !important; }`}</style>
    </div>
  )
}