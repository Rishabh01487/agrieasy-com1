'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

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
                        if (path.includes('/auth/login') || path === '/auth/login') {
                            const params = new URLSearchParams({ google: '1', email: data.email || email, name: data.name || '' })
                            window.location.href = `/auth/register?${params}`
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
