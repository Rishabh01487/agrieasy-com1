'use client'

import { SessionProvider } from 'next-auth/react'
import { Component, ReactNode } from 'react'
import AuthSync from './components/AuthSync'

class SessionProviderBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props)
        this.state = { hasError: false }
    }
    static getDerivedStateFromError() {
        return { hasError: true }
    }
    componentDidCatch(error: Error) {
        console.warn('SessionProvider crashed:', error.message)
    }
    render() {
        if (this.state.hasError) {
            return this.props.children
        }
        return (
            <SessionProvider>
                {this.props.children}
                <AuthSync />
            </SessionProvider>
        )
    }
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    return <SessionProviderBoundary>{children}</SessionProviderBoundary>
}
