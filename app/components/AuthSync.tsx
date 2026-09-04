'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

/**
 * AuthSync bridges the NextAuth Google session (cookie-based, server-side)
 * with the app's localStorage-based JWT auth (used by manual registration).
 *
 * On every page load, if the user has an active NextAuth session:
 *
 *   1. Exchange it for a JWT via /api/auth/session-token.
 *
 *   2. If the user is already registered in our DB:
 *      → store JWT in localStorage
 *      → redirect to their dashboard if they're on an auth page.
 *
 *   3. If the user is NOT registered yet AND we have a pending Google
 *      registration in sessionStorage (role + phone from /auth/register):
 *      → POST to /api/auth/register with email + name + role + phone
 *      → clear sessionStorage
 *      → call session-token again to get the JWT
 *      → redirect to their dashboard.
 *      (This is the one-click flow — user sees ZERO additional forms.)
 *
 *   4. If the user is NOT registered AND no pending registration:
 *      → redirect to /auth/register?google=1&email=...&name=...
 *      (fallback manual form — happens if user cleared sessionStorage
 *      or came from somewhere other than /auth/register)
 */

const PENDING_REG_KEY = 'pendingGoogleRegistration'
const PENDING_REG_TTL = 10 * 60 * 1000  // 10 minutes

interface PendingReg {
  role: 'farmer' | 'buyer' | 'transporter'
  phone: string
  ts: number
}

function readPendingReg(): PendingReg | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PENDING_REG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.role || !parsed.phone || !parsed.ts) return null
    if (Date.now() - parsed.ts > PENDING_REG_TTL) {
      sessionStorage.removeItem(PENDING_REG_KEY)
      return null
    }
    return parsed as PendingReg
  } catch {
    return null
  }
}

function clearPendingReg() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PENDING_REG_KEY)
  } catch {}
}

/** Auto-register a Google user via /api/auth/register using the data
 *  stored in sessionStorage (role, phone) plus the email/name from
 *  the NextAuth session returned by /api/auth/session-token. */
async function autoRegisterGoogleUser(
  email: string,
  name: string,
  role: PendingReg['role'],
  phone: string,
): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || email.split('@')[0],
        email,
        phone,
        role,
        address: '',
        // No password — server generates a strong one for Google users.
        // isGoogleUser=true tells the server to skip strict pw/aadhar/address validation.
        isGoogleUser: true,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export default function AuthSync() {
    const { data: session, status } = useSession()

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.email) return

        const email = session.user.email

        // Step 1: exchange NextAuth session → check if registered
        fetch('/api/auth/session-token', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        })
            .then(res => res.json())
            .then(async data => {
                // Step 2: user already registered — store JWT, redirect to dashboard
                if (data.registered === true && data.token) {
                    localStorage.setItem('token', data.token)
                    localStorage.setItem('userId', data.userId)
                    localStorage.setItem('userEmail', email)
                    localStorage.setItem('userRole', data.role || 'buyer')
                    if (typeof window !== 'undefined') {
                        const path = window.location.pathname
                        if (path.includes('/auth/login') || path.includes('/auth/register')) {
                            window.location.href = `/${data.role || 'buyer'}/dashboard`
                        }
                    }
                    return
                }

                // Step 3: unregistered — check sessionStorage for pending registration
                if (data.registered === false) {
                    const pending = readPendingReg()

                    if (pending) {
                        // One-click Google signup — auto-register the user
                        const name = data.name || (session.user as any).name || ''
                        const ok = await autoRegisterGoogleUser(
                            data.email || email,
                            name,
                            pending.role,
                            pending.phone,
                        )
                        if (ok) {
                            clearPendingReg()
                            // Fetch the JWT now that the user exists
                            const tokenRes = await fetch('/api/auth/session-token', {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email }),
                            })
                            const tokenData = await tokenRes.json()
                            if (tokenData.registered === true && tokenData.token) {
                                localStorage.setItem('token', tokenData.token)
                                localStorage.setItem('userId', tokenData.userId)
                                localStorage.setItem('userEmail', email)
                                localStorage.setItem('userRole', tokenData.role || 'buyer')
                                if (typeof window !== 'undefined') {
                                    // Redirect to dashboard — user is now fully registered + signed in
                                    window.location.href = `/${tokenData.role || 'buyer'}/dashboard`
                                }
                                return
                            }
                            // If second session-token call failed, fall through to
                            // redirect to /auth/login so the user can manually sign in.
                        }
                        // Auto-register failed — fall through to manual fallback
                    }

                    // Step 4: fallback — no pending registration in sessionStorage
                    if (typeof window !== 'undefined') {
                        const path = window.location.pathname
                        const url = new URL(window.location.href)
                        const hasGoogleFlag = url.searchParams.get('google') === '1'

                        if (path.includes('/auth/login')) {
                            const params = new URLSearchParams({
                                google: '1',
                                email: data.email || email,
                                name: data.name || '',
                            })
                            window.location.href = `/auth/register?${params}`
                            return
                        }

                        if (path.includes('/auth/register') && !hasGoogleFlag) {
                            const params = new URLSearchParams({
                                google: '1',
                                email: data.email || email,
                                name: data.name || '',
                            })
                            window.location.href = `/auth/register?${params}`
                            return
                        }
                    }
                }
            })
            .catch(() => {})
    }, [status, session])

    return null
}
