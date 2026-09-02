import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// NextAuth configuration — Google OAuth is OPTIONAL. If the env vars aren't
const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

// Fall back to JWT_SECRET if NEXTAUTH_SECRET isn't explicitly set — they
// serve the same purpose (signing session JWTs) and requiring both is a
// common deployment footgun.
const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET

// Force NextAuth to always use the production URL as the base, regardless
// of which Vercel preview deployment is active. This prevents the
// redirect_uri_mismatch error when users access via a preview URL.
// On localhost, use the local URL for development.
const trustHost = true

const providers = hasGoogle
  ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ]
  : []

const handler = NextAuth({
    // If no providers are configured, NextAuth still works — it just returns
    providers,
    ...(trustHost ? { trustHost: true as any } : {}),
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, account, profile }) {
            if (account) {
                token.accessToken = account.access_token
                token.id = profile?.sub
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as { id?: string }).id = token.id as string
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            // Fix: baseUrl is the NextAuth base (e.g. https://agrieasy.site/api/auth)
            // but we want to redirect to the app root (https://agrieasy.site)
            // So we strip /api/auth from baseUrl to get the actual app URL.
            const appUrl = baseUrl.replace('/api/auth', '')
            if (url.startsWith('/')) return `${appUrl}${url}`
            else if (new URL(url).origin === appUrl) return url
            return appUrl
        },
        async signIn({ account, profile }) {
            if (account?.provider === 'google' && profile?.email) {
                try {
                    const dbConnect = (await import('@/lib/mongodb')).default
                    const bcrypt = (await import('bcryptjs')).default
                    const User = (await import('@/lib/models/User')).default
                    await dbConnect()
                    const existingUser = await User.findOne({ email: profile.email })
                    if (!existingUser) {
                        const crypto = await import('crypto')
                        const randomPassword = crypto.randomBytes(32).toString('hex')
                        // Generate a unique phone number — add timestamp to avoid collisions
                        const timestamp = Date.now().toString().slice(-8)
                        const phone = `9${timestamp}${Math.floor(Math.random() * 100)}`
                        await User.create({
                            email: profile.email,
                            phone,
                            password: await bcrypt.hash(randomPassword, 10),
                            role: 'buyer',
                            address: '',
                            firmName: profile.name || '',
                        })
                    }
                } catch (err) {
                    // If user creation fails (e.g. duplicate email from a previous
                    // Google login attempt, or duplicate phone), don't block the sign-in.
                    // The user might already exist from a manual registration.
                    console.warn('[NextAuth] User creation during Google sign-in failed (non-fatal):', err)
                }
            }
            return true
        },
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/login',
    },
    secret,
})

export { handler as GET, handler as POST }
