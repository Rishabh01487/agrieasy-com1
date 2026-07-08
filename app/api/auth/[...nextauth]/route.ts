import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// NextAuth configuration — Google OAuth is OPTIONAL. If the env vars aren't
// set, we still export a working handler so /api/auth/session returns null
// instead of crashing the SessionProvider on every page load.
const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

// Fall back to JWT_SECRET if NEXTAUTH_SECRET isn't explicitly set — they
// serve the same purpose (signing session JWTs) and requiring both is a
// common deployment footgun.
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
    // If no providers are configured, NextAuth still works — it just returns
    // null sessions, which is fine because the app also supports phone+password
    // auth via /api/auth/login (separate from NextAuth).
    providers,
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
            if (url.startsWith('/')) return `${baseUrl}${url}`
            else if (new URL(url).origin === baseUrl) return url
            return baseUrl
        },
        async signIn({ account, profile }) {
            if (account?.provider === 'google' && profile?.email) {
                const dbConnect = (await import('@/lib/mongodb')).default
                const bcrypt = (await import('bcryptjs')).default
                const User = (await import('@/lib/models/User')).default
                await dbConnect()
                const existingUser = await User.findOne({ email: profile.email })
                if (!existingUser) {
                    const crypto = await import('crypto')
                    const randomPassword = crypto.randomBytes(32).toString('hex')
                    await User.create({
                        email: profile.email,
                        phone: (profile as Record<string, unknown>).phone_number as string || '',
                        password: await bcrypt.hash(randomPassword, 10),
                        role: 'buyer',
                        address: '',
                        firmName: profile.name || '',
                    })
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
