import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET

const providers = hasGoogle
  ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ]
  : []

const handler = NextAuth({
    providers,
    ...(true ? { trustHost: true as any } : {}),
    session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            const appUrl = baseUrl.replace('/api/auth', '')
            if (url.startsWith('/')) return `${appUrl}${url}`
            else if (new URL(url).origin === appUrl) return url
            return appUrl
        },
        async signIn({ account, profile }) {
            // Only allow sign-in if the user already exists in our DB.
            // If they don't exist, we still return true (so the session is created),
            // but the AuthSync component will detect the 404 from session-token
            // and redirect to the registration page.
            if (account?.provider === 'google' && profile?.email) {
                try {
                    const dbConnect = (await import('@/lib/mongodb')).default
                    const User = (await import('@/lib/models/User')).default
                    await dbConnect()
                    const existingUser = await User.findOne({ email: profile.email })
                    // Store whether the user exists in the token so AuthSync
                    // knows whether to redirect to dashboard or registration
                    if (!existingUser) {
                        // User not registered — store their Google email + name
                        // in a cookie so the registration page can prefill it
                        return true // Allow sign-in, AuthSync will handle redirect
                    }
                } catch (err) {
                    console.warn('[NextAuth] DB check failed (non-fatal):', err)
                }
            }
            return true
        },
    },
    pages: { signIn: '/auth/login', error: '/auth/login' },
    secret,
})

export { handler as GET, handler as POST }
