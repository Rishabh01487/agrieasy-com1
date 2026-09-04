'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

/**
 * AuthSync bridges the NextAuth Google session (cookie-based, server-side)
 * with the app's localStorage-based JWT auth (used by manual registration).
 *
 * On every page load, if the user has an active NextAuth session:
 *   1. Exchange it for a JWT via /api/auth/session-token
 *   2. If the user is registered in our DB → store JWT in localStorage
 *      and redirect to their dashboard if they're on an auth page.
 *   3. If the user is NOT registered yet (Google OAuth first-time) →
 *      redirect to /auth/register?google=1&email=...&name=... so the
 *      register page can pre-fill their details and skip password/Aadhar/Address.
 */
export default function AuthSync() {
    const { data: session, status } = useSession()

    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.email) return

        const email = session.user.email

        fetch('/api/auth/session-token', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.registered === false) {
                    if (typeof window !== 'undefined') {
                        const path = window.location.pathname
                        const url = new URL(window.location.href)
                        const hasGoogleFlag = url.searchParams.get('google') === '1'

                        // From /auth/login → redirect to /auth/register with google flag
                        if (path.includes('/auth/login')) {
                            const params = new URLSearchParams({
                                google: '1',
                                email: data.email || email,
                                name: data.name || '',
                            })
                            window.location.href = `/auth/register?${params}`
                            return
                        }

                        // From /auth/register without google flag → add it (reload once)
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
                    return
                }
                if (data.registered === true && data.token) {
                    localStorage.setItem('token', data.token)
                    localStorage.setItem('userId', data.userId)
                    localStorage.setItem('userEmail', email)
                    localStorage.setItem('userRole', data.role || 'buyer')
                    if (typeof window !== 'undefined') {
                        const path = window.location.pathname
                        // Only auto-redirect from auth pages — don't interrupt the user
                        // if they're already on a dashboard or app page.
                        if (path.includes('/auth/login') || path.includes('/auth/register')) {
                            window.location.href = `/${data.role || 'buyer'}/dashboard`
                        }
                    }
                }
            })
            .catch(() => {})
    }, [status, session])

    return null
}
