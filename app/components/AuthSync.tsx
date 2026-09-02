'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

/**
 * AuthSync — bridges NextAuth sessions with the existing localStorage-based auth.
 *
 * Problem: the app's dashboards + API calls use localStorage.getItem('userId')
 * and localStorage.getItem('token') for auth. Manual login (email + password)
 * sets these in the login form. But Google Sign-In via NextAuth stores the
 * session in a cookie — NOT in localStorage. So after Google login, dashboards
 * think the user is not logged in.
 *
 * Solution: this component listens for NextAuth session changes and syncs
 * the user info into localStorage. It also fetches a JWT token from our API
 * so that authFetch() works with the same Bearer token flow.
 *
 * Render this once in the root layout (inside SessionProvider).
 */
export default function AuthSync() {
    const { data: session, status } = useSession()

    useEffect(() => {
        if (status === 'authenticated' && session?.user) {
            // Google login succeeded — sync to localStorage
            const email = session.user.email || ''

            if (!email) return

            // Always fetch a fresh JWT from our API (don't check localStorage —
            // it might have stale data from a previous manual login session)
            fetch('/api/auth/session-token', {
                method: 'POST',
                credentials: 'include',  // send NextAuth cookie
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
                .then(res => res.json())
                .then(data => {
                    if (data.token) {
                        localStorage.setItem('token', data.token)
                        localStorage.setItem('userId', data.userId)
                        localStorage.setItem('userEmail', email)
                        localStorage.setItem('userRole', data.role || 'buyer')

                        // If we're on the login or register page, redirect to dashboard
                        if (typeof window !== 'undefined') {
                            const path = window.location.pathname
                            if (path.includes('/auth/login') || path.includes('/auth/register')) {
                                const role = data.role || 'buyer'
                                window.location.href = `/${role}/dashboard`
                            }
                        }
                    }
                })
                .catch(() => {})
        }
    }, [status, session])

    return null  // renders nothing — just a side-effect component
}
