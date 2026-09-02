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
            const name = session.user.name || ''
            const id = (session.user as any).id || ''

            // Only set if not already present (avoid overwriting manual login)
            if (!localStorage.getItem('userId') && email) {
                localStorage.setItem('userEmail', email)
                localStorage.setItem('userId', id)
                // For Google users, we don't have a role from the session.
                // Default to 'buyer' (the role assigned during NextAuth signIn callback).
                if (!localStorage.getItem('userRole')) {
                    localStorage.setItem('userRole', 'buyer')
                }
            }

            // Fetch a JWT token from our API so authFetch works
            // (NextAuth gives us a session cookie, but our API routes expect
            // a Bearer token. We call /api/auth/session-token to get one.)
            if (!localStorage.getItem('token')) {
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
                            if (data.userId) localStorage.setItem('userId', data.userId)
                            if (data.role) localStorage.setItem('userRole', data.role)
                        }
                    })
                    .catch(() => {})
            }
        } else if (status === 'unauthenticated') {
            // User logged out via NextAuth — clear localStorage too
            // Only clear if there's no manual login token (don't log out manual users)
            // We check the cookie — if NextAuth session is gone, clear everything
            // Actually, let's not be aggressive here — the logout button already clears localStorage
        }
    }, [status, session])

    return null  // renders nothing — just a side-effect component
}
