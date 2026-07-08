'use client'

import { SessionProvider } from 'next-auth/react'
import { Component, ReactNode } from 'react'

// Wrap SessionProvider in an error boundary so that if next-auth ever
// throws during render (e.g. misconfigured env vars, network error
// fetching /api/auth/session), it doesn't take down the entire app —
// we just render the children without a session context, and the
// phone+password auth flow still works fine.
class SessionProviderBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props)
        this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
        return { hasError: true }
    }
    componentDidCatch(error: Error) {
        console.warn('SessionProvider crashed (non-fatal — phone+password auth still works):', error.message)
    }
    render() {
        if (this.state.hasError) {
            // Render children WITHOUT the SessionProvider wrapper — Google
            // OAuth won't work, but the rest of the app will.
            return this.props.children
        }
        return <SessionProvider>{this.props.children}</SessionProvider>
    }
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    return <SessionProviderBoundary>{children}</SessionProviderBoundary>
}
